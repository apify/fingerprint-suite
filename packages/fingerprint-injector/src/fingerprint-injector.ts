import { readFileSync } from 'fs';
import { BrowserFingerprintWithHeaders, Fingerprint } from 'fingerprint-generator';
import { Page } from 'puppeteer';
import { BrowserContext } from 'playwright';

interface EnhancedFingerprint extends Fingerprint {
    userAgent: string;
    historyLength: number;
}

declare function overrideInstancePrototype<T>(instance: T, overrideObj: Partial<T>): void;
declare function overrideUserAgentData(userAgentData: Record<string, string>) : void;
declare function overrideDocumentDimensionsProps(props: Record<string, number>) : void;
declare function overrideWindowDimensionsProps(props: Record<string, number>): void;
declare function overrideBattery(batteryInfo?: Record<string, string|number>) : void;
declare function overrideCodecs(audioCodecs: Record<string, string>, videoCodecs: Record<string, string>) : void;
declare function overrideWebGl(webGlInfo: Record<string, string>) : void;
declare function overrideIntlAPI(language: string) : void;
declare function overrideStatic() : void;
declare function runHeadlessFixes() : void;

/**
 * Fingerprint injector class.
 * @class
 */
export class FingerprintInjector {
    private utilsJs = this._loadUtils();

    /**
     * Adds init script to the browser context, so the fingerprint is changed before every document creation.
     * DISCLAIMER: Since Playwright does not support changing viewport and `user-agent` after the context is created,
     * you have to set it manually when the context is created. Check the Playwright usage example for more details.
     * @param browserContext Playwright browser context to be injected with the fingerprint.
     * @param fingerprint Browser fingerprint from [`fingerprint-generator`](https://github.com/apify/fingerprint-generator).
     */
    async attachFingerprintToPlaywright(browserContext: BrowserContext, browserFingerprintWithHeaders: BrowserFingerprintWithHeaders): Promise<void> {
        const { fingerprint, headers } = browserFingerprintWithHeaders;
        const enhancedFingerprint = this._enhanceFingerprint(fingerprint);

        const content = this.getInjectableFingerprintFunction(
            enhancedFingerprint,
        );

        // Override the language properly
        await browserContext.setExtraHTTPHeaders({
            'accept-language': headers['accept-language'],
        });

        await browserContext.on('page', (page) => {
            page.emulateMedia({ colorScheme: 'dark' })
                .catch(() => {});
        });

        await browserContext.addInitScript({
            content,
        });
    }

    /**
     * Adds script that is evaluated before every document creation.
     * Sets User-Agent and viewport using native puppeteer interface
     * @param page Puppeteer `Page` object to be injected with the fingerprint.
     * @param fingerprint Fingerprint from [`fingerprint-generator`](https://github.com/apify/fingerprint-generator).
     */
    async attachFingerprintToPuppeteer(page: Page, browserFingerprintWithHeaders: BrowserFingerprintWithHeaders): Promise<void> {
        const { fingerprint, headers } = browserFingerprintWithHeaders;
        const enhancedFingerprint = this._enhanceFingerprint(fingerprint);
        const { screen, userAgent } = enhancedFingerprint;

        await page.setUserAgent(userAgent);

        await (await page.target().createCDPSession()).send('Page.setDeviceMetricsOverride', {
            screenHeight: screen.height,
            screenWidth: screen.width,
            width: screen.width,
            height: screen.height,
            mobile: !!(/phone|android|mobile/.test(userAgent)),
            screenOrientation: screen.height > screen.width ? { angle: 0, type: 'portraitPrimary' } : { angle: 90, type: 'landscapePrimary' },
            deviceScaleFactor: screen.devicePixelRatio,

        });
        // Override the language properly
        await page.setExtraHTTPHeaders({
            'accept-language': headers['accept-language'],
        });

        await page.emulateMediaFeatures([
            { name: 'prefers-color-scheme', value: 'dark' },
        ]);

        await page.evaluateOnNewDocument(this.getInjectableFingerprintFunction(enhancedFingerprint));
    }

    /**
     * Gets the override script that should be evaluated in the browser.
     */
    getInjectableScript(browserFingerprintWithHeaders: BrowserFingerprintWithHeaders): string {
        const { fingerprint } = browserFingerprintWithHeaders;
        const enhancedFingerprint = this._enhanceFingerprint(fingerprint);

        return this.getInjectableFingerprintFunction(enhancedFingerprint);
    }

    /**
     * Create injection function string.
     * @param fingerprint Enhanced fingerprint.
     * @returns Script overriding browser fingerprint.
     */
    private getInjectableFingerprintFunction(
        fingerprint: EnhancedFingerprint,
    ): string {
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

            runHeadlessFixes();

            overrideIntlAPI(navigatorProps.language);
            overrideStatic();

            if (userAgentData) {
                overrideUserAgentData(userAgentData);
            }

            if (window.navigator.webdriver) {
                (navigatorProps as any).webdriver = false;
            }
            overrideInstancePrototype(window.navigator, navigatorProps);

            overrideInstancePrototype(window.screen, newScreen);
            overrideWindowDimensionsProps(windowScreenProps);
            overrideDocumentDimensionsProps(documentScreenProps);

            overrideInstancePrototype(window.history, { length: historyLength });

            overrideWebGl(videoCard);
            overrideCodecs(audioCodecs, videoCodecs);

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

    /**
     * Loads the contents of the `utils.js` file, which contains the helper functions for the fingerprinting script.
     *
     * Loading this file dynamically bypasses the TypeScript compiler, which would otherwise mangle the code,
     * causing errors when executing it in the browser.
     */
    private _loadUtils(): string {
        // path.join would be better here, but Vercel's build system doesn't like it (https://github.com/apify/fingerprint-suite/issues/135)
        const utilsJs = readFileSync(`${__dirname}/utils.js`);
        return `\n${utilsJs}\n`;
    }

    private _randomInRange(min: number, max: number): number {
        return Math.floor(
            Math.random() * (max - min) + min,
        );
    };
}
