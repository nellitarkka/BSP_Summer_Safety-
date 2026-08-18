import type { IndicatorRating, RouteGenerationMethod, RouteIndicators, RouteMetrics } from '@/types';

// Presentation helpers for route-level indicators (FR-59). Pure + unit-tested.
// These describe RELATIVE, positive attributes of a route — more lighting, closer
// transit, etc. They are deliberately NOT a danger scale, so "lower" never maps to a
// red/alarm tone (that would imply a street is "dangerous", which the ethical boundary
// forbids — FR-59/NFR-14). Copy here never claims a route is "safe" or "safer" (C1).

export type IndicatorTone = 'ok' | 'neutral' | 'muted';

export const RATING_LABEL: Record<IndicatorRating, string> = {
  higher: 'Higher',
  moderate: 'Moderate',
  lower: 'Lower',
  unknown: 'Not enough data',
};

// Positive framing: more of the attribute = 'ok'; less = neutral (never danger).
export const RATING_TONE: Record<IndicatorRating, IndicatorTone> = {
  higher: 'ok',
  moderate: 'neutral',
  lower: 'muted',
  unknown: 'muted',
};

export type IndicatorKey =
  | 'lighting_availability'
  | 'transit_proximity'
  | 'help_point_proximity'
  | 'route_openness';

// Format a raw metric value for display alongside its category (C2). Missing data is
// rendered as an explicit marker, never as 0 or a number (C3, TECHNICAL_DECISIONS.md §1).
export function formatIndicatorValue(key: IndicatorKey, value: number | null): string {
  if (value === null) return 'No data';
  switch (key) {
    case 'lighting_availability':
    case 'route_openness':
      return `${Math.round(value * 100)}%`;
    case 'transit_proximity':
    case 'help_point_proximity':
      return `${Math.round(value)} m`;
  }
}

export interface IndicatorRow {
  key: IndicatorKey;
  label: string;
  rating: IndicatorRating;
  valueText: string; // formatted numeric evidence, or 'No data'
  available: boolean; // false ⇒ show as missing, distinct from a measured 'lower' (C3)
}

// The four route-level indicators, in display order, each with its numeric value and
// an explicit availability flag so "no data" is never shown like a measured "lower".
export function indicatorRows(ind: RouteIndicators, metrics: RouteMetrics): IndicatorRow[] {
  return [
    {
      key: 'lighting_availability',
      label: 'Lighting coverage',
      rating: ind.lighting_availability,
      valueText: formatIndicatorValue('lighting_availability', metrics.lit_fraction),
      available: ind.lighting_availability !== 'unknown',
    },
    {
      key: 'transit_proximity',
      label: 'Transit proximity',
      rating: ind.transit_proximity,
      valueText: formatIndicatorValue('transit_proximity', metrics.transit_median_distance_m),
      available: ind.transit_proximity !== 'unknown',
    },
    {
      key: 'help_point_proximity',
      label: 'Help-point proximity',
      rating: ind.help_point_proximity,
      valueText: formatIndicatorValue('help_point_proximity', metrics.help_point_min_distance_m),
      available: ind.help_point_proximity !== 'unknown',
    },
    {
      key: 'route_openness',
      label: 'Openness',
      rating: ind.route_openness,
      valueText: formatIndicatorValue('route_openness', metrics.active_span_share),
      available: ind.route_openness !== 'unknown',
    },
  ];
}

// Human label for how a candidate was produced (C6, Gap 7).
export const GENERATION_METHOD_LABEL: Record<RouteGenerationMethod, string> = {
  direct: 'Direct route',
  graphhopper_alternative: 'Map-provider alternative',
  waypoint_detour: 'Generated detour',
};

// The explanation-card source label (C5). Derived ENTIRELY from the source field, so
// it is structurally impossible to show "AI-generated" for fallback text (Gap 10).
export interface ExplanationSourceLabel {
  text: string;
  isAi: boolean;
}
export function explanationSourceLabel(source: 'ai' | 'fallback' | null): ExplanationSourceLabel | null {
  if (source === null) return null;
  return source === 'ai'
    ? { text: 'AI-generated explanation', isAi: true }
    : { text: 'Standard explanation (offline fallback)', isAi: false };
}

// Centralised route-facing copy (C1). No string here claims a route is "safe" or
// "safer"; __tests__/routeCopy.test.ts pins the absence of the forbidden terms.
export const ROUTE_COPY = {
  compareButton: 'Compare route options',
  comparing: 'Comparing…',
  sectionTitle: 'Compare routes',
  whyTitle: 'Why this suggestion',
  systemBadge: 'Suggested',
  manualBadge: 'Your choice',
  noPreferenceTitle: 'No clear preference',
  noPreferenceBody: 'The available indicators do not clearly separate these routes — compare the details and choose what suits you.',
  aiButton: 'Explain with AI',
  aiThinking: 'Thinking…',
  disclaimer: 'Guidance only — not a guarantee. If you are in immediate danger, call local emergency services.',
} as const;

// Terms that must never appear in route-facing copy (objective-safety claims, C1).
export const FORBIDDEN_ROUTE_TERMS = /\b(safer|safest|safe routes?|safe way|safe path)\b/i;
