import path from 'path';
import log from '@apify/log';
import { readFileSync } from 'fs';
import { BrowserFingerprintWithHeaders, Fingerprint } from 'fingerprint-generator';

import { Page } from 'puppeteer';
import { BrowserContext } from 'playwright';
import { UTILS_FILE_NAME } from './constants';

interface EnhancedFingerprint extends Fingerprint {
    userAgent: string;
    historyLength: number;
}

/**
 * Fingerprint injector class.
 * @class
 */
export class FingerprintInjector {
    private log = log.child({ prefix: 'FingerprintInjector' });
    private utilsJs = this._loadUtils();

    /**
     * Adds init script to the browser context, so the fingerprint is changed before every document creation.
     * DISCLAIMER: Since the playwright does not support changing viewport and User-agent after the context is created,
     * you have to set it manually when the context is created. Check the playwright usage example.
     * @param browserContext - playwright browser context
     * @param fingerprint fingerprint from [`fingerprint-generator`](https://github.com/apify/fingerprint-generator)
     */
    async attachFingerprintToPlaywright(browserContext: BrowserContext, browserFingerprintWithHeaders: BrowserFingerprintWithHeaders): Promise<void> {
        const { fingerprint, headers } = browserFingerprintWithHeaders;
        const enhancedFingerprint = this._enhanceFingerprint(fingerprint);

        this.log.debug(`Using fingerprint`, { fingerprint: enhancedFingerprint });
        const content = this._getInjectableFingerprintFunction(enhancedFingerprint);

        // Override the language properly
        await browserContext.setExtraHTTPHeaders({
            'accept-language': headers['accept-language'],
        });

        await browserContext.addInitScript({
            content,
        });
    }

    /**
     * Adds script that is evaluated before every document creation.
     * Sets User-Agent and viewport using native puppeteer interface
     * @param page - puppeteer page
     * @param fingerprint - fingerprint from [`fingerprint-generator`](https://github.com/apify/fingerprint-generator)
     */
    async attachFingerprintToPuppeteer(page: Page, browserFingerprintWithHeaders: BrowserFingerprintWithHeaders): Promise<void> {
        const { fingerprint, headers } = browserFingerprintWithHeaders;
        const enhancedFingerprint = this._enhanceFingerprint(fingerprint);
        const { screen: { width, height }, userAgent } = enhancedFingerprint;

        this.log.debug(`Using fingerprint`, { fingerprint: enhancedFingerprint });
        await page.setUserAgent(userAgent);

        await page.setViewport({
            width,
            height,
        });
        // Override the language properly
        await page.setExtraHTTPHeaders({
            'accept-language': headers['accept-language'],
        });

        await page.evaluateOnNewDocument(this._getInjectableFingerprintFunction(enhancedFingerprint));
    }

    /**
     * Gets the override script that should be evaluated in the browser.
     */
    getInjectableScript(browserFingerprintWithHeaders: BrowserFingerprintWithHeaders): string {
        const { fingerprint } = browserFingerprintWithHeaders;
        const enhancedFingerprint = this._enhanceFingerprint(fingerprint);

        this.log.debug(`Using fingerprint`, { fingerprint: enhancedFingerprint });
        return this._getInjectableFingerprintFunction(enhancedFingerprint);
    }

    /**
     * Create injection function string.
     * @private
     * @param fingerprint - enhanced fingerprint.
     * @returns {string} - script that overrides browser fingerprint.
     */
    private _getInjectableFingerprintFunction(fingerprint: EnhancedFingerprint): string {
        function inject() {
            const {
                battery,
                navigator: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    extraProperties,
                    userAgentData,
                    webdriver,
                    ...navigatorProps
                },
                screen: allScreenProps,
                videoCard,
                historyLength,
                audioCodecs,
                videoCodecs,
                // @ts-expect-error internal browser code
            } = fp as EnhancedFingerprint;

            const {
                // window screen props
                outerHeight,
                outerWidth,
                devicePixelRatio,
                innerWidth,
                innerHeight,
                screenX,
                pageXOffset,
                pageYOffset,

                // Document screen props
                clientWidth,
                clientHeight,
                // Ignore hdr for now.
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                hasHDR,
                // window.screen props
                ...newScreen
            } = allScreenProps;

            const windowScreenProps = {
                innerHeight,
                outerHeight,
                outerWidth,
                innerWidth,
                screenX,
                pageXOffset,
                pageYOffset,
                devicePixelRatio,
            };
            const documentScreenProps = {
                clientHeight,
                clientWidth,
            };
            // override navigator
            overrideInstancePrototype(window.navigator, navigatorProps);

            if (userAgentData) {
                overrideUserAgentData(userAgentData);
            }

            if (window.navigator.webdriver) {
                // Override the webdriver
                (navigatorProps as any).webdriver = webdriver;
            }

            // override screen
            overrideInstancePrototype(window.screen, newScreen);
            overrideWindowDimensionsProps(windowScreenProps);
            overrideDocumentDimensionsProps(documentScreenProps);

            overrideInstancePrototype(window.history, { length: historyLength });

            // override webGl
            // @TODO: Find another way out of this.
            // This feels like a dirty hack, but without this it throws while running tests.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            overrideWebGl(videoCard);

            // override codecs
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            overrideCodecs(audioCodecs, videoCodecs);

            // override batteryInfo
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            overrideBattery(battery);
        }

        const mainFunctionString: string = inject.toString();

        return `(()=>{${this.utilsJs}; const fp=${JSON.stringify(fingerprint)}; (${mainFunctionString})()})()`;
    }

    private _enhanceFingerprint(fingerprint: Fingerprint): EnhancedFingerprint {
        const {
            navigator,
            ...rest
        } = fingerprint;

        return {
            ...rest,
            navigator,
            userAgent: navigator.userAgent,
            historyLength: this._randomInRange(2, 6),
        };
    }

    private _loadUtils(): string {
        const utilsJs = readFileSync(path.join(__dirname, UTILS_FILE_NAME));

        // we need to add the new lines because of typescript initial a final comment causing issues.
        return `\n${utilsJs}\n`;
    }

    private _randomInRange(min: number, max: number): number {
        return Math.floor(
            Math.random() * (max - min) + min,
        );
    };
}
