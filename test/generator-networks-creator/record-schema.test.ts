import { describe, expect, test } from 'vitest';

import { getRecordSchema } from '../../packages/generator-networks-creator/src/record-schema';

type ScreenOverrides = Partial<{
    innerWidth: number;
    innerHeight: number;
    clientWidth: number;
    clientHeight: number;
}>;

const buildRecord = (screen: ScreenOverrides = {}) => ({
    requestFingerprint: {
        headers: {
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        httpVersion: '2.0',
    },
    browserFingerprint: {
        webdriver: false,
        appVersion:
            '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        hardwareConcurrency: 8,
        multimediaDevices: { speakers: [], micros: [], webcams: [] },
        extraProperties: {},
        plugins: [],
        mimeTypes: [],
        deviceMemory: 8,
        oscpu: null,
        battery: {
            charging: true,
            chargingTime: 1800,
            dischargingTime: false,
            level: 0.72,
        },
        platform: 'MacIntel',
        doNotTrack: null,
        audioCodecs: {
            ogg: 'probably',
            mp3: 'probably',
            wav: 'probably',
            m4a: 'maybe',
            aac: 'probably',
        },
        videoCodecs: { ogg: 'probably', h264: 'probably', webm: 'probably' },
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
            vendor: 'Google Inc. (Apple)',
            renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)',
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
            clientWidth: 1380,
            clientHeight: 760,
            innerWidth: 1380,
            innerHeight: 760,
            outerWidth: 1440,
            outerHeight: 858,
            colorDepth: 24,
            pixelDepth: 24,
            devicePixelRatio: 2,
            ...screen,
        },
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
});

describe('Record schema — viewport invariants', () => {
    test('accepts a coherent desktop record', async () => {
        const schema = await getRecordSchema();
        const result = schema.safeParse(buildRecord());
        expect(result.success).toBe(true);
    });

    test('rejects zero innerWidth / innerHeight', async () => {
        const schema = await getRecordSchema();
        const result = schema.safeParse(
            buildRecord({ innerWidth: 0, innerHeight: 0 }),
        );
        expect(result.success).toBe(false);
    });

    test('rejects zero clientWidth / clientHeight', async () => {
        const schema = await getRecordSchema();
        const result = schema.safeParse(
            buildRecord({ clientWidth: 0, clientHeight: 0 }),
        );
        expect(result.success).toBe(false);
    });

    test('rejects clientWidth larger than innerWidth (DOM-spec invariant)', async () => {
        const schema = await getRecordSchema();
        const result = schema.safeParse(
            buildRecord({ clientWidth: 1500, innerWidth: 1380 }),
        );
        expect(result.success).toBe(false);
    });

    test('rejects clientHeight larger than innerHeight (DOM-spec invariant)', async () => {
        const schema = await getRecordSchema();
        const result = schema.safeParse(
            buildRecord({ clientHeight: 900, innerHeight: 760 }),
        );
        expect(result.success).toBe(false);
    });
});
