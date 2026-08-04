import { useCallback, useEffect, useState } from 'react';
import { locationService } from '@/services/locationService';
import { routeService } from '@/services/routeService';
import type { Coords, RouteSummary } from '@/types';

interface PlannerState {
  granted: boolean | null;
  useCurrent: boolean;
  startText: string;
  destText: string;
  // Exact coords chosen from an autocomplete suggestion (avoids re-geocoding an
  // ambiguous string). Cleared when the user edits the text again.
  startPick: Coords | null;
  destPick: Coords | null;
  route: RouteSummary | null;
  // Coords of the last computed route — used by the R2 route comparison (US-013).
  coords: { start: Coords; destination: Coords } | null;
  computing: boolean;
  error: string | null;
}

const MESSAGES: Record<string, string> = {
  ADDRESS_NOT_FOUND: "We couldn't find that address. Check the spelling and try again.",
  ROUTE_FAILED: "We couldn't find a route. Please check the addresses and try again.",
  NETWORK: 'No connection. Please check your network and try again.',
  NO_DEST: 'Please enter a destination.',
  LOCATION_DENIED: 'Location is off. Enter your start manually.',
};

export function useRoutePlanner() {
  const [s, setS] = useState<PlannerState>({
    granted: null, useCurrent: false, startText: '', destText: '',
    startPick: null, destPick: null,
    route: null, coords: null, computing: false, error: null,
  });
  const patch = (p: Partial<PlannerState>) => setS((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    locationService.hasPermission().then((granted) => patch({ granted, useCurrent: granted }));
  }, []);

  const requestLocation = useCallback(async () => {
    const granted = await locationService.requestPermission();
    patch({ granted, useCurrent: granted });
  }, []);

  const setUseCurrent = useCallback((v: boolean) => patch({ useCurrent: v }), []);
  // Editing the text invalidates a previously picked suggestion.
  const setStartText = useCallback((startText: string) => patch({ startText, startPick: null }), []);
  const setDestText = useCallback((destText: string) => patch({ destText, destPick: null }), []);
  const pickStart = useCallback((c: Coords) => patch({ startPick: c }), []);
  const pickDest = useCallback((c: Coords) => patch({ destPick: c }), []);

  const compute = useCallback(async () => {
    setS((prev) => ({ ...prev, computing: true, error: null }));
    try {
      const dest = s.destText.trim();
      if (!dest && !s.destPick) throw new Error('NO_DEST');
      const startCoords: Coords =
        s.useCurrent && s.granted
          ? await locationService.getCurrent()
          : s.startPick ?? (await locationService.geocode(s.startText.trim()));
      const destCoords: Coords = s.destPick ?? (await locationService.geocode(dest));
      const route = await routeService.getRoute(startCoords, destCoords);
      patch({ route, coords: { start: startCoords, destination: destCoords }, computing: false });
    } catch (e) {
      const code = e instanceof Error ? e.message : 'ROUTE_FAILED';
      patch({ computing: false, error: MESSAGES[code] ?? MESSAGES.ROUTE_FAILED });
    }
  }, [s.destText, s.startText, s.useCurrent, s.granted, s.startPick, s.destPick]);

  return { state: s, requestLocation, setUseCurrent, setStartText, setDestText, pickStart, pickDest, compute };
}
