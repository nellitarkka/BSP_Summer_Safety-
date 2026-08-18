import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService, type CreateSessionParams } from '@/services/sessionService';
import { ACTIVE_SESSION_KEY, primeActiveSession } from '@/lib/activeSessionCache';

// primeActiveSession lives in @/lib/activeSessionCache (pure, unit-tested).
export { primeActiveSession } from '@/lib/activeSessionCache';

// The current active session changes over time (created on Route, ended on Session), so
// it must always reflect the DB on mount. Round-2 root cause: with the shared 30 s
// staleTime, a `null` cached by home.tsx on app open stayed "fresh", so the Session
// screen showed "No active session" after a real session was created. staleTime:0 +
// refetchOnMount:'always' plus cache priming after create/end (below) fixes it.
export function useActiveSession() {
  return useQuery({
    queryKey: ACTIVE_SESSION_KEY,
    queryFn: sessionService.getActive,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateSessionParams) => sessionService.create(params),
    onSuccess: (created) => primeActiveSession(qc, created),
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'cancel' }) =>
      action === 'complete' ? sessionService.complete(id) : sessionService.cancel(id),
    onSuccess: () => primeActiveSession(qc, null),
  });
}
