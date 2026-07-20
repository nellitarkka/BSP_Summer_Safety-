import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafetyButton } from '@/components/SafetyButton';
import { useActiveSession } from '@/hooks/useActiveSession';
import { gradients, colors, space, radius, fontSize, font } from '@/lib/theme';

// Tappable action tile for the quick-actions grid.
function ActionTile({
  icon, label, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={24} color={colors.brand} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: session } = useActiveSession();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status hero */}
        <LinearGradient
          colors={session ? gradients.ok : gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name={session ? 'walk' : 'shield-checkmark'} size={28} color={colors.white} />
          </View>
          {session ? (
            <Pressable onPress={() => router.push('/(app)/session')} accessibilityRole="button" accessibilityLabel="Resume active session">
              <Text style={styles.heroTitle}>Session active</Text>
              <Text style={styles.heroSubtitle}>
                {session.start_location} → {session.destination}
              </Text>
              <Text style={styles.heroCta}>Tap to resume →</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.heroTitle}>You&apos;re all set</Text>
              <Text style={styles.heroBody}>Start a safety session before you head out.</Text>
            </>
          )}
        </LinearGradient>

        <SafetyButton
          label="Start safety session"
          variant="primary"
          icon="navigate"
          size="lg"
          onPress={() => router.push('/(app)/route')}
        />

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <ActionTile icon="people" label="Trusted contacts" onPress={() => router.push('/(app)/contacts')} />
          <ActionTile icon="call" label="Fake call" onPress={() => router.push('/(app)/fake-call')} />
        </View>

        {/* Emergency */}
        <View style={styles.emergency}>
          <SafetyButton
            label="I feel unsafe"
            variant="danger"
            icon="alert-circle"
            size="lg"
            accessibilityHint="Opens quick safety actions"
            onPress={() => router.push('/(app)/unsafe')}
          />
          <Text style={styles.emergencyHint}>
            Quick access to alerts, calls, and safety tips.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { gap: space[4], paddingHorizontal: space[5], paddingVertical: space[4] },
  tile: {
    flex: 1,
    gap: space[3],
    borderRadius: radius['4xl'],
    backgroundColor: colors.card,
    padding: space[5],
  },
  tileIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
    backgroundColor: colors.brandSoft,
  },
  tileLabel: { fontSize: fontSize.base, fontFamily: font.bold, color: colors.text },
  hero: { gap: space[3], borderRadius: radius['4xl'], padding: space[6] },
  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroTitle: { fontSize: fontSize['2xl'], fontFamily: font.display, color: '#FFFFFF' },
  heroSubtitle: { marginTop: space[1], fontSize: fontSize.base, fontFamily: font.regular, color: 'rgba(255,255,255,0.85)' },
  heroCta: { marginTop: space[2], fontFamily: font.semibold, color: '#FFFFFF' },
  heroBody: { fontSize: fontSize.base, fontFamily: font.regular, color: 'rgba(255,255,255,0.85)' },
  actionsRow: { flexDirection: 'row', gap: space[4] },
  emergency: { marginTop: space[2], gap: space[2] },
  emergencyHint: { textAlign: 'center', fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
});
