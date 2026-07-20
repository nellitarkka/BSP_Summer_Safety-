import { useState } from 'react';
import { Text, Pressable, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { ScreenTitle } from '@/components/ui/Typography';
import { FormField } from '@/components/FormField';
import { SafetyButton } from '@/components/SafetyButton';
import { signUpSchema } from '@/lib/validation';
import { authService } from '@/services/authService';
import { SAFETY_DISCLAIMER } from '@/lib/constants';
import { colors, radius, space, fontSize, font } from '@/lib/theme';

export default function SignupScreen() {
  const router = useRouter();
  const [v, setV] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '' });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof v) => (text: string) => setV((s) => ({ ...s, [k]: text }));

  async function handleSubmit() {
    const parsed = signUpSchema.safeParse({ ...v, disclaimer_accepted: accepted });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await authService.signUp(parsed.data);
      // AuthGate redirects to (app) once the session is established.
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign up failed';
      setErrors({ email: msg.includes('registered') ? 'An account with this email already exists. Try logging in.' : msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenTitle title="Create account" subtitle="A few details to set up your safety profile." />

      <Card style={styles.formCard}>
        <FormField label="Full name" value={v.full_name} onChangeText={set('full_name')} icon="person-outline" error={errors.full_name} />
        <FormField label="Email" value={v.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" icon="mail-outline" error={errors.email} />
        <FormField label="Phone (optional)" value={v.phone} onChangeText={set('phone')} keyboardType="phone-pad" icon="call-outline" error={errors.phone} />
        <FormField label="Password" value={v.password} onChangeText={set('password')} secureTextEntry icon="lock-closed-outline" error={errors.password} hint="At least 8 characters" />
        <FormField label="Confirm password" value={v.confirm_password} onChangeText={set('confirm_password')} secureTextEntry icon="lock-closed-outline" error={errors.confirm_password} />
      </Card>

      <Card tone="brand" style={styles.disclaimerCard}>
        <Ionicons name="information-circle" size={22} color={colors.brand} />
        <Text style={styles.disclaimerText}>{SAFETY_DISCLAIMER}</Text>
      </Card>

      <Pressable style={styles.checkboxRow} onPress={() => setAccepted((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
        <Text style={styles.checkboxLabel}>I understand the safety disclaimer</Text>
        <Switch value={accepted} onValueChange={setAccepted} trackColor={{ true: colors.brand }} accessibilityLabel="Accept safety disclaimer" />
      </Pressable>
      {errors.disclaimer_accepted ? <Text accessibilityRole="alert" style={styles.errorText}>{errors.disclaimer_accepted}</Text> : null}

      <SafetyButton label={submitting ? 'Creating…' : 'Create account'} variant="primary" icon="person-add-outline" loading={submitting} onPress={handleSubmit} />
      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.link}>
        <Text style={styles.mutedText}>Already have an account? <Text style={styles.linkText}>Log in</Text></Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formCard: { gap: space[4] },
  disclaimerCard: { flexDirection: 'row', gap: space[3] },
  disclaimerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 20, fontFamily: font.regular, color: colors.text },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius['2xl'],
    backgroundColor: colors.white,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  checkboxLabel: { flex: 1, fontSize: fontSize.sm, fontFamily: font.medium, color: colors.text },
  errorText: { fontSize: fontSize.xs, fontFamily: font.medium, color: colors.danger },
  link: { paddingVertical: space[1] },
  linkText: { fontFamily: font.semibold, color: colors.brand },
  mutedText: { textAlign: 'center', fontFamily: font.regular, color: colors.muted },
});
