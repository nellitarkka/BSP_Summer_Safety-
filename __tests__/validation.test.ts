import { signUpSchema, loginSchema, contactSchema, profileSchema } from '@/lib/validation';

// @feature US-001/US-005 @priority must
describe('validation schemas', () => {
  describe('signUpSchema (US-001: FR-01/07/09)', () => {
    const base = {
      full_name: 'Sam Doe',
      email: 'sam@example.com',
      password: 'password1',
      confirm_password: 'password1',
      disclaimer_accepted: true as const,
    };
    it('accepts a valid sign up with disclaimer accepted', () => {
      expect(signUpSchema.safeParse(base).success).toBe(true);
    });
    it('rejects when disclaimer not accepted (FR-07/FR-09)', () => {
      const r = signUpSchema.safeParse({ ...base, disclaimer_accepted: false });
      expect(r.success).toBe(false);
    });
    it('rejects mismatched passwords', () => {
      const r = signUpSchema.safeParse({ ...base, confirm_password: 'nope' });
      expect(r.success).toBe(false);
    });
    it('rejects short password', () => {
      const r = signUpSchema.safeParse({ ...base, password: 'short', confirm_password: 'short' });
      expect(r.success).toBe(false);
    });
    it('rejects invalid email', () => {
      const r = signUpSchema.safeParse({ ...base, email: 'nope' });
      expect(r.success).toBe(false);
    });
  });

  describe('contactSchema (US-005: FR-14)', () => {
    const base = {
      name: 'Mom',
      phone: '+358401234567',
      email: '',
      relationship: '',
      preferred_method: 'sms' as const,
      is_emergency: true,
      priority: 1,
    };
    it('accepts a contact with a phone', () => {
      expect(contactSchema.safeParse(base).success).toBe(true);
    });
    it('accepts a contact with only an email', () => {
      const r = contactSchema.safeParse({ ...base, phone: '', email: 'mom@example.com', preferred_method: 'email' });
      expect(r.success).toBe(true);
    });
    it('rejects a contact with no name (FR-14)', () => {
      expect(contactSchema.safeParse({ ...base, name: '' }).success).toBe(false);
    });
    it('rejects a contact with neither phone nor email (FR-14)', () => {
      expect(contactSchema.safeParse({ ...base, phone: '', email: '' }).success).toBe(false);
    });
  });

  describe('loginSchema / profileSchema', () => {
    it('login requires email + password', () => {
      expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
    });
    it('profile requires a full name', () => {
      expect(profileSchema.safeParse({ full_name: 'A', phone: '' }).success).toBe(true);
      expect(profileSchema.safeParse({ full_name: '', phone: '' }).success).toBe(false);
    });
  });
});
