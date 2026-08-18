import type { QueryClient } from '@tanstack/react-query';
import type { SafetySession } from '@/types';

// The React Query key for the current active session.
export const ACTIVE_SESSION_KEY = ['active-session'] as const;

// Prime the active-session cache after a create/end so the Session screen shows the new
// state immediately, then invalidate to confirm against the DB (round-2 Bug 2 fix). Pure
// — depends only on react-query + a type, so it is unit-testable in the node harness.
export function primeActiveSession(qc: QueryClient, session: SafetySession | null): void {
  qc.setQueryData(ACTIVE_SESSION_KEY, session);
  qc.invalidateQueries({ queryKey: ACTIVE_SESSION_KEY });
}
