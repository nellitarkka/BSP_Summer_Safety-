import {
  validatePayload,
  renderUserContent,
  finalizeAiResponse,
  fallbackBody,
  violatesRouteGuardrails,
} from '../supabase/functions/explain-route/logic';

// A well-formed structured payload (coordinate-free by construction).
const GOOD = {
  candidates: [
    {
      id: 'A', label: 'Route A', distance_m: 1400, duration_s: 1200, extra_walking_min_vs_fastest: 0,
      indicators: {
        lighting_availability: { category: 'higher', value: 0.68 },
        transit_proximity: { category: 'moderate', value: 210 },
        help_point_proximity: { category: 'unknown', value: null },
        route_openness: { category: 'higher', value: 0.9 },
      },
    },
  ],
  preferred_candidate_id: 'A',
  tie: false,
  time_of_day: 'night',
};

// @feature US-014 @priority must
// N3/N4: server-side validation rejects unknown fields and malformed shapes.
describe('explain-route payload validation (N3/N4)', () => {
  it('accepts a well-formed payload', () => {
    expect(validatePayload(GOOD).ok).toBe(true);
  });
  it('rejects unknown top-level fields (e.g. a leaked coordinate field)', () => {
    expect(validatePayload({ ...GOOD, origin: { lat: 49.6, lon: 6.1 } }).ok).toBe(false);
  });
  it('rejects unknown per-candidate fields', () => {
    const bad = { ...GOOD, candidates: [{ ...GOOD.candidates[0], gps: '49.6,6.1' }] };
    expect(validatePayload(bad).ok).toBe(false);
  });
  it('rejects an invalid indicator category', () => {
    const bad = { ...GOOD, candidates: [{ ...GOOD.candidates[0], indicators: { ...GOOD.candidates[0]!.indicators, route_openness: { category: 'dangerous', value: 1 } } }] };
    expect(validatePayload(bad).ok).toBe(false);
  });
  it('rejects empty or oversized candidate lists', () => {
    expect(validatePayload({ ...GOOD, candidates: [] }).ok).toBe(false);
  });
});

// @feature US-014 @priority should
// N3: the rendered user content is coordinate-free and carries categories + values.
describe('explain-route user content (N3)', () => {
  const text = renderUserContent(GOOD);
  it('includes categories and numeric values', () => {
    expect(text).toMatch(/higher/);
    expect(text).toMatch(/210 m/);
    expect(text).toMatch(/68% of the route/);
  });
  it('marks unavailable indicators as "no data", distinct from measured values', () => {
    expect(text).toMatch(/help point proximity: unknown \(no data\)/);
  });
  it('states the deterministic preference', () => {
    expect(text).toMatch(/preferred: A/);
  });
  it('contains no coordinate-like decimals', () => {
    expect(text).not.toMatch(/\d+\.\d{3,}/);
  });
});

// @feature US-014 @priority must
// N1/N5: finalize maps a raw provider reply to ai / parse_error / guardrail_blocked.
describe('explain-route response finalisation (N1/N5)', () => {
  it('returns a live AI result for a clean JSON reply', () => {
    const r = finalizeAiResponse('{"explanation":"Route A stays more open.","emergency_reminder":"x","complete":true}');
    expect(r.source).toBe('ai');
    expect(r.prompt_version).toBe('route-explanation-system-v2');
    expect(r.fallback_reason).toBeNull();
  });
  it('falls back with parse_error on malformed output', () => {
    const r = finalizeAiResponse('not json at all');
    expect(r.source).toBe('fallback');
    expect(r.fallback_reason).toBe('parse_error');
  });
  it('falls back with guardrail_blocked when the model emits a danger label', () => {
    const r = finalizeAiResponse('{"explanation":"Avoid this dangerous street.","complete":true}');
    expect(r.source).toBe('fallback');
    expect(r.fallback_reason).toBe('guardrail_blocked');
  });
  it('fallbackBody always carries source + reason', () => {
    const r = fallbackBody('rate_limited');
    expect(r.source).toBe('fallback');
    expect(r.fallback_reason).toBe('rate_limited');
    expect(r.prompt_version).toBeNull();
  });
  it('the guardrail still flags street-danger claims', () => {
    expect(violatesRouteGuardrails('that area is high-crime')).toBe(true);
    expect(violatesRouteGuardrails('Route A stays closer to transit')).toBe(false);
  });
});
