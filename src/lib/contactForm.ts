import type { TrustedContact } from '@/types';

// Add and Edit are separate routes (contact-new / contact-edit) so the reused Tabs
// screen and iOS param persistence can no longer make "Add" inherit the previous
// contact (Bug 3, round 2). This resolves which contact — if any — seeds the form:
//
// - 'add'  → ALWAYS undefined. Add can never inherit a contact, whatever id/contacts
//            happen to be around. This is the invariant the round-1 fix failed to hold.
// - 'edit' → the contact matching editId, or undefined until it loads.
export type ContactFormMode = 'add' | 'edit';

export function contactFormInitial(
  mode: ContactFormMode,
  editId: string | undefined,
  contacts: TrustedContact[],
): TrustedContact | undefined {
  if (mode === 'add') return undefined;
  return editId ? contacts.find((c) => c.id === editId) : undefined;
}
