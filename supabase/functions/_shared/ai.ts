// Shared AI provider call (Direct Provider pattern, NFR-04). The provider key
// lives only in the AI_PROVIDER_KEY secret — never in the client.
//
// Provider: OpenAI Chat Completions. JSON mode (`response_format: json_object`)
// forces well-formed JSON, so the caller can parse reliably. Swapping providers
// means changing only this file.
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Call the provider with a system + user prompt. Returns the raw message content
// (expected to be a JSON string). Throws on non-2xx so the caller falls back.
export async function callAI(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('AI_PROVIDER_KEY') ?? ''}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI_HTTP_${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

// Tolerant JSON extraction: even in JSON mode a stray fence/prose can appear, so
// strip ```fences``` and grab the first {...} block before parsing.
export function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}
