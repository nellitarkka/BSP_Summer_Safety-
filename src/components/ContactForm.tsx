import { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SectionLabel } from '@/components/ui/Typography';
import { FormField } from '@/components/FormField';
import { SafetyButton } from '@/components/SafetyButton';
import { contactSchema, type ContactInput } from '@/lib/validation';
import type { PreferredMethod, TrustedContact } from '@/types';
import { colors, fontSize, space, font } from '@/lib/theme';

const METHODS: PreferredMethod[] = ['sms', 'email', 'call', 'app'];

interface ContactFormProps {
  initial?: TrustedContact;
  submitting?: boolean;
  onSubmit: (input: ContactInput) => void;
}

export function ContactForm({ initial, submitting, onSubmit }: ContactFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [relationship, setRelationship] = useState(initial?.relationship ?? '');
  const [method, setMethod] = useState<PreferredMethod>(initial?.preferred_method ?? 'app');
  const [isEmergency, setIsEmergency] = useState(initial?.is_emergency ?? false);
  const [priority, setPriority] = useState(initial?.priority ? String(initial.priority) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit() {
    const parsed = contactSchema.safeParse({
      name, phone, email, relationship,
      preferred_method: method,
      is_emergency: isEmergency,
      priority: priority ? Number(priority) : null,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <FormField label="Name" value={name} onChangeText={setName} icon="person-outline" error={errors.name} />
        <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" error={errors.phone} hint="Phone or email required" />
        <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" error={errors.email} />
        <FormField label="Relationship (optional)" value={relationship} onChangeText={setRelationship} icon="heart-outline" />

        <View style={styles.methodGroup}>
          <SectionLabel>Preferred method</SectionLabel>
          <View style={styles.methodRow}>
            {METHODS.map((m) => (
              <Chip key={m} label={m.toUpperCase()} selected={method === m} onPress={() => setMethod(m)} />
            ))}
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.emergencyRow}>
          <Text style={styles.emergencyLabel}>Emergency contact</Text>
          <Switch value={isEmergency} onValueChange={setIsEmergency} trackColor={{ true: colors.brand }} accessibilityLabel="Emergency contact" />
        </View>
        {isEmergency ? (
          <FormField label="Emergency priority (1 = first)" value={priority} onChangeText={setPriority} keyboardType="number-pad" icon="flag-outline" />
        ) : null}
      </Card>

      <SafetyButton label={submitting ? 'Saving…' : 'Save contact'} variant="primary" icon="checkmark" loading={submitting} onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  card: { gap: space[4] },
  methodGroup: { gap: space[2] },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emergencyLabel: { fontSize: fontSize.sm, fontFamily: font.semibold, color: colors.text },
});
