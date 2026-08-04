import { useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { SafetyButton } from '@/components/SafetyButton';
import { RouteMap } from '@/components/RouteMap';
import { CheckInTimer } from '@/components/CheckInTimer';
import { useActiveSession, useEndSession } from '@/hooks/useActiveSession';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { checkinService } from '@/services/checkinService';
import { notificationService } from '@/services/notificationService';
import { alertService } from '@/services/alertService';
import type { MonitorStatus } from '@/lib/sessionMonitor';
import { colors, space, radius, fontSize, font } from '@/lib/theme';

function monitorMessage(m: MonitorStatus): string {
  if (m.overdue && m.offRoute) return "You're past your expected arrival and seem off your planned route.";
  if (m.overdue) return `You're about ${m.minutesOverdue} min past your expected arrival time.`;
  return 'You seem to have moved off your planned route.';
}

export default function SessionScreen() {
  const router = useRouter();
  const { data: session, isLoading } = useActiveSession();
  const end = useEndSession();
  const monitor = useSessionMonitor(session); // owns tracking (FR-55) + ETA/deviation
  const [acknowledged, setAcknowledged] = useState(false);

  async function endSession() {
    if (!session) return;
    await notificationService.cancelAll();
    await end.mutateAsync({ id: session.id, action: 'complete' });
    router.replace('/(app)/home');
  }

  function acknowledgeOk() {
    setAcknowledged(true);
    if (session) checkinService.confirm(session.id); // treat as an "I'm okay" check-in
  }

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.brand} />
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen center>
        <Ionicons name="map-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyText}>No active session.</Text>
        <SafetyButton label="Plan a route" variant="primary" icon="navigate" onPress={() => router.replace('/(app)/route')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="walk" size={22} color={colors.ok} />
        </View>
        <Text style={styles.headerText}>
          {session.start_location} → {session.destination}
        </Text>
      </Card>

      {session.route_data ? (
        <Card><RouteMap coordinates={session.route_data.coordinates} /></Card>
      ) : null}

      {(monitor.overdue || monitor.offRoute) && !acknowledged ? (
        <Card tone="warn" style={styles.cardGap3}>
          <View style={styles.alertRow}>
            <Ionicons name="time-outline" size={20} color={colors.warn} />
            <Text style={styles.alertText}>{monitorMessage(monitor)} Everything ok?</Text>
          </View>
          <View style={styles.buttonRow}>
            <View style={styles.buttonHalf}>
              <SafetyButton label="I'm okay" variant="outline" icon="checkmark-circle-outline" onPress={acknowledgeOk} />
            </View>
            <View style={styles.buttonHalf}>
              <SafetyButton label="Safety options" variant="danger" icon="alert-circle" onPress={() => router.push('/(app)/unsafe')} />
            </View>
          </View>
        </Card>
      ) : null}

      <CheckInTimer
        intervalMinutes={session.checkin_interval_minutes}
        onConfirm={() => checkinService.confirm(session.id)}
        onHelp={() => { checkinService.requestHelp(session.id); router.push('/(app)/home'); }}
        onExpire={() => {
          checkinService.markMissed(session.id);
          // FR-31: simulated notification to contacts when a check-in is missed.
          alertService.simulateMissedAlert(session.id, 'Missed check-in during safety session.');
          Alert.alert('Missed check-in', 'You missed a check-in. Are you okay?');
        }}
      />

      <SafetyButton label="I feel unsafe" variant="danger" icon="alert-circle" onPress={() => router.push('/(app)/unsafe')} />
      <SafetyButton label="End session" variant="ghost" icon="stop-circle-outline" onPress={endSession} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyText: { textAlign: 'center', fontSize: fontSize.base, fontFamily: font.regular, color: colors.muted },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
    backgroundColor: colors.okSoft,
  },
  headerText: { flex: 1, fontSize: fontSize.base, fontFamily: font.semibold, color: colors.text },
  cardGap3: { gap: space[3] },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  alertText: { flex: 1, fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
  buttonRow: { flexDirection: 'row', gap: space[2] },
  buttonHalf: { flex: 1 },
});
