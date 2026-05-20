import { describe, expect, test, vi } from 'vitest';

import { getRecordSchema } from '../../packages/generator-networks-creator/src/record-schema';

vi.mock('node-fetch', () => ({
    default: vi.fn(async () => ({
        json: async () => [],
    })),
}));

const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';

function createValidRecord() {
    return {
        requestFingerprint: {
            headers: {
                'user-agent': userAgent,
            },
            httpVersion: '2',
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
                vendor: 'Google Inc. (Intel)',
                renderer:
                    'ANGLE (Intel Inc., Intel(R) HD Graphics 630 OpenGL Engine)',
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
                clientHeight: 769,
                innerWidth: 1284,
                innerHeight: 769,
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

function withScreenValues(screen: Record<string, number>) {
    const record = createValidRecord();
    record.browserFingerprint.screen = {
        ...record.browserFingerprint.screen,
        ...screen,
    };
    return record;
}

describe('Record schema', () => {
    test('accepts browser records with non-zero viewport dimensions', async () => {
        const schema = await getRecordSchema();

        expect(schema.safeParse(createValidRecord()).success).toBe(true);
    });

    test('normalizes zero viewport dimensions before validation', async () => {
        const schema = await getRecordSchema();
        const result = schema.safeParse(
            withScreenValues({
                clientWidth: 0,
                clientHeight: 0,
                innerWidth: 0,
                innerHeight: 0,
            }),
        );

        expect(result.success).toBe(true);

        if (result.success) {
            expect(
                result.data.browserFingerprint.screen.innerWidth,
            ).toBeGreaterThan(0);
            expect(
                result.data.browserFingerprint.screen.innerHeight,
            ).toBeGreaterThan(0);
            expect(result.data.browserFingerprint.screen.clientWidth).toBe(
                result.data.browserFingerprint.screen.innerWidth,
            );
            expect(result.data.browserFingerprint.screen.clientHeight).toBe(
                result.data.browserFingerprint.screen.innerHeight,
            );
        }
    });

    test.each(['clientWidth', 'clientHeight', 'innerWidth', 'innerHeight'])(
        'rejects unfixable zero %s',
        async (dimension) => {
            const schema = await getRecordSchema();

            expect(
                schema.safeParse(
                    withScreenValues({
                        outerWidth: 0,
                        outerHeight: 0,
                        width: 0,
                        height: 0,
                        availHeight: 0,
                        [dimension]: 0,
                    }),
                ).success,
            ).toBe(false);
        },
    );
});
