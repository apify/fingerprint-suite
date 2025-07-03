import tsEslint from 'typescript-eslint';
import apify from '@apify/eslint-config';
import prettier from 'eslint-config-prettier';

export default [
    {
        ignores: [
            '**/dist',
            'node_modules',
            'coverage',
            '**/*.d.ts',
            'scripts',
            'eslint.config.mjs',
            'vitest.config.ts',
        ],
    },
    ...apify,
    prettier,
    {
        languageOptions: {
            parser: tsEslint.parser,
            parserOptions: {
                project: 'tsconfig.eslint.json',
            },
        },
    },
    {
        plugins: {
            '@typescript-eslint': tsEslint.plugin,
        },
        rules: {
            'no-void': 0,
            'no-underscore-dangle': 0,
            'max-classes-per-file': 0,
            'no-console': 'warn',
        },
    },
];
