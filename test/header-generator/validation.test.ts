import { FingerprintGenerator } from 'fingerprint-generator';
import {
    ArgumentValidationError,
    HeaderGenerator,
    headerGeneratorOptionsSchema,
} from 'header-generator';
import type { HeaderGeneratorOptions } from 'header-generator';
import { describe, expect, expectTypeOf, test } from 'vitest';
import type { z } from 'zod';

describe('Options validation', () => {
    const headerGenerator = new HeaderGenerator();

    test('accepts valid options in the constructor and in getHeaders', () => {
        const options: Partial<HeaderGeneratorOptions> = {
            browsers: ['chrome', { name: 'firefox', minVersion: 100 }],
            operatingSystems: ['windows', 'linux'],
            devices: ['desktop'],
            locales: ['en-US', 'cs'],
            httpVersion: '2',
            strict: false,
        };

        expect(() => new HeaderGenerator(options)).not.toThrow();
        expect(() => headerGenerator.getHeaders(options)).not.toThrow();
    });

    test('keys outside of the schema are allowed', () => {
        expect(
            () => new HeaderGenerator({ unknownKey: 'x' } as any),
        ).not.toThrow();
        expect(
            () =>
                new FingerprintGenerator({
                    screen: { minWidth: 100 },
                    mockWebRTC: true,
                    slim: true,
                }),
        ).not.toThrow();
    });

    test('`Infinity` is a valid version bound, `NaN` is not', () => {
        expect(() =>
            headerGenerator.getHeaders({
                browsers: [
                    { name: 'chrome', minVersion: 1, maxVersion: Infinity },
                ],
            }),
        ).not.toThrow();
        expect(
            () =>
                new HeaderGenerator({
                    browsers: [{ name: 'chrome', minVersion: NaN }],
                }),
        ).toThrow(ArgumentValidationError);
    });

    test.each([
        ['an unknown browser name', { browsers: ['netscape'] }],
        [
            'a browser specification with unknown keys',
            { browsers: [{ name: 'chrome', foo: 1 }] },
        ],
        [
            'a browser specification without a name',
            { browsers: [{ minVersion: 1 }] },
        ],
        ['browsers that are not an array', { browsers: 'chrome' }],
        ['an unknown operating system', { operatingSystems: ['beos'] }],
        ['an unknown device', { devices: ['tablet'] }],
        ['locales of the wrong type', { locales: [1] }],
        ['an unsupported HTTP version', { httpVersion: '3' }],
        ['a numeric HTTP version', { httpVersion: 2 }],
        ['a non-string browser list query', { browserListQuery: 5 }],
        ['a non-boolean `strict`', { strict: 'yes' }],
        ['options that are not an object', 'chrome'],
        ['`null` options', null],
    ])('rejects %s', (_, options) => {
        expect(() => new HeaderGenerator(options as any)).toThrow(
            ArgumentValidationError,
        );
        expect(() => headerGenerator.getHeaders(options as any)).toThrow(
            ArgumentValidationError,
        );
        expect(() => new FingerprintGenerator(options as any)).toThrow(
            ArgumentValidationError,
        );
    });

    test('`undefined` values are allowed', () => {
        expect(() =>
            headerGenerator.getHeaders({
                operatingSystems: undefined,
                locales: undefined,
                browsers: undefined,
            }),
        ).not.toThrow();
    });

    test('the error names the field and the received value, and exposes the zod issues', () => {
        let error: unknown;
        try {
            // eslint-disable-next-line no-new
            new HeaderGenerator({
                operatingSystems: ['beos'],
                strict: 'yes',
            } as any);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(ArgumentValidationError);
        const { message, issues } = error as ArgumentValidationError;
        expect(message).toContain('`operatingSystems[0]`');
        expect(message).toContain('`beos`');
        expect(message).toContain('`strict`');
        expect(message).toContain('in `HeaderGeneratorOptions`');
        expect(issues.map(({ path }) => path.join('.'))).toEqual(
            expect.arrayContaining(['operatingSystems.0', 'strict']),
        );
    });

    test('the schema accepts everything `HeaderGeneratorOptions` allows', () => {
        expectTypeOf<Partial<HeaderGeneratorOptions>>().toExtend<
            z.input<typeof headerGeneratorOptionsSchema>
        >();
    });
});
