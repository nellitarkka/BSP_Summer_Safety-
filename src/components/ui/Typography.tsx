import { Text, View, StyleSheet } from 'react-native';
import { colors, fontSize, space, font } from '@/lib/theme';

// Large screen heading with optional subtitle.
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// Uppercase section label used above grouped controls/lists.
export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  titleWrap: { gap: space[1] },
  title: {
    fontSize: fontSize['4xl'],
    fontFamily: font.display,
    letterSpacing: 0.2,
    color: colors.text,
  },
  subtitle: { fontSize: fontSize.base, fontFamily: font.regular, color: colors.muted },
  label: {
    marginTop: space[1],
    fontSize: fontSize.sm,
    fontFamily: font.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.muted,
  },
});
