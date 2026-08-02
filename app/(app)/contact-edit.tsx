import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ContactForm } from '@/components/ContactForm';
import { useContacts, useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import type { ContactInput } from '@/lib/validation';
import { colors, font } from '@/lib/theme';

export default function ContactEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isLoading } = useContacts();
  const initial = id ? data?.find((c) => c.id === id) : undefined;
  const create = useCreateContact();
  const update = useUpdateContact();
  const [error, setError] = useState<string>();

  async function onSubmit(input: ContactInput) {
    setError(undefined);
    try {
      if (id) await update.mutateAsync({ id, input });
      else await create.mutateAsync(input);
      router.back();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    }
  }

  // Editing: wait until the contact loads so the form seeds correctly.
  if (id && !initial && isLoading) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {/* key forces a fresh form when switching between add/edit so no stale values leak in. */}
      <ContactForm key={id ?? 'new'} initial={initial} submitting={create.isPending || update.isPending} onSubmit={onSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: font.medium, color: colors.danger },
  loading: { fontFamily: font.regular, color: colors.muted },
});
