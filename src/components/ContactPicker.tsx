import { View, Text, StyleSheet } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { colors, fontSize, space, font } from '@/lib/theme';
import type { TrustedContact } from '@/types';

interface ContactPickerProps {
  contacts: TrustedContact[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

// Multi-select chips for choosing which trusted contacts a session notifies.
export function ContactPicker({ contacts, selectedIds, onToggle }: ContactPickerProps) {
  if (contacts.length === 0) {
    return <Text style={styles.empty}>Add a trusted contact first (Contacts tab).</Text>;
  }
  return (
    <View style={styles.row}>
      {contacts.map((c) => (
        <Chip
          key={c.id}
          label={c.name}
          icon={c.is_emergency ? 'star' : undefined}
          selected={selectedIds.includes(c.id)}
          onPress={() => onToggle(c.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: fontSize.sm, fontFamily: font.regular, color: colors.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
