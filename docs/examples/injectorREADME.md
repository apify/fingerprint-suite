# Fingerprint injector

The Fingerprint injector is a sparse javascript library built for stealth override of browser signatures or so-called fingerprints. Overriding browser fingerprints help simulate real user browsers.
This library can inject fingerprints to `playwright` and `puppeteer` controlled browsers through a unified interface.
It is recommended to use this library with the Apify [`fingerprint-generator`](https://github.com/apify/fingerprint-generator) to achieve the best results and meet the necessary fingerprint structure.

<!-- toc -->

- [Fingerprint injector](#fingerprint-injector)
  - [Installation](#installation)
  - [Usage with the playwright](#usage-with-the-playwright)
  - [Usage with the puppeteer](#usage-with-the-puppeteer)
  - [Advanced usage with the Browser pool hooks system](#advanced-usage-with-the-browser-pool-hooks-system)
  - [API](#api)

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
const { FingerprintInjector } = require('fingerprint-injector');

// An asynchronous IIFE (immediately invoked function expression)
// allows us to use the 'await' keyword.
(async () => {
  const playwrightPlugin = new PlaywrightPlugin(
    playwright.firefox,
    pluginOptions
  );

  const fingerprintGenerator = new FingerprintGenerator({
    devices: ['desktop'],
    browsers: [{ name: 'firefox', minVersion: 88 }]
  });

  const { fingerprint } = fingerprintGenerator.getFingerprint();

  const fingerprintInjector = new FingerprintInjector();

  const launchContext = playwrightPlugin.createLaunchContext();
  const browser = await playwrightPlugin.launch(launchContext);
  // Forward properties to the browserContext
  const context = await browser.newContext({
    userAgent: fingerprint.userAgent,
    locale: fingerprint.navigator.language
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
const puppeteer = require('puppeteer')(
  // An asynchronous IIFE (immediately invoked function expression)
  // allows us to use the 'await' keyword.
  async () => {
    const fingerprintInjector = new FingerprintInjector();

    const fingerprintGenerator = new FingerprintGenerator({
      devices: ['desktop'],
      browsers: [{ name: 'chrome', minVersion: 88 }]
    });

    const { fingerprint } = fingerprintGenerator.getFingerprint();
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // Attach fingerprint to page
    await fingerprintInjector.attachFingerprintToPuppeteer(page, fingerprint);
    // Now you can use the page
    await page.goto('https://google.com');
  }
)();
```

## Advanced usage with the Browser pool hooks system

This approach handles injection for both incognito context and persistent context. It is also prepared for usage with both playwright nad puppeteer.

```js
const {
  BrowserPool,
  PlaywrightPlugin,
  PuppeteerPlugin
} = require('browser-pool');
const FingerprintGenerator = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');
const playwright = require('playwright');

// An asynchronous IIFE (immediately invoked function expression)
// allows us to use the 'await' keyword.
(async () => {
  const pluginOptions = {
    launchOptions: {
      headless: false,
      channel: 'chrome'
    }
  };

  const playwrightPlugin = new PlaywrightPlugin(
    playwright.chromium,
    pluginOptions
  );
  const fingerprintGenerator = new FingerprintGenerator({
    devices: ['desktop'],
    browsers: [{ name: 'chrome', minVersion: 90 }],
    operatingSystems: ['linux']
  });

  const { fingerprint } = fingerprintGenerator.getFingerprint();
  const fingerprintInjector = new FingerprintInjector({ fingerprint });

  const browserPool = new BrowserPool({
    browserPlugins: [playwrightPlugin],
    preLaunchHooks: [
      (pageId, launchContext) => {
        const { useIncognitoPages, launchOptions } = launchContext;

        if (useIncognitoPages) {
          return;
        }

        launchContext.launchOptions = {
          ...launchOptions,
          userAgent: fingerprint.userAgent,
          viewport: {
            width: fingerprint.screen.width,
            height: fingerprint.screen.height
          }
        };
      }
    ],
    prePageCreateHooks: [
      (pageId, browserController, pageOptions) => {
        const { launchContext } = browserController;

        if (launchContext.useIncognitoPages && pageOptions) {
          pageOptions.userAgent = fingerprint.userAgent;
          pageOptions.viewport = {
            width: fingerprint.screen.width,
            height: fingerprint.screen.height
          };
        }
      }
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
          await fingerprintInjector.attachFingerprintToPlaywright(
            context,
            fingerprint
          );

          if (!useIncognitoPages) {
            // If not incognitoPages are used we would add the injection script over and over which could cause memory leaks.
            launchContext.extend({ isFingerprintInjected: true });
          }
        } else if (browserPlugin instanceof PuppeteerPlugin) {
          console.log('Injecting fingerprint to puppeteer');
          await fingerprintInjector.attachFingerprintToPuppeteer(
            page,
            fingerprint
          );
        }
      }
    ]
  });

  const page = await browserPool.newPage();
  await page.goto('https://google.com');
})();
```

## API

# Classes

<a name="classesfingerprintinjectormd"></a>

[fingerprint-injector](#readmemd) / [Exports](#modulesmd) / FingerprintInjector

## Class: FingerprintInjector

Fingerprint injector class.

### Table of contents

#### Constructors

- [constructor](#constructor)

#### Properties

- [log](#log)
- [utilsJs](#utilsjs)

#### Methods

- [\_enhanceFingerprint](#_enhancefingerprint)
- [\_getInjectableFingerprintFunction](#_getinjectablefingerprintfunction)
- [\_loadUtils](#_loadutils)
- [\_randomInRange](#_randominrange)
- [attachFingerprintToPlaywright](#attachfingerprinttoplaywright)
- [attachFingerprintToPuppeteer](#attachfingerprinttopuppeteer)
- [getInjectableScript](#getinjectablescript)

### Constructors

#### constructor

• **new FingerprintInjector**()

### Properties

#### log

• **log**: `Log`

##### Defined in

[fingerprint-injector.ts:39](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L39)

___

#### utilsJs

• **utilsJs**: `string`

##### Defined in

[fingerprint-injector.ts:41](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L41)

### Methods

#### \_enhanceFingerprint

▸ `Private` **_enhanceFingerprint**(`fingerprint`): `EnhancedFingerprint`

##### Parameters

| Name | Type |
| :------ | :------ |
| `fingerprint` | `Fingerprint` |

##### Returns

`EnhancedFingerprint`

##### Defined in

[fingerprint-injector.ts:209](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L209)

___

#### \_getInjectableFingerprintFunction

▸ `Private` **_getInjectableFingerprintFunction**(`fingerprint`): `string`

Create injection function string.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `fingerprint` | `EnhancedFingerprint` | enhanced fingerprint. |

##### Returns

`string`

- script that overrides browser fingerprint.

##### Defined in

[fingerprint-injector.ts:110](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L110)

___

#### \_loadUtils

▸ `Private` **_loadUtils**(): `string`

##### Returns

`string`

##### Defined in

[fingerprint-injector.ts:223](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L223)

___

#### \_randomInRange

▸ `Private` **_randomInRange**(`min`, `max`): `number`

##### Parameters

| Name | Type |
| :------ | :------ |
| `min` | `number` |
| `max` | `number` |

##### Returns

`number`

##### Defined in

[fingerprint-injector.ts:230](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L230)

___

#### attachFingerprintToPlaywright

▸ **attachFingerprintToPlaywright**(`browserContext`, `browserFingerprintWithHeaders`): `Promise`<`void`\>

Adds init script to the browser context, so the fingerprint is changed before every document creation.
DISCLAIMER: Since the playwright does not support changing viewport and User-agent after the context is created,
you have to set it manually when the context is created. Check the playwright usage example.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `browserContext` | `BrowserContext` | playwright browser context |
| `browserFingerprintWithHeaders` | `BrowserFingerprintWithHeaders` | - |

##### Returns

`Promise`<`void`\>

##### Defined in

[fingerprint-injector.ts:50](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L50)

___

#### attachFingerprintToPuppeteer

▸ **attachFingerprintToPuppeteer**(`page`, `browserFingerprintWithHeaders`): `Promise`<`void`\>

Adds script that is evaluated before every document creation.
Sets User-Agent and viewport using native puppeteer interface

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `page` | `Page` | puppeteer page |
| `browserFingerprintWithHeaders` | `BrowserFingerprintWithHeaders` | - |

##### Returns

`Promise`<`void`\>

##### Defined in

[fingerprint-injector.ts:73](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L73)

___

#### getInjectableScript

▸ **getInjectableScript**(`browserFingerprintWithHeaders`): `string`

Gets the override script that should be evaluated in the browser.

##### Parameters

| Name | Type |
| :------ | :------ |
| `browserFingerprintWithHeaders` | `BrowserFingerprintWithHeaders` |

##### Returns

`string`

##### Defined in

[fingerprint-injector.ts:96](https://github.com/apify-packages/fingerprint-injector/blob/2ff8367/src/fingerprint-injector.ts#L96)

<a name="modulesmd"></a>

[fingerprint-injector](#readmemd) / Exports

# fingerprint-injector

## Table of contents

### Classes

- [FingerprintInjector](#classesfingerprintinjectormd)
