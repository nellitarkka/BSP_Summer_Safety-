import { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { ScreenTitle } from '@/components/ui/Typography';
import { FormField } from '@/components/FormField';
import { SafetyButton } from '@/components/SafetyButton';
import { loginSchema } from '@/lib/validation';
import { authService } from '@/services/authService';
import { colors, space, weight } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await authService.login(parsed.data.email, parsed.data.password);
      // AuthGate handles redirect into (app).
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      if (msg.includes('not confirmed')) {
        setErrors({ password: 'Please confirm your email first (check your inbox), or disable email confirmation in Supabase.' });
      } else {
        setErrors({ password: 'Incorrect email or password. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll edges={['top', 'bottom']} contentStyle={styles.content}>
      <ScreenTitle title="Welcome back" subtitle="Log in to continue keeping safe." />
      <Card style={styles.card}>
        <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" icon="mail-outline" error={errors.email} />
        <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" error={errors.password} />
        <SafetyButton label={submitting ? 'Logging in…' : 'Log in'} variant="primary" icon="log-in-outline" loading={submitting} onPress={handleSubmit} />
      </Card>
      <Pressable onPress={() => router.push('/(auth)/reset')} style={styles.link}>
        <Text style={styles.linkText}>Forgot password?</Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/(auth)/signup')} style={styles.link}>
        <Text style={styles.mutedText}>No account? <Text style={styles.linkText}>Sign up</Text></Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  card: { gap: space[4] },
  link: { paddingVertical: space[1] },
  linkText: { textAlign: 'center', fontWeight: weight.semibold, color: colors.brand },
  mutedText: { textAlign: 'center', color: colors.muted },
});
