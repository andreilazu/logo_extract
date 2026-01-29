const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');

// --- CONFIGURATION ---
const CONCURRENCY_LIMIT = 20; 
const SIMILARITY_THRESHOLD = 8;
const TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// --- ROBUST HTTP CLIENT ---
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
});

const client = axios.create({
    timeout: TIMEOUT_MS,
    httpsAgent: httpsAgent,
    maxRedirects: 3,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
    },
    validateStatus: status => status < 500
});

/**
 * UTILITY: Resolve Relative URLs (THIS WAS MISSING)
 */
function resolveUrl(baseUrl, relativeUrl) {
    if (!relativeUrl) return null;
    try {
        if (relativeUrl.startsWith('data:')) return null; // Skip base64 for now to keep it simple
        if (relativeUrl.startsWith('//')) {
            return 'https:' + relativeUrl;
        }
        return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
        return null;
    }
}

/**
 * STEP 1: EXTRACTOR (Tier 1 + Tier 2)
 */
async function extractLogoUrl(websiteUrl) {
    try {
        const response = await client.get(websiteUrl);
        const finalUrl = response.request?.res?.responseUrl || response.config.url;
        const html = response.data;
        if (typeof html !== 'string') return null;

        const $ = cheerio.load(html);
        let logoUrl = null;

        // --- TIER 1: METADATA (Preferred: High Res, Square) ---
        const metaSelectors = [
            'link[rel="apple-touch-icon"]',
            'meta[property="og:image"]',
            'link[rel="icon"]'
        ];

        for (const selector of metaSelectors) {
            const val = $(selector).attr('href') || $(selector).attr('content');
            if (val && !val.endsWith('.ico')) { 
                logoUrl = resolveUrl(finalUrl, val);
                if (logoUrl) return logoUrl; 
            }
        }

        // --- TIER 2: DOM HEURISTICS (Fallback: Wide, Transparent) ---
        
        // 1. Look for obvious class names
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            const className = $(el).attr('class') || '';
            const idName = $(el).attr('id') || '';
            const altText = $(el).attr('alt') || '';
            
            if (src && (
                className.toLowerCase().includes('logo') || 
                idName.toLowerCase().includes('logo') ||
                altText.toLowerCase().includes('logo') ||
                src.toLowerCase().includes('logo')
            )) {
                const resolved = resolveUrl(finalUrl, src);
                // Filter out tiny icons or .ico files
                if (resolved && !resolved.endsWith('.ico')) {
                    logoUrl = resolved;
                    return false; // Break Cheerio loop
                }
            }
        });

        if (logoUrl) return logoUrl;

        // 2. Look for image inside Home Link
        const homeLinkImg = $('a[href="/"] img').first();
        const src = homeLinkImg.attr('src');
        if (src) {
             logoUrl = resolveUrl(finalUrl, src);
        }

        return logoUrl;

    } catch (error) {
        // Log error only if it's NOT a standard connection error (helps debug logic bugs)
        if (!error.message.includes('timeout') && !error.message.includes('code 404')) {
            // console.error(`Logic Error on ${websiteUrl}: ${error.message}`);
        }
        return null;
    }
}

/**
 * STEP 2: NORMALIZER & HASHER
 */
async function generateImageHash(imageUrl) {
    try {
        const response = await client.get(imageUrl, { responseType: 'arraybuffer' });
        
        const contentType = response.headers['content-type'];
        if (contentType && !contentType.startsWith('image/')) return null;
        if (response.data.length < 1000) return null; // Ignore < 1KB

        const buffer = Buffer.from(response.data);

        const pixels = await sharp(buffer)
            .resize({ height: 64 }) // 1. Normalize height
            .ensureAlpha()          // 2. Ensure alpha channel exists before flattening
            .flatten({ background: '#ffffff' }) // 3. White background
            .resize(9, 8, { fit: 'fill' })      // 4. Hash resize
            .normalize() 
            .grayscale()
            .raw()
            .toBuffer();

        let hash = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const idx = y * 9 + x;
                hash += (pixels[idx] > pixels[idx + 1]) ? '1' : '0';
            }
        }

        return BigInt('0b' + hash).toString(16);

    } catch (error) {
        return null;
    }
}


/**
 * WORKER: Processes a single site
 */
async function processSingleSite(site) {
    const logoUrl = await extractLogoUrl(site);
    if (!logoUrl) return null;

    const hash = await generateImageHash(logoUrl);
    if (!hash) return null;

    return { site, logoUrl, hash };
}

function calculateHammingDistance(hash1, hash2) {
    if (!hash1 || !hash2) return 100;
    const bin1 = BigInt('0x' + hash1).toString(2).padStart(64, '0');
    const bin2 = BigInt('0x' + hash2).toString(2).padStart(64, '0');
    let distance = 0;
    for (let i = 0; i < 64; i++) {
        if (bin1[i] !== bin2[i]) distance++;
    }
    return distance;
}

// --- MAIN EXECUTION ---
(async () => {
    console.log("🚀 Starting Parallel Logo Grouping Engine...");

    let WEBSITES;
    try {
        const csv = fs.readFileSync("sites.csv", "utf8");
        WEBSITES = csv
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(site => site.startsWith("http") ? site : "https://" + site);
        
        // WEBSITES = WEBSITES.slice(0, 50); // Comment this out for full run
        console.log(`📋 Loaded ${WEBSITES.length} websites.`);
    } catch (e) {
        console.error("Error reading sites.csv:", e.message);
        process.exit(1);
    }

    // Parallel Processing
    async function processWithConcurrency(items, limit, fn) {
        const results = [];
        const executing = [];
        for (const item of items) {
            const p = Promise.resolve().then(() => fn(item));
            results.push(p);
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
        return Promise.all(results);
    }

    let processedCount = 0;
    console.log(`⚡ Processing with concurrency: ${CONCURRENCY_LIMIT}`);
    
    const rawResults = await processWithConcurrency(WEBSITES, CONCURRENCY_LIMIT, async (site) => {
        const res = await processSingleSite(site);
        processedCount++;
        if (processedCount % 50 === 0) process.stdout.write(`\r[${processedCount}/${WEBSITES.length}] `);
        return res;
    });

    const successfulResults = rawResults.filter(r => r !== null);
    console.log(`\n✅ Extraction complete. Found ${successfulResults.length} logos.`);

    // Grouping
    console.log("📦 Grouping results...");
    const groups = [];
    const used = new Set();

    for (let i = 0; i < successfulResults.length; i++) {
        if (used.has(i)) continue;

        const currentGroup = [{
            site: successfulResults[i].site,
            logoUrl: successfulResults[i].logoUrl,
            hash: successfulResults[i].hash
        }];
        used.add(i);

        for (let j = i + 1; j < successfulResults.length; j++) {
            if (used.has(j)) continue;
            const dist = calculateHammingDistance(successfulResults[i].hash, successfulResults[j].hash);
            if (dist <= SIMILARITY_THRESHOLD) {
                currentGroup.push({
                    site: successfulResults[j].site,
                    logoUrl: successfulResults[j].logoUrl,
                    hash: successfulResults[j].hash
                });
                used.add(j);
            }
        }
        groups.push(currentGroup);
    }

    console.log(`💾 Saving to groups.yaml... (Total Groups: ${groups.length})`);
    const yamlStr = yaml.dump(groups);
    fs.writeFileSync('groups.yaml', yamlStr, 'utf8');
    console.log("Done.");

})();
