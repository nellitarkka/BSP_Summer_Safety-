import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '@/components/FormField';
import { locationService, type AddressHit } from '@/services/locationService';
import { colors, space, radius, fontSize, font, cardShadow } from '@/lib/theme';

interface Props {
  label: string;
  value: string;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onChangeText: (text: string) => void;
  // Fired when the user picks a suggestion — carries exact coordinates so we
  // don't have to re-geocode an ambiguous string later.
  onSelect: (hit: AddressHit) => void;
}

// Debounced address search with a suggestions dropdown (like Google/Apple Maps).
export function AddressAutocomplete({ label, value, placeholder, icon, onChangeText, onSelect }: Props) {
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const justSelected = useRef(false);

  useEffect(() => {
    // Skip the query that immediately follows a selection (text was set by us).
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const results = await locationService.suggest(q);
      setHits(results);
      setOpen(results.length > 0);
      setLoading(false);
    }, 320);
    return () => clearTimeout(t);
  }, [value]);

  function pick(hit: AddressHit) {
    justSelected.current = true;
    onChangeText(hit.label);
    onSelect(hit);
    setOpen(false);
    setHits([]);
  }

  return (
    <View style={styles.wrap}>
      <FormField
        label={label}
        value={value}
        onChangeText={onChangeText}
        icon={icon}
        placeholder={placeholder}
        autoCapitalize="none"
      />
      {loading ? <ActivityIndicator style={styles.spinner} size="small" color={colors.brand} /> : null}
      {open ? (
        <View style={styles.dropdown}>
          {hits.map((h, i) => (
            <Pressable
              key={`${h.latitude},${h.longitude},${i}`}
              onPress={() => pick(h)}
              accessibilityRole="button"
              accessibilityLabel={`${h.label}${h.sub ? ', ' + h.sub : ''}`}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="location-outline" size={18} color={colors.brand} style={styles.rowIcon} />
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel} numberOfLines={1}>{h.label}</Text>
                {h.sub ? <Text style={styles.rowSub} numberOfLines={1}>{h.sub}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  spinner: { position: 'absolute', right: space[3], top: 38 },
  dropdown: {
    marginTop: space[1],
    backgroundColor: colors.card,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    ...cardShadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4] },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowIcon: { marginTop: 1 },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  rowSub: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
});
