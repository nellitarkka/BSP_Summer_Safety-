import { buildResponseFromPaths, buildRoutePayload, ENGINE_VERSION, type GraphHopperPath } from '@/lib/routeDerivation';
import { rankCandidates } from '@/lib/routeScoring';
import { routeOverlap } from '@/lib/geo';
import type { FeatureData } from '@/lib/routeFeatures';
import type { EvalScenario } from '@/eval/scenarios';
import type { RouteExplanationRequest, RouteGenerationMethod, TimeOfDay } from '@/types';

// Benchmark runner (Gap 12, B8). Runs the REAL deterministic engine over a set of
// Luxembourg scenarios and produces a machine-readable results object with every
// number the report needs. The path fetcher is INJECTED so this is unit-testable
// offline with mocked GraphHopper responses; the live CLI (scripts/benchmark) passes
// a fetcher that calls GraphHopper. This deliberately does NOT fabricate AI outputs —
// the coordinate-free `ai_payload` is emitted so the live AI step can be run
// separately and its explanation + faithfulness attached later.

export const BENCHMARK_SCHEMA_VERSION = 2;

// How the injected fetcher resolved for a scenario (Gap 12 diagnostics). Distinguishes
// a network/API error, a non-2xx HTTP status, a valid 2xx response that carried no
// route, and a successful fetch. `detail` and `httpStatus` MUST NOT contain secrets or
// request URLs (which carry the API key).
export type FetchOutcome = 'ok' | 'api_error' | 'http_error' | 'no_path';

export interface FetchResult {
  outcome: FetchOutcome;
  paths: GraphHopperPath[]; // non-empty only when outcome === 'ok'
  httpStatus?: number; // set for 'http_error'
  detail?: string; // safe, secret-free message
}

export interface BenchmarkCandidate {
  id: string;
  label: string;
  generation_method: RouteGenerationMethod;
  distance_m: number;
  duration_s: number;
  extra_walking_min_vs_fastest: number;
  indicator_categories: {
    lighting_availability: string;
    transit_proximity: string;
    help_point_proximity: string;
    route_openness: string;
  };
  metrics: {
    transit_median_distance_m: number | null;
    help_point_min_distance_m: number | null;
    lit_fraction: number | null;
    active_span_share: number | null;
  };
  indicator_score: number | null; // base mean over available indicators
  adjusted_score: number | null; // after detour penalty
}

export interface BenchmarkCase {
  id: string;
  name: string;
  time_of_day: TimeOfDay;
  candidate_count: number;
  candidates: BenchmarkCandidate[];
  pairwise_overlap: { a: string; b: string; overlap: number }[];
  preferred_candidate_id: string | null;
  ranking_reason: string;
  deterministic_explanation: string;
  missing_data: { indicator: string; unknown_candidate_count: number }[];
  ai_payload: RouteExplanationRequest; // coordinate-free; input for the live AI step
  ai_explanation: string | null; // filled by the separate live AI step, else null
  fallback_reason: string | null;
  // Diagnostics (Gap 12): why a case has no candidates, without leaking secrets.
  fetch_outcome: FetchOutcome; // 'ok' even when 0 candidates come from filtering
  fetch_http_status: number | null; // set when fetch_outcome === 'http_error'
  fetch_detail: string | null; // safe, secret-free explanation
  error: string | null; // null on success; else 'api_error'|'http_error'|'no_path'|'no_candidates'
}

export interface BenchmarkResults {
  schema_version: number;
  generated_at: string;
  engine_version: string;
  case_count: number;
  cases: BenchmarkCase[];
}

export type FetchPaths = (scenario: EvalScenario) => Promise<FetchResult>;

const INDICATOR_KEYS = ['lighting_availability', 'transit_proximity', 'help_point_proximity', 'route_openness'] as const;

