import type { ExpoConfig, ConfigContext } from 'expo/config';

// Public env only — NEVER put the AI provider key here (it lives in the
// Supabase Edge Function secret AI_PROVIDER_KEY). See architecture.md NFR-04.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Safety Companion',
  slug: 'ai-safety-companion',
  scheme: 'safetycompanion',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    ['expo-location', {
      locationWhenInUsePermission:
        'Safety Companion uses your location only to show your current position and plan routes during a safety session. Sharing is optional and off by default.',
    }],
    ['expo-notifications', {}],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    graphhopperKey: process.env.EXPO_PUBLIC_GRAPHHOPPER_KEY,
  },
  ios: { supportsTablet: true, bundleIdentifier: 'ai.kaycoo.safetycompanion' },
  android: { package: 'ai.kaycoo.safetycompanion' },
});
