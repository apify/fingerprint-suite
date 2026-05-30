import { getRecordSchema } from '../../packages/generator-networks-creator/src/record-schema';

import { describe, expect, test, vi } from 'vitest';

vi.mock('node-fetch', () => ({
    default: vi.fn(async () => ({
        json: async () => [],
    })),
}));

const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';

function createRecord() {
    return {
        requestFingerprint: {
            headers: {
                'user-agent': userAgent,
            },
            httpVersion: '2',
        },
        browserFingerprint: {
            appVersion: userAgent.replace('Mozilla/', ''),
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
                ogg: '',
                h264: 'probably',
                webm: 'probably',
            },
            language: 'en-US',
            languages: ['en-US', 'en'],
            product: 'Gecko',
            appName: 'Netscape',
            appCodeName: 'Mozilla',
            maxTouchPoints: 0,
            productSub: '20030107',
            vendor: 'Google Inc.',
            vendorSub: '',
            videoCard: {
                vendor: 'Google Inc. (ATI Technologies Inc.)',
                renderer:
                    'ANGLE (ATI Technologies Inc., AMD Radeon Pro 455 OpenGL Engine, OpenGL 4.1)',
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
                clientHeight: 773,
                innerWidth: 1284,
                innerHeight: 773,
                outerWidth: 1284,
                outerHeight: 858,
                colorDepth: 24,
                pixelDepth: 24,
                devicePixelRatio: 2,
            },
            userAgent,
        },
    };
}

describe('Record schema screen validation', () => {
    test('rejects zero viewport and client dimensions', async () => {
        const recordSchema = await getRecordSchema();

        for (const property of [
            'clientWidth',
            'clientHeight',
            'innerWidth',
            'innerHeight',
        ] as const) {
            const record = createRecord();
            record.browserFingerprint.screen[property] = 0;

            expect(recordSchema.safeParse(record).success).toBe(false);
        }
    });

    test('keeps zero offsets valid', async () => {
        const recordSchema = await getRecordSchema();

        const record = createRecord();

        expect(record.browserFingerprint.screen.availLeft).toBe(0);
        expect(record.browserFingerprint.screen.pageXOffset).toBe(0);
        expect(record.browserFingerprint.screen.pageYOffset).toBe(0);
        expect(record.browserFingerprint.screen.screenX).toBe(0);
        expect(recordSchema.safeParse(record).success).toBe(true);
    });
});
