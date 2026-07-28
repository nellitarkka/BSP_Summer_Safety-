import Constants from 'expo-constants';
import { buildResponseFromPaths, type GraphHopperPath } from '@/lib/routeDerivation';
import type { FeatureData, LightingGrid } from '@/lib/routeFeatures';
import transitStopsJson from '@/data/lux/transitStops.json';
import helpPointsJson from '@/data/lux/helpPoints.json';
import lightingJson from '@/data/lux/lighting.json';
import type { Coords, RouteFeatureRequest, RouteFeatureResponse } from '@/types';

export { ENGINE_VERSION, buildRouteDescriptors } from '@/lib/routeDerivation';

const FEATURE_DATA: FeatureData = {
  transitStops: transitStopsJson.stops as [number, number][],
  helpPoints: helpPointsJson.points as [number, number, string][],
  lighting: lightingJson as LightingGrid,
};

const GH_URL = 'https://graphhopper.com/api/1/route';

function ghKey(): string {
  return (Constants.expoConfig?.extra?.graphhopperKey as string | undefined) ?? '';
}

async function fetchPath(
  start: Coords,
  destination: Coords,
  key: string,
  via?: Coords,
): Promise<GraphHopperPath | null> {
  const params = new URLSearchParams({ profile: 'foot', points_encoded: 'false', details: 'road_class', key });
  const pts =
    `point=${start.latitude},${start.longitude}` +
    (via ? `&point=${via.latitude},${via.longitude}` : '') +
    `&point=${destination.latitude},${destination.longitude}`;
  let res: Response;
  try {
    res = await fetch(`${GH_URL}?${pts}&${params.toString()}`);
  } catch {
    throw new Error('NETWORK'); 
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { paths?: GraphHopperPath[] };
  const path = json.paths?.[0];
  return path && path.points.coordinates.length > 0 ? path : null;
}


async function fetchAlternatives(req: RouteFeatureRequest, key: string): Promise<GraphHopperPath[] | null> {
  const params = new URLSearchParams({
    profile: 'foot',
    points_encoded: 'false',
    algorithm: 'alternative_route',
    'alternative_route.max_paths': '3',
    'ch.disable': 'true',
    details: 'road_class',
    key,
  });
  const url =
    `${GH_URL}?point=${req.start.latitude},${req.start.longitude}` +
    `&point=${req.destination.latitude},${req.destination.longitude}&${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('NETWORK');
  }
  if (!res.ok) return null; // free plan / not supported → caller uses the detour fallback
  const json = (await res.json()) as { paths?: GraphHopperPath[] };
  const paths = json.paths ?? [];
  return paths.length > 1 ? paths.slice(0, 3) : null;
}

function offsetVia(start: Coords, destination: Coords, meters: number): Coords {
  const midLat = (start.latitude + destination.latitude) / 2;
  const midLng = (start.longitude + destination.longitude) / 2;
  const latRad = (midLat * Math.PI) / 180;
  // Direction start→dest in metres.
  const dx = (destination.longitude - start.longitude) * 111320 * Math.cos(latRad);
  const dy = (destination.latitude - start.latitude) * 111320;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector.
  const px = -dy / len;
  const py = dx / len;
  return {
    latitude: midLat + (py * meters) / 111320,
    longitude: midLng + (px * meters) / (111320 * Math.cos(latRad)),
  };
}


async function fetchDetourCandidates(req: RouteFeatureRequest, key: string): Promise<GraphHopperPath[]> {
  const direct = await fetchPath(req.start, req.destination, key);
  if (!direct) return [];
  const kept: GraphHopperPath[] = [direct];

  const offsets = [450, -450]; 
  for (const off of offsets) {
    if (kept.length >= 3) break;
    const via = offsetVia(req.start, req.destination, off);
    const alt = await fetchPath(req.start, req.destination, key, via).catch(() => null);
    if (!alt) continue;
    const distinct = kept.every((k) => Math.abs(alt.distance - k.distance) / k.distance > 0.03);
    if (distinct) kept.push(alt);
  }
  return kept;
}


export const routeEngineService = {
  async getRouteFeatures(req: RouteFeatureRequest): Promise<RouteFeatureResponse> {
    const key = ghKey();
    const paths = (await fetchAlternatives(req, key)) ?? (await fetchDetourCandidates(req, key));
    if (paths.length === 0) throw new Error('ROUTE_FAILED'); 

    return buildResponseFromPaths(paths, req.time_of_day ?? 'night', new Date().toISOString(), FEATURE_DATA);
  },
};
