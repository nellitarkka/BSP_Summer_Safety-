// ESLint 9 flat config using Expo's preset. Run with `npm run lint`.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'supabase/functions/**', 'Project-Timeline/**'],
  },
];
