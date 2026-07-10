import { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { ScreenTitle } from '@/components/ui/Typography';
import { FormField } from '@/components/FormField';
import { SafetyButton } from '@/components/SafetyButton';
import { resetSchema } from '@/lib/validation';
import { authService } from '@/services/authService';
import { colors, space, weight } from '@/lib/theme';

export default function ResetScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const parsed = resetSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await authService.resetPassword(parsed.data.email);
    } catch {
      // Stay neutral — no account enumeration.
    } finally {
      setSubmitting(false);
      setSent(true); // Neutral confirmation regardless of outcome.
    }
  }

  return (
    <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
      <ScreenTitle title="Reset password" subtitle="We'll email you a secure reset link." />
      {sent ? (
        <Card tone="ok" style={styles.sentCard}>
          <Ionicons name="checkmark-circle" size={24} color={colors.ok} />
          <Text style={styles.sentText}>If that email exists, a reset link has been sent.</Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" error={error} />
          <SafetyButton label={submitting ? 'Sending…' : 'Send reset link'} variant="primary" icon="paper-plane-outline" loading={submitting} onPress={handleSubmit} />
        </Card>
      )}
      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.link}>
        <Text style={styles.linkText}>Back to log in</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  card: { gap: space[4] },
  sentCard: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  sentText: { flex: 1, color: colors.text },
  link: { paddingVertical: space[1] },
  linkText: { textAlign: 'center', fontWeight: weight.semibold, color: colors.brand },
});
