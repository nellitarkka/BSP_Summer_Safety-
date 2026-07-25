import { useMutation } from '@tanstack/react-query';
import { aiService } from '@/services/aiService';
import type { SafetyTipsRequest } from '@/types';

export function useSafetyTips() {
  return useMutation({
    mutationFn: (req: SafetyTipsRequest) => aiService.generateSafetyTips(req),
  });
}
