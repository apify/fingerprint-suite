import { FingerprintGenerator, PRESETS } from 'fingerprint-generator';
import { HeaderGeneratorOptions } from 'header-generator';

import { describe, expect, test } from 'vitest';

describe('Generation tests', () => {
    const fingerprintGenerator = new FingerprintGenerator();
    test('Basic functionality', () => {
        const { fingerprint } = fingerprintGenerator.getFingerprint({
            locales: ['en', 'es', 'en-US'],
            browsers: ['chrome'],
            devices: ['desktop'],
        });
        expect(fingerprint.navigator.userAgent).toContain('Chrome');
    });

    test('undefined options do not throw', () => {
        const fp = fingerprintGenerator.getHeaders({
            operatingSystems: undefined,
            locales: undefined,
        });

        expect(fp).toBeDefined();
    });

    test('Works with presets', () => {
        const presets = Object.values(PRESETS);
        for (const preset of presets) {
            const { fingerprint } = fingerprintGenerator.getFingerprint({
                ...preset,
            } as Partial<HeaderGeneratorOptions>);
            expect(fingerprint).toBeDefined();
        }
    });

    test('Generates fingerprints without errors', () => {
        for (let x = 0; x < 1000; x++) {
            const { fingerprint } = fingerprintGenerator.getFingerprint({
                locales: ['en', 'es', 'en-US'],
            });

            expect(typeof fingerprint).toBe('object');
        }
    });

    test('Generates fingerprints with correct languages', () => {
        const locales = ['en', 'de', 'en-GB'];
        const { fingerprint } = fingerprintGenerator.getFingerprint({
            locales,
        });

        const fingerprintLanguages = fingerprint.navigator.languages;
        expect(fingerprintLanguages.sort()).toEqual(locales.sort());
    });

    test('Generated fingerprint and headers match', () => {
        const { fingerprint, headers } = fingerprintGenerator.getFingerprint({
            locales: ['en', 'de', 'en-GB'],
        });

        const headersUserAgent = headers['User-Agent'] ?? headers['user-agent'];
        expect(
            headersUserAgent === fingerprint.navigator.userAgent,
        ).toBeTruthy();
    });

    test('Transforms schema', () => {
        const {
            fingerprint: { screen, navigator },
        } = fingerprintGenerator.getFingerprint();

        const fields = [
            screen.width,
            screen.height,
            screen.availHeight,
            screen.availWidth,
            screen.pixelDepth,
            navigator.language,
            navigator.languages,
            navigator.hardwareConcurrency,
        ];

        for (const field of fields) {
            expect(field).toBeDefined();
        }
    });

    test('Normalizes zero viewport dimensions', () => {
        const transformed = (fingerprintGenerator as any).transformFingerprint({
            screen: {
                availHeight: 875,
                availWidth: 1440,
                availTop: 25,
                availLeft: 0,
                colorDepth: 24,
                height: 900,
                pixelDepth: 24,
                width: 1440,
                devicePixelRatio: 2,
                pageXOffset: 0,
                pageYOffset: 0,
                innerHeight: 0,
                outerHeight: 858,
                outerWidth: 1284,
                innerWidth: 0,
                screenX: 0,
                clientWidth: 0,
                clientHeight: 0,
                hasHDR: false,
            },
            navigator: {
                userAgent:
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
                userAgentData: {
                    brands: [],
                    mobile: false,
                    platform: 'MacOS',
                    architecture: '',
                    bitness: '',
                    fullVersionList: [],
                    model: '',
                    platformVersion: '',
                    uaFullVersion: '',
                },
                doNotTrack: '1',
                appCodeName: 'Mozilla',
                appName: 'Netscape',
                appVersion: '5.0',
                oscpu: '',
                webdriver: 'false',
                language: 'en-US',
                languages: ['en-US'],
                platform: 'MacIntel',
                deviceMemory: 8,
                hardwareConcurrency: '8',
                product: 'Gecko',
                productSub: '20030107',
                vendor: 'Google Inc.',
                vendorSub: '',
                maxTouchPoints: '0',
                extraProperties: {
                    vendorFlavors: [],
                    isBluetoothSupported: false,
                    globalPrivacyControl: null,
                    pdfViewerEnabled: true,
                    installedApps: [],
                },
            },
            languages: ['en-US'],
            videoCodecs: {},
            audioCodecs: {},
            pluginsData: {},
            battery: null,
            videoCard: { vendor: '', renderer: '' },
            multimediaDevices: [],
            fonts: [],
        });

        expect(transformed.screen.innerWidth).toBeGreaterThan(0);
        expect(transformed.screen.innerHeight).toBeGreaterThan(0);
        expect(transformed.screen.clientWidth).toBeGreaterThan(0);
        expect(transformed.screen.clientHeight).toBeGreaterThan(0);
        expect(transformed.screen.clientWidth).toBe(
            transformed.screen.innerWidth,
        );
        expect(transformed.screen.clientHeight).toBe(
            transformed.screen.innerHeight,
        );
    });
});

describe('Generate fingerprints with basic constraints', () => {
    test('Browsers', () => {
        const fingerprintGenerator = new FingerprintGenerator();
        const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const;

        for (const browser of browsers) {
            expect(
                fingerprintGenerator.getFingerprint({
                    browsers: [browser as any],
                }),
            ).toBeDefined();
        }
    });

    test('Mobile devices', () => {
        const fingerprintGenerator = new FingerprintGenerator();
        const oses = ['android', 'ios'] as const;

        for (const os of oses) {
            expect(
                fingerprintGenerator.getFingerprint({
                    devices: ['mobile'],
                    operatingSystems: [os],
                }),
            ).toBeDefined();
        }
    });

    test('Screen sizes', () => {
        const fingerprintGenerator = new FingerprintGenerator();

        expect(
            fingerprintGenerator.getFingerprint({
                screen: {
                    minHeight: 1080,
                    minWidth: 1920,
                },
            }),
        ).toBeDefined();

        expect(
            fingerprintGenerator.getFingerprint({
                devices: ['mobile'],
                screen: {
                    // can generate a vertical screen
                    minHeight: 500,
                    maxWidth: 500,
                },
            }),
        ).toBeDefined();
    });

    test('[relaxation] header strict mode propagates', () => {
        const fingerprintGenerator = new FingerprintGenerator();

        expect(
            fingerprintGenerator.getFingerprint({
                devices: ['mobile'],
                operatingSystems: ['windows'],
            }),
        ).toBeDefined();

        expect(() =>
            fingerprintGenerator.getFingerprint({
                devices: ['mobile'],
                operatingSystems: ['windows'],
                strict: true,
            }),
        ).toThrow();
    });

    test.skip('[relaxation] strict mode works with fp-only features', () => {
        const fingerprintGenerator = new FingerprintGenerator();

        expect(
            fingerprintGenerator.getFingerprint({
                screen: {
                    minHeight: 9999,
                },
            }),
        ).toBeDefined();

        expect(() =>
            fingerprintGenerator.getFingerprint({
                screen: {
                    minHeight: 9999,
                },
                strict: true,
            }),
        ).toThrow();
    });
});
