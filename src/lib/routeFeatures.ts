import type { Coords, HelpPointKind, IndicatorRating } from '@/types';
import { haversineM } from '@/lib/geo';
import { rateHelp, rateLighting, rateTransit } from '@/lib/routeScoring';

// Pure proximity metrics from the bundled Luxembourg open-data extract (FR-58/59).
// Given a route and the datasets, computes — at ROUTE LEVEL — the RAW numeric
// distances/fractions and the derived relative categories. Relative and
// uncertainty-aware; never a per-street danger score (NFR-14). Missing data is
// `null`, never `0` (TECHNICAL_DECISIONS.md §1). No expo/network deps, so it stays
// unit-testable.

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

function nearestM(lat: number, lon: number, pts: FeatureData['transitStops']): number {
  let min = Infinity;
  for (const p of pts) {
    const d = haversineM(lat, lon, p[0], p[1]);
    if (d < min) min = d;
  }
  return min;
}

// Raw lit fraction: share of sampled points with a mapped lamp in the cell or its
// 3×3 neighbourhood. Returns null when no lighting grid is available — the caller
// must render this as "no data", never as a measured low value.
function litFraction(pts: Coords[], grid: LightingGrid | undefined): number | null {
  if (!grid || Object.keys(grid.cells).length === 0) return null;
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
  return pts.length === 0 ? null : lit / pts.length;
}

// Raw numeric proximity metrics (TECHNICAL_DECISIONS.md §1). `null` marks data the
// dataset could not provide; `0` is a genuine measured value.
export interface ProximityMetrics {
  transit_median_distance_m: number | null;
  help_point_min_distance_m: number | null;
  help_point_kind: HelpPointKind | null; // kind of the nearest help point, if any
  lit_fraction: number | null;
}

export function proximityMetrics(coords: Coords[], data: FeatureData): ProximityMetrics {
  if (coords.length === 0) {
    return {
      transit_median_distance_m: null,
      help_point_min_distance_m: null,
      help_point_kind: null,
      lit_fraction: null,
    };
  }
  const pts = sample(coords);

  // Transit: median nearest-stop distance along the route ("does it generally stay
  // near public transport"), so it discriminates rather than always maxing.
  let transitMedian: number | null = null;
  if (data.transitStops.length > 0) {
    const dists = pts.map((c) => nearestM(c.latitude, c.longitude, data.transitStops)).sort((a, b) => a - b);
    transitMedian = dists[Math.floor(dists.length / 2)]!;
  }

  // Help points are sparse: minimum distance to any police/hospital/pharmacy, plus
  // which kind that nearest one is.
  let helpMin: number | null = null;
  let helpKind: HelpPointKind | null = null;
  if (data.helpPoints.length > 0) {
    let min = Infinity;
    for (const c of pts) {
      for (const p of data.helpPoints) {
        const d = haversineM(c.latitude, c.longitude, p[0], p[1]);
        if (d < min) {
          min = d;
          helpKind = p[2] as HelpPointKind;
        }
      }
    }
    helpMin = min;
  }

  return {
    transit_median_distance_m: transitMedian,
    help_point_min_distance_m: helpMin,
    help_point_kind: helpKind,
    lit_fraction: litFraction(pts, data.lighting),
  };
}

export interface ProximityRatings {
  transit: IndicatorRating;
  help: IndicatorRating;
  lighting: IndicatorRating;
}

// Categories derived from the raw metrics via the centralised thresholds
// (routeScoring). Kept as a stable helper for the existing call sites/tests.
export function proximityRatings(coords: Coords[], data: FeatureData): ProximityRatings {
  const m = proximityMetrics(coords, data);
  return {
    transit: rateTransit(m.transit_median_distance_m),
    help: rateHelp(m.help_point_min_distance_m),
    lighting: rateLighting(m.lit_fraction),
  };
}
