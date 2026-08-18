import type { RouteExplanationRequest, RouteExplanationIndicator } from '@/types';

// Automated, DECIDABLE faithfulness checks for a route AI explanation against the
// structured payload it was given (Gap 13, N6). These do not attempt full natural-
// language understanding; they check the properties that can be decided from the text
// and the numbers alone, and are the automated half of the §7 rubric. Judgement-based
// dimensions (clarity, usefulness) remain human-rubric-scored.

// Positive assertions per indicator — if the text makes one of these claims about an
// indicator that the payload marks unavailable, that is an unfaithful "measured-value"
// claim about missing data.
const INDICATOR_POSITIVE_TERMS: Record<keyof RouteExplanationRequest['candidates'][number]['indicators'], RegExp> = {
  lighting_availability: /\b(well[- ]?lit|good lighting|brighter|more lighting|street ?light)\b/i,
  transit_proximity: /\b(close to (public )?transport|near (a )?(bus|tram|train|transit)|nearer (a )?stop|closer to transit)\b/i,
  help_point_proximity: /\b(help point|near (the )?police|near (a )?hospital|near (a )?pharmac)\b/i,
  route_openness: /\b(more open|open,? active|busier streets|main,? active streets)\b/i,
};

// Phrases that explicitly acknowledge missing/limited data or no clear preference.
const DATA_CAVEAT = /\b(no data|not available|isn'?t available|not enough data|unknown|limited data|couldn'?t|could not|no clear|cannot be separated|either route|both routes|depends on)\b/i;

function categories(payload: RouteExplanationRequest, key: keyof RouteExplanationRequest['candidates'][number]['indicators']): string[] {
  return payload.candidates.map((c) => (c.indicators[key] as RouteExplanationIndicator).category);
}

// True if the text asserts a positive value for an indicator that is 'unknown' for
// EVERY candidate, without any data caveat — i.e. presents missing data as measured.
export function statesUnknownAsMeasured(payload: RouteExplanationRequest, text: string): boolean {
  if (DATA_CAVEAT.test(text)) return false; // an explicit caveat makes it faithful
  for (const key of Object.keys(INDICATOR_POSITIVE_TERMS) as (keyof typeof INDICATOR_POSITIVE_TERMS)[]) {
    const allUnknown = categories(payload, key).every((c) => c === 'unknown');
    if (allUnknown && INDICATOR_POSITIVE_TERMS[key].test(text)) return true;
  }
  return false;
}

// When the payload has no clear preference, a faithful explanation must acknowledge it.
export function acknowledgesNoPreference(payload: RouteExplanationRequest, text: string): boolean {
  if (!payload.tie) return true; // not applicable
  return DATA_CAVEAT.test(text);
}

// Numbers-with-units the payload actually supports, by unit.
function allowedNumbers(payload: RouteExplanationRequest): { pct: number[]; meters: number[]; km: number[]; min: number[] } {
  const pct: number[] = [];
  const meters: number[] = [];
  const km: number[] = [];
  const min: number[] = [];
  for (const c of payload.candidates) {
    meters.push(Math.round(c.distance_m));
    km.push(Math.round((c.distance_m / 1000) * 10) / 10);
    min.push(Math.round(c.duration_s / 60), Math.abs(c.extra_walking_min_vs_fastest));
    const li = c.indicators.lighting_availability.value;
    const op = c.indicators.route_openness.value;
    const tr = c.indicators.transit_proximity.value;
    const hp = c.indicators.help_point_proximity.value;
    if (li !== null) pct.push(Math.round(li * 100));
    if (op !== null) pct.push(Math.round(op * 100));
    if (tr !== null) meters.push(Math.round(tr));
    if (hp !== null) meters.push(Math.round(hp));
  }
  return { pct, meters, km, min };
}

const near = (x: number, pool: number[], tol: number): boolean => pool.some((p) => Math.abs(p - x) <= tol);

// True if every number-with-unit token in the text is supported by the payload
// (within a rounding tolerance). A number the payload never contained is a likely
// fabricated value (hallucinated metric).
export function numbersSupported(payload: RouteExplanationRequest, text: string): boolean {
  const allowed = allowedNumbers(payload);
  const tokens = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(%|km|m\b|min)/gi)];
  for (const t of tokens) {
    const n = Number(t[1]);
    const unit = t[2]!.toLowerCase();
    if (unit === '%' && !near(n, allowed.pct, 1)) return false;
    if (unit === 'km' && !near(n, allowed.km, 0.15)) return false;
    if (unit === 'm' && !near(n, allowed.meters, 15)) return false;
    if (unit === 'min' && !near(n, allowed.min, 1)) return false;
  }
  return true;
}

export interface FaithfulnessResult {
  faithful: boolean;
  unknownStatedAsMeasured: boolean; // uncertainty-communication failure
  acknowledgesNoPreference: boolean; // relevant only when payload.tie
  numbersSupported: boolean; // hallucinated-number check
  issues: string[];
}

// Aggregate automated faithfulness verdict for one (payload, explanation) pair.
export function evaluateAiFaithfulness(payload: RouteExplanationRequest, text: string): FaithfulnessResult {
  const unknownAsMeasured = statesUnknownAsMeasured(payload, text);
  const ackNoPref = acknowledgesNoPreference(payload, text);
  const numsOk = numbersSupported(payload, text);
  const issues: string[] = [];
  if (unknownAsMeasured) issues.push('states an unavailable indicator as if measured');
  if (!ackNoPref) issues.push('payload has no clear preference but the explanation does not acknowledge it');
  if (!numsOk) issues.push('explanation contains a number not supported by the payload');
  return {
    faithful: !unknownAsMeasured && ackNoPref && numsOk,
    unknownStatedAsMeasured: unknownAsMeasured,
    acknowledgesNoPreference: ackNoPref,
    numbersSupported: numsOk,
    issues,
  };
}
