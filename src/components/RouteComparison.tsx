import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/Typography';
import { SafetyButton } from '@/components/SafetyButton';
import { formatDistance, formatDuration } from '@/services/routeService';
import {
  indicatorRows,
  RATING_LABEL,
  RATING_TONE,
  ROUTE_COPY,
  GENERATION_METHOD_LABEL,
  explanationSourceLabel,
  type IndicatorTone,
} from '@/lib/routePresentation';
import type { SelectionSource } from '@/hooks/useRouteComparison';
import { colors, radius, space, fontSize, font } from '@/lib/theme';
import type { RouteCandidate, RouteFeatureResponse } from '@/types';

// Indicator tones (ethical: 'lower'/'unknown' are never an alarm/red — danger red is
// reserved for emergencies). higher → brand, moderate → accent, lower/unknown → muted.
const TONE_COLOR: Record<IndicatorTone, string> = {
  ok: colors.brand,
  neutral: colors.accent,
  muted: colors.muted,
};

interface Props {
  data: RouteFeatureResponse;
  selectedId: string | null;
  selectionSource: SelectionSource;
  onSelect: (id: string) => void;
  aiLoading: boolean;
  aiExplanation: string | null;
  aiSource: 'ai' | 'fallback' | null;
  onExplainWithAI: () => void;
}

function Badge({ kind }: { kind: 'system' | 'user' }) {
  const system = kind === 'system';
  return (
    <View style={[styles.badge, system ? styles.badgeSystem : styles.badgeUser]}>
      <Ionicons
        name={system ? 'sparkles' : 'hand-left'}
        size={12}
        color={system ? colors.brand : colors.accent}
      />
      <Text style={[styles.badgeText, { color: system ? colors.brand : colors.accent }]}>
        {system ? ROUTE_COPY.systemBadge : ROUTE_COPY.manualBadge}
      </Text>
    </View>
  );
}

function CandidateCard({
  c,
  selected,
  selectionSource,
  onPress,
}: {
  c: RouteCandidate;
  selected: boolean;
  selectionSource: SelectionSource;
  onPress: () => void;
}) {
  const badgeKind = selected && selectionSource ? selectionSource : null;
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
        <View style={styles.candidateTitle}>
          <Text style={styles.candidateLabel}>{c.label}</Text>
          <Text style={styles.methodChip}>{GENERATION_METHOD_LABEL[c.generation_method]}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="walk" size={16} color={colors.brand} />
          <Text style={styles.summaryText}>
            {formatDistance(c.summary.distance_m)} · {formatDuration(c.summary.duration_s)}
          </Text>
        </View>
      </View>

      <View style={styles.indicatorList}>
        {indicatorRows(c.indicators, c.metrics).map((row) => (
          <View key={row.key} style={styles.indicatorRow}>
            <View style={styles.indicatorLeft}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TONE_COLOR[RATING_TONE[row.rating]] }} />
              <Text style={styles.indicatorLabel}>{row.label}</Text>
            </View>
            <View style={styles.indicatorRight}>
              {row.available ? (
                <Text style={styles.indicatorValue}>{row.valueText}</Text>
              ) : (
                <Text style={styles.indicatorNoData}>{row.valueText}</Text>
              )}
              <Text style={styles.indicatorRating}>{RATING_LABEL[row.rating]}</Text>
            </View>
          </View>
        ))}
      </View>

      {badgeKind ? (
        <View style={styles.selectedRow}>
          <Badge kind={badgeKind} />
        </View>
      ) : null}
    </Pressable>
  );
}

