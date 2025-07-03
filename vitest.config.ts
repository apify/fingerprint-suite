// @ts-ignore
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

let threads: { minThreads: number; maxThreads: number } | undefined;

export default defineConfig({
    plugins: [tsconfigPaths()],
    esbuild: {
        target: 'es2022',
        keepNames: true,
    },
    test: {
        globals: true,
        restoreMocks: true,
        ...threads,
        testTimeout: 60_000,
        hookTimeout: 60_000,
    },
});
