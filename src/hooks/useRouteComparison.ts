import { useCallback, useState } from 'react';
import { routeEngineService } from '@/services/routeEngineService';
import { buildRoutePayload } from '@/lib/routeDerivation';
import { aiService } from '@/services/aiService';
import type { Coords, FallbackReason, RouteFeatureResponse, TimeOfDay } from '@/types';

// How the currently-selected route was chosen: a system recommendation vs a manual
// user pick. Kept distinct so the UI never presents a manual pick as a system
// preference (TECHNICAL_DECISIONS.md §8/§11, Bianca C4).
export type SelectionSource = 'system' | 'user' | null;

interface ComparisonState {
  loading: boolean;
  data: RouteFeatureResponse | null;
  error: string | null;
  selectedId: string | null;
  selectionSource: SelectionSource;
  aiLoading: boolean;
  aiExplanation: string | null;
  aiSource: 'ai' | 'fallback' | null; // drives the UI source label (C5)
  aiFallbackReason: FallbackReason | null;
}

const INITIAL: ComparisonState = {
  loading: false, data: null, error: null,
  selectedId: null, selectionSource: null,
  aiLoading: false, aiExplanation: null, aiSource: null, aiFallbackReason: null,
};

// Rough local time-of-day bucket for indicator context (no network, no GPS).
function currentTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 6 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

// Drives the R2 route comparison (US-013) + optional AI explanation (US-014).
// Runs against routeEngineService (live GraphHopper candidate routing).
export function useRouteComparison() {
  const [s, setS] = useState<ComparisonState>(INITIAL);
  const patch = (p: Partial<ComparisonState>) => setS((prev) => ({ ...prev, ...p }));

  const compare = useCallback(async (start: Coords, destination: Coords) => {
    setS({ ...INITIAL, loading: true });
    try {
      const data = await routeEngineService.getRouteFeatures({
        start, destination, time_of_day: currentTimeOfDay(),
      });
      // Only auto-select when the engine actually expressed a preference. On a tie /
      // insufficient evidence preferred_candidate_id is null and NOTHING is selected —
      // the old `?? data.candidates[0]` silent default is deliberately gone (B5).
      const preferred = data.comparison?.preferred_candidate_id ?? null;
      patch({
        loading: false,
        data,
        selectedId: preferred,
        selectionSource: preferred ? 'system' : null,
      });
    } catch {
      // Degrade gracefully (ERR-10) — the MVP single-route flow still stands.
      patch({ loading: false, error: 'Route comparison is unavailable right now.' });
    }
  }, []);

  // A manual user pick — recorded as 'user', never presented as a system preference.
  const select = useCallback((id: string) => patch({ selectedId: id, selectionSource: 'user' }), []);

  const explainWithAI = useCallback(async () => {
    setS((prev) => (prev.data ? { ...prev, aiLoading: true } : prev));
    const data = s.data;
    if (!data) return;
    const res = await aiService.explainRoute(buildRoutePayload(data, currentTimeOfDay()));
    patch({
      aiLoading: false,
      aiExplanation: res.explanation,
      aiSource: res.source,
      aiFallbackReason: res.fallback_reason,
    });
  }, [s.data]);

  const reset = useCallback(() => setS(INITIAL), []);

  return { state: s, compare, select, explainWithAI, reset };
}
