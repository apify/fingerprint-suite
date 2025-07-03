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
