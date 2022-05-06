import path from 'path';
import log from '@apify/log';
import { readFileSync } from 'fs';
import * as useragent from 'useragent';
import { BrowserFingerprintWithHeaders, Fingerprint, Headers } from 'fingerprint-generator';
import { UTILS_FILE_NAME } from './constants';

type EnhancedFingerprint = {
    screen: Record<string, number>;
    navigator: Record<string, any>;
    webGl: Record<string, string>;
    userAgent: string;
    audioCodecs: Record<string, string>[];
    videoCodecs: Record<string, string>[];
    batteryData?: Record<string, number>;
}
// Supporting types
type addInitScriptOptions = {
    content: string;
}

type BrowserContext = {
    addInitScript: (options: addInitScriptOptions)=> Promise<void>;
    setExtraHTTPHeaders: (headers: Headers) => Promise<void>;
}

type Viewport = {
    width: number;
    height: number;
}

type Page = {
    evaluateOnNewDocument: (functionToEvaluate: string) => Promise<void>;
    setUserAgent: (userAgent: string) => Promise<void>;
    setViewport: (viewport: Viewport) => Promise<void>;
    setExtraHTTPHeaders: (headers: Headers)=> Promise<void>;
}

/**
 * Fingerprint injector class.
 * @class
 */
export class FingerprintInjector {
    log = log.child({ prefix: 'FingerprintInjector' });

    utilsJs = this._loadUtils();

    constructor() {
        this.log.info('Successfully initialized.');
    }

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
        const { screen } = enhancedFingerprint;

        this.log.debug(`Using fingerprint`, { fingerprint: enhancedFingerprint });
        await page.setUserAgent(enhancedFingerprint.navigator.userAgent);

        await page.setViewport({
            width: screen.width,
            height: screen.height,
        });
        // Override the language properly
        await page.setExtraHTTPHeaders({
            'accept-language': headers['accept-language'],
        });

        await page.evaluateOnNewDocument(this._getInjectableFingerprintFunction(enhancedFingerprint));
    }

    /**
     * Create injection function string.
     * @private
     * @param fingerprint - enhanced fingerprint.
     * @returns {string} - script that overrides browser fingerprint.
     */
    private _getInjectableFingerprintFunction(fingerprint: EnhancedFingerprint): string {
        function inject() {
            // @ts-ignore
            const { batteryInfo, navigator: newNav, screen: newScreen, videoCard: webGl, historyLength, audioCodecs, videoCodecs } = fp;

            // override navigator
            // @ts-ignore
            overrideInstancePrototype(window.navigator, newNav);

            // override screen
            // @ts-ignore
            overrideInstancePrototype(window.screen, newScreen);
            // @ts-ignore
            overrideInstancePrototype(window.history, { length: historyLength });

            // override webGl
            // @TODO: Find another way out of this.
            // This feels like a dirty hack, but without this it throws while running tests.
            // @ts-ignore
            overrideWebGl(webGl);

            // override codecs
            // @ts-ignore
            overrideCodecs(audioCodecs, videoCodecs);

            // override batteryInfo
            // @ts-ignore
            overrideBattery(batteryInfo);
        }

        const mainFunctionString: string = inject.toString();

        return `(()=>{${this.utilsJs}; const fp=${JSON.stringify(fingerprint)}; (${mainFunctionString})()})()`;
    }

    private _enhanceFingerprint(fingerprint: Fingerprint): EnhancedFingerprint {
        const {
            battery,
            navigator,
            userAgent,
            ...rest
        } = fingerprint as any; // Temp fix until we release the new fp schema
        const parsedUa = useragent.parse(userAgent);

        if (useragent.is(userAgent).firefox) {
            navigator.vendor = '';

            const os = parsedUa.os.toString();
            const [major, minor] = parsedUa.os.toVersion().split('.');

            if (os.toLowerCase().includes('windows')) {
                navigator.oscpu = userAgent.includes('x64') ? `Windows NT ${major}.${minor}; Win64; x64` : `Windows NT ${major}.${minor};`;
            } else if (os.toLowerCase().includes('mac')) {
                navigator.oscpu = `Intel Mac OS X ${major}.${minor}`;
            } else if (os.toLowerCase().includes('ubuntu')) {
                navigator.oscpu = 'Linux x86_64';
            }
        }
        let batteryData;

        if (battery) {
            batteryData = { level: 0.25, chargingTime: 322, dischargingTime: Infinity }; // TODO: randomize
        }

        return {
            ...rest,
            navigator,
            batteryData,
            userAgent,
        };
    }

    private _loadUtils(): string {
        const utilsJs = readFileSync(path.join(__dirname, UTILS_FILE_NAME));

        // we need to add the new lines because of typescript initial a final comment causing issues.
        return `\n${utilsJs}\n`;
    }
}
