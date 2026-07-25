import { useState } from 'react';
import { View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SectionLabel } from '@/components/ui/Typography';
import { SafetyButton } from '@/components/SafetyButton';
import { useSafetyTips } from '@/hooks/useSafetyTips';
import type { SituationContext } from '@/types';
import { colors, space, radius, fontSize, font } from '@/lib/theme';

const CONTEXTS: SituationContext[] = ['walking', 'taxi', 'club', 'public_transport', 'unknown'];

export default function AiTipsScreen() {
  const [situation, setSituation] = useState('');
  const [context, setContext] = useState<SituationContext>('unknown');
  const [isAlone, setIsAlone] = useState(false);
  const [error, setError] = useState<string>();
  const tips = useSafetyTips();

  function generate() {
    if (!situation.trim()) {
      setError('Describe your situation to get tips.');
      return;
    }
    setError(undefined);
    tips.mutate({ situation: situation.trim(), context, is_alone: isAlone });
  }

  const result = tips.data;

  return (
    <Screen scroll>
      <View style={styles.banner}>
        <Ionicons name="warning" size={22} color={colors.danger} />
        <Text style={styles.bannerText}>
          If you are in immediate danger, call local emergency services now.
        </Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Describe your situation</Text>
          <TextInput
            accessibilityLabel="Describe your situation"
            value={situation}
            onChangeText={setSituation}
            multiline
            numberOfLines={4}
            placeholder="e.g. I'm walking home alone and someone seems to be following me."
            placeholderTextColor="#9AA3B2"
            style={styles.textarea}
            textAlignVertical="top"
          />
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <SectionLabel>Context</SectionLabel>
        <View style={styles.chipRow}>
          {CONTEXTS.map((c) => (
            <Chip key={c} label={c.replace('_', ' ')} selected={context === c} onPress={() => setContext(c)} />
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>I am alone</Text>
          <Switch value={isAlone} onValueChange={setIsAlone} trackColor={{ true: colors.brand }} accessibilityLabel="I am alone" />
        </View>

        <SafetyButton label={tips.isPending ? 'Getting tips…' : 'Get tips'} variant="primary" icon="bulb-outline" loading={tips.isPending} onPress={generate} />
      </Card>

      {result ? (
        <Card style={styles.resultCard} accessibilityLabel="Safety tips">
          <View accessibilityLiveRegion="polite" style={styles.resultInner}>
            {result.tips.map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.ok} />
                <Text style={styles.tipText}>{t}</Text>
              </View>
            ))}
            <View style={styles.reminder}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={styles.reminderText}>{result.emergency_reminder}</Text>
            </View>
            <Text style={styles.suggestion}>{result.contact_suggestion}</Text>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderRadius: radius['4xl'],
    backgroundColor: colors.dangerSoft,
    padding: space[4],
  },
  bannerText: { flex: 1, fontSize: fontSize.sm, fontFamily: font.medium, color: colors.text },
  card: { gap: space[4] },
  resultCard: { gap: space[3] },
  field: { gap: 6 },
  label: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  textarea: {
    minHeight: 110,
    borderRadius: radius['2xl'],
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: fontSize.base,
    fontFamily: font.regular,
    color: colors.text,
  },
  error: { fontFamily: font.medium, color: colors.danger },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultInner: { gap: space[3] },
  tipRow: { flexDirection: 'row', gap: space[2] },
  tipText: { flex: 1, fontSize: fontSize.base, fontFamily: font.regular, color: colors.text },
  reminder: {
    marginTop: space[1],
    flexDirection: 'row',
    gap: space[2],
    borderRadius: radius['2xl'],
    backgroundColor: colors.dangerSoft,
    padding: space[3],
  },
  reminderText: { flex: 1, fontFamily: font.semibold, color: colors.text },
  suggestion: { fontFamily: font.regular, color: colors.muted },
});
