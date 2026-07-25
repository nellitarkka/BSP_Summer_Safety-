import { supabase } from '@/lib/supabase';
import type { CheckIn, CheckInStatus } from '@/types';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

async function record(sessionId: string, status: CheckInStatus, completed: boolean): Promise<CheckIn> {
  const userId = await requireUserId();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      session_id: sessionId,
      user_id: userId,
      scheduled_time: now,
      completed_time: completed ? now : null,
      status,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CheckIn;
}

export const checkinService = {
  // FR-28: "I am okay"
  confirm(sessionId: string) {
    return record(sessionId, 'confirmed', true);
  },
  // FR-29: "I need help"
  requestHelp(sessionId: string) {
    return record(sessionId, 'help_requested', true);
  },
  // FR-31: missed check-in -> mark + flip session status
  async markMissed(sessionId: string): Promise<CheckIn> {
    const ci = await record(sessionId, 'missed', false);
    await supabase.from('safety_sessions').update({ status: 'missed_checkin' }).eq('id', sessionId);
    return ci;
  },

  async listForSession(sessionId: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CheckIn[];
  },
};
