import { useCallback, useState } from 'react';
import { routeEngineService } from '@/services/routeEngineService';
import { buildRouteDescriptors } from '@/lib/routeDerivation';
import { aiService } from '@/services/aiService';
import type { Coords, RouteFeatureResponse, TimeOfDay } from '@/types';

interface ComparisonState {
  loading: boolean;
  data: RouteFeatureResponse | null;
  error: string | null;
  selectedId: string | null;
  aiLoading: boolean;
  aiExplanation: string | null;
}

const INITIAL: ComparisonState = {
  loading: false, data: null, error: null,
  selectedId: null, aiLoading: false, aiExplanation: null,
};

function currentTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 6 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}


export function useRouteComparison() {
  const [s, setS] = useState<ComparisonState>(INITIAL);
  const patch = (p: Partial<ComparisonState>) => setS((prev) => ({ ...prev, ...p }));

  const compare = useCallback(async (start: Coords, destination: Coords) => {
    setS({ ...INITIAL, loading: true });
    try {
      const data = await routeEngineService.getRouteFeatures({
        start, destination, time_of_day: currentTimeOfDay(),
      });
      const selectedId = data.comparison?.preferred_candidate_id ?? data.candidates[0]?.id ?? null;
      patch({ loading: false, data, selectedId });
    } catch {
      patch({ loading: false, error: 'Route comparison is unavailable right now.' });
    }
  }, []);

  const select = useCallback((id: string) => patch({ selectedId: id }), []);

  const explainWithAI = useCallback(async () => {
    setS((prev) => {
      if (!prev.data) return prev;
      return { ...prev, aiLoading: true };
    });
    const data = s.data;
    if (!data) return;
    const descriptors = buildRouteDescriptors(data.candidates);
    const res = await aiService.explainRoute({
      candidate_descriptors: descriptors,
      time_of_day: currentTimeOfDay(),
    });
    patch({ aiLoading: false, aiExplanation: res.explanation });
  }, [s.data]);

  const reset = useCallback(() => setS(INITIAL), []);

  return { state: s, compare, select, explainWithAI, reset };
}
