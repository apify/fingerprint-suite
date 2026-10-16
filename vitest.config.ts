import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    oxc: {
        target: 'es2022',
        keepNames: true,
    },
    test: {
        globals: true,
        restoreMocks: true,
        testTimeout: 60_000,
        hookTimeout: 60_000,
    },
});
