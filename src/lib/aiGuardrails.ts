const FORBIDDEN =
  /\b(guarantee|you are safe|you'?re safe|confront|attack them|sue|lawsuit|diagnos)/i;

export function violatesGuardrails(text: string): boolean {
  return FORBIDDEN.test(text);
}


const FORBIDDEN_ROUTE =
  /\b(dangerous|unsafe (street|area|road|neighbou?rhood)|high[- ]?crime|crime[- ]?ridden|avoid this (street|area)|sketchy|dodgy|bad (area|neighbou?rhood))\b/i;

export function violatesRouteGuardrails(text: string): boolean {
  return FORBIDDEN.test(text) || FORBIDDEN_ROUTE.test(text);
}
