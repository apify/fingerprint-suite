import { GeneratorNetworksCreator } from 'generator-networks-creator';

import { describe, expect, test, vi } from 'vitest';

import { getRecordSchema } from '../../packages/generator-networks-creator/src/record-schema';

vi.mock('node-fetch', () => ({
    default: vi.fn(async () => ({ json: async () => [] })),
}));

describe('Processing browser data', () => {
    const networkGenerator = new GeneratorNetworksCreator();

    const cases = [
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 5.1; rv:99.0) Gecko/20100101 Firefox/99.0',
            expectedBrowser: 'firefox/99.0',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0 Trailer/92.3.2312.13',
            expectedBrowser: 'firefox/99.0',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
            expectedBrowser: 'firefox/113.0',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:109.0) Gecko/20100101 Firefox/113.0',
            expectedBrowser: 'firefox/113.0',
            expectedOS: 'linux',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 EdgiOS/113.0.1774.50 Mobile/15E148 Safari/605.1.15',
            expectedBrowser: 'edge/113.0.1774.50',
            expectedOS: 'ios',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (Linux; Android 10; ONEPLUS A6003) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.57 Mobile Safari/537.36 EdgA/113.0.1774.63',
            expectedBrowser: 'edge/113.0.1774.63',
            expectedOS: 'android',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/113.0.1774.57',
            expectedBrowser: 'edge/113.0.1774.57',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows Mobile 10; Android 10.0; Microsoft; Lumia 950XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 Edge/40.15254.603',
            expectedBrowser: 'edge/40.15254.603',
            expectedOS: 'android',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            expectedBrowser: 'chrome/114.0.0.0',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            expectedBrowser: 'chrome/114.0.0.0',
            expectedOS: 'macos',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            expectedBrowser: 'chrome/114.0.0.0',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.57 Mobile Safari/537.36',
            expectedBrowser: 'chrome/114.0.5735.57',
            expectedOS: 'android',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
            expectedBrowser: 'chrome/114.0.5735.99',
            expectedOS: 'ios',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            expectedBrowser: 'safari/16.5',
            expectedOS: 'ios',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            expectedBrowser: 'safari/16.5',
            expectedOS: 'ios',
            expectedDeviceType: 'mobile',
        },
        {
            userAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
            expectedBrowser: 'safari/16.5',
            expectedOS: 'macos',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2500 Yowser/2.5 Safari/537.36',
            expectedBrowser: '*MISSING_VALUE*',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1145 Yowser/2.5 Safari/537.36',
            expectedBrowser: '*MISSING_VALUE*',
            expectedOS: 'macos',
            expectedDeviceType: 'desktop',
        },
        {
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Vivaldi/6.0.2979.18',
            expectedBrowser: '*MISSING_VALUE*',
            expectedOS: 'windows',
            expectedDeviceType: 'desktop',
        },
    ];

    test('Extracts browser name/version from User-Agent', () => {
        for (const testCase of cases) {
            const browser = networkGenerator['getBrowserNameVersion'](
                testCase.userAgent,
            );
            expect(browser).toBe(testCase.expectedBrowser);
        }
    });

    test('Extracts operating system from User-Agent', () => {
        for (const testCase of cases) {
            const os = networkGenerator['getDeviceOS'](
                testCase.userAgent,
            ).operatingSystem;
            expect(os).toBe(testCase.expectedOS);
        }
    });

    test('Extracts device type from User-Agent', () => {
        for (const testCase of cases) {
            const deviceType = networkGenerator['getDeviceOS'](
                testCase.userAgent,
            ).device;
            expect(deviceType).toBe(testCase.expectedDeviceType);
        }
    });
});

describe('Browser fingerprint record schema', () => {
    const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';

    const createRecord = () => ({
        requestFingerprint: {
            httpVersion: '2',
            headers: {
                'user-agent': userAgent,
                'accept-language': 'en-US',
            },
        },
        browserFingerprint: {
            webdriver: false,
            appVersion: userAgent,
            hardwareConcurrency: 8,
            multimediaDevices: {
                speakers: [],
                micros: [],
                webcams: [],
            },
            extraProperties: {},
            plugins: [],
            mimeTypes: [],
            deviceMemory: 8,
            oscpu: null,
            battery: null,
            platform: 'MacIntel',
            doNotTrack: null,
            audioCodecs: {
                ogg: 'probably',
                mp3: 'probably',
                wav: 'probably',
                m4a: 'maybe',
                aac: 'probably',
            },
            videoCodecs: {
                ogg: 'probably',
                h264: 'probably',
                webm: 'probably',
            },
            userAgentData: {
                brands: [
                    { brand: 'Chromium', version: '100' },
                    { brand: 'Google Chrome', version: '100' },
                ],
                mobile: false,
                platform: 'macOS',
            },
            language: 'en-US',
            languages: ['en-US'],
            product: 'Gecko',
            appName: 'Netscape',
            appCodeName: 'Mozilla',
            maxTouchPoints: 0,
            productSub: '20030107',
            vendor: 'Google Inc.',
            vendorSub: '',
            videoCard: {
                renderer:
                    'ANGLE (ATI Technologies Inc., AMD Radeon Pro 455 OpenGL Engine, OpenGL 4.1)',
                vendor: 'Google Inc. (ATI Technologies Inc.)',
            },
            fonts: [],
            screen: {
                availTop: 25,
                availLeft: 0,
                pageXOffset: 0,
                pageYOffset: 0,
                screenX: 0,
                hasHDR: false,
                width: 1440,
                height: 900,
                availWidth: 1440,
                availHeight: 875,
                clientWidth: 1284,
                clientHeight: 858,
                innerWidth: 1284,
                innerHeight: 858,
                outerWidth: 1284,
                outerHeight: 858,
                colorDepth: 24,
                pixelDepth: 24,
                devicePixelRatio: 2,
            },
            userAgent,
        },
    });

    test('accepts records with non-zero viewport dimensions', async () => {
        const recordSchema = await getRecordSchema();

        expect(recordSchema.safeParse(createRecord()).success).toBe(true);
    });

    test.each(['clientWidth', 'clientHeight', 'innerWidth', 'innerHeight'])(
        'rejects zero %s in screen records',
        async (screenProperty) => {
            const recordSchema = await getRecordSchema();
            const record = createRecord();
            record.browserFingerprint.screen[
                screenProperty as keyof typeof record.browserFingerprint.screen
            ] = 0 as never;

            expect(recordSchema.safeParse(record).success).toBe(false);
        },
    );
});
