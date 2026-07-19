// Design tokens — dusk-violet on mist. Calm, intimate, honest. Signal red is
// RESERVED for genuine emergency actions only (Call 112, missed check-in) so it
// never loses meaning. Plain React Native StyleSheet values (no NativeWind on this stack).

// Dusk scale — the core brand ramp.
export const dusk = {
  50: '#EFE9F6',
  100: '#DDD2EC',
  200: '#C9B6E8',
  300: '#A98FD6',
  500: '#7A5EA6',
  600: '#5E4487',
  800: '#3E2E5C',
} as const;

export const colors = {
  bg: '#F4F1F7', // mist / surface (the 70%)
  card: '#FFFFFF',
  text: '#241F2E', // midnight / ink
  muted: '#6E6780', // muted ink for captions / secondary
  line: '#E7E1F0', // hairline on mist
  brand: '#7A5EA6', // dusk / primary
  brandDark: '#5E4487',
  brandSoft: '#EFE9F6', // dusk-50 tint for soft surfaces
  accent: '#A98FD6', // lilac (help points, secondary motifs)
  accentSoft: '#DDD2EC',
  danger: '#D2556B', // SIGNAL — emergency only
  dangerDark: '#B83E54',
  dangerSoft: '#F7E1E6',
  ok: '#6D5AA0', // "live / positive" — dusk-toned (brand has no green)
  okSoft: '#E7DEF2',
  warn: '#8A6FB0', // gentle caution (e.g. location off) — dusk, never alarm
  warnSoft: '#EFE9F6',
  white: '#FFFFFF',
  ink: '#241F2E',
  midnight: '#241F2E',
} as const;

// Spacing scale (n * 4px).
export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

// Corner radii — soft 18px tiles are the brand default.
export const radius = {
  sm: 8, md: 12, lg: 16, xl: 18, '2xl': 18, '3xl': 22, '4xl': 26, full: 9999,
} as const;

// Type scale (brand: Display 48 · Title 28 · Body 16 · Label 13 · Caption 12).
export const fontSize = {
  xs: 12, sm: 13, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 28, '4xl': 34, display: 46,
} as const;

// Font families. Display = Instrument Serif (a voice, never below 20px). Text =
// Manrope, the workhorse for every label, button, body and number. Use these as
// `fontFamily` — with custom fonts, fontFamily (not fontWeight) carries the weight.
export const font = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

// Legacy numeric weights — kept so any un-migrated style still compiles. Prefer
// `fontFamily: font.*` for real Manrope weights.
export const weight = {
  medium: '500', semibold: '600', bold: '700', extrabold: '800',
} as const;

// Soft, dusk-tinted card shadow (iOS + Android elevation). Nothing harsh.
export const cardShadow = {
  shadowColor: '#3E2E5C',
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;

// Gradient tuples (LinearGradient `colors`). Signal gradient is emergency-only.
export const gradients = {
  brand: ['#7A5EA6', '#5E4487'] as const, // dusk primary — hero / CTA
  dusk: ['#A98FD6', '#7A5EA6'] as const, // soft lilac → dusk
  danger: ['#D2556B', '#B83E54'] as const, // SIGNAL — emergency only
  ok: ['#8B72B8', '#5E4487'] as const, // live-session glow (dusk, not green)
  night: ['#3E2E5C', '#241F2E'] as const, // twilight → midnight (fake call, dark tiles)
} as const;

export type GradientName = keyof typeof gradients;
