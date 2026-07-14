import Constants from 'expo-constants';
import type { Coords, RouteSummary } from '@/types';

const GH_URL = 'https://graphhopper.com/api/1/route';

interface GraphHopperPath {
  distance: number;
  time: number;
  points: { coordinates: [number, number][] }; // [lon, lat]
}

// Walking route via GraphHopper (decision: architecture §12). Errors map to ERR-02.
export const routeService = {
  async getRoute(start: Coords, destination: Coords): Promise<RouteSummary> {
    const key = (Constants.expoConfig?.extra?.graphhopperKey as string | undefined) ?? '';
    const params = new URLSearchParams({ profile: 'foot', points_encoded: 'false', key });
    const url =
      `${GH_URL}?point=${start.latitude},${start.longitude}` +
      `&point=${destination.latitude},${destination.longitude}&${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      throw new Error('NETWORK'); // ERR-05
    }
    if (!res.ok) throw new Error('ROUTE_FAILED'); // ERR-02

    const json = (await res.json()) as { paths?: GraphHopperPath[] };
    const path = json.paths?.[0];
    if (!path || path.points.coordinates.length === 0) throw new Error('ROUTE_FAILED');

    return {
      coordinates: path.points.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
      distance_m: Math.round(path.distance),
      duration_s: Math.round(path.time / 1000),
      provider: 'graphhopper',
    };
  },
};

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}
