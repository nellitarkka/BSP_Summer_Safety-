import type { IndicatorRating, RouteCandidate, RouteIndicators } from '@/types';

// Single documented home for every tunable routing constant (Gap 2/3/4/5/6,
// TECHNICAL_DECISIONS.md §2/§4/§5/§6/§7/§8). Every value here is an ENGINEERING
// PROTOTYPE CHOICE unless a source is named — see TECHNICAL_DECISIONS.md. No
// threshold/weight literal is allowed to remain inline in a rating or ranking
// function; they all read from here so one edit moves the tests with it.
export const ROUTE_TUNING = {
  // §4 — category cut-offs (kept from the original build; documented, not revised).
  thresholds: {
    transitHigherM: 150, // ~2 min walk to a stop
    transitModerateM: 350, // ~common transit access-distance rule of thumb
    helpHigherM: 300, // help points are sparse; "on the way"
    helpModerateM: 800, // "roughly nearby"
    lightingHigherFrac: 0.6, // majority of sampled points near mapped lamps
    lightingModerateFrac: 0.3, // partial coverage
    opennessHigherShare: 0.8, // mostly on active streets
    opennessModerateShare: 0.5, // mixed
  },
  // §2 — ranking: equal weights, exclude-and-normalise unknown policy.
  ranking: {
    weights: {
      lighting_availability: 1,
      transit_proximity: 1,
      help_point_proximity: 1,
      route_openness: 1,
    } as Record<keyof RankableIndicators, number>,
    points: { higher: 1, moderate: 0.5, lower: 0 } as Record<Exclude<IndicatorRating, 'unknown'>, number>,
    minAvailableIndicators: 2, // fewer than this ⇒ no trustworthy score (§2/§8)
    tieMargin: 0.1, // adjusted-score gap below this ⇒ no clear preference (§8)
  },
  // §5/§6 — walking-time trade-off and maximum acceptable detour.
  detour: {
    penaltyPerMin: 0.05, // score points subtracted per extra minute vs the fastest
    maxRatio: 1.5, // reject only if BOTH ratio AND absolute exceeded (§6)
    maxAbsSeconds: 600, // 10 min
  },
  // §7 — geometric route overlap.
  overlap: {
    toleranceM: 25, // two routes within this band count as shared
    rejectThreshold: 0.7, // ≥70 % shared ⇒ not a meaningfully different alternative
  },
  // §"values not on the blocking list" — synthesised-candidate plausibility.
  candidate: {
    plausibilityMaxDistanceRatio: 3.0, // reject a detour longer than 3× the direct route
  },
} as const;

// The four indicators that feed the score (everything on RouteIndicators except the
// contextual `time_of_day` / `uncertainty_note`).
export type RankableIndicators = Pick<
  RouteIndicators,
  'lighting_availability' | 'transit_proximity' | 'help_point_proximity' | 'route_openness'
>;

const RANKABLE_KEYS: (keyof RankableIndicators)[] = [
  'lighting_availability',
  'transit_proximity',
  'help_point_proximity',
  'route_openness',
];

// ---------------------------------------------------------------------------
// Threshold → category functions (§4). Each returns 'unknown' iff the raw value is
// null (missing data), never a guessed 'lower' (NFR-14). Centralised so no literal
// lives inline in routeFeatures / routeDerivation.
// ---------------------------------------------------------------------------
export function rateTransit(medianM: number | null): IndicatorRating {
  if (medianM === null) return 'unknown';
  const t = ROUTE_TUNING.thresholds;
  return medianM < t.transitHigherM ? 'higher' : medianM < t.transitModerateM ? 'moderate' : 'lower';
}

export function rateHelp(minM: number | null): IndicatorRating {
  if (minM === null) return 'unknown';
  const t = ROUTE_TUNING.thresholds;
  return minM < t.helpHigherM ? 'higher' : minM < t.helpModerateM ? 'moderate' : 'lower';
}

export function rateLighting(frac: number | null): IndicatorRating {
  if (frac === null) return 'unknown';
  const t = ROUTE_TUNING.thresholds;
  return frac >= t.lightingHigherFrac ? 'higher' : frac >= t.lightingModerateFrac ? 'moderate' : 'lower';
}

export function rateOpenness(share: number | null): IndicatorRating {
  if (share === null) return 'unknown';
  const t = ROUTE_TUNING.thresholds;
  return share >= t.opennessHigherShare ? 'higher' : share >= t.opennessModerateShare ? 'moderate' : 'lower';
}

// ---------------------------------------------------------------------------
// Deterministic ranking (§2/§3/§5/§8). Exported and independently testable — this
// logic previously had ZERO test coverage and always emitted a preference.
// ---------------------------------------------------------------------------

// Weighted mean of the AVAILABLE indicators, in [0,1]; null when fewer than
// minAvailableIndicators are available (unknown is EXCLUDED, never scored as 0).
export function candidateIndicatorScore(ind: RankableIndicators): number | null {
  const { weights, points, minAvailableIndicators } = ROUTE_TUNING.ranking;
  let weighted = 0;
  let weightSum = 0;
  let available = 0;
  for (const key of RANKABLE_KEYS) {
    const rating = ind[key];
    if (rating === 'unknown') continue;
    const w = weights[key];
    weighted += w * points[rating];
    weightSum += w;
    available += 1;
  }
  if (available < minAvailableIndicators || weightSum === 0) return null;
  return weighted / weightSum;
}

export type RankingReason = 'clear' | 'tie' | 'insufficient_evidence';

export interface Ranking {
  preferredCandidateId: string | null;
  reason: RankingReason;
  fastestDurationS: number;
  // Per-candidate detail for transparency / the benchmark results file.
  detail: {
    id: string;
    indicatorScore: number | null; // base mean over available indicators
    extraMinutes: number; // vs the fastest candidate
    adjustedScore: number | null; // indicatorScore − detour penalty
  }[];
}

// Rank candidates and decide the preferred one (or null on tie / insufficient
// evidence). Fully deterministic: the final order is total (adjusted score desc,
// then duration asc, then id asc), so the result is independent of input order.
export function rankCandidates(candidates: RouteCandidate[]): Ranking {
  const durations = candidates.map((c) => c.summary.duration_s);
  const fastestDurationS = durations.length ? Math.min(...durations) : 0;
  const { penaltyPerMin } = ROUTE_TUNING.detour;
  const { tieMargin } = ROUTE_TUNING.ranking;

  const detail = candidates.map((c) => {
    const indicatorScore = candidateIndicatorScore(c.indicators);
    const extraMinutes = (c.summary.duration_s - fastestDurationS) / 60;
    const adjustedScore = indicatorScore === null ? null : indicatorScore - penaltyPerMin * extraMinutes;
    return { id: c.id, indicatorScore, extraMinutes, adjustedScore };
  });

  const eligible = detail.filter(
    (d): d is typeof d & { adjustedScore: number } => d.adjustedScore !== null,
  );
  if (eligible.length === 0) {
    return { preferredCandidateId: null, reason: 'insufficient_evidence', fastestDurationS, detail };
  }

  const durationById = new Map(candidates.map((c) => [c.id, c.summary.duration_s]));
  const ordered = [...eligible].sort(
    (a, b) =>
      b.adjustedScore - a.adjustedScore ||
      (durationById.get(a.id)! - durationById.get(b.id)!) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  const top = ordered[0]!;
  const second = ordered[1];
  if (second && top.adjustedScore - second.adjustedScore < tieMargin) {
    return { preferredCandidateId: null, reason: 'tie', fastestDurationS, detail };
  }
  return { preferredCandidateId: top.id, reason: 'clear', fastestDurationS, detail };
}
