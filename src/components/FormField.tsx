import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, fontSize, font } from '@/lib/theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

// Accessible labelled text input (NFR-08): programmatic label, hint, and
// role="alert" error. Optional leading icon and a focus ring. Used by all forms.
export function FormField({ label, error, hint, icon, ...inputProps }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.brand : colors.line;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, { borderColor }]}>
        {icon ? <Ionicons name={icon} size={20} color={focused ? colors.brand : colors.muted} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#9AA3B2"
          style={[styles.input, icon ? { marginLeft: 10 } : null]}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />
      </View>
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] + 2 },
  label: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
    borderWidth: 2,
    backgroundColor: colors.white,
    paddingHorizontal: space[4],
  },
  input: { flex: 1, paddingVertical: 14, fontSize: fontSize.base, fontFamily: font.regular, color: colors.text },
  hint: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
  error: { fontSize: fontSize.xs, fontFamily: font.medium, color: colors.danger },
});
