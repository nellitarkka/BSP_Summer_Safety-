import type { Coords } from '@/types';
import { routeOverlap } from '@/lib/geo';
import { ROUTE_TUNING } from '@/lib/routeScoring';
import type { GraphHopperPath } from '@/lib/routeDerivation';

// Pure candidate-generation helpers (Gap 6/7). Kept free of expo/network deps so the
// synthesised-detour geometry, the plausibility rule and the geometric-overlap
// diversity check are all unit-testable. routeEngineService does the actual fetching
// and delegates the selection here.

// A via-point offset perpendicular to the start→dest line at its midpoint, used to
// synthesise a distinct candidate route on the free GraphHopper plan.
export function offsetVia(start: Coords, destination: Coords, meters: number): Coords {
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

// [lon,lat] GraphHopper coordinates → Coords for the geometric overlap check.
export function pathCoords(p: GraphHopperPath): Coords[] {
  return p.points.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
}

// A synthesised detour is plausible only if it is a real, non-degenerate polyline and
// not absurdly longer than the direct route (Gap 7, TECHNICAL_DECISIONS.md).
export function isPlausibleDetour(direct: GraphHopperPath, alt: GraphHopperPath): boolean {
  if (alt.points.coordinates.length < 2 || alt.distance <= 0) return false;
  return alt.distance <= direct.distance * ROUTE_TUNING.candidate.plausibilityMaxDistanceRatio;
}

// Choose the final candidate set from a direct route plus already-fetched detours.
// A detour is kept only if it is plausible AND geometrically distinct from every kept
// route — measured by real polyline overlap, not length alone (Gap 6). Each candidate
// is tagged with how it was produced (Gap 7). At most 3 candidates.
export function pickDetourCandidates(direct: GraphHopperPath, alts: GraphHopperPath[]): GraphHopperPath[] {
  const kept: GraphHopperPath[] = [{ ...direct, generation_method: 'direct' }];
  for (const alt of alts) {
    if (kept.length >= 3) break;
    if (!isPlausibleDetour(direct, alt)) continue;
    const altCoords = pathCoords(alt);
    const distinct = kept.every(
      (k) => routeOverlap(altCoords, pathCoords(k)) < ROUTE_TUNING.overlap.rejectThreshold,
    );
    if (distinct) kept.push({ ...alt, generation_method: 'waypoint_detour' });
  }
  return kept;
}
