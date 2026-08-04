import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/FormField';
import { SafetyButton } from '@/components/SafetyButton';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { profileSchema } from '@/lib/validation';
import { colors, space, radius, fontSize, font } from '@/lib/theme';

export default function ProfileScreen() {
  const { data, isLoading } = useProfile();
  const update = useUpdateProfile();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setFullName(data.full_name);
      setPhone(data.phone ?? '');
    }
  }, [data]);

  async function handleSave() {
    const parsed = profileSchema.safeParse({ full_name: fullName, phone });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await update.mutateAsync({ full_name: parsed.data.full_name, phone: parsed.data.phone || null });
      setSaved(true);
    } catch {
      setErrors({ full_name: "Couldn't save. Check your connection." });
    }
  }

  if (isLoading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.brand} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.brand} />
        </View>
        <Text style={styles.email}>{data?.email}</Text>
      </View>
      <Card style={styles.form}>
        <FormField label="Full name" value={fullName} onChangeText={setFullName} icon="person-outline" error={errors.full_name} />
        <FormField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" />
        <SafetyButton label={update.isPending ? 'Saving…' : 'Save'} variant="primary" icon="checkmark" loading={update.isPending} onPress={handleSave} />
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.saved}>Profile updated</Text>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space[2], paddingVertical: space[2] },
  avatar: {
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.brandSoft,
  },
  email: { fontSize: fontSize.sm, fontFamily: font.regular, color: colors.muted },
  form: { gap: space[4] },
  saved: { textAlign: 'center', fontFamily: font.semibold, color: colors.ok },
});
