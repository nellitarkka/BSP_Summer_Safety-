import { supabase } from '@/lib/supabase';
import type { TrustedContact } from '@/types';
import type { ContactInput } from '@/lib/validation';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

function toRow(input: ContactInput, userId: string) {
  return {
    user_id: userId,
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    relationship: input.relationship || null,
    preferred_method: input.preferred_method,
    is_emergency: input.is_emergency,
    priority: input.priority,
  };
}

export const contactService = {
  async list(): Promise<TrustedContact[]> {
    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('*')
      .order('is_emergency', { ascending: false })
      .order('priority', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as TrustedContact[];
  },

  async create(input: ContactInput): Promise<TrustedContact> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('trusted_contacts')
      .insert(toRow(input, userId))
      .select('*')
      .single();
    if (error) throw error;
    return data as TrustedContact;
  },

  async update(id: string, input: ContactInput): Promise<TrustedContact> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('trusted_contacts')
      .update(toRow(input, userId))
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as TrustedContact;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('trusted_contacts').delete().eq('id', id);
    if (error) throw error;
  },
};
