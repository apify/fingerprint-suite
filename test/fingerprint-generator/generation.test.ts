import { HeaderGeneratorOptions } from 'header-generator';
import { FingerprintGenerator, PRESETS } from 'fingerprint-generator';

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

    test('Works with presets', () => {
        const presets = Object.values(PRESETS);
        for (const preset of presets) {
            const { fingerprint } = fingerprintGenerator.getFingerprint({ ...preset } as Partial<HeaderGeneratorOptions>);
            expect(fingerprint).toBeDefined();
        }
    });

    test('Generates fingerprints without errors', () => {
        for (let x = 0; x < 10000; x++) {
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
        expect(headersUserAgent === fingerprint.navigator.userAgent).toBeTruthy();
    });

    test('Transforms schema', () => {
        const { fingerprint: { screen, navigator } } = fingerprintGenerator.getFingerprint();

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
