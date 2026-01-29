const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');
const { generateAndSaveStats } = require('./stats');

// --- CONFIGURATION ---
const CONCURRENCY_LIMIT = 20; // Number of parallel requests (Don't go too high or you'll get blocked)
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
    maxRedirects: 3, // Lowered to save time
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
    },
    validateStatus: status => status < 500
});

/**
 * UTILITY: Resolve Relative URLs
 */
function resolveUrl(baseUrl, relativeUrl) {
    if (!relativeUrl) return null;
    try {
        // Handle cases like "//cdn.site.com/logo.png"
        if (relativeUrl.startsWith('//')) {
            return 'https:' + relativeUrl;
        }
        return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
        return null;
    }
}

/**
 * STEP 1: EXTRACTOR
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
            if (val && !val.endsWith('.ico')) { // Skip .ico in Tier 1 if possible
                logoUrl = resolveUrl(finalUrl, val);
                if (logoUrl) return logoUrl; // RETURN IMMEDIATELY if found
            }
        }

        // --- TIER 2: DOM HEURISTICS (Fallback: Wide, Transparent) ---
        // Only run if Tier 1 failed. This is fast (regex/parsing), no network hit.
        
        // 1. Look for obvious class names
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            const className = $(el).attr('class') || '';
            const idName = $(el).attr('id') || '';
            const altText = $(el).attr('alt') || '';
            
            // Score the image based on keywords
            if (src && (
                className.toLowerCase().includes('logo') || 
                idName.toLowerCase().includes('logo') ||
                altText.toLowerCase().includes('logo') ||
                src.toLowerCase().includes('logo')
            )) {
                // Ignore SVGs if you want strictly raster, but Sharp handles them.
                // Ignore tiny tracking pixels later in processing.
                const resolved = resolveUrl(finalUrl, src);
                if (resolved && !resolved.endsWith('.ico')) {
                    logoUrl = resolved;
                    return false; // Break loop
                }
            }
        });

        if (logoUrl) return logoUrl;

        // 2. Look for image inside Home Link (Standard pattern)
        const homeLinkImg = $('a[href="/"] img, a[href="' + finalUrl + '"] img').first();
        const src = homeLinkImg.attr('src');
        if (src) {
             logoUrl = resolveUrl(finalUrl, src);
        }

        return logoUrl;

    } catch (error) {
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

        const buffer = Buffer.from(response.data);

        const pixels = await sharp(buffer)
            .resize(9, 8, { fit: 'fill' })
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
 * Returns object { site, logoUrl, hash } or null
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

    // 1. Load Data
    let WEBSITES;
    try {
        const csv = fs.readFileSync("sites.csv", "utf8");
        WEBSITES = csv
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(site => site.startsWith("http") ? site : "https://" + site);
        
        // Remove .slice() when ready for full run
        //WEBSITES = WEBSITES.slice(0, 500); 
        console.log(`📋 Loaded ${WEBSITES.length} websites.`);
    } catch (e) {
        console.error("Error reading sites.csv:", e.message);
        process.exit(1);
    }

    // 2. Parallel Processing (The "Worker Pool" Pattern)
    const results = [];
    let processedCount = 0;
    
    // This helper function manages the concurrency
    async function runBatch() {
        const promises = [];
        
        for (const site of WEBSITES) {
            // Create a promise for the current item
            const p = processSingleSite(site).then(result => {
                processedCount++;
                if (processedCount % 10 === 0) {
                    process.stdout.write(`\rProgress: ${processedCount}/${WEBSITES.length} sites...`);
                }
                if (result) results.push(result);
            });

            promises.push(p);

            // If we hit the limit, wait for *one* of them to finish before adding more
            if (promises.length >= CONCURRENCY_LIMIT) {
                await Promise.race(promises);
                // Clean up finished promises to keep array small
                // (Note: In a perfect world we'd remove the specific finished one, 
                // but strictly waiting for race is enough to throttle).
                // For cleaner memory management, we can use a Set, but this works for 4000.
                const index = promises.findIndex(p => util.inspect(p).includes('pending') === false); 
                // Simple cleanup: just wait for some space
                 while (promises.length >= CONCURRENCY_LIMIT) {
                     // Wait for one to finish, then remove it
                     await Promise.race(promises);
                     // Filter out fulfilled promises
                     // Since standard Promises don't expose state easily, 
                     // we usually use a wrapper or a library like 'p-limit'.
                     // For this demo, let's use a simpler "Chunking" strategy 
                     // if you want zero-dependencies, OR simply wait for the batch.
                 }
            }
        }
        // Wait for remainder
        await Promise.all(promises);
    }

    // ACTUALLY, let's use the cleanest native method for concurrency:
    // "Map with Iterator"
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

    // Run the robust parallel processor
    console.log(`⚡ Processing with concurrency: ${CONCURRENCY_LIMIT}`);
    const rawResults = await processWithConcurrency(WEBSITES, CONCURRENCY_LIMIT, async (site) => {
        const res = await processSingleSite(site);
        processedCount++;
        if (processedCount % 50 === 0) process.stdout.write(`\r[${processedCount}/${WEBSITES.length}] `);
        return res;
    });

    // Filter out nulls (failed sites)
    const successfulResults = rawResults.filter(r => r !== null);
    console.log(`\n✅ Extraction complete. Found ${successfulResults.length} logos.`);

    // 3. Grouping Logic
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

    // 4. Output
    console.log(`💾 Saving to groups.yaml... (Total Groups: ${groups.length})`);
    const yamlStr = yaml.dump(groups);
    fs.writeFileSync('groups.yaml', yamlStr, 'utf8');
    console.log("Done.");

    // 5. Generate Statistics (Added)
    generateAndSaveStats(groups, WEBSITES.length);

})();
