import { describe, expect, test } from 'vitest';

import {
    hasZeroViewportDimensions,
    normalizeCollectedScreenViewport,
    normalizeFingerprintRecordScreenViewport,
} from '../../packages/generator-networks-creator/src/screen-viewport';

describe('Collected screen viewport normalization', () => {
    test('repairs zero viewport dimensions from surrounding screen values', () => {
        const screen = normalizeCollectedScreenViewport({
            width: 1440,
            height: 900,
            availWidth: 1440,
            availHeight: 875,
            outerWidth: 1284,
            outerHeight: 858,
            innerWidth: 0,
            innerHeight: 0,
            clientWidth: 0,
            clientHeight: 0,
        });

        expect(screen).toMatchObject({
            innerWidth: 1284,
            innerHeight: 858,
            clientWidth: 1284,
            clientHeight: 858,
        });
        expect(hasZeroViewportDimensions(screen)).toBe(false);
    });

    test('keeps collected positive viewport dimensions unchanged', () => {
        const screen = normalizeCollectedScreenViewport({
            width: 1440,
            height: 900,
            availWidth: 1440,
            availHeight: 875,
            outerWidth: 1284,
            outerHeight: 858,
            innerWidth: 1284,
            innerHeight: 769,
            clientWidth: 1269,
            clientHeight: 754,
        });

        expect(screen).toMatchObject({
            innerWidth: 1284,
            innerHeight: 769,
            clientWidth: 1269,
            clientHeight: 754,
        });
    });

    test('repairs only the browser fingerprint screen on a dataset record', () => {
        const requestFingerprint = {
            headers: { 'user-agent': 'example' },
            httpVersion: '2',
        };
        const record = normalizeFingerprintRecordScreenViewport({
            requestFingerprint,
            browserFingerprint: {
                screen: {
                    width: 1440,
                    height: 900,
                    availWidth: 1440,
                    availHeight: 875,
                    outerWidth: 1284,
                    outerHeight: 858,
                    innerWidth: 0,
                    innerHeight: 0,
                    clientWidth: 0,
                    clientHeight: 0,
                },
            },
        });

        expect(record.requestFingerprint).toBe(requestFingerprint);
        expect(record.browserFingerprint.screen).toMatchObject({
            innerWidth: 1284,
            innerHeight: 858,
            clientWidth: 1284,
            clientHeight: 858,
        });
    });
});
