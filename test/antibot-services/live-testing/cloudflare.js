const { chromium } = require('playwright');
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');

const fingerprintGenerator = new FingerprintGenerator();
const fingerprintInjector = new FingerprintInjector();

const method = "fs";

const pages = [
    "https://www.alphr.com/",
    "https://putlocker.tl/",
    "https://www.collinsdictionary.com/",
    "https://www.airportia.com/",
    "https://altadefinizione.casino/shingeki-no-bahamut-manaria-friends-sub-ita/",
    "https://bernstein-badshop.de/",
    "https://www.sonono.de/",
    "https://www.emero.de/",
    "https://www.reuter.com/",
];
(async () => {
    let totalPass = 0;
    for(const baseUrl of pages) {
        let pass = 0;
        const browser = await chromium.launch({ 
            headless: false,
        });
        let queue = [baseUrl];
    
        while(queue.length > 0) {
            const fingerprint = fingerprintGenerator.getFingerprint({
                browsers: ['chrome'],
                operatingSystems: ['linux'],
                devices: ['desktop'],
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
            await page.goto(url, { waitUntil: 'domcontentloaded'}).catch(x => false);
    
            let result = (await page.textContent('body')).toLowerCase().includes('is secure') ? 'bot' : 'page';
            if(result === 'bot') {
                await page.waitForTimeout(100000);
                result = (await page.textContent('body')).toLowerCase().includes('is secure') ? 'bot' : 'page';
            }
            console.log(`${result === 'page' ? '✅' : '❌'} ${url} `);
        
            if(result === 'page'){
                pass++;
                if(url === baseUrl){
                    // take 10 links from the page
                    queue = (await page.$$eval('a', (links) => {
                        return links.map(link => link.href).slice(0, 5);
                    })).filter(x => x !== baseUrl);
                }
            }
            await page.close();
        }
    
        await browser.close();
        console.log(baseUrl, `${pass}/5`);
        totalPass += pass;
    }
    console.log(`${totalPass}/${pages.length * 5} (${totalPass / (pages.length * 5) * 100}%)`);
})();