import { runBenchmark, validateBenchmarkResults, BENCHMARK_SCHEMA_VERSION, type FetchResult } from '@/eval/benchmark';
import type { GraphHopperPath } from '@/lib/routeDerivation';
import type { EvalScenario } from '@/eval/scenarios';

const sc = (id: string, name: string): EvalScenario => ({
  id, name,
  start: { latitude: 49.6, longitude: 6.13 },
  destination: { latitude: 49.61, longitude: 6.14 },
  time_of_day: 'night',
  expect: { minCandidates: 1, requiresComparison: true },
});

const PATHS: GraphHopperPath[] = [
  { distance: 1400, time: 1020000, points: { coordinates: [[6.13, 49.6], [6.135, 49.605], [6.14, 49.61]] }, details: { road_class: [[0, 1, 'secondary']] }, generation_method: 'direct' },
  { distance: 1600, time: 1200000, points: { coordinates: [[6.13, 49.6], [6.128, 49.606], [6.14, 49.61]] }, details: { road_class: [[0, 1, 'path']] }, generation_method: 'waypoint_detour' },
];
const ok = (paths: GraphHopperPath[]): FetchResult => ({ outcome: 'ok', paths });

// @feature US-015 @priority should
// Gap 12 (B8): the benchmark runner produces a machine-readable, schema-valid file.
describe('benchmark runner (Gap 12)', () => {
  it('runs the live engine (mocked fetcher) and produces a valid results object', async () => {
    const scenarios = [sc('T1', 'has candidates'), sc('T2', 'no candidates')];
    const fetchPaths = async (s: EvalScenario): Promise<FetchResult> =>
      s.id === 'T2' ? { outcome: 'ok', paths: [] } : ok(PATHS);
    const results = await runBenchmark(scenarios, fetchPaths, { generatedAt: '1970-01-01T00:00:00.000Z' });

    expect(results.schema_version).toBe(BENCHMARK_SCHEMA_VERSION);
    expect(results.case_count).toBe(2);
    expect(validateBenchmarkResults(results)).toBe(true);

    const t1 = results.cases.find((c) => c.id === 'T1')!;
    expect(t1.candidate_count).toBe(2);
    expect(t1.candidates[0]!.metrics).toBeDefined();
    expect(t1.pairwise_overlap.length).toBe(1); // one pair
    expect(t1.ai_payload.candidates.length).toBe(2);
    expect(t1.fetch_outcome).toBe('ok');
    expect(t1.error).toBeNull();
    // Coordinate-free payload even in the results file (FR-68).
    expect(JSON.stringify(t1.ai_payload)).not.toMatch(/\d+\.\d{3,}/);

    // OK response but no candidates after generation/filtering.
    const t2 = results.cases.find((c) => c.id === 'T2')!;
    expect(t2.error).toBe('no_candidates');
    expect(t2.fetch_outcome).toBe('ok');
    expect(t2.candidate_count).toBe(0);
  });

  it('rejects a malformed results object', () => {
    expect(validateBenchmarkResults({ schema_version: 1 })).toBe(false);
    expect(validateBenchmarkResults(null)).toBe(false);
    expect(validateBenchmarkResults({ schema_version: 999, generated_at: 'x', engine_version: 'y', case_count: 0, cases: [] })).toBe(false);
  });

  it('does not fabricate AI output (ai_explanation is null until the live step runs)', async () => {
    const results = await runBenchmark([sc('T1', 'x')], async () => ok(PATHS), { generatedAt: '1970-01-01T00:00:00.000Z' });
    expect(results.cases[0]!.ai_explanation).toBeNull();
  });
});

// @feature US-015 @priority must
// Gap 12 diagnostics: zero-candidate cases record the exact reason, without secrets.
describe('benchmark zero-candidate diagnostics (Gap 12)', () => {
  it('distinguishes a non-2xx HTTP status', async () => {
    const results = await runBenchmark([sc('H', 'http')], async () => ({ outcome: 'http_error', paths: [], httpStatus: 429 }), { generatedAt: '1970-01-01T00:00:00.000Z' });
    const c = results.cases[0]!;
    expect(c.error).toBe('http_error');
    expect(c.fetch_outcome).toBe('http_error');
    expect(c.fetch_http_status).toBe(429);
    expect(c.candidate_count).toBe(0);
    expect(validateBenchmarkResults(results)).toBe(true);
  });

  it('distinguishes an API/network error', async () => {
    const results = await runBenchmark([sc('A', 'api')], async () => ({ outcome: 'api_error', paths: [], detail: 'TypeError' }), { generatedAt: '1970-01-01T00:00:00.000Z' });
    const c = results.cases[0]!;
    expect(c.error).toBe('api_error');
    expect(c.fetch_detail).toBe('TypeError');
  });

  it('distinguishes a valid response with no path', async () => {
    const results = await runBenchmark([sc('N', 'nopath')], async () => ({ outcome: 'no_path', paths: [] }), { generatedAt: '1970-01-01T00:00:00.000Z' });
    expect(results.cases[0]!.error).toBe('no_path');
  });

  it('records an api_error when the fetcher throws (never leaks a URL/key)', async () => {
    const results = await runBenchmark([sc('T', 'throw')], async () => { throw new Error('boom'); }, { generatedAt: '1970-01-01T00:00:00.000Z' });
    const c = results.cases[0]!;
    expect(c.error).toBe('api_error');
    expect(c.fetch_detail).toBe('Error'); // error class only, no message/URL
  });
});

// @feature US-015 @priority must
// Single-candidate guard: never report a preference that conflicts with comparison===null.
describe('benchmark single-candidate guard', () => {
  it('reports no preference and a single_candidate reason for one candidate', async () => {
    const results = await runBenchmark([sc('S', 'single')], async () => ok([PATHS[0]!]), { generatedAt: '1970-01-01T00:00:00.000Z' });
    const c = results.cases[0]!;
    expect(c.candidate_count).toBe(1);
    expect(c.preferred_candidate_id).toBeNull(); // matches engine comparison === null
    expect(c.ranking_reason).toBe('single_candidate');
    expect(c.deterministic_explanation).toBe('');
  });
});
