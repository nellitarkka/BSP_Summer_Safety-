import { useCallback, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ContactForm } from '@/components/ContactForm';
import { useContacts, useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { contactFormInitial, type ContactFormMode } from '@/lib/contactForm';
import type { ContactInput } from '@/lib/validation';
import { colors, font } from '@/lib/theme';

// Shared body for the Add (contact-new) and Edit (contact-edit) screens. Kept as one
// component so the two routes stay in sync while remaining SEPARATE screen instances —
// which is what stops "Add" inheriting the previously edited contact (Bug 3, round 2).
export function ContactFormScreen({ mode, editId }: { mode: ContactFormMode; editId?: string }) {
  const router = useRouter();
  const { data, isLoading } = useContacts();
  const initial = contactFormInitial(mode, editId, data ?? []);
  const create = useCreateContact();
  const update = useUpdateContact();
  const [error, setError] = useState<string>();

  // Remount the form on every focus so no field values survive across visits: Add is
  // always empty; Edit always reseeds the selected contact. This defends against the
  // persistent Tabs screen instance retaining local form state.
  const [focusNonce, setFocusNonce] = useState(0);
  useFocusEffect(useCallback(() => setFocusNonce((n) => n + 1), []));

  async function onSubmit(input: ContactInput) {
    setError(undefined);
    try {
      if (mode === 'edit' && editId) await update.mutateAsync({ id: editId, input });
      else await create.mutateAsync(input);
      router.back();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    }
  }

  // Editing: wait until the contact loads so the form seeds correctly.
  if (mode === 'edit' && editId && !initial && isLoading) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <ContactForm
        key={`${mode}-${editId ?? 'new'}-${focusNonce}`}
        initial={initial}
        submitting={create.isPending || update.isPending}
        onSubmit={onSubmit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: font.medium, color: colors.danger },
  loading: { fontFamily: font.regular, color: colors.muted },
});
