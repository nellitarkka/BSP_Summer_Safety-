import {
  statesUnknownAsMeasured,
  acknowledgesNoPreference,
  numbersSupported,
  evaluateAiFaithfulness,
} from '@/eval/aiFaithfulness';
import type { RouteExplanationRequest } from '@/types';

// One candidate with lighting UNAVAILABLE and transit measured.
const UNKNOWN_LIGHTING: RouteExplanationRequest = {
  candidates: [
    {
      id: 'A', label: 'Route A', distance_m: 1400, duration_s: 1200, extra_walking_min_vs_fastest: 0,
      indicators: {
        lighting_availability: { category: 'unknown', value: null },
        transit_proximity: { category: 'moderate', value: 210 },
        help_point_proximity: { category: 'moderate', value: 250 },
        route_openness: { category: 'higher', value: 0.9 },
      },
    },
  ],
  preferred_candidate_id: 'A',
  tie: false,
};

const TIE: RouteExplanationRequest = { ...UNKNOWN_LIGHTING, preferred_candidate_id: null, tie: true };

// @feature US-015 @priority must
// Gap 13 (N6): automated faithfulness checks flag crafted unfaithful explanations.
describe('AI faithfulness — unknown-as-measured (Gap 13)', () => {
  it('flags a claim about an unavailable indicator', () => {
    expect(statesUnknownAsMeasured(UNKNOWN_LIGHTING, 'Route A has more lighting and stays open.')).toBe(true);
  });
  it('passes when the missing data is acknowledged', () => {
    expect(statesUnknownAsMeasured(UNKNOWN_LIGHTING, 'Lighting data was not available, but Route A stays open.')).toBe(false);
  });
});

describe('AI faithfulness — no-preference acknowledgement (Gap 13)', () => {
  it('requires acknowledgement when the payload is a tie', () => {
    expect(acknowledgesNoPreference(TIE, 'Route A is the best choice.')).toBe(false);
    expect(acknowledgesNoPreference(TIE, 'There is no clear preference between these routes.')).toBe(true);
  });
  it('is not applicable when there is a preference', () => {
    expect(acknowledgesNoPreference(UNKNOWN_LIGHTING, 'Route A is preferred.')).toBe(true);
  });
});

describe('AI faithfulness — number support (Gap 13)', () => {
  it('accepts numbers present in the payload', () => {
    expect(numbersSupported(UNKNOWN_LIGHTING, 'About 210 m from transit, a 20 min walk.')).toBe(true);
  });
  it('flags a number the payload never contained', () => {
    expect(numbersSupported(UNKNOWN_LIGHTING, 'It is 800 m from transit.')).toBe(false);
  });
});

describe('evaluateAiFaithfulness aggregate (Gap 13)', () => {
  it('passes a faithful explanation', () => {
    const r = evaluateAiFaithfulness(UNKNOWN_LIGHTING, 'Route A stays open and is about 210 m from transit; lighting data was not available.');
    expect(r.faithful).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
  it('fails an explanation that fabricates a value and ignores missing data', () => {
    const r = evaluateAiFaithfulness(UNKNOWN_LIGHTING, 'Route A has more lighting and is only 800 m long walk of 5 min.');
    expect(r.faithful).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});
