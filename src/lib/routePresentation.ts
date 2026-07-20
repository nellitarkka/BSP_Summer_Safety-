import type { IndicatorRating, RouteIndicators } from '@/types';

export type IndicatorTone = 'ok' | 'neutral' | 'muted';

export const RATING_LABEL: Record<IndicatorRating, string> = {
  higher: 'Higher',
  moderate: 'Moderate',
  lower: 'Lower',
  unknown: 'Not enough data',
};


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


export function indicatorRows(ind: RouteIndicators): IndicatorRow[] {
  return [
    { key: 'lighting_availability', label: 'Lighting along route', rating: ind.lighting_availability },
    { key: 'transit_proximity', label: 'Close to transit', rating: ind.transit_proximity },
    { key: 'help_point_proximity', label: 'Near help points', rating: ind.help_point_proximity },
    { key: 'route_openness', label: 'Open & active', rating: ind.route_openness },
  ];
}
