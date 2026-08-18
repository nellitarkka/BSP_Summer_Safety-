// Pure, runtime-agnostic logic for the explain-route Edge Function (N1/N3/N4/N5).
// Deliberately free of Deno APIs and network imports so it can be unit-tested under
// jest; the Deno `index.ts` composes these helpers with the provider call and the
// Supabase client. Mirrors the app-side contract in src/types + src/lib/aiGuardrails.

export type FallbackReason =
  | 'unauthorized'
  | 'rate_limited'
  | 'bad_request'
  | 'provider_error'
  | 'parse_error'
  | 'guardrail_blocked'
  | 'client_error';

export const PROMPT_VERSION = 'route-explanation-system-v2';
export const MAX_TOKENS = 500;

// prompt-id: route-explanation-system-v2
export const SYSTEM_PROMPT_V2 =
  'You are a personal safety support assistant that explains a comparison of walking ' +
  'routes. You are given structured facts about 1-3 candidate routes: distance, ' +
  'walking time, and four route-level indicators (lighting, transit proximity, ' +
  'help-point proximity, openness), each with a category and, where measured, a ' +
  'numeric value. You are also told which route a deterministic ranking preferred, or ' +
  'that there is no clear preference.\n\n' +
  'Rules you MUST follow:\n' +
  '1. Use ONLY the supplied facts. Do not invent streets, places, landmarks, crime ' +
  'levels or any detail that is not in the input.\n' +
  '2. When an indicator is "unknown"/no data, say the data was not available — never ' +
  'present missing data as a measured low value, and never treat it as a weakness.\n' +
  '3. When you discuss a route that takes longer, state the extra walking time in ' +
  'minutes and what it is traded for.\n' +
  '4. If there is no clear preferred route, say so plainly and describe the trade-offs ' +
  'instead of inventing a winner.\n' +
  '5. Never label any street, area or neighbourhood as dangerous, unsafe, high-crime, ' +
  'sketchy or similar, and never guarantee safety. Use relative, non-absolute wording. ' +
  'The user decides; you do not replace emergency services.\n\n' +
  'Respond ONLY with JSON matching: {"explanation":string,"emergency_reminder":string,' +
  '"complete":true}. Keep the explanation to 2-4 short sentences.';

// prompt-id: route-explanation-system-v1 — retained verbatim for the §7 comparison.
export const SYSTEM_PROMPT_V1 =
  'You are a personal safety support assistant helping compare walking routes. ' +
  'Given short, relative descriptions of candidate routes, explain in a calm, plain ' +
  'way why one route may be preferable — for example better lighting, staying closer ' +
  'to public transport, or more open and active streets. You do NOT label any street ' +
  'or area as dangerous, high-crime, sketchy, or unsafe, and you never guarantee ' +
  'safety. Avoid confrontational or absolute language. Present suggestions as options ' +
  'with uncertainty; the user decides. You do not replace emergency services.\n\n' +
  'Respond ONLY with JSON matching: {"explanation":string,"emergency_reminder":string,' +
  '"complete":true}. Keep the explanation to 2-3 short sentences.';

export const EMERGENCY_REMINDER = 'If you are in immediate danger, call local emergency services.';
export const FALLBACK_TEXT =
  'Compare the routes using the details shown — lighting, how close each stays to ' +
  'public transport, and how open and active the streets are. Choose the one you ' +
  'feel most comfortable with.';

export interface RouteResult {
  explanation: string;
  emergency_reminder: string;
  source: 'ai' | 'fallback';
  fallback_reason: FallbackReason | null;
  prompt_version: string | null;
  complete: boolean;
}

// A fallback body always carries an explicit source + reason (Gap 10).
export function fallbackBody(reason: FallbackReason): RouteResult {
  return {
    explanation: FALLBACK_TEXT,
    emergency_reminder: EMERGENCY_REMINDER,
    source: 'fallback',
    fallback_reason: reason,
    prompt_version: null,
    complete: true,
  };
}

// FR-67 guardrail — mirrors src/lib/aiGuardrails.ts (violatesRouteGuardrails).
export function violatesRouteGuardrails(text: string): boolean {
  const base = /\b(guarantee|you are safe|you'?re safe|confront|attack them|sue|lawsuit|diagnos)/i;
  const route =
    /\b(dangerous|unsafe (street|area|road|neighbou?rhood)|high[- ]?crime|crime[- ]?ridden|avoid this (street|area)|sketchy|dodgy|bad (area|neighbou?rhood))\b/i;
  return base.test(text) || route.test(text);
}

// Tolerant JSON extraction (mirrors _shared/ai.ts extractJson) — pure, no Deno.
export function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1]!.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---- Structured payload validation (N3/N4). Rejects unknown fields and malformed
// shapes so the coordinate-free privacy boundary is enforced server-side too. --------
const CANDIDATE_KEYS = ['id', 'label', 'distance_m', 'duration_s', 'extra_walking_min_vs_fastest', 'indicators'];
const INDICATOR_KEYS = ['lighting_availability', 'transit_proximity', 'help_point_proximity', 'route_openness'];
const REQUEST_KEYS = ['candidates', 'preferred_candidate_id', 'tie', 'time_of_day'];
const CATEGORIES = new Set(['lower', 'moderate', 'higher', 'unknown']);

