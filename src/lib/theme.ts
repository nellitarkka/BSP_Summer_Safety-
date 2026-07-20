export const colors = {
  bg: '#F4F6FC',
  card: '#FFFFFF',
  text: '#0B1020',
  muted: '#64748B',
  line: '#E6E9F2',
  brand: '#4F46E5',
  brandDark: '#4338CA',
  brandSoft: '#EEF0FF',
  accent: '#7C3AED',
  accentSoft: '#F3EEFF',
  danger: '#E11D48',
  dangerDark: '#BE123C',
  dangerSoft: '#FFE4E9',
  ok: '#059669',
  okSoft: '#D1FAE5',
  warn: '#D97706',
  warnSoft: '#FEF3C7',
  white: '#FFFFFF',
} as const;


export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

export const radius = {
  sm: 6, md: 10, lg: 14, xl: 16, '2xl': 16, '3xl': 24, '4xl': 28, full: 9999,
} as const;

export const fontSize = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
} as const;

export const weight = {
  medium: '500', semibold: '600', bold: '700', extrabold: '800',
} as const;

export const cardShadow = {
  shadowColor: '#1E293B',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

export const gradients = {
  brand: ['#4F46E5', '#7C3AED'] as const, // indigo → violet
  danger: ['#F43F5E', '#BE123C'] as const, // rose → deep red
  ok: ['#10B981', '#059669'] as const,
  night: ['#1E1B4B', '#0B1020'] as const, // for the fake-call screen
} as const;

export type GradientName = keyof typeof gradients;
