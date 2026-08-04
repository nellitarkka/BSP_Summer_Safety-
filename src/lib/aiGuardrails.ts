// Pure guardrail check (FR-45). Mirrors the denylist used in the
// generate-safety-tips Edge Function (prompt-id: safety-tips-system-v1).
// Kept here as a unit-testable function; the Edge Function uses the same pattern.
// No trailing \b: "diagnos" must also match "diagnose"/"diagnosis"; leading \b
// still prevents matches inside unrelated words (e.g. "pursue").
const FORBIDDEN =
  /\b(guarantee|you are safe|you'?re safe|confront|attack them|sue|lawsuit|diagnos)/i;

export function violatesGuardrails(text: string): boolean {
  return FORBIDDEN.test(text);
}

// R2 route-explanation guardrail (FR-59/FR-67, NFR-14). In addition to the
// base FR-45 rules, route explanations must NOT call a street/area objectively
// dangerous or emit a street-level danger label. Mirrors the route-mode denylist
// in generate-safety-tips (prompt-id: route-explanation-system-v1).
const FORBIDDEN_ROUTE =
  /\b(dangerous|unsafe (street|area|road|neighbou?rhood)|high[- ]?crime|crime[- ]?ridden|avoid this (street|area)|sketchy|dodgy|bad (area|neighbou?rhood))\b/i;

export function violatesRouteGuardrails(text: string): boolean {
  return FORBIDDEN.test(text) || FORBIDDEN_ROUTE.test(text);
}