function onlyKnownKeys(obj: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(obj).every((k) => allowed.includes(k));
}

// deno-lint-ignore no-explicit-any
export function validatePayload(body: any): { ok: true; payload: any } | { ok: false } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  if (!onlyKnownKeys(body, REQUEST_KEYS)) return { ok: false };
  if (!Array.isArray(body.candidates) || body.candidates.length === 0 || body.candidates.length > 3) return { ok: false };
  for (const c of body.candidates) {
    if (!c || typeof c !== 'object' || !onlyKnownKeys(c, CANDIDATE_KEYS)) return { ok: false };
    if (typeof c.id !== 'string' || typeof c.label !== 'string') return { ok: false };
    if (typeof c.distance_m !== 'number' || typeof c.duration_s !== 'number') return { ok: false };
    if (typeof c.extra_walking_min_vs_fastest !== 'number') return { ok: false };
    if (!c.indicators || typeof c.indicators !== 'object' || !onlyKnownKeys(c.indicators, INDICATOR_KEYS)) return { ok: false };
    for (const k of INDICATOR_KEYS) {
      const ind = c.indicators[k];
      if (!ind || typeof ind !== 'object' || !onlyKnownKeys(ind, ['category', 'value'])) return { ok: false };
      if (!CATEGORIES.has(ind.category)) return { ok: false };
      if (ind.value !== null && typeof ind.value !== 'number') return { ok: false };
    }
  }
  if (body.preferred_candidate_id !== null && typeof body.preferred_candidate_id !== 'string') return { ok: false };
  if (typeof body.tie !== 'boolean') return { ok: false };
  return { ok: true, payload: body };
}

function fmtValue(key: string, value: number | null): string {
  if (value === null) return 'no data';
  if (key === 'lighting_availability' || key === 'route_openness') return `${Math.round(value * 100)}% of the route`;
  return `${Math.round(value)} m`;
}

// deno-lint-ignore no-explicit-any
export function renderUserContent(payload: any): string {
  const fastestId = payload.candidates.reduce(
    // deno-lint-ignore no-explicit-any
    (best: any, c: any) => (c.duration_s < best.duration_s ? c : best),
    payload.candidates[0],
  ).id;
  // deno-lint-ignore no-explicit-any
  const blocks = payload.candidates.map((c: any) => {
    const km = (c.distance_m / 1000).toFixed(2);
    const min = Math.round(c.duration_s / 60);
    const tag = c.id === fastestId ? ' (fastest)' : ` (+${c.extra_walking_min_vs_fastest} min vs fastest)`;
    const rows = INDICATOR_KEYS.map((k) => {
      const ind = c.indicators[k];
      return `  - ${k.replace(/_/g, ' ')}: ${ind.category} (${fmtValue(k, ind.value)})`;
    }).join('\n');
    return `${c.label}: ${km} km, ${min} min walk${tag}\n${rows}`;
  });
  const pref = payload.tie
    ? 'Deterministic ranking: no clear preference (the routes could not be separated on the available indicators).'
    : payload.preferred_candidate_id
      ? `Deterministic ranking preferred: ${payload.preferred_candidate_id}.`
      : 'Deterministic ranking: no clear preference (insufficient data).';
  return (
    'Candidate routes:\n' +
    blocks.join('\n') +
    (payload.time_of_day ? `\nTime of day: ${payload.time_of_day}` : '') +
    `\n${pref}`
  );
}

// Turn a raw provider reply into either a live-AI result or the appropriate fallback,
// applying the parse and guardrail checks (N1/N5). Pure — the network call is done by
// the caller and only its text is passed in.
export function finalizeAiResponse(rawText: string): RouteResult {
  const parsed = extractJson(rawText);
  if (!parsed || typeof parsed.explanation !== 'string' || String(parsed.explanation).trim().length === 0) {
    return fallbackBody('parse_error');
  }
  if (violatesRouteGuardrails(rawText)) return fallbackBody('guardrail_blocked');
  return {
    explanation: String(parsed.explanation),
    emergency_reminder: String(parsed.emergency_reminder ?? EMERGENCY_REMINDER),
    source: 'ai',
    fallback_reason: null,
    prompt_version: PROMPT_VERSION,
    complete: true,
  };
}
