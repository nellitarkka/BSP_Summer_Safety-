import { contactFormInitial } from '@/lib/contactForm';
import type { TrustedContact } from '@/types';

const contact = (id: string, name: string): TrustedContact => ({
  id, user_id: 'u1', name, phone: '123', email: null, relationship: null,
  preferred_method: 'app', is_emergency: false, priority: null,
  created_at: '', updated_at: '',
});

const CONTACTS = [contact('X', 'Alice'), contact('Y', 'Bob')];

// @feature US-010 @priority must
// Bug 3 (round 2): Add and Edit are separate routes; the state-transition invariant is
// that "Add" can NEVER inherit a previously edited contact — even if a stale id and the
// contacts list are present (which is exactly what broke on-device). Component rendering
// is not possible in this node/ts-jest harness, so we pin the invariant the fix relies on.
describe('contactFormInitial — Add never inherits a contact (Bug 3)', () => {
  it('Add mode returns undefined even when a stale id + matching contact exist', () => {
    // Simulates Edit "X" → Contacts → Add: a leaked 'X' must NOT seed the Add form.
    expect(contactFormInitial('add', 'X', CONTACTS)).toBeUndefined();
  });

  it('Add mode returns undefined with no id', () => {
    expect(contactFormInitial('add', undefined, CONTACTS)).toBeUndefined();
  });

  it('Edit mode seeds only the selected contact', () => {
    expect(contactFormInitial('edit', 'X', CONTACTS)?.name).toBe('Alice');
    expect(contactFormInitial('edit', 'Y', CONTACTS)?.name).toBe('Bob');
  });

  it('Edit mode returns undefined until the contact is available', () => {
    expect(contactFormInitial('edit', undefined, CONTACTS)).toBeUndefined();
    expect(contactFormInitial('edit', 'missing', CONTACTS)).toBeUndefined();
  });
});
