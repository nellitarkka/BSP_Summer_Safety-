import type {
  IndicatorRating,
  PathType,
  RouteCandidate,
  RouteFeatureResponse,
  TimeOfDay,
} from '@/types';
import { proximityRatings, type FeatureData } from '@/lib/routeFeatures';



export interface GraphHopperPath {
  distance: number; // meters
  time: number; // milliseconds
  points: { coordinates: [number, number][] };
  details?: { road_class?: [number, number, string][] };
}

export const ENGINE_VERSION = 'route-engine-graphhopper-0.2';

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


function opennessRating(rc: [number, number, string][] | undefined): IndicatorRating {
  if (!rc || rc.length === 0) return 'unknown';
  let total = 0;
  let active = 0;
  for (const [from, to, value] of rc) {
    const span = Math.max(1, to - from);
    total += span;
    if (!ISOLATED_CLASSES.has(value)) active += span;
  }
  if (total === 0) return 'unknown';
  const share = active / total;
  if (share >= 0.8) return 'higher';
  if (share >= 0.5) return 'moderate';
  return 'lower';
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

const RANK: Record<IndicatorRating, number> = { higher: 3, moderate: 2, lower: 1, unknown: 0 };

function durMin(c: RouteCandidate): number {
  return Math.round(c.summary.duration_s / 60);
}

function extraClauses(c: RouteCandidate): string {
  const bits: string[] = [];
  if (c.indicators.lighting_availability === 'higher') bits.push('has more street lighting');
  if (c.indicators.transit_proximity === 'higher') bits.push('stays close to public transport');
  if (c.indicators.help_point_proximity === 'higher') bits.push('passes near help points');
  return bits.length > 0 ? `, and ${bits.join(' and ')}` : '';
}


function explain(candidates: RouteCandidate[], preferred: RouteCandidate): string {
  const other = candidates.find((c) => c.id !== preferred.id);
  const parts = [
    `${preferred.label} (${durMin(preferred)} min walk) ${OPENNESS_CLAUSE[preferred.indicators.route_openness]}${extraClauses(preferred)}.`,
  ];
  if (other) {
    parts.push(`${other.label} (${durMin(other)} min walk) ${OPENNESS_CLAUSE[other.indicators.route_openness]}.`);
  }
  parts.push('Both are options — choose what feels right for you.');
  return parts.join(' ');
}

function candidateScore(c: RouteCandidate): number {
  return (
    RANK[c.indicators.route_openness] +
    RANK[c.indicators.transit_proximity] +
    RANK[c.indicators.help_point_proximity] +
    RANK[c.indicators.lighting_availability]
  );
}

const LABELS = ['Route A', 'Route B', 'Route C'];
const IDS = ['A', 'B', 'C'];

export function buildResponseFromPaths(
  paths: GraphHopperPath[],
  timeOfDay: TimeOfDay,
  generatedAt: string,
  data?: FeatureData,
): RouteFeatureResponse {
  const note = data
    ? 'Indicators use the Luxembourg open-data extract; lighting reflects mapped ' +
      'street lamps (OSM coverage varies), openness is estimated from road types.'
    : 'Lighting, transit and help-point data are not available in this build — ' +
      'shown as "not enough data". Openness is estimated from road types only.';

  const candidates: RouteCandidate[] = paths.slice(0, 3).map((p, i) => {
    const rc = p.details?.road_class;
    const distance_m = Math.round(p.distance);
    const duration_s = Math.round(p.time / 1000);
    const coordinates = p.points.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
    const prox = data
      ? proximityRatings(coordinates, data)
      : { transit: 'unknown' as const, help: 'unknown' as const, lighting: 'unknown' as const };
    return {
      id: IDS[i]!,
      label: LABELS[i]!,
      summary: { coordinates, distance_m, duration_s, provider: ENGINE_VERSION },
      features: {
        distance_m,
        duration_s,
        transit_stops: [],
        help_points: [],
        path_types: pathTypes(rc),
        lighting: 'unknown',
        isolated_segment_count: 0,
      },
      indicators: {
        lighting_availability: prox.lighting,
        transit_proximity: prox.transit,
        help_point_proximity: prox.help,
        route_openness: opennessRating(rc),
        time_of_day: timeOfDay,
        uncertainty_note: note,
      },
    };
  });

  let comparison: RouteFeatureResponse['comparison'] = null;
  if (candidates.length > 1) {
    const preferred = [...candidates].sort(
      (a, b) => candidateScore(b) - candidateScore(a) || a.summary.duration_s - b.summary.duration_s,
    )[0]!;
    comparison = { preferred_candidate_id: preferred.id, explanation: explain(candidates, preferred) };
  }

  return { candidates, comparison, generated_at: generatedAt, engine_version: ENGINE_VERSION };
}


export function buildRouteDescriptors(candidates: RouteCandidate[]): string[] {
  return candidates.map((c) => {
    const parts: string[] = [];
    if (c.indicators.lighting_availability === 'higher') parts.push('well-lit main streets');
    else if (c.indicators.lighting_availability === 'lower') parts.push('some less-lit stretches');
    if (c.indicators.transit_proximity === 'higher') parts.push('close to public transport');
    if (c.indicators.route_openness === 'higher') parts.push('mostly open, active areas');
    else if (c.indicators.route_openness === 'lower') parts.push('some quieter, less busy parts');
    if (c.indicators.help_point_proximity === 'higher') parts.push('near help points');
    const desc = parts.length > 0 ? parts.join(', ') : 'limited route data available';
    return `${c.label}: ${desc}`;
  });
}
