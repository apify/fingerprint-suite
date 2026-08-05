import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HeaderGenerator } from 'header-generator';

import { describe, expect, test } from 'vitest';

/**
 * Guards the *committed* model against the class of breakage reported in
 * https://github.com/apify/fingerprint-suite/issues/564, where an automated model
 * update shipped a model covering only stale browser versions. Every existing test
 * passed, because none of them asserted that the model can still satisfy the
 * browserslist queries users actually write.
 *
 * `scripts/verify-model.ts` runs the equivalent checks at model-build time; these
 * tests keep the invariant enforced for every change to the repository.
 */
describe('committed model sanity', () => {
    const helperFile = JSON.parse(
        readFileSync(
            join(
                __dirname,
                '../../packages/header-generator/src/data_files/browser-helper-file.json',
            ),
            { encoding: 'utf8' },
        ),
    ) as string[];

    const browsers = ['chrome', 'firefox', 'safari', 'edge'] as const;

    test.each(browsers)(
        "generates headers for 'last 5 %s versions'",
        (browser) => {
            const generator = new HeaderGenerator({
                browserListQuery: `last 5 ${browser} versions`,
            });

            // A throw here means the model's newest versions no longer overlap the
            // last 5 releases browserslist knows about: either the model is stale
            // (regenerate it) or caniuse-lite has moved well ahead of it.
            expect(() => generator.getHeaders()).not.toThrow();
        },
    );

    test.each(browsers)('generates headers for browser %s', (browser) => {
        expect(() =>
            new HeaderGenerator({ browsers: [browser] }).getHeaders(),
        ).not.toThrow();
    });

    test("generates headers for 'last 2 versions'", () => {
        expect(() =>
            new HeaderGenerator({
                browserListQuery: 'last 2 versions',
            }).getHeaders(),
        ).not.toThrow();
    });

    test('covers every supported browser', () => {
        for (const browser of browsers) {
            expect(
                helperFile.some((entry) => entry.startsWith(`${browser}/`)),
            ).toBe(true);
        }
    });

    test('contains no engine build numbers masquerading as browser versions', () => {
        // `Safari/605.1.15` is a WebKit build, not a Safari version. Entries like
        // `safari/605.1` mean the User-Agent parser fell through to the wrong token.
        const implausible = helperFile.filter((entry) => {
            const [browserVersion] = entry.split('|');
            const separator = browserVersion.lastIndexOf('/');
            if (separator === -1) return true;

            const major = Number.parseInt(
                browserVersion.slice(separator + 1),
                10,
            );
            return !Number.isFinite(major) || major > 300;
        });

        expect(implausible).toEqual([]);
    });
});
