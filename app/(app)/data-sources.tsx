import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { DATASET_SOURCES } from '@/data/provenance';
import { colors, space, fontSize, font } from '@/lib/theme';
import type { DatasetSource } from '@/types';

function SourceCard({ s }: { s: DatasetSource }) {
  return (
    <Card tone={s.background_only ? 'warn' : 'default'} style={styles.sourceCard}>
      <View style={styles.sourceHeader}>
        <Ionicons
          name={s.background_only ? 'information-circle-outline' : 'server-outline'}
          size={18}
          color={s.background_only ? colors.warn : colors.brand}
        />
        <Text style={styles.sourceName}>{s.name}</Text>
      </View>
      <Text style={styles.license}>{s.license}</Text>
      <Text style={styles.limitations}>{s.limitations}</Text>
      {s.background_only ? (
        <Text style={styles.backgroundOnly}>Background/motivation only — never a route input.</Text>
      ) : null}
    </Card>
  );
}

// Data sources & provenance screen (NFR-14). States, transparently, what data
// the app uses and its limits — and that crime statistics are background only.
export default function DataSourcesScreen() {
  return (
    <Screen scroll>
      <Card tone="brand" style={styles.intro}>
        <Text style={styles.introTitle}>How we use data</Text>
        <Text style={styles.introBody}>
          Route suggestions are based on open map and transport data. The app describes routes with
          relative, route-level indicators (like lighting or how close a route stays to transit) —
          it never labels any street as dangerous and never builds a street-by-street risk map.
        </Text>
      </Card>

      {DATASET_SOURCES.map((s) => (
        <SourceCard key={s.id} s={s} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space[2] },
  introTitle: { fontSize: fontSize.sm, fontFamily: font.bold, color: colors.text },
  introBody: { fontSize: 13, lineHeight: 20, fontFamily: font.regular, color: colors.text },
  sourceCard: { gap: space[2] },
  sourceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  sourceName: { flex: 1, fontSize: fontSize.sm, fontFamily: font.bold, color: colors.text },
  license: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
  limitations: { fontSize: 13, lineHeight: 20, fontFamily: font.regular, color: colors.text },
  backgroundOnly: { fontSize: fontSize.xs, fontFamily: font.semibold, color: colors.warn },
});
