// @ts-ignore
import { defineConfig } from 'vitest/config';

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
    },
});
