import { GeneratorNetworksCreator } from 'generator-networks-creator';

import { describe, expect, test } from 'vitest';

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
