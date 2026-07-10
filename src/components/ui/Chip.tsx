import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, fontSize, weight } from '@/lib/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

// Selectable pill for single/multi-select option rows. Selected = filled brand;
// unselected = soft outline. Min height keeps a comfortable touch target.
export function Chip({ label, selected, onPress, icon }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={selected ? colors.white : colors.muted} />
      ) : null}
      <Text style={[styles.label, { color: selected ? colors.white : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 2,
    borderRadius: radius.full,
    paddingHorizontal: space[4],
    paddingVertical: 10,
  },
  selected: { backgroundColor: colors.brand },
  unselected: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  label: { fontWeight: weight.semibold, fontSize: fontSize.base },
});
