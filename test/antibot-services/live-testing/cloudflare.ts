/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

import { chromium, Page } from 'playwright';

import { FingerprintSuiteExtra } from './engine/combo';
import { FingerprintSuite } from './engine/fingerprint-suite';
import { PlaywrightExtra } from './engine/playwright-extra';
import {
    FingeprintingEngine,
    VanillaPlaywright,
} from './engine/vanilla-playwright';
import { generateReport, TestResult } from './utils/generateReport';

async function waitForCompletion<T>(
    promises: (() => Promise<T>)[],
    maxConcurrency: number,
): Promise<void> {
    async function worker() {
        let job;
        /* eslint-disable-next-line no-cond-assign */
        while ((job = promises.shift())) await job();
    }

    await Promise.all([...new Array(maxConcurrency)].map(async () => worker()));
}

const source = fs.readFileSync(
    path.join(__dirname, 'cloudflare-websites.csv'),
    'utf8',
);
const pages = source.split('\n');

async function runWith(engine: FingeprintingEngine): Promise<TestResult> {
    let passed = 0;
    let unreachable = 0;
    let blocked = 0;
    let sumTimeToPass = 0;

    async function processUrl(url: string) {
        async function gotDetected(page: Page) {
            return (await page.textContent('body'))
                .toLowerCase()
                .includes('is secure');
        }

        const context = await engine.getContext({
            launchOptions: {
                headless: true,
            },
        });

        await context.route('**', async (route) => {
            if (
                [
                    'image',
                    'stylesheet',
                    'font',
                    'media',
                    'texttrack',
                    'object',
                    'beacon',
                    'csp_report',
                    'imageset',
                ].includes(route.request().resourceType() as string)
            ) {
                await route.abort();
            } else {
                await route.continue();
            }
        });

        const page = await context.newPage();

        const start = Date.now();
        if (
            await page
                .goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
                .catch(async () => {
                    return page
                        .goto(url, {
                            waitUntil: 'domcontentloaded',
                            timeout: 10000,
                        })
                        .catch((x) => {
                            console.log(
                                `[${engine.getEngineName()}] ❌ ${x.message}`,
                            );
                            unreachable++;
                            return false;
                        });
                })
        ) {
            let busted = await gotDetected(page);

            // try to wait on the Cloudflare challenge a bit, see if it gets resolved
            if (busted) {
                await page.waitForTimeout(10000);
                busted = await gotDetected(page);
            }
            console.log(
                `[${engine.getEngineName()}] ${!busted ? '✅' : '❌'} ${url} `,
            );

            if (busted) {
                blocked++;
            } else {
                passed++;
                sumTimeToPass += Date.now() - start;
            }

            await page.close();
        }
        await context.close();
    }

    // do not set the concurrency too high, there is a slight network bottleneck
    await waitForCompletion(
        pages.map((url) => async () => {
            try {
                await processUrl(url);
            } catch (e) {
                console.log(e);
            }
        }),
        3,
    );

    return {
        passed,
        blocked,
        unreachable,
        meanTimeToPass: sumTimeToPass / passed,
    };
}

(async () => {
    const results = await Promise.all([
        runWith(new VanillaPlaywright()),
        runWith(new FingerprintSuite()),
        runWith(new PlaywrightExtra()),
        runWith(new FingerprintSuiteExtra()),
    ]);

    fs.writeFileSync(
        path.join(__dirname, 'report.html'),
        generateReport({
            '🎭️ Vanilla Playwright': results[0],
            '🍪 Playwright Extra': results[2],
            '🕵️ Fingerprint Suite': results[1],
            '🍪 + 🕵️ Fingerprint Suite Extra': results[3],
        }),
    );

    const b = await chromium.launch();
    const c = await b.newContext({
        viewport: {
            width: 3000,
            height: 1440,
        },
    });
    const p = await c.newPage();
    await p.goto(`file://${path.join(__dirname, 'report.html')}`);
    await (
        await p.$('#content')
    ).screenshot({ path: path.join(`${__dirname}`, 'report.png') });
    await b.close();

    process.exit(0);
})().catch((x) => console.error(x));
