import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig, mergeConfig } from 'vitest/config';

const packages = [
    'fingerprint-generator',
    'fingerprint-injector',
    'generative-bayesian-network',
    'generator-networks-creator',
    'header-generator',
];

const baseConfig = defineConfig({
    test: {
        globals: true,
        restoreMocks: true,
        testTimeout: 60_000,
        hookTimeout: 60_000,
        alias: packages.map((name) => ({
            find: new RegExp(`^${name}$`),
            replacement: resolve(
                import.meta.dirname,
                `./packages/${name}/src/index.ts`,
            ),
        })),
        retry: process.env.RETRY_TESTS ? 3 : 0,
    },
});

// Optional local override, gitignored.
const localConfigPath = resolve(
    import.meta.dirname,
    './vitest.config.local.mts',
);
let finalConfig = baseConfig;

if (existsSync(localConfigPath)) {
    const localConfigModule = await import(localConfigPath);
    finalConfig = mergeConfig(baseConfig, localConfigModule.default);
}

export default finalConfig;
