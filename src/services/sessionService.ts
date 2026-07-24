import { supabase } from '@/lib/supabase';
import type { RouteSummary, SafetySession } from '@/types';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

interface CreateSessionParams {
  start_location: string;
  destination: string;
  route_data: RouteSummary | null;
  checkin_interval_minutes: number;
  location_sharing_enabled: boolean;
  contact_ids: string[];
}

export const sessionService = {
  async getActive(): Promise<SafetySession | null> {
    const { data, error } = await supabase
      .from('safety_sessions')
      .select('*')
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return (data as SafetySession | null) ?? null;
  },

  async create(params: CreateSessionParams): Promise<SafetySession> {
    const userId = await requireUserId();
    const { contact_ids, ...session } = params;
    const { data, error } = await supabase
      .from('safety_sessions')
      .insert({ ...session, user_id: userId, status: 'active', start_time: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw error;
    const created = data as SafetySession;

    if (contact_ids.length > 0) {
      const rows = contact_ids.map((contact_id) => ({
        user_id: userId,
        session_id: created.id,
        contact_id,
      }));
      const { error: linkError } = await supabase.from('session_contacts').insert(rows);
      if (linkError) throw linkError;
    }
    return created;
  },

  async setStatus(id: string, status: SafetySession['status']): Promise<SafetySession> {
    const { data, error } = await supabase
      .from('safety_sessions')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as SafetySession;
  },

  complete(id: string) {
    return this.setStatus(id, 'completed');
  },
  cancel(id: string) {
    return this.setStatus(id, 'cancelled');
  },
};
