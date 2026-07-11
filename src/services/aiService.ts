import { supabase } from '@/lib/supabase';
import type {
  RouteExplanationRequest,
  RouteExplanationResponse,
  SafetyTipsRequest,
  SafetyTipsResponse,
} from '@/types';
import { AI_FALLBACK_TIP } from '@/lib/constants';

const FALLBACK: SafetyTipsResponse = {
  tips: [AI_FALLBACK_TIP],
  emergency_reminder: 'If you are in immediate danger, call local emergency services.',
  contact_suggestion: 'Contact a trusted person now.',
  complete: true,
};

const ROUTE_FALLBACK: RouteExplanationResponse = {
  explanation:
    'Compare the routes using the details shown — lighting, how close each stays to ' +
    'public transport, and how open and active the streets are. Choose the one you ' +
    'feel most comfortable with.',
  emergency_reminder: 'If you are in immediate danger, call local emergency services.',
  complete: true,
};

// Calls the server-side Edge Functions (NFR-04 — no provider key in the client).
// Always resolves with a safe response; never throws into the UI (ERR-04).
export const aiService = {
  async generateSafetyTips(request: SafetyTipsRequest): Promise<SafetyTipsResponse> {
    try {
      const { data, error } = await supabase.functions.invoke<SafetyTipsResponse>(
        'generate-safety-tips',
        { body: request },
      );
      if (error || !data || !Array.isArray(data.tips)) return FALLBACK;
      return data;
    } catch {
      return FALLBACK;
    }
  },

  // Route explanation (FR-66/67/68). Input is aggregated/relative descriptors —
  // never precise GPS. Always resolves with a safe fallback.
  async explainRoute(request: RouteExplanationRequest): Promise<RouteExplanationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke<RouteExplanationResponse>(
        'explain-route',
        { body: request },
      );
      if (error || !data || typeof data.explanation !== 'string') return ROUTE_FALLBACK;
      return data;
    } catch {
      return ROUTE_FALLBACK;
    }
  },
};
