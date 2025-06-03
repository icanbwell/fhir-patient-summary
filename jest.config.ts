import {createDefaultPreset, JestConfigWithTsJest} from 'ts-jest'

const presetConfig = createDefaultPreset({
    // Equivalent to the previous 'globals' configuration
    diagnostics: {
        // Disable type checking diagnostics
        warnOnly: true,
    },
    // Optional: Equivalent to isolatedModules: true
    isolatedModules: true,
})

const jestConfig: JestConfigWithTsJest = {
    ...presetConfig,
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.spec.ts'],
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/src/types/**/*.ts',
    ],
}

export default jestConfig;