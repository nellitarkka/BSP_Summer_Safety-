import { QueryClient } from '@tanstack/react-query';
import { primeActiveSession } from '@/lib/activeSessionCache';
import type { SafetySession } from '@/types';

const session = (id: string): SafetySession => ({
  id, user_id: 'u1', start_location: 'A', destination: 'B', route_data: null,
  start_time: '', expected_arrival_time: null, checkin_interval_minutes: 30,
  status: 'active', location_sharing_enabled: false, created_at: '', updated_at: '',
});

// @feature US-018 @priority must
// Bug 2 (round 2): the Session screen showed "No active session" because a `null` cached
// under ['active-session'] (30 s staleTime) was never updated after create. The fix
// primes the cache on create/end. This drives that fix with a real QueryClient (react
// components can't render in this harness, but react-query runs in node).
describe('primeActiveSession — active-session cache is updated after create/end (Bug 2)', () => {
  it('replaces a stale cached null with the newly created session', () => {
    const qc = new QueryClient();
    // Reproduce the stale state home.tsx leaves behind on app open.
    qc.setQueryData(['active-session'], null);
    expect(qc.getQueryData(['active-session'])).toBeNull();

    primeActiveSession(qc, session('s-new'));

    expect(qc.getQueryData<SafetySession | null>(['active-session'])?.id).toBe('s-new');
  });

  it('clears the cache to null on end', () => {
    const qc = new QueryClient();
    qc.setQueryData(['active-session'], session('s-old'));
    primeActiveSession(qc, null);
    expect(qc.getQueryData(['active-session'])).toBeNull();
  });

  it('marks the query invalidated so the Session screen refetches to confirm', () => {
    const qc = new QueryClient();
    qc.setQueryData(['active-session'], null);
    primeActiveSession(qc, session('s-new'));
    const state = qc.getQueryState(['active-session']);
    expect(state?.isInvalidated).toBe(true);
  });
});
