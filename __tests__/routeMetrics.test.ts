import { buildResponseFromPaths, type GraphHopperPath } from '@/lib/routeDerivation';
import type { FeatureData } from '@/lib/routeFeatures';

// A short route with a stop and a help point beside it, plus a lit grid cell.
const COORDS: [number, number][] = [
  [6.1342, 49.6003],
  [6.135, 49.6008],
  [6.1358, 49.6012],
];
const path = (distance: number, time: number, coords = COORDS, rc?: [number, number, string][]): GraphHopperPath => ({
  distance,
  time,
  points: { coordinates: coords },
  details: rc ? { road_class: rc } : undefined,
});

const li = Math.round(49.6008 / 0.002);
const lo = Math.round(6.135 / 0.003);
const DATA: FeatureData = {
  transitStops: [[49.6008, 6.135]],
  helpPoints: [[49.6009, 6.1351, 'hospital']],
  lighting: { latStep: 0.002, lonStep: 0.003, cells: { [`${li},${lo}`]: 4 } },
};

// @feature US-013 @priority must
// Gap 1 (TECHNICAL_DECISIONS.md §1): raw numeric metrics are preserved end to end.
describe('numeric route metrics (Gap 1)', () => {
  it('carries a raw numeric value for every available indicator', () => {
    const res = buildResponseFromPaths([path(900, 700000, COORDS, [[0, 1, 'secondary']])], 'night', '1970-01-01T00:00:00.000Z', DATA);
    const m = res.candidates[0]!.metrics;
    expect(typeof m.transit_median_distance_m).toBe('number');
    expect(typeof m.help_point_min_distance_m).toBe('number');
    expect(typeof m.lit_fraction).toBe('number');
    expect(typeof m.active_span_share).toBe('number');
    expect(m.distance_m).toBe(900);
  });

  it('represents unavailable data as null, NEVER as 0', () => {
    // No datasets supplied ⇒ proximity/lighting metrics are unavailable.
    const res = buildResponseFromPaths([path(900, 700000, COORDS, [[0, 1, 'secondary']])], 'night', '1970-01-01T00:00:00.000Z');
    const m = res.candidates[0]!.metrics;
    expect(m.transit_median_distance_m).toBeNull();
    expect(m.help_point_min_distance_m).toBeNull();
    expect(m.lit_fraction).toBeNull();
    // …and the paired categories are 'unknown', not 'lower'.
    expect(res.candidates[0]!.indicators.transit_proximity).toBe('unknown');
  });

  it('populates the formerly-placeholder RouteFeatures from real derivations', () => {
    const rc: [number, number, string][] = [[0, 2, 'residential'], [2, 3, 'path']];
    const res = buildResponseFromPaths([path(900, 700000, COORDS, rc)], 'night', '1970-01-01T00:00:00.000Z', DATA);
    const f = res.candidates[0]!.features;
    expect(f.isolated_segment_count).toBe(1); // one 'path' span
    expect(f.path_types).not.toEqual(['unknown']);
    expect(f.help_points.length).toBe(1); // populated, not a []-placeholder
    expect(f.help_points[0]!.distance_m).toBeGreaterThan(0);
  });

  it('tags each candidate with its generation method', () => {
    const res = buildResponseFromPaths([path(900, 700000)], 'night', '1970-01-01T00:00:00.000Z', DATA);
    expect(res.candidates[0]!.generation_method).toBe('direct');
  });
});

// @feature US-013 @priority must
// Gap 4 / §6: over-detour candidates are excluded before reaching the UI.
describe('maximum-detour exclusion (Gap 4)', () => {
  it('drops a candidate that is both >1.5× and >10 min slower than the fastest', () => {
    const fast = path(1000, 600_000); // 10 min
    const huge = path(3000, 1_500_000); // 25 min ⇒ 2.5× and +15 min ⇒ excluded
    const res = buildResponseFromPaths([fast, huge], 'night', '1970-01-01T00:00:00.000Z', DATA);
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0]!.summary.duration_s).toBe(600);
  });

  it('keeps a moderately longer candidate (penalised, not excluded)', () => {
    const fast = path(1000, 600_000); // 10 min
    const longer = path(1400, 840_000); // 14 min ⇒ 1.4× (< 1.5×) ⇒ kept
    const res = buildResponseFromPaths([fast, longer], 'night', '1970-01-01T00:00:00.000Z', DATA);
    expect(res.candidates).toHaveLength(2);
  });
});
