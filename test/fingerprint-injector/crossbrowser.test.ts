import {
    FingerprintInjector,
    newCDPInjector,
    newInjectedContext,
    newInjectedPage,
} from 'fingerprint-injector';
import playwright from 'playwright';
import puppeteer, { Browser } from 'puppeteer';
import CDP from "chrome-remote-interface";

function generateCartesianMatrix(A: any, B: any) {
    const matrix = [];
    for (const a of A) {
        for (const b of B) {
            matrix.push([a, b]);
        }
    }
    return matrix;
}

describe('Playwright controlled instances', () => {
    const runnableBrowsers = [
        'chromium',
        'firefox',
        // 'webkit',
    ] as const;
    const fingerprintBrowsers = [
        'chrome',
        'firefox',
        'safari',
        'edge',
    ] as const;

    test.each(generateCartesianMatrix(runnableBrowsers, fingerprintBrowsers))(
        `[%s] should inject %s fingerprint`,
        async (
            browserType: (typeof runnableBrowsers)[number],
            fingerprintBrowser: (typeof fingerprintBrowsers)[number],
        ) => {
            const browser = await playwright[browserType].launch();

            const context = await newInjectedContext(browser, {
                fingerprintOptions: {
                    browsers: [fingerprintBrowser],
                },
            });

            const page = await context.newPage();

            await page.goto('https://example.com');
            await browser.close();
        },
    );
});

describe('Puppeteer controlled instances', () => {
    const runnableBrowsers = ['chrome', 'firefox'] as const;
    const fingerprintBrowsers = [
        'chrome',
        'firefox',
        'safari',
        'edge',
    ] as const;

    test.each(generateCartesianMatrix(runnableBrowsers, fingerprintBrowsers))(
        `[%s] should inject %s fingerprint`,
        async (
            browserType: (typeof runnableBrowsers)[number],
            fingerprintBrowser: (typeof fingerprintBrowsers)[number],
        ) => {
            const browser = await puppeteer.launch({
                browser: browserType,
            });

            const page = await newInjectedPage(browser, {
                fingerprintOptions: {
                    browsers: [fingerprintBrowser],
                },
            });

            await page.goto('https://example.com');
            await browser.close();
        },
    );
});
describe('CDP controller instances', () => {
    const fingerprintBrowsers = [
        'chrome',
        'firefox',
        'safari',
        'edge',
    ] as const;
    test.each(fingerprintBrowsers)(
        `should inject %s fingerprint`,
        async (fingerprintBrowser: (typeof fingerprintBrowsers)[number]) => {
            const puppeteer_browser = await puppeteer.launch({
                browser: 'chrome',
                debuggingPort: 9222, // need to specify it explicitly or puppeteer launcher won't open it up
                headless: true,
            });
            const webSocketDebuggerUrl = puppeteer_browser.wsEndpoint();
            const client = await CDP({ target: webSocketDebuggerUrl });
            const { Target } = client;

            // getting the default 'about:blank' page
            const { targetInfos} = await Target.getTargets();
            const ctx_client = await CDP({ target: targetInfos[0].targetId });

            const { Network, Page, Browser, Emulation } = ctx_client;
            await Network.enable();
            await Page.enable();

            await newCDPInjector({
                network: Network,
                page: Page,
                browser: Browser,
                emulation: Emulation,
            }, {
                fingerprintOptions: {
                    browsers: [fingerprintBrowser],
                },
                });

            const { frameId } = await Page.navigate({
                url: 'http://example.com',
            });
            expect(frameId).toBeDefined();
            await client.close();
            await puppeteer_browser.close();
        },
    );
});
