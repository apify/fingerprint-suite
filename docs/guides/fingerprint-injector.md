---
id: fingerprint-injector
title: Fingerprint Injector
---

The `FingerprintInjector` is a library built for stealth override of browser signatures or so-called fingerprints. Overriding browser fingerprints helps to simulate real user browsers.
This library can inject fingerprints to `playwright` and `puppeteer` controlled browsers through a unified interface.
It is recommended to use this library with the Apify [`fingerprint-generator`](https://github.com/apify/fingerprint-generator) to achieve the best results and meet the necessary fingerprint structure.

> In case you mean it with scraping, make sure to check out our new library [Crawlee](https://crawlee.dev/), which handles all the tedious work for you. It also has a native support for fingerprinting, using this library!

<!-- toc -->

- [Installation](#installation)
- [Usage with Playwright](#usage-with-the-playwright)
- [Usage with Puppeteer](#usage-with-the-puppeteer)
- [Advanced usage with the Crawlee BrowserPool hooks system](#advanced-usage-with-the-browser-pool-hooks-system)
- [API Reference](#api-reference)

<!-- tocstop -->

## Installation

```bash
npm install fingerprint-injector
```

## Usage with Playwright
To inject the generated fingerprint to a Playwright controlled browser, we can use the `attachFingerprintToPlaywright` function. This function takes the `BrowserContext` object and the fingerprint object as parameters. Below, there is a complete example of how to run a Playwright browser with a fingerprint injected.

```javascript
const { firefox } = require('playwright');
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector }  = require('fingerprint-injector');

(async () => {
    const fingerprintGenerator = new FingerprintGenerator();

    const browserFingerprintWithHeaders = fingerprintGenerator.getFingerprint({
        devices: ['desktop'],
        browsers: ['chrome'],
    });

    const fingerprintInjector = new FingerprintInjector();
    const { fingerprint } = browserFingerprintWithHeaders;

    const browser = await firefox.launch({ headless: false });

    // With certain properties, we need to inject the props into the context initialization
    const context = await browser.newContext({
        userAgent: fingerprint.userAgent,
        locale: fingerprint.navigator.language,
        viewport: fingerprint.screen,
    });
   
    // Attach the rest of the fingerprint
   await fingerprintInjector.attachFingerprintToPlaywright(context, browserFingerprintWithHeaders);

   const page = await context.newPage();
   // ... your code using `page` here
})();
```

## Usage with Puppeteer
This example demonstrates, how to use the fingerprint injector library with puppeteer.
```javascript
const puppeteer = require('puppeteer');
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector }  = require('fingerprint-injector');

(async () => {
    const fingerprintGenerator = new FingerprintGenerator({
        devices: ['mobile'],
    });

    const browserFingerprintWithHeaders = fingerprintGenerator.getFingerprint();
    const fingerprintInjector = new FingerprintInjector();

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
   
    // Attach fingerprint to the Playwright page
   await fingerprintInjector.attachFingerprintToPuppeteer(page, browserFingerprintWithHeaders);
   // ... your code using `page` here
})();
```
## Advanced usage with the Crawlee `BrowserPool` hooks system
This approach handles injection using the [Crawlee](https://crawlee.dev/) BrowserPool. This way, you can manage your running browsers and inject fingerprints to them using the Crawlee library interface. This is a bit more advanced approach, but it is recommended to use this if you are using Crawlee.

```javascript
const { BrowserPool, PlaywrightPlugin } = require('@crawlee/browser-pool');
const { chromium } = require('playwright');

(async () => {
    const pluginOptions = {
        launchOptions: {
            headless: false,
            channel: 'chrome',
        },
    };

    const playwrightPlugin = new PlaywrightPlugin(chromium, pluginOptions);

    const browserPool = new BrowserPool({
        browserPlugins: [playwrightPlugin],
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                browsers: ['chrome'],
                devices: ['mobile'],
            },
        },
    });

    const page = await browserPool.newPage();
    await page.goto('https://google.com');
})();
```

## API Reference
All public classes, methods and their parameters can be inspected in the [API reference](../../../api/fingerprint-injector/).
