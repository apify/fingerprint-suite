<h1 align="center">
    <a href="https://apify.github.io/fingerprint-suite/">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="./website/static/img/logo_big_light.svg">
          <img alt="Fingerprinting suite" src="./website/static/img/logo_big_dark.svg" width="500">
        </picture>
    </a>
    <br>
    <small>a modular toolkit for browser fingerprint generation and injection.</small>
</h1>

<p align=center>
    <a href="https://www.npmjs.com/package/fingerprint-injector" rel="nofollow"><img src="https://img.shields.io/npm/v/fingerprint-injector/next.svg" alt="NPM dev version" data-canonical-src="https://img.shields.io/npm/v/fingerprint-injector/next.svg" style="max-width: 100%;"></a>
    <a href="https://www.npmjs.com/package/fingerprint-injector" rel="nofollow"><img src="https://img.shields.io/npm/dw/fingerprint-injector" alt="Downloads" data-canonical-src="https://img.shields.io/npm/dw/fingerprint-injector" style="max-width: 100%;"></a>
    <a href="https://discord.gg/jyEM2PRvMU" rel="nofollow"><img src="https://img.shields.io/discord/801163717915574323?label=discord" alt="Chat on discord" data-canonical-src="https://img.shields.io/discord/801163717915574323?label=discord" style="max-width: 100%;"></a>
    <a href="https://github.com/apify/fingerprint-suite/actions/workflows/test-and-release.yml"><img src="https://github.com/apify/fingerprint-suite/actions/workflows/test-and-release.yml/badge.svg?branch=stable" alt="Build Status" style="max-width: 100%;"></a>
</p>

`fingerprint-suite` is a handcrafted assembly of tools for browser fingerprint generation and injection.
Today's websites are increasingly using fingerprinting to track users and identify them.
With the help of `fingerprint-suite` you can generate and inject browser fingerprints into your browser, allowing you to fly your scrapers under the radar.

The packages are available as the [`crawlee`](https://www.npmjs.com/package/crawlee) NPM package.
It can be used either stand-alone in your own applications
or in [actors](https://docs.apify.com/actor)
running on the [Apify Cloud](https://apify.com/).

**View full documentation, guides and examples on the [fingerprint-suite website](https://apify.github.io/fingerprint-suite/)**

> Would you like to work with us on our fingerprinting tools or similar projects? [We are hiring!](https://apify.com/jobs#senior-node.js-engineer)

## Overview

`fingerprint-suite` is a modular toolkit for browser fingerprint generation and injection. It consists of the following `npm` packages, which you can use separately, or together:

- [`header-generator`](https://www.npmjs.com/package/header-generator): generates configurable, realistic HTTP headers
- [`fingerprint-generator`](https://www.npmjs.com/package/fingerprint-generator): generates realistic browser fingerprints, affecting the HTTP headers and browser JS APIs 
- [`fingerprint-injector`](https://www.npmjs.com/package/fingerprint-injector): injects browser fingerprints into your Playwright or Puppeteer managed browser instance
- [`generative-bayesian-network`](https://www.npmjs.com/package/generative-bayesian-network): our fast implementation of Bayesian generative network used to generate realistic browser fingerprints

## Support

If you find any bug or issue with any of the fingerprinting tools, please [submit an issue on GitHub](https://github.com/apify/fingerprint-suite/issues).
For questions, you can ask on [Stack Overflow](https://stackoverflow.com/questions/tagged/apify) or contact support@apify.com

## Contributing

Your code contributions are welcome and you'll be praised to eternity!
If you have any ideas for improvements, either submit an issue or create a pull request.
For contribution guidelines and the code of conduct,
see [CONTRIBUTING.md](https://github.com/apify/fingerprint-suite/blob/master/CONTRIBUTING.md).

## License

This project is licensed under the Apache License 2.0 -
see the [LICENSE.md](https://github.com/apify/fingerprint-suite/blob/master/LICENSE.md) file for details.
