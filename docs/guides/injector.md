---
id: fingerprint-injector
title: Fingerprint Injector
---

The Fingerprint injector is a sparse javascript library built for stealth override of browser signatures or so-called fingerprints. Overriding browser fingerprints help simulate real user browsers.
This library can inject fingerprints to `playwright` and `puppeteer` controlled browsers through a unified interface.
It is recommended to use this library with the Apify [`fingerprint-generator`](https://github.com/apify/fingerprint-generator) to achieve the best results and meet the necessary fingerprint structure.

<!-- toc -->

- [Installation](#installation)
- [Usage with the playwright](#usage-with-the-playwright)
- [Usage with the puppeteer](#usage-with-the-puppeteer)
- [Advanced usage with the Browser pool hooks system](#advanced-usage-with-the-browser-pool-hooks-system)
- [API Reference](#api-reference)

<!-- tocstop -->

## Installation

```bash
npm install fingerprint-injector
```

## Usage with the playwright
This example shows how to use fingerprint injector with `browser-pool` plugin system, `playwright` firefox browser, and the Apify [`fingerprint-generator`](https://github.com/apify/fingerprint-generator)

```js
const { PlaywrightPlugin } = require('browser-pool');
const FingerprintGenerator = require('fingerprint-generator');
const { FingerprintInjector }  = require('fingerprint-injector');

// An asynchronous IIFE (immediately invoked function expression)
// allows us to use the 'await' keyword.
(async () => {
    const playwrightPlugin = new PlaywrightPlugin(playwright.firefox, pluginOptions);
    
    const fingerprintGenerator = new FingerprintGenerator({
        devices: ['desktop'],
        browsers: [{ name: 'firefox', minVersion: 88 }],
    });

    const { fingerprint } = fingerprintGenerator.getFingerprint();

    const fingerprintInjector = new FingerprintInjector();

    const launchContext = playwrightPlugin.createLaunchContext();
    const browser = await playwrightPlugin.launch(launchContext);
    // Forward properties to the browserContext
    const context = await browser.newContext({
        userAgent: fingerprint.userAgent,
        locale: fingerprint.navigator.language,
    });
   // Attach fingerprint
   await fingerprintInjector.attachFingerprintToPlaywright(context, fingerprint);

   const page = await context.newPage();
})();
```

## Usage with the puppeteer
This example demonstrates, how to use the fingerprint injector library with puppeteer.
```js
const FingerprintGenerator = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');
const puppeteer = require('puppeteer')

// An asynchronous IIFE (immediately invoked function expression)
// allows us to use the 'await' keyword.
(async () => {
    const fingerprintInjector = new FingerprintInjector();

    const fingerprintGenerator = new FingerprintGenerator({
        devices: ['desktop'],
        browsers: [{ name: 'chrome', minVersion: 88 }],
    });

    const { fingerprint } = fingerprintGenerator.getFingerprint();
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage();
    // Attach fingerprint to page
    await fingerprintInjector.attachFingerprintToPuppeteer(page, fingerprint);
    // Now you can use the page
    await page.goto('https://google.com')

})();
```
## Advanced usage with the Browser pool hooks system
This approach handles injection for both incognito context and persistent context. It is also prepared for usage with both playwright nad puppeteer.

```js
const { BrowserPool, PlaywrightPlugin, PuppeteerPlugin } = require('browser-pool');
const FingerprintGenerator = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');
const playwright = require('playwright');

// An asynchronous IIFE (immediately invoked function expression)
// allows us to use the 'await' keyword.
(async () => {
    const pluginOptions = {
        launchOptions: {
            headless: false,
            channel: 'chrome',
        },
    };

    const playwrightPlugin = new PlaywrightPlugin(playwright.chromium, pluginOptions);
    const fingerprintGenerator = new FingerprintGenerator({
        devices: ['desktop'],
        browsers: [{ name: 'chrome', minVersion: 90 }],
        operatingSystems: ['linux'],
    });

    const { fingerprint } = fingerprintGenerator.getFingerprint();
    const fingerprintInjector = new FingerprintInjector({ fingerprint });

    const browserPool = new BrowserPool({
        browserPlugins: [playwrightPlugin],
        preLaunchHooks: [(pageId, launchContext) => {
            const { useIncognitoPages, launchOptions } = launchContext;

            if (useIncognitoPages) {
                return;
            }

            launchContext.launchOptions = {
                ...launchOptions,
                userAgent: fingerprint.userAgent,
                viewport: {
                    width: fingerprint.screen.width,
                    height: fingerprint.screen.height,
                },

            };
        }],
        prePageCreateHooks: [
            (pageId, browserController, pageOptions) => {
                const { launchContext } = browserController;

                if (launchContext.useIncognitoPages && pageOptions) {
                    pageOptions.userAgent = fingerprint.userAgent;
                    pageOptions.viewport = {
                        width: fingerprint.screen.width,
                        height: fingerprint.screen.height,
                    };
                }
            },
        ],
        postPageCreateHooks: [
            async (page, browserController) => {
                const { browserPlugin, launchContext } = browserController;

                if (browserPlugin instanceof PlaywrightPlugin) {
                    const { useIncognitoPages, isFingerprintInjected } = launchContext;

                    if (isFingerprintInjected) {
                        // If not incognitoPages are used we would add the injection script over and over which could cause memory leaks.
                        return;
                    }
                    console.log('Injecting fingerprint to playwright');

                    const context = page.context();
                    await fingerprintInjector.attachFingerprintToPlaywright(context, fingerprint);

                    if (!useIncognitoPages) {
                        // If not incognitoPages are used we would add the injection script over and over which could cause memory leaks.
                        launchContext.extend({ isFingerprintInjected: true });
                    }
                } else if (browserPlugin instanceof PuppeteerPlugin) {
                    console.log('Injecting fingerprint to puppeteer');
                    await fingerprintInjector.attachFingerprintToPuppeteer(page, fingerprint);
                }
            },
        ],
    });

    const page = await browserPool.newPage();
    await page.goto('https://google.com');
})();

```
## API Reference
All public classes, methods and their parameters can be inspected in this API reference.

{{>all-docs~}}
