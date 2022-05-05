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
        expect(fingerprint.navigator.userAgent.includes('Chrome')).toBe(true);
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
        const { fingerprint } = fingerprintGenerator.getFingerprint({
            locales: ['en', 'de', 'en-GB'],
        });

        const fingerprintLanguages = fingerprint.navigator.languages;
        expect(fingerprintLanguages.length).toBe(3);
        expect(fingerprintLanguages.includes('en')).toBeTruthy();
        expect(fingerprintLanguages.includes('de')).toBeTruthy();
        expect(fingerprintLanguages.includes('en-GB')).toBeTruthy();
    });

    test('Generated fingerprint and headers match', () => {
        const { fingerprint, headers } = fingerprintGenerator.getFingerprint({
            locales: ['en', 'de', 'en-GB'],
        });

        const headersUserAgent = 'User-Agent' in headers ? headers['User-Agent'] : headers['user-agent'];
        expect(headersUserAgent === fingerprint.navigator.userAgent).toBeTruthy();
    });

    test('Transforms schema', () => {
        const { fingerprint } = fingerprintGenerator.getFingerprint();

        expect(fingerprint.screen.width).toBeDefined();
        expect(fingerprint.screen.height).toBeDefined();
        expect(fingerprint.screen.availHeight).toBeDefined();
        expect(fingerprint.screen.availWidth).toBeDefined();
        expect(fingerprint.screen.pixelDepth).toBeDefined();

        expect(fingerprint.navigator.language).toBeDefined();
        expect(fingerprint.navigator.languages).toBeDefined();
        expect(fingerprint.navigator.hardwareConcurrency).toBeDefined();
    });
});
