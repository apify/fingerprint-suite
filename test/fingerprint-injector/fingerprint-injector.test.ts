import { setTimeout } from 'timers/promises';

import {
    BrowserFingerprintWithHeaders,
    Fingerprint,
    FingerprintGenerator,
} from 'fingerprint-generator';
import {
    FingerprintInjector,
    newInjectedContext,
    newInjectedPage,
} from 'fingerprint-injector';
import playwright, { chromium, type Browser as PWBrowser } from 'playwright';
import puppeteer, { Browser as PPBrowser } from 'puppeteer';

import {
    describe,
    expect,
    test,
    beforeEach,
    afterAll,
    beforeAll,
} from 'vitest';

function getHTTPBinUrl() {
    return process.env.APIFY_HTTPBIN_TOKEN
        ? `https://httpbin.apify.actor/get?token=${process.env.APIFY_HTTPBIN_TOKEN}`
        : 'https://httpbin.org/get';
}

const cases = [
    [
        'Playwright',
        [
            {
                name: 'Firefox',
                launcher: playwright.firefox,
                options: {},
                fingerprintGeneratorOptions: {
                    browsers: [{ name: 'firefox', minVersion: 96 }],
                },
            },
            {
                name: 'Chrome',
                launcher: playwright.chromium,
                options: {
                    channel: 'chrome',
                },
                fingerprintGeneratorOptions: {
                    browsers: [{ name: 'chrome', minVersion: 90 }],
                },
            },
        ],
    ],
    [
        'Puppeteer',
        [
            {
                name: 'Chrome',
                launcher: puppeteer,
                options: {
                    args: ['--no-sandbox', '--use-gl=desktop'],
                    channel: 'chrome',
                },
                fingerprintGeneratorOptions: {
                    browsers: [{ name: 'chrome', minVersion: 90 }],
                },
            },
            {
                name: 'Chromium',
                launcher: puppeteer,
                options: {
                    args: ['--no-sandbox', '--use-gl=desktop'],
                },
                fingerprintGeneratorOptions: {
                    browsers: [{ name: 'chrome', minVersion: 90 }],
                },
            },
        ],
    ],
];

