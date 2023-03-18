const playwright = require('playwright');
const { runServer } = require('./server');

async function getHeadersFor(launcher) {
    const browser = await launcher();
    
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:3000/');
    await page.click('a');
    const headerNames = await page.evaluate(() => {
        return fetch('/headers').then(res => res.json());
    });
    await browser.close();
    return headerNames;
}

function extendWithLowercaseHeaders(headers) {
    const out = [];
    for ( h of headers ) {
        out.push(h.toLowerCase());
        out.push(h);
    }

    return out;
}

(async () => {
        const server = await runServer();

        const browserTypes = {
            safari: () => playwright.webkit.launch(),
            chrome: () => playwright.chromium.launch({ channel: 'chrome' }),
            firefox: () => playwright.firefox.launch(),
            edge: () => playwright.chromium.launch({ channel: 'msedge' }),
        };

        const x = await Promise.all(
            Object.entries(browserTypes)
                .map(async ([name, launcher]) => {
                    return [name, extendWithLowercaseHeaders(await getHeadersFor(launcher))]
                })
        );

        console.log(JSON.stringify(Object.fromEntries(x), null, 4));
        
        server.close();
    }
)();

