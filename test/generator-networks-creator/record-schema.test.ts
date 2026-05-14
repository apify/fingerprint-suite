import { beforeEach, describe, expect, test, vi } from 'vitest';

import fetch from 'node-fetch';

import { getRecordSchema } from '../../packages/generator-networks-creator/src/record-schema';

vi.mock('node-fetch', () => ({
    default: vi.fn(),
}));

const createRecord = ({
    innerWidth,
    innerHeight,
    clientWidth,
    clientHeight,
}: {
    innerWidth: number;
    innerHeight: number;
    clientWidth: number;
    clientHeight: number;
}) => ({
    requestFingerprint: {
        headers: {
            'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        },
        httpVersion: '2.0',
    },
    browserFingerprint: {
        webdriver: false,
        appVersion: '5.0 (Windows)',
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
        oscpu: 'Win32',
        battery: {
            charging: true,
            chargingTime: 1800,
            dischargingTime: false,
            level: 0.72,
        },
        platform: 'Win32',
        doNotTrack: null,
        audioCodecs: {
            ogg: 'probably',
            mp3: 'probably',
            wav: 'probably',
            m4a: 'probably',
            aac: 'probably',
        },
        videoCodecs: {
            ogg: 'probably',
            h264: 'probably',
            webm: 'probably',
        },
        userAgentData: {
            brands: [{ brand: 'Not;A=Brand', version: '8' }],
            mobile: false,
            platform: 'macOS',
            architecture: 'x64',
            bitness: '64',
            model: '',
            platformVersion: '13.2.0',
            uaFullVersion: '100.0.4896.127',
            fullVersionList: [{ brand: 'Not;A=Brand', version: '8' }],
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
            vendor: 'Intel',
            renderer:
                'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics, OpenGL 4.1)',
        },
        fonts: [],
        screen: {
            availTop: 24,
            availLeft: 0,
            pageXOffset: 0,
            pageYOffset: 0,
            screenX: 0,
            hasHDR: false,
            width: 1440,
            height: 900,
            availWidth: 1400,
            availHeight: 860,
            clientWidth,
            clientHeight,
            innerWidth,
            innerHeight,
            outerWidth: 1400,
            outerHeight: 860,
            colorDepth: 24,
            pixelDepth: 24,
            devicePixelRatio: 1.25,
        },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    },
});

beforeEach(() => {
    vi.mocked(fetch).mockResolvedValue({
        json: async () => [],
    } as never);
});

describe('Record schema validation', () => {
    test('rejects zero inner/client screen dimensions', async () => {
        const recordSchema = await getRecordSchema();
        const record = createRecord({
            innerWidth: 0,
            innerHeight: 0,
            clientWidth: 0,
            clientHeight: 0,
        });

        const result = recordSchema.safeParse(record);

        expect(result.success).toBe(false);
    });

    test('accepts positive inner/client screen dimensions', async () => {
        const recordSchema = await getRecordSchema();
        const record = createRecord({
            innerWidth: 1200,
            innerHeight: 768,
            clientWidth: 1200,
            clientHeight: 768,
        });

        const result = recordSchema.safeParse(record);

        expect(result.success).toBe(true);
    });
});
