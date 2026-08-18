import { useEffect, useState } from 'react';
import { View, Text, Switch, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SectionLabel } from '@/components/ui/Typography';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { SafetyButton } from '@/components/SafetyButton';
import { RouteMap } from '@/components/RouteMap';
import { RouteComparison } from '@/components/RouteComparison';
import { ContactPicker } from '@/components/ContactPicker';
import { useRoutePlanner } from '@/hooks/useRoutePlanner';
import { routeRequestKey } from '@/lib/routeRequest';
import { useRouteComparison } from '@/hooks/useRouteComparison';
import { useContacts } from '@/hooks/useContacts';
import { useCreateSession } from '@/hooks/useActiveSession';
import { ActiveSessionError } from '@/services/sessionService';
import { notificationService } from '@/services/notificationService';
import { formatDistance, formatDuration } from '@/services/routeService';
import { ROUTE_COPY } from '@/lib/routePresentation';
import { CHECKIN_INTERVALS } from '@/lib/constants';
import { colors, space, fontSize, font } from '@/lib/theme';

export default function RouteScreen() {
  const router = useRouter();
  const { state, requestLocation, setUseCurrent, setStartText, setDestText, pickStart, pickDest, compute } = useRoutePlanner();
  const comparison = useRouteComparison();
  const { data: contacts } = useContacts();
  const createSession = useCreateSession();
  const [interval, setInterval] = useState<number>(30);
  const [selected, setSelected] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [starting, setStarting] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Changing origin/destination clears the planner's route/coords; whenever that route
  // request identity changes, discard the previous comparison so no stale candidates,
  // selection, recommendation/tie state or AI explanation linger (Bug 1).
  const requestKey = routeRequestKey(state.coords);
  const { reset: resetComparison } = comparison;
  useEffect(() => {
    resetComparison();
  }, [requestKey, resetComparison]);

  async function startSession() {
    if (!state.route) return;
    setStarting(true);
    try {
      // Create via the mutation so the active-session cache is primed on success — the
      // Session screen then shows the new session immediately (round-2 fix, Bug 2).
      await createSession.mutateAsync({
        start_location: state.useCurrent ? 'Current location' : state.startText,
        destination: state.destText,
        route_data: state.route,
        checkin_interval_minutes: interval,
        location_sharing_enabled: sharing,
        contact_ids: selected,
      });
      if (await notificationService.requestPermission()) {
        await notificationService.scheduleCheckIn(interval);
      }
      router.replace('/(app)/session');
    } catch (e) {
      // At most one active session per user (DB constraint). Don't surface a raw DB
      // error — offer to resume the existing session instead of destroying it (Bug 2).
      if (e instanceof ActiveSessionError) {
        Alert.alert(
          'Active session in progress',
          'You already have a safety session running. You can go to it, or end it before starting a new one.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Go to session', onPress: () => router.replace('/(app)/session') },
          ],
        );
      } else {
        Alert.alert("Couldn't start session", 'Please check your connection and try again.');
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen scroll>
      {state.granted === false ? (
        <Card tone="warn" style={styles.warnRow} onPress={requestLocation} accessibilityLabel="Enable location">
          <Ionicons name="location-outline" size={22} color={colors.warn} />
          <Text style={styles.warnText}>Location is off. Tap to enable, or enter your start below.</Text>
        </Card>
      ) : null}

      <Card style={styles.cardGap4}>
        <View style={styles.rowBetween}>
          <Text style={styles.rowLabel}>Use current location as start</Text>
          <Switch value={state.useCurrent} onValueChange={setUseCurrent} disabled={!state.granted} trackColor={{ true: colors.brand }} accessibilityLabel="Use current location" />
        </View>
        {!state.useCurrent ? (
          <AddressAutocomplete label="Start" value={state.startText} onChangeText={setStartText} onSelect={(h) => pickStart({ latitude: h.latitude, longitude: h.longitude })} icon="locate-outline" placeholder="Enter a start address" />
        ) : null}
        <AddressAutocomplete label="Destination" value={state.destText} onChangeText={setDestText} onSelect={(h) => pickDest({ latitude: h.latitude, longitude: h.longitude })} icon="flag-outline" placeholder="Where are you going?" />
        <SafetyButton label={state.computing ? 'Finding route…' : 'Get route'} variant="outline" icon="search-outline" loading={state.computing} onPress={compute} />
        {state.error ? <Text accessibilityRole="alert" style={styles.errorText}>{state.error}</Text> : null}
      </Card>

      {state.route ? (
        <>
          <Card style={styles.cardGap3}>
            <RouteMap coordinates={state.route.coordinates} />
            <View style={styles.walkRow}>
              <Ionicons name="walk" size={18} color={colors.brand} />
              <Text style={styles.walkText}>
                {formatDistance(state.route.distance_m)} · {formatDuration(state.route.duration_s)} walk
              </Text>
            </View>
            {state.coords && !comparison.state.data ? (
              <SafetyButton
                label={comparison.state.loading ? ROUTE_COPY.comparing : ROUTE_COPY.compareButton}
                variant="outline"
                icon="git-compare-outline"
                loading={comparison.state.loading}
                onPress={() => comparison.compare(state.coords!.start, state.coords!.destination)}
              />
            ) : null}
            {comparison.state.error ? (
              <Text accessibilityRole="alert" style={styles.errorText}>{comparison.state.error}</Text>
            ) : null}
          </Card>

          {comparison.state.data ? (
            <RouteComparison
              data={comparison.state.data}
              selectedId={comparison.state.selectedId}
              selectionSource={comparison.state.selectionSource}
              onSelect={comparison.select}
              aiLoading={comparison.state.aiLoading}
              aiExplanation={comparison.state.aiExplanation}
              aiSource={comparison.state.aiSource}
              onExplainWithAI={comparison.explainWithAI}
            />
          ) : null}

          <Card style={styles.cardGap3}>
            <SectionLabel>Check in every</SectionLabel>
            <View style={styles.chipRow}>
              {CHECKIN_INTERVALS.map((m) => (
                <Chip key={m} label={`${m} min`} selected={interval === m} onPress={() => setInterval(m)} />
              ))}
            </View>

            <SectionLabel>Notify these contacts</SectionLabel>
            <ContactPicker contacts={contacts ?? []} selectedIds={selected} onToggle={toggle} />

            <View style={styles.shareRow}>
              <Text style={styles.shareLabel}>Share my location during this session</Text>
              <Switch value={sharing} onValueChange={setSharing} trackColor={{ true: colors.brand }} accessibilityLabel="Share location" />
            </View>
          </Card>

          <SafetyButton label={starting ? 'Starting…' : 'Start safety session'} variant="primary" icon="navigate" size="lg" loading={starting} onPress={startSession} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  warnText: { flex: 1, fontSize: fontSize.sm, fontFamily: font.regular, color: colors.text },
  cardGap4: { gap: space[4] },
  cardGap3: { gap: space[3] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  errorText: { fontFamily: font.medium, color: colors.danger },
  walkRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  walkText: { fontFamily: font.semibold, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  shareRow: { marginTop: space[1], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareLabel: { flex: 1, fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
});
