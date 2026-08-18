import { supabase } from '@/lib/supabase';
import { aiService } from '@/services/aiService';
import type { RouteExplanationRequest, RouteExplanationResponse } from '@/types';

// The Supabase client is fully mocked so no network/import side effects run.
// (ts-jest hoists this jest.mock call above the imports at runtime.)
jest.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));

const invoke = supabase.functions.invoke as unknown as jest.Mock;
const REQ: RouteExplanationRequest = { candidates: [], preferred_candidate_id: null, tie: false };

beforeEach(() => invoke.mockReset());

// @feature US-014 @priority must
// N1/Gap 10: no path out of explainRoute returns text without an explicit source.
describe('aiService.explainRoute source metadata (Gap 10)', () => {
  it('passes through a live AI response with source "ai"', async () => {
    const ai: RouteExplanationResponse = {
      explanation: 'Route A is a little more open.', emergency_reminder: 'x',
      source: 'ai', fallback_reason: null, prompt_version: 'route-explanation-system-v2', complete: true,
    };
    invoke.mockResolvedValue({ data: ai, error: null });
    const res = await aiService.explainRoute(REQ);
    expect(res.source).toBe('ai');
    expect(res.fallback_reason).toBeNull();
  });

  it('passes through a server fallback with its reason', async () => {
    invoke.mockResolvedValue({
      data: { explanation: 'compare the details', emergency_reminder: 'x', source: 'fallback', fallback_reason: 'provider_error', prompt_version: null, complete: true },
      error: null,
    });
    const res = await aiService.explainRoute(REQ);
    expect(res.source).toBe('fallback');
    expect(res.fallback_reason).toBe('provider_error');
  });

  it('returns a client_error fallback when invoke errors', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const res = await aiService.explainRoute(REQ);
    expect(res.source).toBe('fallback');
    expect(res.fallback_reason).toBe('client_error');
  });

  it('returns a client_error fallback when invoke throws', async () => {
    invoke.mockRejectedValue(new Error('network'));
    const res = await aiService.explainRoute(REQ);
    expect(res.source).toBe('fallback');
    expect(res.fallback_reason).toBe('client_error');
  });

  it('returns a parse_error fallback when the body is malformed', async () => {
    invoke.mockResolvedValue({ data: { explanation: 123 }, error: null });
    const res = await aiService.explainRoute(REQ);
    expect(res.source).toBe('fallback');
    expect(res.fallback_reason).toBe('parse_error');
  });

  it('never labels a source-less body as live AI (coerces to fallback)', async () => {
    invoke.mockResolvedValue({ data: { explanation: 'text with no source field' }, error: null });
    const res = await aiService.explainRoute(REQ);
    expect(res.source).toBe('fallback');
  });
});
