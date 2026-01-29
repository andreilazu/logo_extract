const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');
const puppeteer = require('puppeteer');
const Stats = require('./stats');

// --- CONFIGURATION ---
const stats = new Stats(true);
const CONCURRENCY_LIMIT = 10; // Reduced slightly because Puppeteer is heavy
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
 * UTILITY: Resolve Relative URLs
 */
function resolveUrl(baseUrl, relativeUrl) {
    if (!relativeUrl) return null;
    try {
        if (relativeUrl.startsWith('data:')) return null;
        if (relativeUrl.startsWith('//')) {
            return 'https:' + relativeUrl;
        }
        return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
        return null;
    }
}

/**
 * METHOD 1: STATIC EXTRACTOR (Your Original Code)
 * Fast, lightweight, used as first attempt.
 */
async function extractLogoUrlAxios(websiteUrl) {
    try {
        const response = await client.get(websiteUrl);
        const finalUrl = response.request?.res?.responseUrl || response.config.url;
        const html = response.data;
        if (typeof html !== 'string') return null;

        const $ = cheerio.load(html);
        let logoUrl = null;

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
                if (resolved && !resolved.endsWith('.ico')) {
                    logoUrl = resolved;
                    return false;
                }
            }
        });

        if (logoUrl) return logoUrl;

        const homeLinkImg = $('a[href="/"] img').first();
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
 * METHOD 2: PUPPETEER EXTRACTOR (Fallback)
 * Slower, heavy, but executes JS and handles dynamic content.
 */
async function extractLogoUrlPuppeteer(websiteUrl, browser) {
    let page = null;
    try {
        page = await browser.newPage();

        // Block resources to speed up loading (we only need HTML/Structure, maybe images)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['font', 'stylesheet', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Navigate
        await page.goto(websiteUrl, { waitUntil: 'networkidle2', timeout: 15000 });

        // Evaluate in browser context (handles computed styles and JS-injected nodes)
        const logoUrl = await page.evaluate(() => {
            // Helper to check string for "logo"
            const isLogo = (str) => str && str.toLowerCase().includes('logo');

            // 1. Check Metadata
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage && ogImage.content) return ogImage.content;

            const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
            if (appleIcon && appleIcon.href) return appleIcon.href;

            // 2. Check Images in DOM
            const imgs = Array.from(document.querySelectorAll('img'));
            for (const img of imgs) {
                if (
                    isLogo(img.className) ||
                    isLogo(img.id) ||
                    isLogo(img.alt) ||
                    isLogo(img.src)
                ) {
                    // Check if visible
                    if (img.width > 20 && !img.src.endsWith('.ico')) {
                        return img.src;
                    }
                }
            }

            // 3. Check Header for first image
            const headerImg = document.querySelector('header img, .navbar img, a[href="/"] img');
            if (headerImg && headerImg.src) return headerImg.src;

            return null;
        });

        return logoUrl;

    } catch (error) {
        // console.error(`Puppeteer Error on ${websiteUrl}:`, error.message);
        return null;
    } finally {
        if (page) await page.close();
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
        if (response.data.length < 1000) return null;

        const buffer = Buffer.from(response.data);

        const pixels = await sharp(buffer)
            .resize({ height: 64 })
            .ensureAlpha()
            .flatten({ background: '#808080' })
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
 */
async function processSingleSite(site, browser) {
    // 1. Try Fast Axios
    let logoUrl = await extractLogoUrlAxios(site);
    let usedPuppeteer = false;
    // 2. If Failed, Try Heavy Puppeteer
    if (!logoUrl) {
        usedPuppeteer = true;
        // console.log(`[Retry] Switching to Puppeteer for: ${site}`);
        logoUrl = await extractLogoUrlPuppeteer(site, browser);
    }

    if (!logoUrl) {
        stats.trackFailNoLogo();
        return null;
    }

    const hash = await generateImageHash(logoUrl);
    if (!hash) {
        stats.trackFailDownload();
        return null;
    }

    const method = usedPuppeteer
        ? 'Tier 2: Puppeteer Fallback'
        : 'Tier 1: Fast Axios';

    stats.trackSuccess(method);

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
    console.log("🚀 Starting Logo Grouping Engine...");

    // Initialize Puppeteer Browser ONCE (Global Instance)
    // We use --no-sandbox for better compatibility in varied environments
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    let WEBSITES;
    try {
        const csv = fs.readFileSync("sites.csv", "utf8");
        WEBSITES = csv
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(site => site.startsWith("http") ? site : "https://" + site);

        WEBSITES = WEBSITES.slice(0, 100);
        console.log(`📋 Loaded ${WEBSITES.length} websites.`);
    } catch (e) {
        console.error("Error reading sites.csv:", e.message);
        await browser.close();
        process.exit(1);
    }

    stats.init(WEBSITES.length);

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

    // Pass the browser instance into the worker
    const rawResults = await processWithConcurrency(WEBSITES, CONCURRENCY_LIMIT, async (site) => {
        const res = await processSingleSite(site, browser);
        processedCount++;
        if (processedCount % 10 === 0) process.stdout.write(`\r[${processedCount}/${WEBSITES.length}] `);
        return res;
    });

    console.log("\n🛑 Closing Browser...");
    await browser.close();
    stats.generateReport()

    const successfulResults = rawResults.filter(r => r !== null);
    console.log(`✅ Extraction complete. Found ${successfulResults.length} logos.`);

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
