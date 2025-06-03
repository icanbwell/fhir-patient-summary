import {createDefaultPreset, JestConfigWithTsJest} from 'ts-jest'

const presetConfig = createDefaultPreset({});

const jestConfig: JestConfigWithTsJest = {
    ...presetConfig,
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.spec.ts', '**/test/**/*.ts'],
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/types/**/*.ts',
    ],
}

export default jestConfig;