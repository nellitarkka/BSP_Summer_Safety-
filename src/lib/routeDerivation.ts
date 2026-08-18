import type {
  IndicatorRating,
  LightingTag,
  PathType,
  RouteCandidate,
  RouteExplanationRequest,
  RouteFeatureResponse,
  RouteGenerationMethod,
  RouteMetrics,
  TimeOfDay,
  TransitKind,
} from '@/types';
import { proximityMetrics, type FeatureData } from '@/lib/routeFeatures';
import {
  ROUTE_TUNING,
  candidateIndicatorScore,
  rankCandidates,
  rateHelp,
  rateLighting,
  rateOpenness,
  rateTransit,
  type Ranking,
} from '@/lib/routeScoring';

// Pure derivation of route features + route-level indicators + comparison from
// GraphHopper alternative-route paths (FR-58/59/60). Unit-testable, no network.
// Openness comes from road types; transit/help-point proximity and lighting from
// the bundled LU extract (via routeFeatures). Every category now carries its raw
// numeric value in `metrics`. Never a per-street danger label or score (FR-59/NFR-14).

export interface GraphHopperPath {
  distance: number; // meters
  time: number; // milliseconds
  points: { coordinates: [number, number][] }; // [lon, lat]
  details?: { road_class?: [number, number, string][] };
  generation_method?: RouteGenerationMethod; // annotated by routeEngineService (Gap 7)
}

export const ENGINE_VERSION = 'route-engine-graphhopper-0.3';

// Road classes that indicate quiet, off-street paths (vs active streets).
const ISOLATED_CLASSES = new Set(['path', 'track', 'bridleway']);

function mapRoadClass(value: string): PathType {
  switch (value) {
    case 'footway':
      return 'sidewalk';
    case 'pedestrian':
    case 'steps':
    case 'path':
    case 'track':
      return 'footpath';
    case 'residential':
    case 'living_street':
      return 'residential';
    case 'primary':
    case 'secondary':
    case 'tertiary':
    case 'trunk':
    case 'motorway':
    case 'unclassified':
    case 'service':
    case 'road':
      return 'main_road';
    default:
      return 'unknown';
  }
}

// Raw "openness" share: fraction of route length on active (non-isolated) road
// classes, or null when road-class data is unavailable (never guessed).
function opennessShare(rc: [number, number, string][] | undefined): number | null {
  if (!rc || rc.length === 0) return null;
  let total = 0;
  let active = 0;
  for (const [from, to, value] of rc) {
    const span = Math.max(1, to - from);
    total += span;
    if (!ISOLATED_CLASSES.has(value)) active += span;
  }
  return total === 0 ? null : active / total;
}

// Count of road-class spans on quiet/isolated paths. A COUNT ONLY — never located
// or labelled as "dangerous" (FR-59/NFR-14).
function isolatedSegmentCount(rc: [number, number, string][] | undefined): number {
  if (!rc) return 0;
  let n = 0;
  for (const [, , value] of rc) if (ISOLATED_CLASSES.has(value)) n++;
  return n;
}

function pathTypes(rc: [number, number, string][] | undefined): PathType[] {
  if (!rc || rc.length === 0) return ['unknown'];
  const set = new Set<PathType>();
  for (const [, , value] of rc) set.add(mapRoadClass(value));
  return [...set];
}

const OPENNESS_CLAUSE: Record<IndicatorRating, string> = {
  higher: 'stays mostly on open, active streets',
  moderate: 'mixes active streets with some quieter stretches',
  lower: 'uses more quiet, less busy paths',
  unknown: 'covers a similar mix of paths',
};

function durMin(c: RouteCandidate): number {
  return Math.round(c.summary.duration_s / 60);
}

// Join a short list naturally: "a", "a and b", "a, b and c" — avoids a long chain
// of "and".
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// Names the measured advantages of the preferred route — safe, positive wording only
// (FR-67). Used both to describe the route and to justify a longer walk. Openness is
// deliberately OMITTED here because the lead sentence already states it via
// OPENNESS_CLAUSE, so it is never described twice.
function compensatingClause(c: RouteCandidate): string {
  const bits: string[] = [];
  if (c.indicators.lighting_availability === 'higher') bits.push('has more street lighting');
  if (c.indicators.transit_proximity === 'higher') bits.push('stays closer to public transport');
  if (c.indicators.help_point_proximity === 'higher') bits.push('passes nearer a help point');
  return joinList(bits);
}

