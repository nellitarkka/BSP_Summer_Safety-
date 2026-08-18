import { supabase } from '@/lib/supabase';
import type {
  FallbackReason,
  RouteExplanationRequest,
  RouteExplanationResponse,
  SafetyTipsRequest,
  SafetyTipsResponse,
} from '@/types';
import { AI_FALLBACK_TIP, ROUTE_FALLBACK_TEXT } from '@/lib/constants';

const FALLBACK: SafetyTipsResponse = {
  tips: [AI_FALLBACK_TIP],
  emergency_reminder: 'If you are in immediate danger, call local emergency services.',
  contact_suggestion: 'Contact a trusted person now.',
  complete: true,
};

// Client-side fallback (Gap 10). Always carries an explicit source + reason so the
// UI can never label this static text as live AI output.
function routeFallback(reason: FallbackReason): RouteExplanationResponse {
  return {
    explanation: ROUTE_FALLBACK_TEXT,
    emergency_reminder: 'If you are in immediate danger, call local emergency services.',
    source: 'fallback',
    fallback_reason: reason,
    prompt_version: null,
    complete: true,
  };
}

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

  // Route explanation (FR-66/67/68). Input is a STRUCTURED, coordinate-free payload —
  // never precise GPS. Always resolves with a fallback that is explicitly labelled as
  // such (source: 'fallback'), so fallback text can never be presented as live AI.
  async explainRoute(request: RouteExplanationRequest): Promise<RouteExplanationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke<RouteExplanationResponse>(
        'explain-route',
        { body: request },
      );
      if (error) return routeFallback('client_error');
      if (!data || typeof data.explanation !== 'string') return routeFallback('parse_error');
      // Trust the Edge Function's provenance; if an older deploy omits it, treat the
      // response as a fallback rather than risk mislabelling it as live AI.
      if (data.source !== 'ai' && data.source !== 'fallback') {
        return { ...data, source: 'fallback', fallback_reason: data.fallback_reason ?? 'parse_error', prompt_version: data.prompt_version ?? null };
      }
      return data;
    } catch {
      return routeFallback('client_error');
    }
  },
};
