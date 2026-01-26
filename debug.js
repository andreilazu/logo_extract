const fs = require('fs');
const yaml = require('js-yaml');
const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const https = require('https');

// --- CONFIGURATION ---
const CSV_FILE = 'sites.csv';
const YAML_FILE = 'groups.yaml';
const TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// --- HTTP CLIENT SETUP ---
const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
const client = axios.create({
    timeout: TIMEOUT_MS,
    httpsAgent: httpsAgent,
    maxRedirects: 5,
    headers: { 
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
    },
    validateStatus: status => status < 500
});

// --- HELPER: Resolve URLs ---
function resolveUrl(baseUrl, relativeUrl) {
    try {
        return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
        return `INVALID_URL`;
    }
}

// --- CORE: The Deep Debugger ---
async function analyzeSite(siteUrl) {
    console.log(`\n🔍 ANALYZING: ${siteUrl}`);
    console.log("-".repeat(50));

    // 1. NETWORK & HTML
    let html, finalUrl;
    try {
        const response = await client.get(siteUrl);
        finalUrl = response.request?.res?.responseUrl || response.config.url;
        html = response.data;
        console.log(`   ✅ Connected. Status: ${response.status}`);
        if (finalUrl !== siteUrl) console.log(`   ↪️  Redirected to: ${finalUrl}`);
    } catch (e) {
        console.log(`   ❌ NETWORK FAIL: ${e.message}`);
        if (e.code === 'ECONNABORTED') console.log(`      (The site was too slow or blocked requests)`);
        if (e.response?.status === 403) console.log(`      (Access Forbidden - Likely Bot Protection)`);
        return; // Stop here
    }

    // 2. METADATA EXTRACTION
    const $ = cheerio.load(html);
    const candidates = [];
    
    // Check all standard logo locations
    const checks = [
        { name: 'Apple Icon', sel: 'link[rel="apple-touch-icon"]', attr: 'href' },
        { name: 'OG Image', sel: 'meta[property="og:image"]', attr: 'content' },
        { name: 'Favicon', sel: 'link[rel="icon"]', attr: 'href' },
        { name: 'Shortcut', sel: 'link[rel="shortcut icon"]', attr: 'href' }
    ];

    checks.forEach(c => {
        $(c.sel).each((i, el) => {
            const val = $(el).attr(c.attr);
            if (val) candidates.push({ type: c.name, url: resolveUrl(finalUrl, val) });
        });
    });

    if (candidates.length === 0) {
        console.log(`   ❌ NO METADATA: No standard icon tags found in HTML.`);
        return;
    }

    console.log(`   ℹ️  Found ${candidates.length} candidate images.`);

    // 3. IMAGE VALIDATION
    let successCount = 0;
    
    for (const img of candidates) {
        process.stdout.write(`   👉 Testing ${img.type}... `);
        
        if (img.url === 'INVALID_URL') {
            console.log("❌ Malformed URL");
            continue;
        }

        try {
            const imgRes = await client.get(img.url, { responseType: 'arraybuffer' });
            const contentType = imgRes.headers['content-type'];
            
            if (!contentType || !contentType.startsWith('image/')) {
                console.log(`❌ Not an image (Type: ${contentType})`);
                // Often 404 pages returned as 200 OK text/html
                continue;
            }

            const buffer = Buffer.from(imgRes.data);
            
            // Try processing with Sharp
            await sharp(buffer)
                .resize(9, 8)
                .toBuffer(); // Just try to render
            
            console.log(`✅ OK! (${(buffer.length/1024).toFixed(1)} KB)`);
            successCount++;

        } catch (err) {
            console.log(`❌ FAIL.`);
            if (err.message.includes('Input buffer contains unsupported image format')) {
                console.log(`      (Likely an .ico file or corrupt data)`);
            } else {
                console.log(`      (${err.message})`);
            }
        }
    }

    if (successCount === 0) {
        console.log(`   ⚠️  CONCLUSION: Candidates found, but none were valid images.`);
    } else {
        console.log(`   ✅ CONCLUSION: Valid logos exist. (The main script might have timed out or picked a bad one first).`);
    }
}

// --- MAIN EXECUTION ---
(async () => {
    // 1. Load Data
    console.log("📂 Loading files...");
    
    let csvSites = [];
    try {
        const csvRaw = fs.readFileSync(CSV_FILE, 'utf8');
        csvSites = csvRaw.split(/\r?\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => s.startsWith('http') ? s : 'https://' + s);
    } catch (e) {
        console.error(`Error reading ${CSV_FILE}: ${e.message}`);
        process.exit(1);
    }

    let processedSites = new Set();
    try {
        const yamlRaw = fs.readFileSync(YAML_FILE, 'utf8');
        const groups = yaml.load(yamlRaw);
        groups.forEach(group => {
            group.forEach(item => {
                if (item.site) processedSites.add(item.site);
            });
        });
    } catch (e) {
        console.error(`Error reading ${YAML_FILE}: ${e.message}`);
        process.exit(1);
    }

    // 2. Find Missing
    const missing = csvSites.filter(site => !processedSites.has(site));
    
    console.log(`\n📊 STATS`);
    console.log(`   Total Input (CSV):   ${csvSites.length}`);
    console.log(`   Total Output (YAML): ${processedSites.size}`);
    console.log(`   Missing / Failed:    ${missing.length}`);

    if (missing.length === 0) {
        console.log("\n🎉 AMAZING! 100% SUCCESS RATE. NOTHING TO DEBUG.");
        process.exit(0);
    }

    // 3. Prompt user or auto-run
    const limit = process.argv[2] ? parseInt(process.argv[2]) : 5; // Default to checking first 5
    console.log(`\n🕵️  Running Deep Debug on first ${limit} missing sites...`);
    
    for (let i = 0; i < Math.min(limit, missing.length); i++) {
        await analyzeSite(missing[i]);
    }

    console.log(`\n💡 To see more, run: node debug.js 20`);

})();