// Plain-language, relative comparison (FR-60). Mentions the extra walking time
// whenever a slower route is preferred, and states plainly when there is no clear
// preference (tie / insufficient evidence). Never labels a street dangerous (FR-67).
function explain(candidates: RouteCandidate[], ranking: Ranking): string {
  if (ranking.preferredCandidateId === null) {
    return ranking.reason === 'insufficient_evidence'
      ? "There isn't enough mapped lighting, transit or openness data to clearly prefer one route. Compare the details shown and choose what feels right for you."
      : "These routes are close on lighting, transit proximity and how open and active they are, so there's no clear preference. Compare the details and choose what feels right for you.";
  }
  const preferred = candidates.find((c) => c.id === ranking.preferredCandidateId)!;
  const detail = ranking.detail.find((d) => d.id === preferred.id)!;
  const comp = compensatingClause(preferred);

  const parts: string[] = [];
  let lead = `${preferred.label} (${durMin(preferred)} min walk) ${OPENNESS_CLAUSE[preferred.indicators.route_openness]}`;
  if (comp) lead += `, and ${comp}`;
  parts.push(lead + '.');

  const extraMin = Math.round(detail.extraMinutes);
  if (extraMin >= 1) {
    parts.push(
      `It's about ${extraMin} min longer than the quickest option${comp ? `, in exchange for the advantages above` : ''}.`,
    );
  }

  const other = candidates.find((c) => c.id !== preferred.id);
  if (other) {
    parts.push(`${other.label} (${durMin(other)} min walk) ${OPENNESS_CLAUSE[other.indicators.route_openness]}.`);
  }
  parts.push('Compare the details and choose what feels right for you.');
  return parts.join(' ');
}

// Exclude candidates that are BOTH proportionally and absolutely much longer than
// the fastest (TECHNICAL_DECISIONS.md §6). The fastest candidate is always kept.
function withinMaxDetour(candidates: RouteCandidate[]): RouteCandidate[] {
  if (candidates.length <= 1) return candidates;
  const fastest = Math.min(...candidates.map((c) => c.summary.duration_s));
  const { maxRatio, maxAbsSeconds } = ROUTE_TUNING.detour;
  return candidates.filter((c) => {
    const dur = c.summary.duration_s;
    const over = dur > fastest * maxRatio && dur - fastest > maxAbsSeconds;
    return !over;
  });
}

const LABELS = ['Route A', 'Route B', 'Route C'];
const IDS = ['A', 'B', 'C'];

function buildCandidate(p: GraphHopperPath, i: number, timeOfDay: TimeOfDay, note: string, data?: FeatureData): RouteCandidate {
  const rc = p.details?.road_class;
  const distance_m = Math.round(p.distance);
  const duration_s = Math.round(p.time / 1000);
  const coordinates = p.points.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));

  const prox = data
    ? proximityMetrics(coordinates, data)
    : { transit_median_distance_m: null, help_point_min_distance_m: null, help_point_kind: null, lit_fraction: null };

  const metrics: RouteMetrics = {
    distance_m,
    duration_s,
    transit_median_distance_m: prox.transit_median_distance_m,
    help_point_min_distance_m: prox.help_point_min_distance_m,
    lit_fraction: prox.lit_fraction,
    active_span_share: opennessShare(rc),
  };

  const indicators = {
    lighting_availability: rateLighting(metrics.lit_fraction),
    transit_proximity: rateTransit(metrics.transit_median_distance_m),
    help_point_proximity: rateHelp(metrics.help_point_min_distance_m),
    route_openness: rateOpenness(metrics.active_span_share),
    time_of_day: timeOfDay,
    uncertainty_note: note,
  };

  // Populate the formerly-placeholder RouteFeatures from real derivations so no
  // hard-coded stub remains (Gap 1). `metrics` stays the source of truth for numbers.
  const lightingTag: LightingTag =
    metrics.lit_fraction === null
      ? 'unknown'
      : metrics.lit_fraction >= ROUTE_TUNING.thresholds.lightingModerateFrac
        ? 'lit'
        : 'unlit';

  return {
    id: IDS[i]!,
    label: LABELS[i]!,
    summary: { coordinates, distance_m, duration_s, provider: ENGINE_VERSION },
    features: {
      distance_m,
      duration_s,
      transit_stops:
        metrics.transit_median_distance_m === null
          ? []
          : [{ name: null, kind: 'other' as TransitKind, distance_m: Math.round(metrics.transit_median_distance_m) }],
      help_points:
        metrics.help_point_min_distance_m === null
          ? []
          : [{ kind: prox.help_point_kind ?? 'public_place', name: null, distance_m: Math.round(metrics.help_point_min_distance_m) }],
      path_types: pathTypes(rc),
      lighting: lightingTag,
      isolated_segment_count: isolatedSegmentCount(rc),
    },
    indicators,
    metrics,
    generation_method: p.generation_method ?? 'direct',
    score: candidateIndicatorScore(indicators),
  };
}

