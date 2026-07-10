import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space, cardShadow } from '@/lib/theme';

type Tone = 'default' | 'brand' | 'danger' | 'ok' | 'warn';

interface CardProps {
  children: ReactNode;
  tone?: Tone;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const TONE_BG: Record<Tone, string> = {
  default: colors.card,
  brand: colors.brandSoft,
  danger: colors.dangerSoft,
  ok: colors.okSoft,
  warn: colors.warnSoft,
};

// Elevated content container. Soft shadow on the default (white) tone; tinted
// tones are flat surfaces used for callouts.
export function Card({ children, tone = 'default', onPress, style, accessibilityLabel }: CardProps) {
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: TONE_BG[tone] },
    tone === 'default' ? cardShadow : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius['4xl'],
    padding: space[5],
  },
});
