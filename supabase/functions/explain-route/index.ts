// Edge Function: explain-route  (FR-66, FR-67, FR-68, NFR-04, NFR-06)
// Route-explanation mode of the safety AI. Input is AGGREGATED/RELATIVE route
// descriptors only (built client-side) — never precise GPS (FR-68). The system
// prompt and an output guardrail forbid objective street-danger labels and
// safety guarantees (FR-67). Provider key stays in the AI_PROVIDER_KEY secret.
//
// Deploy:  supabase functions deploy explain-route
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { callAI, extractJson } from '../_shared/ai.ts';

// prompt-id: route-explanation-system-v1
const SYSTEM_PROMPT =
  'You are a personal safety support assistant helping compare walking routes. ' +
  'Given short, relative descriptions of candidate routes, explain in a calm, plain ' +
  'way why one route may be preferable — for example better lighting, staying closer ' +
  'to public transport, or more open and active streets. You do NOT label any street ' +
  'or area as dangerous, high-crime, sketchy, or unsafe, and you never guarantee ' +
  'safety. Avoid confrontational or absolute language. Present suggestions as options ' +
  'with uncertainty; the user decides. You do not replace emergency services.\n\n' +
  'Respond ONLY with JSON matching: {"explanation":string,"emergency_reminder":string,' +
  '"complete":true}. Keep the explanation to 2-3 short sentences.';

const RATE_LIMIT = 10;
const RATE_WINDOW_MIN = 5;

const FALLBACK = {
  explanation:
    'Compare the routes using the details shown — lighting, how close each stays to ' +
    'public transport, and how open and active the streets are. Choose the one you ' +
    'feel most comfortable with.',
  emergency_reminder: 'If you are in immediate danger, call local emergency services.',
  complete: true,
};

// FR-67 guardrail — mirrors src/lib/aiGuardrails.ts (violatesRouteGuardrails).
function violatesRouteGuardrails(text: string): boolean {
  const base = /\b(guarantee|you are safe|you'?re safe|confront|attack them|sue|lawsuit|diagnos)/i;
  const route =
    /\b(dangerous|unsafe (street|area|road|neighbou?rhood)|high[- ]?crime|crime[- ]?ridden|avoid this (street|area)|sketchy|dodgy|bad (area|neighbou?rhood))\b/i;
  return base.test(text) || route.test(text);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized', ...FALLBACK }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json({ error: 'Unauthorized', ...FALLBACK }, 401);

  // Rate limit (NFR-06): shared with other AI requests, RLS-scoped to this user.
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await supabase
    .from('ai_safety_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if ((count ?? 0) >= RATE_LIMIT) return json({ error: 'rate_limited', ...FALLBACK }, 429);

  // Parse input — relative descriptors only. There is no coordinates field (FR-68).
  let descriptors: string[] = [];
  let timeOfDay: string | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body.candidate_descriptors)) {
      descriptors = body.candidate_descriptors.map((d: unknown) => String(d).slice(0, 200)).slice(0, 3);
    }
    timeOfDay = body.time_of_day ? String(body.time_of_day) : undefined;
  } catch {
    return json({ error: 'bad_request', ...FALLBACK }, 400);
  }
  if (descriptors.length === 0) return json({ error: 'empty', ...FALLBACK }, 400);

  const userContent =
    'Candidate routes:\n' +
    descriptors.join('\n') +
    (timeOfDay ? `\nTime of day: ${timeOfDay}` : '');

  let result = FALLBACK;
  try {
    const text = await callAI(SYSTEM_PROMPT, userContent, 400);
    const parsed = extractJson(text);
    if (
      parsed &&
      typeof parsed.explanation === 'string' &&
      parsed.explanation.trim().length > 0 &&
      !violatesRouteGuardrails(text)
    ) {
      result = {
        explanation: String(parsed.explanation),
        emergency_reminder: String(parsed.emergency_reminder ?? FALLBACK.emergency_reminder),
        complete: true,
      };
    }
  } catch {
    result = FALLBACK; // safe static fallback
  }

  // Audit/rate-limit row. Route explanations carry no free-text situation to store.
  await supabase.from('ai_safety_requests').insert({
    user_id: user.id,
    situation_category: 'route_explanation',
    user_input: null,
    ai_response: null,
  });

  return json(result, 200);
});
