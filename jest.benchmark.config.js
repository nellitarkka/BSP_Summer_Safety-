// Benchmark runner config — SEPARATE from the unit-test config (jest.config.js).
// Runs the live route engine over the Luxembourg scenarios and writes a
// machine-readable results file. Invoke with:  npm run benchmark
// Requires EXPO_PUBLIC_GRAPHHOPPER_KEY in the environment and network access; if the
// key is absent the live case is skipped (it never fabricates results).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/scripts/benchmark/**/*.bench.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, diagnostics: false }],
  },
  testTimeout: 180000,
};