export function buildResponseFromPaths(
  paths: GraphHopperPath[],
  timeOfDay: TimeOfDay,
  generatedAt: string,
  data?: FeatureData,
): RouteFeatureResponse {
  const note = data
    ? 'Indicators use the Luxembourg open-data extract; lighting reflects mapped ' +
      'street-lamp NODES within a coarse grid (OSM coverage varies), openness is estimated from road types.'
    : 'Lighting, transit and help-point data are not available in this build — ' +
      'shown as "not enough data". Openness is estimated from road types only.';

  const all = paths.slice(0, 3).map((p, i) => buildCandidate(p, i, timeOfDay, note, data));
  // Exclude over-detour candidates BEFORE they reach the UI (§6), then rank the rest.
  const candidates = withinMaxDetour(all);

  let comparison: RouteFeatureResponse['comparison'] = null;
  if (candidates.length > 1) {
    const ranking = rankCandidates(candidates);
    comparison = {
      preferred_candidate_id: ranking.preferredCandidateId, // may be null on tie / insufficient evidence
      explanation: explain(candidates, ranking),
    };
  }

  return { candidates, comparison, generated_at: generatedAt, engine_version: ENGINE_VERSION };
}

// FR-68: build the STRUCTURED, COORDINATE-FREE payload for the AI from a response
// (Gap 8, replaces the old lossy string descriptors). Derives only from route-level
// metrics/indicators — never emits coordinates, place names or addresses, so precise
// GPS cannot reach the model (extends FR-47). Pure (no expo deps), unit-testable.
export function buildRoutePayload(response: RouteFeatureResponse, timeOfDay?: TimeOfDay): RouteExplanationRequest {
  const cands = response.candidates;
  const fastest = cands.length ? Math.min(...cands.map((c) => c.summary.duration_s)) : 0;
  // Values are rounded (metres → integer, fractions → 2 dp) so the serialised payload
  // never contains a many-decimal number that could look like a coordinate, keeping the
  // FR-68 GPS-leak check meaningful. The full-precision numbers stay on candidate.metrics.
  const meters = (v: number | null): number | null => (v === null ? null : Math.round(v));
  const frac2 = (v: number | null): number | null => (v === null ? null : Math.round(v * 100) / 100);
  return {
    candidates: cands.map((c) => ({
      id: c.id,
      label: c.label,
      distance_m: c.metrics.distance_m,
      duration_s: c.metrics.duration_s,
      extra_walking_min_vs_fastest: Math.round((c.summary.duration_s - fastest) / 60),
      indicators: {
        lighting_availability: { category: c.indicators.lighting_availability, value: frac2(c.metrics.lit_fraction) },
        transit_proximity: { category: c.indicators.transit_proximity, value: meters(c.metrics.transit_median_distance_m) },
        help_point_proximity: { category: c.indicators.help_point_proximity, value: meters(c.metrics.help_point_min_distance_m) },
        route_openness: { category: c.indicators.route_openness, value: frac2(c.metrics.active_span_share) },
      },
    })),
    preferred_candidate_id: response.comparison?.preferred_candidate_id ?? null,
    tie: response.comparison ? response.comparison.preferred_candidate_id === null : false,
    time_of_day: timeOfDay ?? cands[0]?.indicators.time_of_day,
  };
}
