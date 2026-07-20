// Edge Function: generate-safety-tips  (FR-43..47, NFR-04, NFR-06)
// Direct Provider (OpenAI) executed SERVER-SIDE. The provider key lives only
// in the AI_PROVIDER_KEY secret — never in the client. Provider call is in
// ../_shared/ai.ts (swap providers there).
//
// Deploy:  supabase functions deploy generate-safety-tips
// Secret:  supabase secrets set AI_PROVIDER_KEY=sk-...   (OpenAI API key)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { callAI, extractJson } from '../_shared/ai.ts';

// Exact system prompt (spec §18) — do not paraphrase. prompt-id: safety-tips-system-v1
const SYSTEM_PROMPT =
  'You are a personal safety support assistant. Give short, calm, practical safety ' +
  'suggestions. You do not replace emergency services. If the user may be in immediate ' +
  'danger, tell them to contact local emergency services. Do not give risky, confrontational, ' +
  'medical, legal, or guaranteed safety advice. Do not ask for unnecessary personal data. ' +
  'Prioritize privacy, consent, and user control.\n\n' +
  'Respond ONLY with JSON matching: {"tips":[string,...],"emergency_reminder":string,' +
  '"contact_suggestion":string,"complete":true}. Keep 2-4 short tips.';

const RATE_LIMIT = 10; // requests
const RATE_WINDOW_MIN = 5;

const FALLBACK = {
  tips: [
    'Move toward a public, well-lit area such as a shop, café, or a group of people.',
    'Call or message a trusted contact now and share where you are.',
  ],
  emergency_reminder: 'If you are in immediate danger, call local emergency services.',
  contact_suggestion: 'Consider contacting a trusted person right now.',
  complete: true,
};

// Reject responses that violate the AI guardrails (FR-45).
function violatesGuardrails(text: string): boolean {
  // No trailing \b so "diagnos" matches "diagnose"/"diagnosis" (see unit test).
  return /\b(guarantee|you are safe|you'?re safe|confront|attack them|sue|lawsuit|diagnos)/i.test(text);
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

  // Rate limit (NFR-06): count this user's recent requests (RLS-scoped).
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await supabase
    .from('ai_safety_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if ((count ?? 0) >= RATE_LIMIT) {
    return json({ error: 'rate_limited', ...FALLBACK }, 429);
  }

  // Parse input. Exact GPS is never accepted (FR-47).
  let situation = '';
  let context: string | undefined;
  let timeOfDay: string | undefined;
  let isAlone: boolean | undefined;
  try {
    const body = await req.json();
    situation = String(body.situation ?? '').slice(0, 1500); // cap (prompt budget)
    context = body.context ? String(body.context) : undefined;
    timeOfDay = body.time_of_day ? String(body.time_of_day) : undefined;
    isAlone = typeof body.is_alone === 'boolean' ? body.is_alone : undefined;
  } catch {
    return json({ error: 'bad_request', ...FALLBACK }, 400);
  }
  if (!situation.trim()) return json({ error: 'empty', ...FALLBACK }, 400);

  const userContent =
    `Situation: ${situation}\n` +
    (context ? `Context: ${context}\n` : '') +
    (timeOfDay ? `Time of day: ${timeOfDay}\n` : '') +
    (isAlone !== undefined ? `Alone: ${isAlone}\n` : '');

  // Call the provider server-side (key from secret). Falls back on any failure.
  let result = FALLBACK;
  try {
    const text = await callAI(SYSTEM_PROMPT, userContent, 600);
    const parsed = extractJson(text);
    if (
      parsed &&
      Array.isArray(parsed.tips) &&
      parsed.tips.length > 0 &&
      !violatesGuardrails(text)
    ) {
      result = {
        tips: parsed.tips.map((t: unknown) => String(t)).slice(0, 4),
        emergency_reminder: String(parsed.emergency_reminder ?? FALLBACK.emergency_reminder),
        contact_suggestion: String(parsed.contact_suggestion ?? FALLBACK.contact_suggestion),
        complete: true,
      };
    }
  } catch {
    result = FALLBACK; // ERR-04 — static safety fallback
  }

  // Audit/rate-limit row. Situation text stored ONLY with consent (FR-45/FR-49).
  let storeText = false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_preferences')
    .eq('id', user.id)
    .single();
  storeText = Boolean(profile?.privacy_preferences?.store_ai_text);

  await supabase.from('ai_safety_requests').insert({
    user_id: user.id,
    situation_category: context ?? null,
    user_input: storeText ? situation : null,
    ai_response: storeText ? JSON.stringify(result) : null,
  });

  return json(result, 200);
});