export async function runBenchmark(
  scenarios: EvalScenario[],
  fetchPaths: FetchPaths,
  opts: { data?: FeatureData; generatedAt: string },
): Promise<BenchmarkResults> {
  const cases: BenchmarkCase[] = [];

  for (const sc of scenarios) {
    let result: FetchResult;
    try {
      result = await fetchPaths(sc);
    } catch (e) {
      // A thrown fetcher is an API/network error — record its class, never a URL/key.
      result = { outcome: 'api_error', paths: [], detail: e instanceof Error ? e.name : 'unknown_error' };
    }

    // The fetch never reached a usable route → record the exact reason.
    if (result.outcome !== 'ok') {
      cases.push(
        emptyCase(sc, {
          fetch_outcome: result.outcome,
          error: result.outcome,
          fetch_http_status: result.httpStatus ?? null,
          fetch_detail: result.detail ?? null,
        }),
      );
      continue;
    }

    // Response was OK but generation/filtering left no candidate.
    if (result.paths.length === 0) {
      cases.push(
        emptyCase(sc, {
          fetch_outcome: 'ok',
          error: 'no_candidates',
          fetch_http_status: null,
          fetch_detail: 'response ok but no candidate routes after generation/filtering',
        }),
      );
      continue;
    }

    const paths = result.paths;
    const response = buildResponseFromPaths(paths, sc.time_of_day, opts.generatedAt, opts.data);
    const ranking = rankCandidates(response.candidates);
    const fastest = Math.min(...response.candidates.map((c) => c.summary.duration_s));

    const candidates: BenchmarkCandidate[] = response.candidates.map((c) => {
      const d = ranking.detail.find((x) => x.id === c.id)!;
      return {
        id: c.id,
        label: c.label,
        generation_method: c.generation_method,
        distance_m: c.metrics.distance_m,
        duration_s: c.metrics.duration_s,
        extra_walking_min_vs_fastest: Math.round((c.summary.duration_s - fastest) / 60),
        indicator_categories: {
          lighting_availability: c.indicators.lighting_availability,
          transit_proximity: c.indicators.transit_proximity,
          help_point_proximity: c.indicators.help_point_proximity,
          route_openness: c.indicators.route_openness,
        },
        metrics: {
          transit_median_distance_m: c.metrics.transit_median_distance_m,
          help_point_min_distance_m: c.metrics.help_point_min_distance_m,
          lit_fraction: c.metrics.lit_fraction,
          active_span_share: c.metrics.active_span_share,
        },
        indicator_score: d.indicatorScore,
        adjusted_score: d.adjustedScore,
      };
    });

    const pairwise_overlap: { a: string; b: string; overlap: number }[] = [];
    for (let i = 0; i < response.candidates.length; i++) {
      for (let j = i + 1; j < response.candidates.length; j++) {
        const a = response.candidates[i]!;
        const b = response.candidates[j]!;
        pairwise_overlap.push({
          a: a.id,
          b: b.id,
          overlap: Math.round(routeOverlap(a.summary.coordinates, b.summary.coordinates) * 100) / 100,
        });
      }
    }

    const missing_data = INDICATOR_KEYS.map((k) => ({
      indicator: k,
      unknown_candidate_count: response.candidates.filter((c) => c.indicators[k] === 'unknown').length,
    }));

    // The engine (buildResponseFromPaths) is the authority for the preference: with a
    // single candidate it sets comparison=null, so we must NOT report a ranking-derived
    // preference that would conflict with comparison===null (single-candidate guard).
    const hasComparison = response.comparison !== null;

    cases.push({
      id: sc.id,
      name: sc.name,
      time_of_day: sc.time_of_day,
      candidate_count: response.candidates.length,
      candidates,
      pairwise_overlap,
      preferred_candidate_id: hasComparison ? response.comparison!.preferred_candidate_id : null,
      ranking_reason: hasComparison ? ranking.reason : 'single_candidate',
      deterministic_explanation: response.comparison?.explanation ?? '',
      missing_data,
      ai_payload: buildRoutePayload(response, sc.time_of_day),
      ai_explanation: null,
      fallback_reason: null,
      fetch_outcome: 'ok',
      fetch_http_status: null,
      fetch_detail: null,
      error: null,
    });
  }

  return {
    schema_version: BENCHMARK_SCHEMA_VERSION,
    generated_at: opts.generatedAt,
    engine_version: ENGINE_VERSION,
    case_count: cases.length,
    cases,
  };
}

function emptyCase(
  sc: EvalScenario,
  diag: { fetch_outcome: FetchOutcome; error: string; fetch_http_status: number | null; fetch_detail: string | null },
): BenchmarkCase {
  return {
    id: sc.id,
    name: sc.name,
    time_of_day: sc.time_of_day,
    candidate_count: 0,
    candidates: [],
    pairwise_overlap: [],
    preferred_candidate_id: null,
    ranking_reason: diag.error, // the diagnostic category, not a misleading 'insufficient_evidence'
    deterministic_explanation: '',
    missing_data: [],
    ai_payload: { candidates: [], preferred_candidate_id: null, tie: false, time_of_day: sc.time_of_day },
    ai_explanation: null,
    fallback_reason: null,
    fetch_outcome: diag.fetch_outcome,
    fetch_http_status: diag.fetch_http_status,
    fetch_detail: diag.fetch_detail,
    error: diag.error,
  };
}

// Structural validation of a results file (B8 test). Deliberately shallow — it checks
// the shape the report depends on, not the values (which must be measured, not asserted).
export function validateBenchmarkResults(obj: unknown): obj is BenchmarkResults {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  if (r.schema_version !== BENCHMARK_SCHEMA_VERSION) return false;
  if (typeof r.generated_at !== 'string' || typeof r.engine_version !== 'string') return false;
  if (!Array.isArray(r.cases) || r.case_count !== r.cases.length) return false;
  return r.cases.every((c) => {
    if (!c || typeof c !== 'object') return false;
    const k = c as Record<string, unknown>;
    return (
      typeof k.id === 'string' &&
      typeof k.name === 'string' &&
      typeof k.candidate_count === 'number' &&
      Array.isArray(k.candidates) &&
      Array.isArray(k.pairwise_overlap) &&
      Array.isArray(k.missing_data) &&
      (k.preferred_candidate_id === null || typeof k.preferred_candidate_id === 'string') &&
      typeof k.ranking_reason === 'string' &&
      typeof k.deterministic_explanation === 'string' &&
      typeof k.fetch_outcome === 'string' &&
      (k.fetch_http_status === null || typeof k.fetch_http_status === 'number') &&
      (k.fetch_detail === null || typeof k.fetch_detail === 'string') &&
      (k.error === null || typeof k.error === 'string') &&
      !!k.ai_payload && typeof k.ai_payload === 'object'
    );
  });
}
