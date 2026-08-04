import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUnsafeMode } from '@/hooks/useUnsafeMode';
import { alertService, mapsLink } from '@/services/alertService';
import { locationService } from '@/services/locationService';
import { EMERGENCY_NUMBER } from '@/lib/constants';
import { colors, space, radius, fontSize, font } from '@/lib/theme';

interface Pending {
  title: string; message: string; confirmLabel: string; run: () => void;
}

type Tone = 'danger' | 'brand' | 'accent' | 'muted';
const TONE_BG: Record<Tone, string> = { danger: colors.dangerSoft, brand: colors.brandSoft, accent: colors.accentSoft, muted: colors.brandSoft };
const TONE_FG: Record<Tone, string> = { danger: colors.danger, brand: colors.brand, accent: colors.accent, muted: colors.muted };

function ActionRow({
  icon, label, sublabel, tone, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; sublabel?: string; tone: Tone; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: TONE_BG[tone] }]}>
        <Ionicons name={icon} size={24} color={TONE_FG[tone]} />
      </View>
      <View style={styles.actionBody}>
        <Text style={styles.actionLabel}>{label}</Text>
        {sublabel ? <Text style={styles.actionSub}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function UnsafeModeScreen() {
  const router = useRouter();
  const { orderedContacts, session, instantAlerts, composeMessage } = useUnsafeMode();
  const [pending, setPending] = useState<Pending | null>(null);

  function needContact(): boolean {
    if (orderedContacts.length === 0) {
      Alert.alert('No trusted contacts', 'Add at least one trusted contact to send an alert.');
      return false;
    }
    return true;
  }

  function callEmergency() {
    setPending({
      title: 'Call emergency services?',
      message: `This will call ${EMERGENCY_NUMBER}. Only continue if you are in immediate danger.`,
      confirmLabel: 'Call',
      run: () => { setPending(null); alertService.callEmergency(); },
    });
  }

  async function sendAlert() {
    if (!needContact()) return;
    const contact = orderedContacts[0]!;
    const message = await composeMessage();
    const run = async () => {
      setPending(null);
      await alertService.sendAlertToContact(contact, message, session?.id ?? null);
      Alert.alert('Alert sent', `Sent to ${contact.name}.`);
    };
    if (instantAlerts) { await run(); return; }
    setPending({ title: `Alert ${contact.name}?`, message, confirmLabel: 'Send alert', run });
  }

  function callTrusted() {
    if (!needContact()) return;
    const contact = orderedContacts[0]!;
    setPending({
      title: `Call ${contact.name}?`,
      message: contact.phone ?? 'No phone number on file.',
      confirmLabel: 'Call',
      run: () => { setPending(null); alertService.callContact(contact); },
    });
  }

  async function shareLocation() {
    try {
      const c = await locationService.getCurrent();
      await Linking.openURL(mapsLink(c.latitude, c.longitude));
    } catch {
      Alert.alert('Location off', 'Enable location to share your position.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="alert-circle" size={24} color={colors.danger} />
          <Text style={styles.bannerText}>
            Choose an action. Nothing is sent until you confirm.
          </Text>
        </View>

        <ActionRow icon="call" label="Call emergency services" sublabel={`Dials ${EMERGENCY_NUMBER}`} tone="danger" onPress={callEmergency} />
        <ActionRow icon="paper-plane" label="Alert trusted contact" sublabel="Send your status and location" tone="danger" onPress={sendAlert} />
        <ActionRow icon="call-outline" label="Call trusted contact" tone="brand" onPress={callTrusted} />
        <ActionRow icon="people-circle" label="Start fake call" sublabel="Stage an excuse to leave" tone="brand" onPress={() => router.push('/(app)/fake-call')} />
        <ActionRow icon="bulb" label="Get AI safety tips" tone="accent" onPress={() => router.push('/(app)/ai-tips')} />
        <ActionRow icon="location" label="Share my location" tone="muted" onPress={shareLocation} />

        <Pressable onPress={() => router.back()} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.footer}>
          The app never calls or alerts anyone without your confirmation.
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel}
        destructive
        onConfirm={() => pending?.run()}
        onCancel={() => setPending(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { gap: space[3], paddingHorizontal: space[5], paddingVertical: space[4] },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderRadius: radius['4xl'],
    backgroundColor: colors.dangerSoft,
    padding: space[4],
  },
  bannerText: { flex: 1, fontSize: fontSize.sm, fontFamily: font.medium, color: colors.text },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    borderRadius: radius['4xl'],
    backgroundColor: colors.card,
    padding: space[4],
  },
  actionIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
  },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: fontSize.base, fontFamily: font.bold, color: colors.text },
  actionSub: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
  cancel: { marginTop: space[2], paddingVertical: space[3] },
  cancelText: { textAlign: 'center', fontSize: fontSize.base, fontFamily: font.semibold, color: colors.muted },
  footer: { textAlign: 'center', fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
});
