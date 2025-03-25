const playwright = require('playwright');
const { runServer: v1 } = require('./server.js');
const { runServer: v2 } = require('./serverv2.js');

const HTTP1port = 3001;
const HTTP2port = 3002;

async function getHeadersFor(launcher, httpVersion) {
    const browser = await launcher({
        headless: false,
    });

    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    if (httpVersion === 1) {
        await page.goto(`http://localhost:${HTTP1port}/`);
    } else {
        await page.goto(`https://localhost:${HTTP2port}/`);
    }

    try {
        await page.click('[type="submit"]', { timeout: 1000 });

        const headerNames = await page.evaluate(() => {
            return JSON.parse(document.body.innerText);
        });
        await browser.close();
        return headerNames;
    } catch (e) {
        console.debug(e);
        // Webkit on Linux does not support http2
        return [];
    }
}

(async () => {
    v1(HTTP1port);
    v2(HTTP2port);

    const browserTypes = {
        safari: (p) => playwright.webkit.launch(p),
        chrome: (p) => playwright.chromium.launch(p),
        firefox: (p) => playwright.firefox.launch(p),
        edge: (p) => playwright.chromium.launch({ ...p, channel: 'msedge' }),
    };

    try {
        const x = await Promise.all(
            Object.entries(browserTypes).map(async ([name, launcher]) => {
                return [
                    name,
                    [
                        ...(await getHeadersFor(launcher, 1)),
                        ...(await getHeadersFor(launcher, 2)),
                    ],
                ];
            }),
        );
        console.log(JSON.stringify(Object.fromEntries(x), null, 4));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
