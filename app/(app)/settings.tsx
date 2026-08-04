import { View, Text, Switch, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SectionLabel } from '@/components/ui/Typography';
import { SafetyButton } from '@/components/SafetyButton';
import { useProfile, useUpdatePrivacy } from '@/hooks/useProfile';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/authService';
import type { PrivacyPreferences } from '@/types';
import { colors, space, radius, fontSize, font } from '@/lib/theme';

function ToggleRow({ icon, label, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand }} accessibilityLabel={label} />
    </View>
  );
}

function LinkRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.muted} />
      <Text style={[styles.rowLabel, danger ? styles.dangerText : null]}>{label}</Text>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

function Sep() {
  return <View style={styles.sep} />;
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { data, isLoading } = useProfile();
  const updatePrivacy = useUpdatePrivacy();

  function setPref(key: keyof PrivacyPreferences, val: boolean) {
    if (!data) return;
    updatePrivacy.mutate({ ...data.privacy_preferences, [key]: val });
  }

  function confirmDeleteHistory() {
    Alert.alert('Delete session history', 'This removes your past sessions, check-ins and alerts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => profileService.deleteSessionHistory() },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert('Delete account', 'This permanently deletes your account and all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: () => profileService.deleteAccount() },
    ]);
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }

  const p = data.privacy_preferences;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <SectionLabel>Account</SectionLabel>
        <Group>
          <LinkRow icon="person-circle-outline" label="Profile" onPress={() => router.push('/(app)/profile')} />
        </Group>

        <SectionLabel>Privacy</SectionLabel>
        <Group>
          <ToggleRow icon="location-outline" label="Location sharing" value={p.location_sharing} onChange={(v) => setPref('location_sharing', v)} />
          <Sep />
          <ToggleRow icon="document-text-outline" label="Store my AI situation text" value={p.store_ai_text} onChange={(v) => setPref('store_ai_text', v)} />
          <Sep />
          <ToggleRow icon="flash-outline" label="Instant alerts (skip confirmation)" value={p.instant_alerts} onChange={(v) => setPref('instant_alerts', v)} />
          <Sep />
          <LinkRow icon="shield-outline" label="View privacy notice" onPress={() => router.push('/(app)/privacy-notice')} />
          <Sep />
          <LinkRow icon="server-outline" label="Data sources & how we use data" onPress={() => router.push('/(app)/data-sources')} />
        </Group>

        <SectionLabel>Data</SectionLabel>
        <Group>
          <LinkRow icon="time-outline" label="Delete safety session history" onPress={confirmDeleteHistory} />
          <Sep />
          <LinkRow icon="trash-outline" label="Delete account" onPress={confirmDeleteAccount} danger />
        </Group>

        <View style={styles.logout}>
          <SafetyButton label="Log out" variant="outline" icon="log-out-outline" onPress={() => authService.logout()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  container: { gap: space[3], paddingHorizontal: space[5], paddingVertical: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: fontSize.base, fontFamily: font.regular, color: colors.text },
  dangerText: { color: colors.danger },
  sep: { height: 1, backgroundColor: colors.line },
  group: { overflow: 'hidden', borderRadius: radius['4xl'], backgroundColor: colors.card },
  logout: { marginTop: space[3] },
});
