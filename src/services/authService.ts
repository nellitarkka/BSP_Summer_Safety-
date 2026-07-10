import { supabase } from '@/lib/supabase';

// Auth flows (FR-01..05). Sign-up metadata feeds the handle_new_user trigger,
// which creates the profiles row with disclaimer_accepted.

interface SignUpParams {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  disclaimer_accepted: boolean;
}

export const authService = {
  async signUp({ full_name, email, password, phone, disclaimer_accepted }: SignUpParams) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone: phone || null, disclaimer_accepted },
      },
    });
    if (error) throw error;
    return data;
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    // Redirect target handled by app deep link; neutral result (no enumeration).
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
};
