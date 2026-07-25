import { violatesGuardrails } from '@/lib/aiGuardrails';

// @feature US-011 @priority must
// FR-45: AI must not guarantee safety, encourage confrontation, or give legal certainty.
describe('AI guardrails (FR-45)', () => {
  it('flags safety guarantees', () => {
    expect(violatesGuardrails('I guarantee you will be safe')).toBe(true);
    expect(violatesGuardrails("you're safe now")).toBe(true);
  });
  it('flags confrontation encouragement', () => {
    expect(violatesGuardrails('confront the person directly')).toBe(true);
    expect(violatesGuardrails('attack them if needed')).toBe(true);
  });
  it('flags legal/medical certainty', () => {
    expect(violatesGuardrails('you should sue them')).toBe(true);
    expect(violatesGuardrails('I can diagnose your condition')).toBe(true);
  });
  it('allows calm, practical, compliant advice', () => {
    expect(
      violatesGuardrails(
        'Move toward a well-lit public area and call a trusted contact. If in danger, call emergency services.',
      ),
    ).toBe(false);
  });
});
