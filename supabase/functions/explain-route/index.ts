// Edge Function: explain-route  (FR-66, FR-67, FR-68, NFR-04, NFR-06)
// Route-explanation mode of the safety AI. Input is a STRUCTURED, COORDINATE-FREE
// payload (built client-side) — never precise GPS, place names or addresses (FR-68).
// The system prompt and an output guardrail forbid objective street-danger labels and
// safety guarantees (FR-67). Provider key stays in the AI_PROVIDER_KEY secret.
//
// Every response carries `source` ('ai' | 'fallback'), `fallback_reason` and
// `prompt_version` so fallback text can never be presented as live AI (Gap 10), and
// each request records a coordinate-free, free-text-free diagnostic row (Gap 11).
// The pure logic (validation, prompt, rendering, guardrail) lives in ./logic.ts and is
// unit-tested under jest; this file only wires it to Deno + Supabase + the provider.
//
// Deploy:  supabase functions deploy explain-route
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { callAI } from '../_shared/ai.ts';
import {
  fallbackBody,
  finalizeAiResponse,
  renderUserContent,
  validatePayload,
  MAX_TOKENS,
  PROMPT_VERSION,
  SYSTEM_PROMPT_V2,
  type FallbackReason,
} from './logic.ts';

const RATE_LIMIT = 10;
const RATE_WINDOW_MIN = 5;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json(fallbackBody('unauthorized'), 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(fallbackBody('unauthorized'), 401);

  // Rate limit (NFR-06): shared with other AI requests, RLS-scoped to this user.
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
  const { count } = await supabase
    .from('ai_safety_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if ((count ?? 0) >= RATE_LIMIT) return json(fallbackBody('rate_limited'), 429);

  // Parse + validate the STRUCTURED payload. No coordinates / place names by schema.
  // deno-lint-ignore no-explicit-any
  let parsed: any;
  try {
    parsed = await req.json();
  } catch {
    await audit(supabase, user.id, 'fallback', 'bad_request');
    return json(fallbackBody('bad_request'), 400);
  }
  const validation = validatePayload(parsed);
  if (!validation.ok) {
    await audit(supabase, user.id, 'fallback', 'bad_request');
    return json(fallbackBody('bad_request'), 400);
  }

  const userContent = renderUserContent(validation.payload);

  let result = fallbackBody('provider_error');
  try {
    const text = await callAI(SYSTEM_PROMPT_V2, userContent, MAX_TOKENS);
    result = finalizeAiResponse(text);
  } catch {
    result = fallbackBody('provider_error'); // provider HTTP error / missing key / network
  }

  await audit(supabase, user.id, result.source, result.source === 'ai' ? null : result.fallback_reason);
  return json(result, 200);
});

// Diagnostic audit row (Gap 11). Records ONLY provenance metadata — no user free text
// and no model explanation text — so a fallback rate and its reasons are recoverable.
// deno-lint-ignore no-explicit-any
async function audit(supabase: any, userId: string, source: 'ai' | 'fallback', reason: FallbackReason | null) {
  await supabase.from('ai_safety_requests').insert({
    user_id: userId,
    situation_category: 'route_explanation',
    user_input: null,
    ai_response: JSON.stringify({ source, fallback_reason: reason, prompt_version: source === 'ai' ? PROMPT_VERSION : null }),
  });
}
