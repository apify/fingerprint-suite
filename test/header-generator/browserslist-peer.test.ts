import type * as NodeModule from 'node:module';

import { HeaderGenerator, PRESETS } from 'header-generator';
import { describe, expect, test, vi } from 'vitest';

// Simulates an installation without the optional `browserslist` peer dependency.
vi.mock('node:module', async (importOriginal) => {
    const actual = await importOriginal<typeof NodeModule>();

    return {
        ...actual,
        createRequire: (...args: Parameters<typeof actual.createRequire>) => {
            const realRequire = actual.createRequire(...args);

            return Object.assign((id: string) => {
                if (id === 'browserslist') {
                    throw Object.assign(new Error("Cannot find module 'browserslist'"), { code: 'MODULE_NOT_FOUND' });
                }

                return realRequire(id);
            }, realRequire);
        },
    };
});

describe('Without the optional `browserslist` peer dependency', () => {
    test('generating headers works without a `browserListQuery`', () => {
        const generator = new HeaderGenerator({ browsers: ['chrome'] });

        expect(generator.getHeaders()).toBeDefined();
    });

    test.each([
        ['the constructor', () => new HeaderGenerator({ browserListQuery: 'last 5 versions' })],
        [
            'getHeaders()',
            () =>
                new HeaderGenerator().getHeaders({
                    browserListQuery: 'last 5 versions',
                }),
        ],
        ['a preset', () => new HeaderGenerator(PRESETS.MODERN_DESKTOP)],
    ])('%s points to the missing package', (_, act) => {
        expect(act).toThrow(/optional peer dependency of `header-generator`.*npm install browserslist/);
    });
});
