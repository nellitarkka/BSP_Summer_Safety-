import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { SafetyButton } from '@/components/SafetyButton';
import { colors, fontSize, space, font } from '@/lib/theme';

interface CheckInTimerProps {
  intervalMinutes: number;
  onConfirm: () => void;
  onHelp: () => void;
  onExpire: () => void;
}

function format(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Counts down to the next check-in. Reaching zero fires onExpire once (missed).
// "Extend" resets the countdown (FR-30).
export function CheckInTimer({ intervalMinutes, onConfirm, onHelp, onExpire }: CheckInTimerProps) {
  const [remaining, setRemaining] = useState(intervalMinutes * 60);
  const expiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
    }
  }, [remaining, onExpire]);

  function reset() {
    expiredRef.current = false;
    setRemaining(intervalMinutes * 60);
  }

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="timer-outline" size={16} color={colors.muted} />
          <Text style={styles.label}>Next check-in</Text>
        </View>
        <Text
          accessibilityLabel={`Next check-in in ${format(remaining)}`}
          style={styles.time}
        >
          {format(remaining)}
        </Text>
      </Card>
      <SafetyButton label="I'm OK" variant="ok" icon="checkmark-circle" onPress={() => { onConfirm(); reset(); }} />
      <SafetyButton label="I need help" variant="danger" icon="alert-circle" onPress={onHelp} />
      <SafetyButton label="Extend timer" variant="outline" icon="refresh" onPress={reset} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  card: { alignItems: 'center', gap: space[1], paddingVertical: 28 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: {
    fontSize: fontSize.xs,
    fontFamily: font.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
  },
  time: {
    fontSize: 60,
    fontFamily: font.display,
    letterSpacing: -1,
    color: colors.text,
  },
});
