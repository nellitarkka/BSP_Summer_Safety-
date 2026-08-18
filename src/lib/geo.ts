// Shared geospatial helpers.
import type { Coords } from '@/types';
import { ROUTE_TUNING } from '@/lib/routeScoring';

const EARTH_R = 6371000; // metres
const toRad = (d: number): number => (d * Math.PI) / 180;

// Great-circle distance between two lat/lon points, in metres.
export function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Sample a polyline to at most `max` points to bound the O(n·m) overlap cost.
// GraphHopper returns dense coordinates, so vertex sampling is a faithful proxy.
function sampleLine(coords: readonly Coords[], max = 60): Coords[] {
  if (coords.length <= max) return [...coords];
  const step = Math.ceil(coords.length / max);
  const out: Coords[] = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]!);
  return out;
}

// Fraction of `from` points that lie within `toleranceM` of some `to` point.
function coverage(from: Coords[], to: Coords[], toleranceM: number): number {
  if (from.length === 0 || to.length === 0) return 0;
  let covered = 0;
  for (const p of from) {
    let near = false;
    for (const q of to) {
      if (haversineM(p.latitude, p.longitude, q.latitude, q.longitude) <= toleranceM) {
        near = true;
        break;
      }
    }
    if (near) covered += 1;
  }
  return covered / from.length;
}

// Geometric overlap between two route polylines in [0,1] (Gap 6,
// TECHNICAL_DECISIONS.md §7). Symmetric mean of the two directed coverages within
// `toleranceM`: identical lines → 1.0, disjoint → ~0, partial → in between. This
// replaces the old length-only duplicate check, which compared distances not shapes.
export function routeOverlap(
  a: readonly Coords[],
  b: readonly Coords[],
  toleranceM: number = ROUTE_TUNING.overlap.toleranceM,
): number {
  const sa = sampleLine(a);
  const sb = sampleLine(b);
  return (coverage(sa, sb, toleranceM) + coverage(sb, sa, toleranceM)) / 2;
}
