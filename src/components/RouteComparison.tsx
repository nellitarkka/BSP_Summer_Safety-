import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/Typography';
import { SafetyButton } from '@/components/SafetyButton';
import { formatDistance, formatDuration } from '@/services/routeService';
import { indicatorRows, RATING_LABEL, RATING_TONE, type IndicatorTone } from '@/lib/routePresentation';
import { colors, radius, space, fontSize, font } from '@/lib/theme';
import type { RouteCandidate, RouteFeatureResponse } from '@/types';


const TONE_COLOR: Record<IndicatorTone, string> = {
  ok: colors.brand,
  neutral: colors.accent,
  muted: colors.muted,
};

interface Props {
  data: RouteFeatureResponse;
  selectedId: string | null;
  onSelect: (id: string) => void;
  aiLoading: boolean;
  aiExplanation: string | null;
  onExplainWithAI: () => void;
}

function CandidateCard({ c, selected, onPress }: { c: RouteCandidate; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Select ${c.label}`}
      style={({ pressed }) => [
        styles.candidate,
        selected ? styles.candidateSel : styles.candidateUnsel,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.candidateHeader}>
        <Text style={styles.candidateLabel}>{c.label}</Text>
        <View style={styles.summaryRow}>
          <Ionicons name="walk" size={16} color={colors.brand} />
          <Text style={styles.summaryText}>
            {formatDistance(c.summary.distance_m)} · {formatDuration(c.summary.duration_s)}
          </Text>
        </View>
      </View>

      <View style={styles.indicatorList}>
        {indicatorRows(c.indicators).map((row) => (
          <View key={row.key} style={styles.indicatorRow}>
            <View style={styles.indicatorLeft}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TONE_COLOR[RATING_TONE[row.rating]] }} />
              <Text style={styles.indicatorLabel}>{row.label}</Text>
            </View>
            <Text style={styles.indicatorRating}>{RATING_LABEL[row.rating]}</Text>
          </View>
        ))}
      </View>

      {selected ? (
        <View style={styles.selectedRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function RouteComparison({ data, selectedId, onSelect, aiLoading, aiExplanation, onExplainWithAI }: Props) {
  const uncertainty = data.candidates[0]?.indicators.uncertainty_note;

  return (
    <View style={styles.wrap}>
      <SectionLabel>Compare routes</SectionLabel>
      {data.candidates.map((c) => (
        <CandidateCard key={c.id} c={c} selected={c.id === selectedId} onPress={() => onSelect(c.id)} />
      ))}

      {data.comparison ? (
        <Card tone="brand" style={styles.calloutGap}>
          <View style={styles.calloutHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
            <Text style={styles.calloutTitle}>Why this route</Text>
          </View>
          <Text style={styles.calloutBody}>{data.comparison.explanation}</Text>
        </Card>
      ) : null}

      <SafetyButton
        label={aiLoading ? 'Thinking…' : 'Explain with AI'}
        variant="outline"
        icon="sparkles-outline"
        loading={aiLoading}
        onPress={onExplainWithAI}
      />

      {aiExplanation ? (
        <Card style={styles.calloutGap}>
          <Text style={styles.calloutBody}>{aiExplanation}</Text>
          <Text style={styles.disclaimer}>
            Guidance only — not a guarantee. If you are in immediate danger, call local emergency services.
          </Text>
        </Card>
      ) : null}

      {uncertainty ? <Text style={styles.disclaimer}>{uncertainty}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  candidate: {
    gap: space[3],
    borderRadius: radius['4xl'],
    borderWidth: 1,
    padding: space[4],
  },
  candidateSel: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  candidateUnsel: { borderColor: colors.line, backgroundColor: colors.white },
  candidateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  candidateLabel: { fontSize: fontSize.base, fontFamily: font.bold, color: colors.text },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  indicatorList: { gap: 6 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indicatorLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  indicatorLabel: { fontSize: fontSize.sm, fontFamily: font.regular, color: colors.text },
  indicatorRating: { fontSize: fontSize.xs, fontFamily: font.semibold, color: colors.muted },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedText: { fontSize: fontSize.xs, fontFamily: font.semibold, color: colors.brand },
  calloutGap: { gap: space[2] },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  calloutTitle: { fontSize: fontSize.sm, fontFamily: font.bold, color: colors.text },
  calloutBody: { fontSize: fontSize.sm, fontFamily: font.regular, lineHeight: 20, color: colors.text },
  disclaimer: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
});
