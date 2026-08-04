import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Vibration, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SectionLabel } from '@/components/ui/Typography';
import { FormField } from '@/components/FormField';
import { SafetyButton } from '@/components/SafetyButton';
import { notificationService } from '@/services/notificationService';
import { FAKE_CALLERS, FAKE_CALL_DELAYS_SEC, FAKE_CALL_SCRIPT } from '@/lib/constants';
import { gradients, colors, space, radius, fontSize, font } from '@/lib/theme';

type Phase = 'setup' | 'incoming' | 'incall';
const DELAY_LABELS: Record<number, string> = { 0: 'Now', 30: '30s', 60: '1 min', 180: '3 min' };
// Ring pattern: wait, buzz, pause, buzz — loops until answered/declined.
const RING_PATTERN = [0, 800, 700, 800];

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Round call-control button (accept / decline).
function CallButton({ icon, bg, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; bg: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.callBtn, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.callCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={34} color={colors.white} />
      </View>
      <Text style={styles.callBtnLabel}>{label}</Text>
    </Pressable>
  );
}

// Non-functional in-call controls — purely for visual realism.
function FakeControl({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.ctrl}>
      <View style={styles.ctrlCircle}>
        <Ionicons name={icon} size={24} color={colors.white} />
      </View>
      <Text style={styles.ctrlLabel}>{label}</Text>
    </View>
  );
}

export default function FakeCallScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('setup');
  const [caller, setCaller] = useState<string>(FAKE_CALLERS[0]);
  const [customName, setCustomName] = useState('');
  const [delay, setDelay] = useState<number>(0);
  const [line, setLine] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = customName.trim() || caller;

  // Ring (vibrate) only while the call is incoming.
  useEffect(() => {
    if (phase === 'incoming') {
      Vibration.vibrate(RING_PATTERN, true);
      return () => Vibration.cancel();
    }
    Vibration.cancel();
  }, [phase]);

  // Count call duration once answered.
  useEffect(() => {
    if (phase !== 'incall') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Cleanup pending schedule + vibration on unmount.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    Vibration.cancel();
  }, []);

  function start() {
    if (delay <= 0) { setPhase('incoming'); return; }
    notificationService.scheduleFakeCall(delay, displayName).catch(() => {});
    timer.current = setTimeout(() => setPhase('incoming'), delay * 1000);
  }

  function endCall() {
    Vibration.cancel();
    router.back();
  }

  if (phase === 'incoming' || phase === 'incall') {
    return (
      <LinearGradient colors={gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex1}>
        <SafeAreaView style={styles.callScreen}>
          <View style={styles.callHeader}>
            <Text style={styles.callStatus}>
              {phase === 'incoming' ? 'mobile' : mmss(seconds)}
            </Text>
            <View style={styles.callAvatar}>
              <Ionicons name="person" size={56} color={colors.white} />
            </View>
            <Text style={styles.callerName}>{displayName}</Text>
            {phase === 'incoming' ? (
              <Text style={styles.incomingText}>incoming call…</Text>
            ) : (
              <Text style={styles.scriptText}>{FAKE_CALL_SCRIPT[line]}</Text>
            )}
          </View>

          {phase === 'incoming' ? (
            <View style={styles.incomingControls}>
              <CallButton icon="close" bg={colors.danger} label="Decline" onPress={endCall} />
              <CallButton icon="call" bg={colors.ok} label="Accept" onPress={() => setPhase('incall')} />
            </View>
          ) : (
            <View style={styles.inCallArea}>
              <View style={styles.ctrlRow}>
                <FakeControl icon="mic-off" label="mute" />
                <FakeControl icon="keypad" label="keypad" />
                <FakeControl icon="volume-high" label="speaker" />
              </View>
              <View style={styles.inCallControls}>
                {line < FAKE_CALL_SCRIPT.length - 1 ? (
                  <SafetyButton label="Next line" variant="primary" icon="chatbubble-ellipses-outline" onPress={() => setLine((l) => l + 1)} />
                ) : null}
                <SafetyButton label="End call" variant="danger" icon="call" onPress={endCall} />
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <Screen scroll>
      <Card style={styles.card}>
        <SectionLabel>Caller</SectionLabel>
        <View style={styles.chipRow}>
          {FAKE_CALLERS.map((c) => (
            <Chip key={c} label={c} selected={!customName.trim() && caller === c} onPress={() => { setCaller(c); setCustomName(''); }} icon="person-outline" />
          ))}
        </View>
        <FormField label="Or a custom name/number" value={customName} onChangeText={setCustomName} icon="create-outline" placeholder="e.g. Dad, or +352…" />
        <SectionLabel>When</SectionLabel>
        <View style={styles.chipRow}>
          {FAKE_CALL_DELAYS_SEC.map((d) => (
            <Chip key={d} label={DELAY_LABELS[d] ?? `${d}s`} selected={delay === d} onPress={() => setDelay(d)} />
          ))}
        </View>
      </Card>
      <SafetyButton label="Start fake call" variant="primary" icon="call" size="lg" onPress={start} />
      <Text style={styles.footer}>No real call is made. Your phone will ring and vibrate.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  callBtn: { alignItems: 'center', gap: space[2] },
  callCircle: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  callBtnLabel: { fontSize: fontSize.sm, fontFamily: font.regular, color: 'rgba(255,255,255,0.8)' },
  callScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[16],
  },
  callHeader: { marginTop: space[8], alignItems: 'center', gap: space[4], paddingHorizontal: space[8] },
  callStatus: { fontSize: fontSize.base, fontFamily: font.regular, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  callAvatar: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  callerName: { fontSize: fontSize['3xl'], fontFamily: font.display, color: colors.white },
  incomingText: { fontFamily: font.regular, color: 'rgba(255,255,255,0.6)' },
  scriptText: {
    marginTop: space[4],
    textAlign: 'center',
    fontSize: fontSize.lg,
    lineHeight: 28,
    fontFamily: font.regular,
    color: colors.white,
  },
  incomingControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: space[12],
  },
  inCallArea: { width: '100%', gap: space[8] },
  ctrlRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: space[8] },
  ctrl: { alignItems: 'center', gap: space[2] },
  ctrlCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  ctrlLabel: { fontSize: fontSize.xs, fontFamily: font.regular, color: 'rgba(255,255,255,0.7)' },
  inCallControls: { width: '100%', gap: space[3], paddingHorizontal: space[8] },
  card: { gap: space[4] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  footer: { textAlign: 'center', fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
});
