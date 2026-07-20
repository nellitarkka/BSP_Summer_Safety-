import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, colors, radius, space, fontSize, font } from '@/lib/theme';

type Variant = 'danger' | 'primary' | 'ok' | 'outline' | 'ghost';

interface SafetyButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  accessibilityHint?: string;
}

// Filled variants render as a bold gradient; outline/ghost are flat.
const GRADIENT: Partial<Record<Variant, readonly [string, string]>> = {
  primary: gradients.brand,
  danger: gradients.danger,
  ok: gradients.ok,
};

const FILLED_TEXT = '#FFFFFF';

// Large, high-contrast action button for urgent flows (NFR-09).
// Min height keeps the touch target >= 56dp (NFR-08).
export function SafetyButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  size = 'md',
  accessibilityHint,
}: SafetyButtonProps) {
  const isFilled = variant === 'primary' || variant === 'danger' || variant === 'ok';
  const isOutline = variant === 'outline';
  const minHeight = size === 'lg' ? 64 : 56;
  const textColor = isFilled ? FILLED_TEXT : variant === 'ghost' ? colors.muted : colors.brand;
  const textSize = size === 'lg' ? fontSize.xl : fontSize.lg;

  const inner = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'lg' ? 24 : 20} color={textColor} />
      ) : null}
      <Text style={[styles.label, { color: textColor, fontSize: textSize }]}>{label}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.85 : 1 })}
    >
      {isFilled ? (
        <LinearGradient
          colors={GRADIENT[variant]!}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.body,
            { minHeight },
            {
              shadowColor: variant === 'danger' ? colors.danger : colors.brand,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            },
          ]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.body, { minHeight }, isOutline ? styles.outline : styles.ghost]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    justifyContent: 'center',
    borderRadius: radius['2xl'],
    paddingHorizontal: space[5],
    paddingVertical: space[4],
  },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  label: { textAlign: 'center', fontFamily: font.bold },
  outline: { borderWidth: 2, borderColor: colors.brand, backgroundColor: colors.white },
  ghost: { backgroundColor: 'transparent' },
});
