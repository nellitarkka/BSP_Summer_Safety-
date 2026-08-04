import { evaluateScenario, summarize, GUARDRAIL_MUST_FLAG } from '@/eval/routeEval';
import { SCENARIOS } from '@/eval/scenarios';
import { buildResponseFromPaths, type GraphHopperPath } from '@/lib/routeDerivation';
import { violatesRouteGuardrails } from '@/lib/aiGuardrails';
import type { ScenarioResult } from '@/eval/routeEval';

// Offline fixture: two GraphHopper alternative paths, reused per scenario so the
// evaluation runs deterministically without a network call to the engine.
const PATHS: GraphHopperPath[] = [
  {
    distance: 1400, time: 1020000,
    points: { coordinates: [[6.13, 49.6], [6.14, 49.61]] },
    details: { road_class: [[0, 1, 'secondary']] },
  },
  {
    distance: 1100, time: 820000,
    points: { coordinates: [[6.13, 49.6], [6.14, 49.61]] },
    details: { road_class: [[0, 1, 'path'], [1, 2, 'footway']] },
  },
];

// @feature US-015 @priority should
// FR-69: evaluate route explanations + engine over sample night-out scenarios;
// guardrail compliance (FR-67) and GPS exclusion (FR-68) are BLOCKING.
describe('route evaluation over sample night-out scenarios (FR-69)', () => {
  it('every scenario passes; no blocking guardrail/GPS failures', () => {
    const results: ScenarioResult[] = [];
    for (const sc of SCENARIOS) {
      const res = buildResponseFromPaths(PATHS, sc.time_of_day, '1970-01-01T00:00:00.000Z');
      results.push(evaluateScenario(sc, res, null));
    }
    const summary = summarize(results);
    expect(summary.total).toBe(SCENARIOS.length);
    expect(summary.blockingFailures).toBe(0);
    expect(summary.passed).toBe(true);
    expect(summary.passRatePct).toBe(100);
  });

  it('flags a comparison explanation that violates the guardrail as blocking', () => {
    const sc = SCENARIOS[0]!;
    const poisoned = {
      candidates: [
        {
          id: 'A',
          label: 'Route A',
          summary: { coordinates: [], distance_m: 900, duration_s: 700, provider: 'test' },
          features: {
            distance_m: 900, duration_s: 700, transit_stops: [], help_points: [],
            path_types: ['unknown' as const], lighting: 'unknown' as const, isolated_segment_count: 0,
          },
          indicators: {
            lighting_availability: 'unknown' as const, transit_proximity: 'unknown' as const,
            help_point_proximity: 'unknown' as const, route_openness: 'unknown' as const,
            time_of_day: 'night' as const, uncertainty_note: 'x',
          },
        },
      ],
      comparison: { preferred_candidate_id: 'A', explanation: 'Route A avoids this dangerous street.' },
      generated_at: '1970-01-01T00:00:00.000Z',
      engine_version: 'test',
    };
    const result = evaluateScenario(sc, poisoned, null);
    expect(result.guardrailPass).toBe(false);
    expect(summarize([result]).passed).toBe(false);
  });

  it('guardrail flags every adversarial street-danger claim (FR-67 regression fence)', () => {
    for (const bad of GUARDRAIL_MUST_FLAG) {
      expect(violatesRouteGuardrails(bad)).toBe(true);
    }
  });
});