describe('FingerprintInjector', () => {
    let fpInjector: FingerprintInjector;

    beforeEach(() => {
        fpInjector = new FingerprintInjector();
    });

    test('should build utils', async () => {
        // eslint-disable-next-line dot-notation
        expect(fpInjector['utilsJs']).toBeTruthy();
    });
    // @ts-expect-error test only
    describe.each(cases)('%s', (frameworkName, testCases) => {
        // @ts-expect-error test only
        describe.each(testCases)(
            '$name',
            // @ts-expect-error test only
            ({ name, launcher, options, fingerprintGeneratorOptions }) => {
                let browser: any;
                let page: any;
                let response: any;
                let fingerprintGenerator: FingerprintGenerator;
                let fingerprintWithHeaders: BrowserFingerprintWithHeaders;
                let fingerprint: Fingerprint;
                let context: any;

                beforeAll(async () => {
                    fingerprintGenerator = new FingerprintGenerator({
                        devices: ['desktop'],
                        operatingSystems: ['linux'],
                        browsers: [{ name: 'firefox', minVersion: 86 }],
                        locales: ['cs-CZ'],
                        ...fingerprintGeneratorOptions,
                    });

                    fingerprintWithHeaders =
                        fingerprintGenerator.getFingerprint();

                    fingerprint = fingerprintWithHeaders.fingerprint;

                    if (frameworkName === 'Playwright') {
                        browser = (await launcher.launch({
                            headless: false,
                            ...options,
                        })) as import('playwright').Browser;

                        context = await browser.newContext();
                        await fpInjector.attachFingerprintToPlaywright(
                            context,
                            fingerprintWithHeaders,
                        );

                        page = await context.newPage();
                        response = await page.goto(
                            `file://${__dirname}/test.html`,
                            { waitUntil: 'commit' },
                        );
                    } else if (frameworkName === 'Puppeteer') {
                        browser = await launcher.launch({
                            headless: false,
                            ...options,
                        });

                        page =
                            (await browser.newPage()) as import('puppeteer').Page;
                        await fpInjector.attachFingerprintToPuppeteer(
                            page,
                            fingerprintWithHeaders,
                        );

                        response = await page.goto(
                            `file://${__dirname}/test.html`,
                        );
                    }
                    return await setTimeout(2000);
                });

                afterAll(async () => {
                    if (browser) {
                        await browser.close();
                    }
                });

                test('should override navigator', async () => {
                    const { navigator: navigatorFp } = fingerprint as any;

                    const navigatorPrimitiveProperties = Object.keys(
                        navigatorFp,
                    ).filter((key) => {
                        const type = typeof navigatorFp[key];
                        return type === 'string' || type === 'number';
                    });

                    for (const navigatorProperty of navigatorPrimitiveProperties) {
                        const browserValue = await page.evaluate(
                            (propName: string) => {
                                // @ts-expect-error internal browser code
                                return navigator[propName];
                            },
                            navigatorProperty,
                        );
                        expect(browserValue).toBe(
                            navigatorFp[navigatorProperty],
                        );
                    }

                    if (name === 'Chrome') {
                        const userAgentData = await page.evaluate(async () => {
                            const highEntropy =
                                // @ts-expect-error internal browser code
                                await navigator.userAgentData.getHighEntropyValues(
                                    [
                                        'architecture',
                                        'bitness',
                                        'model',
                                        'platformVersion',
                                        'uaFullVersion',
                                        'fullVersionList',
                                        'platform',
                                    ],
                                );

                            return {
                                ...highEntropy,
                                // @ts-expect-error internal browser code
                                brands: navigator.userAgentData.brands,
                                // @ts-expect-error internal browser code
                                platform: navigator.userAgentData.platform,
                                // @ts-expect-error internal browser code
                                mobile: navigator.userAgentData.mobile,
                            };
                        });
                        const { userAgentData: userAgentDataFp } = navigatorFp;
                        if (userAgentDataFp) {
                            expect(userAgentData.brands).toBeDefined();
                            expect(userAgentData.mobile).toBe(
                                userAgentDataFp.mobile,
                            );
                            expect(userAgentData.platform).toBe(
                                userAgentDataFp.platform,
                            );
                            expect(userAgentData.architecture).toBe(
                                userAgentDataFp.architecture,
                            );
                        }
                    }
                });

                test('should override window.screen', async () => {
                    const { screen: screenFp } = fingerprint as any;
                    const {
                        availHeight,
                        availWidth,
                        pixelDepth,
                        height,
                        width,
                        availTop,
                        availLeft,
                        colorDepth,
                    } = screenFp;
                    const screenObj = {
                        availHeight,
                        availWidth,
                        pixelDepth,
                        height,
                        width,
                        availTop,
                        availLeft,
                        colorDepth,
                    };

                    const screenProperties = Object.keys(screenObj);

                    for (const screenProperty of screenProperties) {
                        const browserValue = await page.evaluate(
                            (propName: string) => {
                                // @ts-expect-error internal browser code
                                return window.screen[propName];
                            },
                            screenProperty,
                        );

                        expect(browserValue).toBe(screenFp[screenProperty]);
                    }
                });

                test('should override screen props on window', async () => {
                    const { screen } = fingerprint as any;
                    const { outerHeight, outerWidth, devicePixelRatio } =
                        screen;
                    const screenObj = {
                        outerHeight,
                        outerWidth,
                        devicePixelRatio,
                    };

                    const screenProperties = Object.keys(screenObj);

                    for (const screenProperty of screenProperties) {
                        const propValue = screen[screenProperty];
                        // The 0 values are introduced by collecting in the hidden iframe.
                        // They are document sizes anyway so no need to test them or inject them.
                        if (propValue > 0) {
                            const browserValue = await page.evaluate(
                                (propName: keyof Window) => {
                                    return window[propName];
                                },
                                screenProperty,
                            );

                            expect(browserValue).toBe(screen[screenProperty]);
                        }
                    }
                });

                test('should override webGl', async () => {
                    fingerprint.videoCard ??= { vendor: null, renderer: null };
                    const {
                        videoCard: { vendor, renderer },
                    } = fingerprint;
                    const [browserVendor, browserRenderer] =
                        await page.evaluate(() => {
                            const canvas = document.createElement('canvas');
                            const webGl = canvas.getContext('webgl');
                            try {
                                const debugInfo = webGl.getExtension(
                                    'WEBGL_debug_renderer_info',
                                );
                                const loadedVendor = webGl.getParameter(
                                    debugInfo.UNMASKED_VENDOR_WEBGL,
                                );
                                const loadedRenderer = webGl.getParameter(
                                    debugInfo.UNMASKED_RENDERER_WEBGL,
                                );

                                return [loadedVendor, loadedRenderer];
                            } catch (e) {
                                return [null, null];
                            }
                        });

                    if (browserVendor === null || browserRenderer === null) {
                        // this can happen with headless browsers / systems without hardware graphical accelerators - e.g. CI
                        expect(browserVendor).toBeNull();
                        expect(browserRenderer).toBeNull();

                        return;
                    }

                    expect(browserVendor).toBe(vendor);
                    expect(browserRenderer).toBe(renderer);
                });

                test('should override codecs', async () => {
                    const { videoCodecs, audioCodecs } = fingerprint;

                    for (const [codec, canPlay] of Object.entries(
                        videoCodecs,
                    )) {
                        const canPlayBrowser = await page.evaluate(
                            (videoCodec: string) => {
                                const videoEl = document.createElement('video');
                                return videoEl.canPlayType(
                                    `video/${videoCodec}`,
                                );
                            },
                            codec,
                        );
                        expect(canPlay).toBe(canPlayBrowser);
                    }

                    for (const [codec, canPlay] of Object.entries(
                        audioCodecs,
                    )) {
                        const canPlayBrowser = await page.evaluate(
                            (audioCodec: string) => {
                                const audioEl = document.createElement('audio');
                                return audioEl.canPlayType(
                                    `audio/${audioCodec}`,
                                );
                            },
                            codec,
                        );
                        expect(canPlay).toBe(canPlayBrowser);
                    }
                });

                test('should override locales', async () => {
                    response = await page.goto(`https://crawlee.dev`);
                    const requestHeaders = response.request().headers();

                    expect(
                        requestHeaders['accept-language']?.includes('cs'),
                    ).toBe(true);

                    const {
                        navigator: { language },
                    } = fingerprint;

                    const intlLocale = await page.evaluate(async () => {
                        return new Intl.NumberFormat().resolvedOptions().locale;
                    });

                    expect(intlLocale).toBe(language);
                });

                test('should override other browser headers', async () => {
                    response = await page.goto(`https://crawlee.dev`);
                    const requestObject = await response.request();
                    const requestHeaders =
                        (await requestObject.allHeaders?.()) ??
                        requestObject.headers?.();
                    const { headers } = fingerprintWithHeaders;

                    // eslint-disable-next-line dot-notation
                    const onlyInjectable = new FingerprintInjector()[
                        'onlyInjectableHeaders'
                    ];

                    for (const header of Object.keys(onlyInjectable(headers))) {
                        expect(requestHeaders[header]).toBe(headers[header]);
                    }
                });

                test('highEntropyValues contain default values', async () => {
                    const result = await page.evaluate(() =>
                        // @ts-expect-error internal browser code
                        navigator.userAgentData?.getHighEntropyValues([]),
                    );

                    if (name === 'Chrome') {
                        expect(result).toHaveProperty('brands');
                        expect(result.brands).toBeInstanceOf(Array);
                        expect(result).toHaveProperty('mobile');
                        expect([true, false]).toContain(result.mobile);
                    } else if (name === 'Firefox') {
                        expect(result).toBeFalsy();
                    }
                });
            },
        );
    });

    // @ts-expect-error test only
    describe.each(cases)('%s', (frameworkName, testCases) => {
        // @ts-expect-error test only
        describe.each(testCases)(
            '$name',
            // @ts-expect-error test only
            ({ name, launcher, options, fingerprintGeneratorOptions }) => {
                const fpg = new FingerprintGenerator(
                    fingerprintGeneratorOptions,
                );

                const getNewPage = async (
                    browser: PPBrowser | PWBrowser,
                    fp: any,
                    newContextOptions = {},
                ): Promise<any> => {
                    if (frameworkName === 'Playwright') {
                        const context = await (browser as PWBrowser).newContext(
                            newContextOptions,
                        );
                        await fpInjector.attachFingerprintToPlaywright(
                            context,
                            fp,
                        );
                        return context.newPage();
                    }
                    if (frameworkName === 'Puppeteer') {
                        const page = await (browser as PPBrowser).newPage();
                        await fpInjector.attachFingerprintToPuppeteer(page, fp);
                        return page;
                    }
                    throw new Error(`Unknown framework name ${frameworkName}`);
                };

                test('injects actual HTTP headers (network-layer)', async () => {
                    const fp = fpg.getFingerprint();
                    const browser = await launcher.launch({ ...options });

                    const page = await getNewPage(browser, fp);

                    await page.goto(getHTTPBinUrl());
                    const response = await JSON.parse(
                        await page.$eval('pre', (el: any) => {
                            return el.textContent || '';
                        }),
                    );

                    const onlyInjectable = new FingerprintInjector()[
                        'onlyInjectableHeaders'
                    ];

                    for (const headerName of Object.keys(
                        onlyInjectable(fp.headers),
                    )) {
                        expect(
                            Object.entries(response.headers).find(
                                ([key]) =>
                                    key.toLowerCase() ===
                                    headerName.toLowerCase(),
                            )?.[1],
                        ).toBe(fp.headers[headerName]);
                    }
                });

                test('does not override user-defined headers', async () => {
                    // Puppeteer only supports setting HTTP headers on the page level,
                    // so user is the one responsible for not overriding the headers.
                    if (frameworkName === 'Puppeteer') return;

                    const fp = fpg.getFingerprint();
                    const browser = await launcher.launch({ ...options });

                    const page = await getNewPage(browser, fp, {
                        extraHTTPHeaders: {
                            'X-Test-Header': 'TestValue',
                            'User-Agent': 'CustomUserAgent/1.0',
                        },
                    });

                    await page.goto(getHTTPBinUrl());
                    const response = await JSON.parse(
                        await page.$eval('pre', (el: any) => {
                            return el.textContent || '';
                        }),
                    );

                    expect(response.headers['X-Test-Header']).toBe('TestValue');
                    expect(response.headers['User-Agent']).toBe(
                        'CustomUserAgent/1.0',
                    );
                });

                test('WebRTC not blocked by default', async () => {
                    const fp = fpg.getFingerprint();

                    const browser = await launcher.launch({ ...options });
                    const page = await getNewPage(browser, fp);

                    await page.goto('https://hide.me/en/webrtc-leak-test');
                    await setTimeout(5000);
                    const ok = await page.$('.o-pagecheck__alert--ok');
                    expect(ok).toBeFalsy();

                    browser.close();
                });

                test('WebRTC not blocked if `mockWebRTC: false`', async () => {
                    const fp = fpg.getFingerprint({
                        mockWebRTC: false,
                    });

                    const browser = await launcher.launch({
                        headless: false,
                        ...options,
                    });
                    const page = await getNewPage(browser, fp);

                    await page.goto('https://hide.me/en/webrtc-leak-test');
                    await setTimeout(5000);
                    const ok = await page.$('.o-pagecheck__alert--ok');
                    expect(ok).toBeFalsy();

                    browser.close();
                });

                test('WebRTC blocked if `mockWebRTC: true`', async () => {
                    const fp = fpg.getFingerprint({
                        mockWebRTC: true,
                    });

                    const browser = await launcher.launch({
                        headless: false,
                        ...options,
                    });
                    const page = await getNewPage(browser, fp);

                    await page.goto('https://hide.me/en/webrtc-leak-test');
                    await setTimeout(5000);
                    const ok = await page.$('.o-pagecheck__alert--ok');
                    expect(ok).toBeTruthy();

                    browser.close();
                });
            },
        );
    });

    describe('helpers', () => {
        test('Playwright helpers', async () => {
            const browser = await chromium.launch();
            const context = await newInjectedContext(browser, {
                fingerprintOptions: {
                    devices: ['mobile'],
                    operatingSystems: ['ios'],
                },
            });

            const page = await context.newPage();

            // test whether the injection worked
            const isApple = await page.evaluate(() => {
                const ua = navigator.userAgent.toLowerCase();
                return ['iphone', 'ipad', 'macintosh'].some((x) =>
                    ua.includes(x),
                );
            });

            const screenSize = await page.evaluate(() => {
                return { w: window.screen.width, h: window.screen.height };
            });

            expect(isApple).toBe(true);
            expect(screenSize.h).toBeGreaterThan(screenSize.w);

            await page.close();
            await context.close();
            await browser.close();
        });

        test('Puppeteer helpers', async () => {
            const browser = await puppeteer.launch();
            const page = await newInjectedPage(browser, {
                fingerprintOptions: {
                    devices: ['mobile'],
                    operatingSystems: ['ios'],
                },
            });

            // test whether the injection worked
            const isApple = await page.evaluate(() => {
                const ua = navigator.userAgent.toLowerCase();
                return ['iphone', 'ipad'].some((x) => ua.includes(x));
            });

            const screenSize = await page.evaluate(() => {
                return { w: window.screen.width, h: window.screen.height };
            });

            expect(isApple).toBe(true);
            expect(screenSize.h).toBeGreaterThan(screenSize.w);

            await page.close();
            await browser.close();
        });
    });
});
