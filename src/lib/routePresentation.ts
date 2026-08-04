import type { IndicatorRating, RouteIndicators } from '@/types';

// Presentation helpers for route-level indicators (FR-59). Pure + unit-tested.
// These describe RELATIVE, positive attributes of a route — more lighting,
// closer transit, etc. They are deliberately NOT a danger scale, so "lower"
// never maps to a red/alarm tone (that would imply a street is "dangerous",
// which the ethical boundary forbids — FR-59/NFR-14).

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

export interface IndicatorRow {
  key: string;
  label: string;
  rating: IndicatorRating;
}

// The four route-level indicators, in display order, with human labels.
export function indicatorRows(ind: RouteIndicators): IndicatorRow[] {
  return [
    { key: 'lighting_availability', label: 'Lighting along route', rating: ind.lighting_availability },
    { key: 'transit_proximity', label: 'Close to transit', rating: ind.transit_proximity },
    { key: 'help_point_proximity', label: 'Near help points', rating: ind.help_point_proximity },
    { key: 'route_openness', label: 'Open & active', rating: ind.route_openness },
  ];
}