// R2 route comparison (US-013) + optional AI explanation (US-014). Presents relative,
// route-level indicators with their numeric evidence and a plain-language comparison —
// never a per-street danger label (FR-59/NFR-14) and never a "safe/safer" claim (C1).
export function RouteComparison({
  data,
  selectedId,
  selectionSource,
  onSelect,
  aiLoading,
  aiExplanation,
  aiSource,
  onExplainWithAI,
}: Props) {
  const uncertainty = data.candidates[0]?.indicators.uncertainty_note;
  // A comparison exists but with no preferred candidate ⇒ tie / insufficient evidence.
  const noPreference = data.comparison !== null && data.comparison.preferred_candidate_id === null;
  const hasPreference = data.comparison !== null && data.comparison.preferred_candidate_id !== null;
  const sourceLabel = explanationSourceLabel(aiSource);

  return (
    <View style={styles.wrap}>
      <SectionLabel>{ROUTE_COPY.sectionTitle}</SectionLabel>
      {data.candidates.map((c) => (
        <CandidateCard
          key={c.id}
          c={c}
          selected={c.id === selectedId}
          selectionSource={selectionSource}
          onPress={() => onSelect(c.id)}
        />
      ))}

      {hasPreference ? (
        <Card tone="brand" style={styles.calloutGap}>
          <View style={styles.calloutHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
            <Text style={styles.calloutTitle}>{ROUTE_COPY.whyTitle}</Text>
          </View>
          <Text style={styles.calloutBody}>{data.comparison!.explanation}</Text>
        </Card>
      ) : null}

      {noPreference ? (
        <Card style={styles.calloutGap}>
          <View style={styles.calloutHeader}>
            <Ionicons name="git-compare-outline" size={18} color={colors.muted} />
            <Text style={styles.calloutTitle}>{ROUTE_COPY.noPreferenceTitle}</Text>
          </View>
          <Text style={styles.calloutBody}>{data.comparison!.explanation || ROUTE_COPY.noPreferenceBody}</Text>
        </Card>
      ) : null}

      <SafetyButton
        label={aiLoading ? ROUTE_COPY.aiThinking : ROUTE_COPY.aiButton}
        variant="outline"
        icon="sparkles-outline"
        loading={aiLoading}
        onPress={onExplainWithAI}
      />

      {aiExplanation && sourceLabel ? (
        <Card style={styles.calloutGap}>
          <View style={styles.calloutHeader}>
            <Ionicons
              name={sourceLabel.isAi ? 'sparkles' : 'document-text-outline'}
              size={16}
              color={sourceLabel.isAi ? colors.brand : colors.muted}
            />
            <Text style={[styles.sourceLabel, { color: sourceLabel.isAi ? colors.brand : colors.muted }]}>
              {sourceLabel.text}
            </Text>
          </View>
          <Text style={styles.calloutBody}>{aiExplanation}</Text>
          <Text style={styles.disclaimer}>{ROUTE_COPY.disclaimer}</Text>
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
  candidateHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  candidateTitle: { gap: 2 },
  candidateLabel: { fontSize: fontSize.base, fontFamily: font.bold, color: colors.text },
  methodChip: { fontSize: fontSize.xs, fontFamily: font.medium, color: colors.muted },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  indicatorList: { gap: 6 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indicatorLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  indicatorLabel: { fontSize: fontSize.sm, fontFamily: font.regular, color: colors.text },
  indicatorRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  indicatorValue: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  indicatorNoData: { fontSize: fontSize.xs, fontFamily: font.medium, color: colors.muted, fontStyle: 'italic' },
  indicatorRating: { fontSize: fontSize.xs, fontFamily: font.semibold, color: colors.muted, minWidth: 56, textAlign: 'right' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 4, borderRadius: radius.full },
  badgeSystem: { backgroundColor: colors.brandSoft },
  badgeUser: { backgroundColor: colors.accentSoft },
  badgeText: { fontSize: fontSize.xs, fontFamily: font.bold },
  calloutGap: { gap: space[2] },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  calloutTitle: { fontSize: fontSize.sm, fontFamily: font.bold, color: colors.text },
  calloutBody: { fontSize: fontSize.sm, fontFamily: font.regular, lineHeight: 20, color: colors.text },
  sourceLabel: { fontSize: fontSize.xs, fontFamily: font.bold },
  disclaimer: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
});
