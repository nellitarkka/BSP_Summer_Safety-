import {
  ROUTE_TUNING,
  rateTransit,
  rateHelp,
  rateLighting,
  rateOpenness,
  candidateIndicatorScore,
  rankCandidates,
} from '@/lib/routeScoring';
import type { IndicatorRating, RouteCandidate } from '@/types';

// Build a minimal candidate with the four indicators and a duration. Raw metrics are
// left null (the ranking works off the indicator categories + duration).
function cand(id: string, duration_s: number, r: [IndicatorRating, IndicatorRating, IndicatorRating, IndicatorRating]): RouteCandidate {
  const [lighting, transit, help, openness] = r;
  return {
    id,
    label: `Route ${id}`,
    summary: { coordinates: [], distance_m: 1000, duration_s, provider: 'test' },
    features: { distance_m: 1000, duration_s, transit_stops: [], help_points: [], path_types: ['unknown'], lighting: 'unknown', isolated_segment_count: 0 },
    indicators: { lighting_availability: lighting, transit_proximity: transit, help_point_proximity: help, route_openness: openness, time_of_day: 'night', uncertainty_note: 'x' },
    metrics: { distance_m: 1000, duration_s, transit_median_distance_m: null, help_point_min_distance_m: null, lit_fraction: null, active_span_share: null },
    generation_method: 'direct',
    score: null,
  };
}

// @feature US-013 @priority should
// Gap 2 (TECHNICAL_DECISIONS.md §4): threshold boundaries, tested either side.
describe('indicator thresholds (Gap 2)', () => {
  const t = ROUTE_TUNING.thresholds;
  it('transit boundaries', () => {
    expect(rateTransit(t.transitHigherM - 1)).toBe('higher');
    expect(rateTransit(t.transitHigherM)).toBe('moderate'); // 150 is not < 150
    expect(rateTransit(t.transitModerateM - 1)).toBe('moderate');
    expect(rateTransit(t.transitModerateM)).toBe('lower');
    expect(rateTransit(null)).toBe('unknown'); // never guessed
  });
  it('help-point boundaries', () => {
    expect(rateHelp(t.helpHigherM - 1)).toBe('higher');
    expect(rateHelp(t.helpHigherM)).toBe('moderate');
    expect(rateHelp(t.helpModerateM)).toBe('lower');
    expect(rateHelp(null)).toBe('unknown');
  });
  it('lighting boundaries (>= thresholds)', () => {
    expect(rateLighting(t.lightingHigherFrac)).toBe('higher');
    expect(rateLighting(t.lightingHigherFrac - 0.001)).toBe('moderate');
    expect(rateLighting(t.lightingModerateFrac)).toBe('moderate');
    expect(rateLighting(t.lightingModerateFrac - 0.001)).toBe('lower');
    expect(rateLighting(null)).toBe('unknown');
  });
  it('openness boundaries (>= thresholds)', () => {
    expect(rateOpenness(t.opennessHigherShare)).toBe('higher');
    expect(rateOpenness(t.opennessHigherShare - 0.001)).toBe('moderate');
    expect(rateOpenness(t.opennessModerateShare)).toBe('moderate');
    expect(rateOpenness(t.opennessModerateShare - 0.001)).toBe('lower');
    expect(rateOpenness(null)).toBe('unknown');
  });
});

// @feature US-013 @priority must
// Gap 3 (§2/§3): ranking is documented, exported, testable; unknown is EXCLUDED (not
// scored below 'lower'); score is a mean over available indicators.
describe('candidateIndicatorScore — unknown policy (Gap 3)', () => {
  it('averages available indicators in [0,1]', () => {
    expect(candidateIndicatorScore({ lighting_availability: 'higher', transit_proximity: 'higher', help_point_proximity: 'lower', route_openness: 'lower' })).toBe(0.5);
  });
  it('EXCLUDES unknown rather than scoring it as 0', () => {
    // Two 'higher' + two 'unknown' ⇒ mean of the two available = 1.0, NOT 0.5.
    expect(candidateIndicatorScore({ lighting_availability: 'higher', transit_proximity: 'higher', help_point_proximity: 'unknown', route_openness: 'unknown' })).toBe(1);
  });
  it('returns null below the minimum available-indicator count', () => {
    expect(candidateIndicatorScore({ lighting_availability: 'higher', transit_proximity: 'unknown', help_point_proximity: 'unknown', route_openness: 'unknown' })).toBeNull();
  });
});

// @feature US-013 @priority must
// Gap 3/4/5: ranking — clear winner, reversal, tie, insufficient evidence, stability,
// and the detour penalty.
describe('rankCandidates (Gap 3/4/5)', () => {
  it('picks a clear winner', () => {
    const r = rankCandidates([cand('A', 600, ['higher', 'higher', 'higher', 'higher']), cand('B', 600, ['lower', 'lower', 'lower', 'lower'])]);
    expect(r.preferredCandidateId).toBe('A');
    expect(r.reason).toBe('clear');
  });
  it('reverses when the indicators reverse', () => {
    const r = rankCandidates([cand('A', 600, ['lower', 'lower', 'lower', 'lower']), cand('B', 600, ['higher', 'higher', 'higher', 'higher'])]);
    expect(r.preferredCandidateId).toBe('B');
  });
  it('returns null on a tie (scores within the margin)', () => {
    const r = rankCandidates([cand('A', 600, ['higher', 'moderate', 'lower', 'higher']), cand('B', 600, ['higher', 'moderate', 'lower', 'higher'])]);
    expect(r.preferredCandidateId).toBeNull();
    expect(r.reason).toBe('tie');
  });
  it('returns null (insufficient evidence) when no candidate has enough data', () => {
    const r = rankCandidates([cand('A', 600, ['higher', 'unknown', 'unknown', 'unknown']), cand('B', 600, ['lower', 'unknown', 'unknown', 'unknown'])]);
    expect(r.preferredCandidateId).toBeNull();
    expect(r.reason).toBe('insufficient_evidence');
  });
  it('is deterministic regardless of input order (stability)', () => {
    const a = cand('A', 600, ['higher', 'higher', 'higher', 'higher']);
    const b = cand('B', 700, ['moderate', 'moderate', 'moderate', 'moderate']);
    const c = cand('C', 800, ['lower', 'lower', 'lower', 'lower']);
    expect(rankCandidates([a, b, c]).preferredCandidateId).toBe('A');
    expect(rankCandidates([c, b, a]).preferredCandidateId).toBe('A');
    expect(rankCandidates([b, a, c]).preferredCandidateId).toBe('A');
  });
  it('does NOT prefer a longer route without a compensating advantage', () => {
    // Same indicators, B is 5 min slower ⇒ A wins on the detour penalty.
    const r = rankCandidates([cand('A', 600, ['higher', 'higher', 'higher', 'higher']), cand('B', 900, ['higher', 'higher', 'higher', 'higher'])]);
    expect(r.preferredCandidateId).toBe('A');
  });
  it('DOES prefer a longer route when the advantage outweighs the extra time', () => {
    // A is fast but poor; B is 5 min slower but far better ⇒ B wins despite the penalty.
    const r = rankCandidates([cand('A', 600, ['lower', 'lower', 'lower', 'lower']), cand('B', 900, ['higher', 'higher', 'higher', 'higher'])]);
    expect(r.preferredCandidateId).toBe('B');
  });
});
