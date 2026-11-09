// @ts-ignore
import { defineConfig } from 'vitest/config';
import { join } from 'node:path';

let threads: { minThreads: number; maxThreads: number } | undefined;

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        restoreMocks: true,
        ...threads,
        testTimeout: 60_000,
        hookTimeout: 60_000,
        alias: {
            'header-generator/src/utils': join(
                __dirname,
                'packages/header-generator/src/utils.ts',
            ),
        },
    },
});
