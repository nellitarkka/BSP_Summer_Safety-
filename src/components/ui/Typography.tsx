import { Text, View, StyleSheet } from 'react-native';
import { colors, fontSize, space, weight } from '@/lib/theme';

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
    fontSize: fontSize['3xl'],
    fontWeight: weight.extrabold,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: { fontSize: fontSize.base, color: colors.muted },
  label: {
    marginTop: space[1],
    fontSize: fontSize.xs,
    fontWeight: weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.muted,
  },
});
