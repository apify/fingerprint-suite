const { chromium } = require('playwright');
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');

const fingerprintGenerator = new FingerprintGenerator();
const fingerprintInjector = new FingerprintInjector();

const method = "fs";

const pages = [
    "https://www.brownsfashion.com/",
    "https://www.antonioli.eu/",
    "https://www.ssense.com/",
    "https://www.kickstarter.com/projects/antonyevans/glowing-plants-natural-lighting-with-no-electricit/description?&utm_source=www.nerdydata.com",
    "https://www.booking.com/hotel/at/haus-sonnenschein-warth.de.html?&utm_source=www.nerdydata.com",
    "https://www.crunchbase.com/",
    "https://www.walmart.com/",
    "https://www.azlyrics.com/",
    "https://www.24s.com/en-cz/",
    "https://www.nike.com",
];

(async () => {

    for (const baseUrl of pages) {
        let queue = [baseUrl];
        const browser = await chromium.launch({ headless: false, channel: 'chrome' });

        let pass = 0;
        while(queue.length > 0) {            
            const fingerprint = fingerprintGenerator.getFingerprint({
                browsers: ['chrome'],
                operatingSystems: ['linux'],
                devices: ['desktop'],
                screen: {
                    maxWidth: 1920,
                    maxHeight: 1080,
                },
                locales: ['en-US'],
            });
            
            const context = await browser.newContext(method === 'fs' ? {
                viewport: { width: fingerprint.fingerprint.screen.width, height: fingerprint.fingerprint.screen.height },
                screen: { width: fingerprint.fingerprint.screen.width, height: fingerprint.fingerprint.screen.height },
                userAgent: fingerprint.fingerprint.userAgent,
            } : {});
            if (method === 'fs') {
                await fingerprintInjector.attachFingerprintToPlaywright(context, fingerprint);
            }
            
            const page = await context.newPage();

            const url = queue.shift();

            await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(x => false);
            await page.waitForTimeout(5000);
            
            try {
                await page.waitForLoadState('load');
                const title = (await page.title()).toLowerCase();
                const result = !(['access to this page', 'robot or human'].some((phrase) => title.includes(phrase)));
                
                if(!result){
                    await page.close();
                    continue;
                }
            } catch {
                await page.close();
                continue;
            }

            pass++;
            if(url === baseUrl){
                queue = (await page.$$eval('a', (links) => links.map(link => link.href))).filter(x => x !== baseUrl).slice(0,9);
            }

            await page.close();
        }
        console.log(baseUrl);
        console.log(`${pass}/10`);
        await browser.close();
    }
})();