import type { Coords, IndicatorRating } from '@/types';
import { haversineM } from '@/lib/geo';

// Pure proximity indicators from the bundled Luxembourg open-data extract
// (FR-58/59). Given a route and the datasets, decides — at ROUTE LEVEL — how
// close the route stays to public transport and to help points. Relative and
// uncertainty-aware; never a per-street danger score (NFR-14). No expo/network
// deps, so it stays unit-testable.

// Street lamps aggregated into a coarse grid (built by scripts/build-lux-features).
export interface LightingGrid {
  latStep: number;
  lonStep: number;
  cells: Record<string, number>; // "latIdx,lonIdx" -> lamp count
}

export interface FeatureData {
  transitStops: readonly (readonly [number, number])[]; // [lat, lon]
  helpPoints: readonly (readonly [number, number, string])[]; // [lat, lon, kind]
  lighting?: LightingGrid;
}

// Sample the route to at most `max` points to bound the O(points × dataset) cost.
function sample(coords: Coords[], max = 40): Coords[] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const out: Coords[] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]!);
  return out;
}

function nearestM(lat: number, lon: number, pts: FeatureData['transitStops'] | FeatureData['helpPoints']): number {
  let min = Infinity;
  for (const p of pts) {
    const d = haversineM(lat, lon, p[0], p[1]);
    if (d < min) min = d;
  }
  return min;
}

// Fraction of the route with mapped street lighting in the cell or its neighbours.
function lightingRating(pts: Coords[], grid: LightingGrid | undefined): IndicatorRating {
  if (!grid || Object.keys(grid.cells).length === 0) return 'unknown';
  let lit = 0;
  for (const c of pts) {
    const li = Math.round(c.latitude / grid.latStep);
    const lo = Math.round(c.longitude / grid.lonStep);
    let near = false;
    for (let dLa = -1; dLa <= 1 && !near; dLa++) {
      for (let dLo = -1; dLo <= 1 && !near; dLo++) {
        if ((grid.cells[`${li + dLa},${lo + dLo}`] ?? 0) > 0) near = true;
      }
    }
    if (near) lit++;
  }
  const frac = lit / pts.length;
  return frac >= 0.6 ? 'higher' : frac >= 0.3 ? 'moderate' : 'lower';
}

export interface ProximityRatings {
  transit: IndicatorRating;
  help: IndicatorRating;
  lighting: IndicatorRating;
}

export function proximityRatings(coords: Coords[], data: FeatureData): ProximityRatings {
  if (coords.length === 0) return { transit: 'unknown', help: 'unknown', lighting: 'unknown' };
  const pts = sample(coords);

  // Transit: median nearest-stop distance along the route ("does it generally
  // stay near public transport"), so it discriminates rather than always maxing.
  let transit: IndicatorRating = 'unknown';
  if (data.transitStops.length > 0) {
    const dists = pts.map((c) => nearestM(c.latitude, c.longitude, data.transitStops)).sort((a, b) => a - b);
    const median = dists[Math.floor(dists.length / 2)]!;
    transit = median < 150 ? 'higher' : median < 350 ? 'moderate' : 'lower';
  }

  // Help points are sparse: does the route pass near any police/hospital/pharmacy.
  let help: IndicatorRating = 'unknown';
  if (data.helpPoints.length > 0) {
    let min = Infinity;
    for (const c of pts) {
      const d = nearestM(c.latitude, c.longitude, data.helpPoints);
      if (d < min) min = d;
    }
    help = min < 300 ? 'higher' : min < 800 ? 'moderate' : 'lower';
  }

  return { transit, help, lighting: lightingRating(pts, data.lighting) };
}
