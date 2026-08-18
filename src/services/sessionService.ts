import { supabase } from '@/lib/supabase';
import type { RouteSummary, SafetySession } from '@/types';

// Raised when the user already has an active session (DB enforces at most one per user
// via the partial unique index uq_safety_sessions_one_active). The UI catches this to
// offer resuming the existing session instead of surfacing a raw DB error (Bug 2).
export class ActiveSessionError extends Error {
  constructor() {
    super('An active safety session already exists.');
    this.name = 'ActiveSessionError';
  }
}

// Detect the "one active session" unique-constraint violation from a Supabase/Postgres
// error, whether by SQLSTATE 23505 or by the constraint/index name. Pure + testable.
export function isActiveSessionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; details?: string };
  if (e.code === '23505') return true;
  const text = `${e.message ?? ''} ${e.details ?? ''}`;
  return /uq_safety_sessions_one_active/.test(text);
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export interface CreateSessionParams {
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

    // Detect an existing active session up front so we can offer to resume it rather
    // than let the DB uniqueness constraint fail (Bug 2). Preserves the constraint.
    const existing = await this.getActive();
    if (existing) throw new ActiveSessionError();

    const { data, error } = await supabase
      .from('safety_sessions')
      .insert({ ...session, user_id: userId, status: 'active', start_time: new Date().toISOString() })
      .select('*')
      .single();
    // Handle the race where a session became active between the check and the insert:
    // the constraint (still enforced) fires and we translate it, not surface it raw.
    if (error) throw isActiveSessionConflict(error) ? new ActiveSessionError() : error;
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
