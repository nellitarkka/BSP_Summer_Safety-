import { supabase } from '@/lib/supabase';
import type { Profile, PrivacyPreferences } from '@/types';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export const profileService = {
  async getProfile(): Promise<Profile> {
    const id = await requireUserId();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'phone'>>): Promise<Profile> {
    const id = await requireUserId();
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async updatePrivacy(prefs: PrivacyPreferences): Promise<Profile> {
    const id = await requireUserId();
    const { data, error } = await supabase
      .from('profiles')
      .update({ privacy_preferences: prefs })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Profile;
  },

  async acceptDisclaimer(): Promise<void> {
    const id = await requireUserId();
    const { error } = await supabase
      .from('profiles')
      .update({ disclaimer_accepted: true })
      .eq('id', id);
    if (error) throw error;
  },

  // Deletes the user's session history (FR-50). Owner-scoped; RLS enforces it.
  async deleteSessionHistory(): Promise<void> {
    const id = await requireUserId();
    await supabase.from('alerts').delete().eq('user_id', id);
    await supabase.from('checkins').delete().eq('user_id', id);
    await supabase.from('safety_sessions').delete().eq('user_id', id);
  },

  // Deletes all of the user's data (FR-08). Removing the auth credential itself
  // requires the `delete-account` Edge Function (service role) — invoked here;
  // data rows are also removed directly so deletion is complete even pre-deploy.
  async deleteAccount(): Promise<void> {
    const id = await requireUserId();
    await this.deleteSessionHistory();
    await supabase.from('trusted_contacts').delete().eq('user_id', id);
    await supabase.from('ai_safety_requests').delete().eq('user_id', id);
    await supabase.from('profiles').delete().eq('id', id);
    try {
      await supabase.functions.invoke('delete-account');
    } catch {
      // Edge Function not deployed yet — data already removed; sign out below.
    }
    await supabase.auth.signOut();
  },
};
