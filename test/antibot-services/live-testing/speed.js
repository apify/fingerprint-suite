const { chromium } = require('playwright');
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');

const fingerprintGenerator = new FingerprintGenerator();
const fingerprintInjector = new FingerprintInjector();

const method = 'fs';

async function test() {
    let totalPass = 0;

    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
    });
    let queue = ['http://localhost:3000/1'];

    while (totalPass < 100) {
        const fingerprint = fingerprintGenerator.getFingerprint({
            browsers: ['chrome'],
            operatingSystems: ['linux'],
            devices: ['desktop'],
            locales: ['en-US'],
        });

        const context = await browser.newContext(
            method === 'fs'
                ? {
                      viewport: {
                          width: fingerprint.fingerprint.screen.width,
                          height: fingerprint.fingerprint.screen.height,
                      },
                      screen: {
                          width: fingerprint.fingerprint.screen.width,
                          height: fingerprint.fingerprint.screen.height,
                      },
                      userAgent: fingerprint.fingerprint.userAgent,
                  }
                : {},
        );
        if (method === 'fs') {
            await fingerprintInjector.attachFingerprintToPlaywright(
                context,
                fingerprint,
            );
        }

        const page = await context.newPage();

        const url = queue.shift();
        await page.goto(url, { waitUntil: 'load' }).catch((_) => false);
        await page.waitForTimeout(100);
        totalPass++;
        queue = await page.$$eval('a', (links) =>
            links.map((link) => link.href),
        );
        await page.close();
    }
    await browser.close();
}

test();
