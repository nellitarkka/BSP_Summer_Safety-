import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { runBenchmark, validateBenchmarkResults, type FetchResult } from '@/eval/benchmark';
import { SCENARIOS, type EvalScenario } from '@/eval/scenarios';
import { offsetVia, pickDetourCandidates } from '@/lib/routeCandidates';
import type { GraphHopperPath } from '@/lib/routeDerivation';
import type { FeatureData, LightingGrid } from '@/lib/routeFeatures';
import transitStopsJson from '@/data/lux/transitStops.json';
import helpPointsJson from '@/data/lux/helpPoints.json';
import lightingJson from '@/data/lux/lighting.json';

// Live benchmark wrapper (B8). This is the ONLY place that calls GraphHopper; the
// engine + result assembly are the same tested code as production (src/eval/benchmark).
// It reuses the tested candidate-selection logic (routeCandidates) and only replicates
// the raw HTTP fetch (routeEngineService itself can't be imported here — it pulls in
// expo-constants). Run with:  npm run benchmark

const KEY = process.env.EXPO_PUBLIC_GRAPHHOPPER_KEY ?? '';
const GH_URL = 'https://graphhopper.com/api/1/route';
const OUT_DIR = join(process.cwd(), 'outputs', 'benchmark');
const OUT_FILE = join(OUT_DIR, 'route-benchmark-results.json');

const DATA: FeatureData = {
  transitStops: transitStopsJson.stops as [number, number][],
  helpPoints: helpPointsJson.points as [number, number, string][],
  lighting: lightingJson as LightingGrid,
};

type Coords = { latitude: number; longitude: number };

// A single GraphHopper fetch, classified into the diagnostic outcomes. NEVER returns
// the request URL or the API key — only the class of failure and the HTTP status.
interface OneResult {
  outcome: 'ok' | 'api_error' | 'http_error' | 'no_path';
  path?: GraphHopperPath;
  httpStatus?: number;
  detail?: string;
}

async function fetchOne(start: Coords, dest: Coords, via?: Coords): Promise<OneResult> {
  const params = new URLSearchParams({ profile: 'foot', points_encoded: 'false', details: 'road_class', key: KEY });
  const pts =
    `point=${start.latitude},${start.longitude}` +
    (via ? `&point=${via.latitude},${via.longitude}` : '') +
    `&point=${dest.latitude},${dest.longitude}`;
  let res: Response;
  try {
    res = await fetch(`${GH_URL}?${pts}&${params.toString()}`);
  } catch (e) {
    return { outcome: 'api_error', detail: e instanceof Error ? e.name : 'fetch_failed' };
  }
  if (!res.ok) return { outcome: 'http_error', httpStatus: res.status };
  let json: { paths?: GraphHopperPath[] };
  try {
    json = (await res.json()) as { paths?: GraphHopperPath[] };
  } catch {
    return { outcome: 'no_path', detail: 'malformed_json' };
  }
  const path = json.paths?.[0];
  return path && path.points.coordinates.length > 0 ? { outcome: 'ok', path } : { outcome: 'no_path' };
}

// Native alternatives are optional (paid plan); any failure just means "fall back to
// the detour method", so this stays best-effort and swallows errors.
async function fetchAlternatives(sc: EvalScenario): Promise<GraphHopperPath[] | null> {
  const params = new URLSearchParams({
    profile: 'foot', points_encoded: 'false', algorithm: 'alternative_route',
    'alternative_route.max_paths': '3', 'ch.disable': 'true', details: 'road_class', key: KEY,
  });
  const url = `${GH_URL}?point=${sc.start.latitude},${sc.start.longitude}&point=${sc.destination.latitude},${sc.destination.longitude}&${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as { paths?: GraphHopperPath[] };
  const paths = json.paths ?? [];
  return paths.length > 1 ? paths.slice(0, 3).map((p) => ({ ...p, generation_method: 'graphhopper_alternative' as const })) : null;
}

async function fetchPathsLive(sc: EvalScenario): Promise<FetchResult> {
  const native = await fetchAlternatives(sc).catch(() => null);
  if (native) return { outcome: 'ok', paths: native };

  // The direct route is the determining fetch — its outcome is the case diagnostic.
  const direct = await fetchOne(sc.start, sc.destination);
  if (direct.outcome !== 'ok' || !direct.path) {
    return { outcome: direct.outcome, paths: [], httpStatus: direct.httpStatus, detail: direct.detail };
  }

  const alts: GraphHopperPath[] = [];
  for (const off of [450, -450]) {
    const via = offsetVia(sc.start, sc.destination, off);
    const alt = await fetchOne(sc.start, sc.destination, via).catch((): OneResult => ({ outcome: 'api_error' }));
    if (alt.outcome === 'ok' && alt.path) alts.push(alt.path);
  }
  return { outcome: 'ok', paths: pickDetourCandidates(direct.path, alts) };
}

describe('route benchmark (live GraphHopper)', () => {
  (KEY ? it : it.skip)('runs the live engine over every scenario and writes the results file', async () => {
    const results = await runBenchmark(SCENARIOS, fetchPathsLive, {
      data: DATA,
      generatedAt: new Date().toISOString(),
    });
    expect(validateBenchmarkResults(results)).toBe(true);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\nBenchmark: wrote ${results.case_count} cases to ${OUT_FILE}`);
  });

  if (!KEY) {
    it('SKIPPED — set EXPO_PUBLIC_GRAPHHOPPER_KEY to run the live benchmark', () => {
      console.warn('\n[benchmark] No EXPO_PUBLIC_GRAPHHOPPER_KEY set — live run skipped. See PROFESSOR_REPO_PUSH_PLAN.md / BSP_IMPLEMENTATION_COMPLETION.md.');
      expect(KEY).toBe('');
    });
  }
});
