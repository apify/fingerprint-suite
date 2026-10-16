import { defineConfig } from '@apify/oxlint-config';

export default defineConfig({
    ignorePatterns: ['**/node_modules', '**/dist', 'coverage', '**/*.d.ts', 'packages/header-order-collector'],
    rules: {
        'import/extensions': ['error', 'always', { ignorePackages: true, checkTypeImports: true }],
        'no-console': 'warn',
        'no-void': 'off',
        'no-underscore-dangle': ['error', { enforceInClassFields: true, enforceInMethodNames: true }],
        'typescript/array-type': 'error',
        'typescript/no-explicit-any': 'off',
        'typescript/ban-ts-comment': 'off',
        'typescript/no-empty-function': 'off',
        'typescript/no-empty-interface': 'off',
        'typescript/no-unused-vars': 'off',
    },
    overrides: [
        {
            files: ['*.config.ts', '*.config.mts', '*.config.mjs'],
            rules: {
                'no-console': 'off',
                'import/no-default-export': 'off',
            },
        },
        {
            // browser code that is injected into pages: it reports problems through the console and uses `_` names of the DOM
            files: ['packages/fingerprint-injector/src/utils.js'],
            rules: {
                'no-console': 'off',
                'no-underscore-dangle': 'off',
            },
        },
        {
            // build tooling that prints its progress
            files: ['scripts/**', 'packages/generator-networks-creator/**'],
            rules: {
                'no-console': 'off',
            },
        },
        {
            files: ['test/**'],
            rules: {
                'no-console': 'off',
                'no-underscore-dangle': 'off',
                'no-useless-constructor': 'off',
                'typescript/no-empty-function': 'off',
                'typescript/no-unused-vars': 'off',
                'jest/no-conditional-expect': 'off',
                'vitest/no-conditional-expect': 'off',
                'jest/expect-expect': 'off',
                'vitest/expect-expect': 'off',
                'jest/no-standalone-expect': 'off',
                'vitest/no-standalone-expect': 'off',
                'jest/no-disabled-tests': 'off',
                'vitest/no-disabled-tests': 'off',
                'jest/valid-title': 'off',
                'vitest/valid-title': 'off',
            },
        },
    ],
});
