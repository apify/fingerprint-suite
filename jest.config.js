module.exports = {
    testTimeout: 60e3,
    maxWorkers: 3,
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: false,
    testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        '<rootDir>/packages/*/src/**/*.[jt]s',
    ],
    moduleNameMapper: {
        '^apify$': '<rootDir>/packages/apify/src',
        '^@apify/scraper-tools$': '<rootDir>/packages/scraper-tools/src',
        '^crawlee$': '<rootDir>/packages/crawlers/src',
        '^@crawlee/basic$': '<rootDir>/packages/basic-crawler/src',
        '^@crawlee/browser$': '<rootDir>/packages/browser-crawler/src',
        '^@crawlee/cheerio$': '<rootDir>/packages/cheerio-crawler/src',
        '^@crawlee/playwright$': '<rootDir>/packages/playwright-crawler/src',
        '^@crawlee/puppeteer$': '<rootDir>/packages/puppeteer-crawler/src',
        '^@crawlee/(.*)/(.*)$': '<rootDir>/packages/$1/$2',
        '^@crawlee/(.*)$': '<rootDir>/packages/$1/src',
    },
    modulePathIgnorePatterns: [
        'dist/package.json',
        '<rootDir>/package.json',
    ],
    globals: {
        'ts-jest': {
            tsconfig: 'test/tsconfig.json',
        },
    },
};
