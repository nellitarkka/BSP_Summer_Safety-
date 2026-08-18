import { buildResponseFromPaths, buildRoutePayload, type GraphHopperPath } from '@/lib/routeDerivation';
import { violatesRouteGuardrails, containsCoordinateLike } from '@/lib/aiGuardrails';

// Fixture GraphHopper alternative-route paths (offline — no network).
const PATHS: GraphHopperPath[] = [
  {
    distance: 1400,
    time: 1020000,
    points: { coordinates: [[6.13, 49.6], [6.135, 49.605], [6.14, 49.61]] },
    details: { road_class: [[0, 1, 'secondary'], [1, 2, 'residential']] },
  },
  {
    distance: 1100,
    time: 820000,
    points: { coordinates: [[6.13, 49.6], [6.132, 49.603], [6.14, 49.61]] },
    details: { road_class: [[0, 1, 'path'], [1, 2, 'footway']] },
  },
];

const build = () => buildResponseFromPaths(PATHS, 'night', '1970-01-01T00:00:00.000Z');

// @feature US-013 @priority should
// FR-57/58/59/60/NFR-14: route-level indicators only, no street-danger labels.
describe('route engine derivation (FR-57/58/59/60)', () => {
  it('returns 1–3 candidates with real geometry + route-level indicators', () => {
    const res = build();
    expect(res.candidates.length).toBeGreaterThanOrEqual(1);
    expect(res.candidates.length).toBeLessThanOrEqual(3);
    for (const c of res.candidates) {
      expect(c.summary.distance_m).toBeGreaterThan(0);
      expect(c.summary.coordinates.length).toBeGreaterThan(0);
      expect(c.indicators.uncertainty_note.length).toBeGreaterThan(0); // FR-59 uncertainty
    }
  });

  it('derives openness from road types (active streets vs quiet paths)', () => {
    const res = build();
    // Route A is on secondary+residential (active) → higher; Route B has a path → lower/moderate.
    expect(res.candidates[0]!.indicators.route_openness).toBe('higher');
    expect(res.candidates[1]!.indicators.route_openness).not.toBe('higher');
    // Lighting/transit need OSM data → honestly reported as unknown.
    expect(res.candidates[0]!.indicators.lighting_availability).toBe('unknown');
  });

  it('produces a comparison + explanation when >1 candidate (FR-60)', () => {
    const res = build();
    expect(res.comparison).not.toBeNull();
    expect(res.comparison?.explanation.length).toBeGreaterThan(0);
  });

  it('explanation contains no street-level danger labels (FR-59/NFR-14)', () => {
    expect(violatesRouteGuardrails(build().comparison?.explanation ?? '')).toBe(false);
  });
});

// @feature US-014 @priority must
// FR-68 / Gap 8: the AI payload is structured, coordinate-free, and carries the
// numbers + categories (replaces the old lossy prose descriptors).
describe('structured AI payload (FR-68 / Gap 8)', () => {
  it('emits one structured candidate per route with no coordinates or place names', () => {
    const payload = buildRoutePayload(build());
    expect(payload.candidates).toHaveLength(2);
    // The whole serialised payload must contain no coordinate-like decimal (FR-68).
    expect(containsCoordinateLike(JSON.stringify(payload))).toBe(false);
    for (const c of payload.candidates) {
      expect(typeof c.distance_m).toBe('number');
      expect(typeof c.duration_s).toBe('number');
      // Each indicator carries a category and a value (number or null), so 'moderate'
      // is distinguishable from 'unknown'.
      expect(c.indicators.route_openness).toHaveProperty('category');
      expect(c.indicators.route_openness).toHaveProperty('value');
      expect(violatesRouteGuardrails(JSON.stringify(c))).toBe(false);
    }
  });

  it('carries the deterministic preference/tie state to the AI', () => {
    const payload = buildRoutePayload(build());
    // With only openness available (no dataset), the engine cannot separate them.
    expect(payload.tie).toBe(true);
    expect(payload.preferred_candidate_id).toBeNull();
  });
});

// @feature US-014 @priority must
// FR-67: route guardrail flags objective street-danger claims.
describe('route guardrail (FR-67)', () => {
  it('flags objective street-danger labels', () => {
    expect(violatesRouteGuardrails('this is a dangerous street')).toBe(true);
    expect(violatesRouteGuardrails('avoid this area, it is high-crime')).toBe(true);
    expect(violatesRouteGuardrails('that neighbourhood is sketchy')).toBe(true);
  });
  it('allows relative, uncertainty-aware wording', () => {
    expect(
      violatesRouteGuardrails('Route A stays closer to public transport and well-lit streets.'),
    ).toBe(false);
  });
});
