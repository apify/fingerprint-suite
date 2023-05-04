<h1 align="center">
    <a href="https://github.com/apify/fingerprint-suite/">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/apify/fingerprint-suite/master/static/logo_big_light.svg">
          <img alt="Fingerprinting suite" src="https://raw.githubusercontent.com/apify/fingerprint-suite/master/static/logo_big_dark.svg" width="500">
        </picture>
    </a>
    <br>
</h1>

<p align=center>
    <a href="https://www.npmjs.com/package/fingerprint-injector" rel="nofollow"><img src="https://img.shields.io/npm/v/fingerprint-injector/latest.svg" alt="NPM dev version" data-canonical-src="https://img.shields.io/npm/v/fingerprint-injector/next.svg" style="max-width: 100%;"></a>
    <a href="https://discord.gg/jyEM2PRvMU" rel="nofollow"><img src="https://img.shields.io/discord/801163717915574323?label=discord" alt="Chat on discord" data-canonical-src="https://img.shields.io/discord/801163717915574323?label=discord" style="max-width: 100%;"></a>
</p>

`fingerprint-suite` is a handcrafted assembly of tools for browser fingerprint generation and injection.
Today's websites are increasingly using fingerprinting to track users and identify them.
With the help of `fingerprint-suite` you can generate and inject browser fingerprints into your browser, allowing you to fly your scrapers under the radar.

> Would you like to work with us on our fingerprinting tools or similar projects? [We are hiring!](https://apify.com/jobs#senior-node.js-engineer)

## Overview

`fingerprint-suite` is a modular toolkit for browser fingerprint generation and injection. It consists of the following `npm` packages, which you can use separately, or together:

- [`header-generator`](https://www.npmjs.com/package/header-generator): generates configurable, realistic HTTP headers
- [`fingerprint-generator`](https://www.npmjs.com/package/fingerprint-generator): generates realistic browser fingerprints, affecting the HTTP headers and browser JS APIs 
- [`fingerprint-injector`](https://www.npmjs.com/package/fingerprint-injector): injects browser fingerprints into your Playwright or Puppeteer managed browser instance
- [`generative-bayesian-network`](https://www.npmjs.com/package/generative-bayesian-network): our fast implementation of a Bayesian generative network used to generate realistic browser fingerprints

## Quick start

The following example shows how to use the fingerprinting tools to camouflage your Playwright-managed Chromium instance.

```typescript
import { chromium } from 'playwright';
import { newInjectedContext } from 'fingerprint-injector';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await newInjectedContext(
        browser,
        {
            // Constraints for the generated fingerprint (optional)
            fingerprintOptions: {
                devices: ['mobile'],
                operatingSystems: ['ios'],
            },
            // Playwright's newContext() options (optional, random example for illustration)
            newContextOptions: {
                geolocation: {
                    latitude: 51.50853,
                    longitude: -0.12574,
                }
            }
        },
    );

    const page = await context.newPage();
   // ... your code using `page` here
})();
```

Here is the same example using Puppeteer:

```typescript
import puppeteer from 'puppeteer';
import { newInjectedPage } from 'fingerprint-injector';

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await newInjectedPage(
        browser,
        {
            // constraints for the generated fingerprint
            fingerprintOptions: {
                devices: ['mobile'],
                operatingSystems: ['ios'],
            },
        },
    );

    // ... your code using `page` here
    await page.goto('https://example.com');
})();
```

## Performance
With ever-improving performance of antibot fingerprinting services, we use some of the industry-leading services to benchmark our performance.
The following table shows how is the latest build of `fingerprint-suite` doing in comparison to other popular fingerprinting tools.

![Fingerprinting Benchmark Report](https://raw.githubusercontent.com/apify/fingerprint-suite/master/test/antibot-services/live-testing/report.png)

## Support

If you find any bug or issue with any of the fingerprinting tools, please [submit an issue on GitHub](https://github.com/apify/fingerprint-suite/issues).
For questions, you can ask on [Stack Overflow](https://stackoverflow.com/questions/tagged/apify) or contact support@apify.com

## Contributing

Your code contributions are welcome and you'll be praised for eternity!
If you have any ideas for improvements, either submit an issue or create a pull request.
For contribution guidelines and the code of conduct,
see [CONTRIBUTING.md](https://github.com/apify/fingerprint-suite/blob/master/CONTRIBUTING.md).

## License

This project is licensed under the Apache License 2.0 -
see the [LICENSE.md](https://github.com/apify/fingerprint-suite/blob/master/LICENSE.md) file for details.
