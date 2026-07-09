// Pure-logic unit tests run under ts-jest (node), bypassing the Expo/RN babel
// chain. Component/E2E tests use a separate native runner (Maestro/Detox) — see
// outputs/quality/test-plan.md.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/Project-Timeline/'],
  modulePathIgnorePatterns: ['/Project-Timeline/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, diagnostics: false }],
  },
};
