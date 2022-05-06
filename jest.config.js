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
        '^header-generator$': '<rootDir>/packages/header-generator/src',
        '^fingerprint-generator$': '<rootDir>/packages/fingerprint-generator/src',
        '^fingerprint-injector$': '<rootDir>/packages/fingerprint-injector/src',
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
