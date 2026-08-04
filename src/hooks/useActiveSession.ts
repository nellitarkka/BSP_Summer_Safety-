import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '@/services/sessionService';
import type { SafetySession } from '@/types';

export function useActiveSession() {
  return useQuery({ queryKey: ['active-session'], queryFn: sessionService.getActive });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'complete' | 'cancel' }) =>
      action === 'complete' ? sessionService.complete(id) : sessionService.cancel(id),
    onSuccess: (s: SafetySession) => {
      qc.setQueryData(['active-session'], null);
      qc.invalidateQueries({ queryKey: ['active-session'] });
      return s;
    },
  });
}
