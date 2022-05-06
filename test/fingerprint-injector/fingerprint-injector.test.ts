import playwright from 'playwright';
import puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore bypass unnecessary module declaration for tests
import { BrowserFingerprintWithHeaders, Fingerprint } from 'fingerprint-generator';

// USe fingerprint injector from dist to test if the published version works.
// Historically injection was not working from build files, but all tests passed.
import { FingerprintInjector } from 'fingerprint-injector';

describe('FingerprintInjector', () => {
    let fpInjector: FingerprintInjector;
    let fingerprintWithHeaders: BrowserFingerprintWithHeaders;
    let fingerprint: Fingerprint;

    beforeEach(() => {
        fingerprintWithHeaders = {
            fingerprint: {
                screen: {
                    availHeight: 1440,
                    availWidth: 2560,
                    availTop: 0,
                    availLeft: 3840,
                    colorDepth: 24,
                    height: 1440,
                    pixelDepth: 24,
                    width: 2560,
                },
                navigator: {
                    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:96.0) Gecko/20100101 Firefox/96.0',
                    userAgentData: null,
                    language: 'cs-CZ',
                    languages: [
                        'cs-CZ',
                    ],
                    platform: 'Linux x86_64',
                    deviceMemory: null,
                    hardwareConcurrency: 4,
                    maxTouchPoints: 0,
                    product: 'Gecko',
                    productSub: '20030107',
                    vendor: null,
                    vendorSub: null,
                    doNotTrack: '1',
                    appCodeName: 'Mozilla',
                    appName: 'Netscape',
                    appVersion: '5',
                    oscpu: 'Linux x86_64',
                    extraProperties: {
                        vendorFlavors: [],
                        isBluetoothSupported: false,
                        globalPrivacyControl: null,
                        pdfViewerEnabled: null,
                        installedApps: [],
                    },
                    webdriver: false,
                },
                audioCodecs: {
                    ogg: 'probably',
                    mp3: 'maybe',
                    wav: 'probably',
                    m4a: 'maybe',
                    aac: 'maybe',
                },
                videoCodecs: {
                    ogg: 'probably',
                    h264: 'probably',
                    webm: 'probably',
                },
                pluginsData: {},
                battery: null,
                videoCard: {
                    vendor: 'AMD',
                    renderer: 'Radeon R9 200 Series',
                },
                multimediaDevices: {
                    speakers: [],
                    micros: [],
                    webcams: [],
                },
                fonts: [],
            },
            headers: {
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:96.0) Gecko/20100101 Firefox/96.0',
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'accept-language': 'cs-CZ',
                'accept-encoding': 'gzip, deflate, br',
                dnt: '1',
                'upgrade-insecure-requests': '1',
                te: 'trailers',
                'sec-fetch-site': 'same-site',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-user': '?1',
                'sec-fetch-dest': 'document',
            },
        } as any;
        fingerprint = fingerprintWithHeaders.fingerprint;

        fpInjector = new FingerprintInjector();
    });

    test('should build utils', async () => {
        expect(fpInjector.utilsJs).toBeTruthy();
    });

    describe('Playwright fingerprint overrides', () => {
        let browser: import('playwright').Browser;
        let page: import('playwright').Page;
        let response: any;

        beforeEach(async () => {
            browser = await playwright.firefox.launch({ headless: false });

            const context = await browser.newContext();
            await fpInjector.attachFingerprintToPlaywright(context, fingerprintWithHeaders);

            page = await context.newPage();
            response = await page.goto(`file://${__dirname}/test.html`, { waitUntil: 'commit' });
        });

        afterEach(async () => {
            if (browser) {
                await browser.close();
            }
        });

        test('should override navigator', async () => {
            const { navigator: navigatorFp } = fingerprint as any;

            const navigatorPrimitiveProperties = Object.keys(navigatorFp).filter((key) => {
                const type = typeof navigatorFp[key];
                return type === 'string' || type === 'number';
            });

            for (const navigatorProperty of navigatorPrimitiveProperties) {
                const browserValue = await page.evaluate((propName) => {
                    // @ts-expect-error internal browser code
                    return navigator[propName];
                }, navigatorProperty);

                expect(browserValue).toBe(navigatorFp[navigatorProperty]);
            }

            expect.assertions(navigatorPrimitiveProperties.length);
        });

        test('should override screen', async () => {
            const { screen: screenFp } = fingerprint as any;

            const screenProperties = Object.keys(screenFp);

            for (const navigatorProperty of screenProperties) {
                const browserValue = await page.evaluate((propName) => {
                    // @ts-expect-error internal browser code
                    return window.screen[propName];
                }, navigatorProperty);

                expect(browserValue).toBe(screenFp[navigatorProperty]);
            }

            expect.assertions(screenProperties.length);
        });

        test('should override webGl', async () => {
            const { videoCard: { vendor, renderer } } = fingerprint;
            const [browserVendor, browserRenderer] = await page.evaluate(() => {
                const canvas = document.createElement('canvas');
                const webGl = canvas.getContext('webgl');
                const debugInfo = webGl.getExtension('WEBGL_debug_renderer_info');
                const loadedVendor = webGl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                const loadedRenderer = webGl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

                return [loadedVendor, loadedRenderer];
            });

            expect(browserVendor).toBe(vendor);
            expect(browserRenderer).toBe(renderer);
        });

        test('should override codecs', async () => {
            const { videoCodecs, audioCodecs } = fingerprint;

            for (const [codec, canPlay] of Object.entries(videoCodecs)) {
                const canPlayBrowser = await page.evaluate((videoCodec) => {
                    const videoEl = document.createElement('video');
                    return videoEl.canPlayType(`video/${videoCodec}`);
                }, codec);
                expect(canPlay).toEqual(canPlayBrowser);
            }

            for (const [codec, canPlay] of Object.entries(audioCodecs)) {
                const canPlayBrowser = await page.evaluate((audioCodec) => {
                    const audioEl = document.createElement('audio');
                    return audioEl.canPlayType(`audio/${audioCodec}`);
                }, codec);
                expect(canPlay).toEqual(canPlayBrowser);
            }
        });

        test('should override locales', async () => {
            response = await page.goto('https://google.com', { waitUntil: 'commit' });
            const requestHeaders = response.request().headers();

            expect(requestHeaders['accept-language']?.includes('cs')).toBe(true);
        });
    });

    describe('Puppeteer fingerprint overrides', () => {
        let browser: import('puppeteer').Browser;
        let page: import('puppeteer').Page;
        let response: any;

        beforeEach(async () => {
            browser = await puppeteer.launch({ headless: false });

            page = await browser.newPage();
            await fpInjector.attachFingerprintToPuppeteer(page, fingerprintWithHeaders);

            response = await page.goto(`file://${__dirname}/test.html`);
        });

        afterEach(async () => {
            if (browser) {
                await browser.close();
            }
        });

        test('should override user-agent and viewport', async () => {
            // This is the only difference between playwright and puppeteer injection
            const viewport = await page.viewport();
            expect(viewport?.width).toEqual(fingerprint.screen.width);
            expect(viewport?.height).toEqual(fingerprint.screen.height);
            const userAgent = await page.evaluate(() => {
                return navigator.userAgent;
            });
            expect(userAgent).toBe(fingerprint.navigator.userAgent);
        });

        test('should override locales', async () => {
            const requestHeaders = response.request().headers();

            expect(requestHeaders['accept-language']?.includes('cs')).toBe(true);
        });
    });
});
