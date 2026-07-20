import { indicatorRows, RATING_LABEL, RATING_TONE } from '@/lib/routePresentation';
import type { RouteIndicators } from '@/types';

const IND: RouteIndicators = {
  lighting_availability: 'higher',
  transit_proximity: 'moderate',
  help_point_proximity: 'lower',
  route_openness: 'unknown',
  time_of_day: 'night',
  uncertainty_note: 'stub',
};

describe('route indicator presentation (FR-59)', () => {
  it('exposes exactly the four route-level indicators in order', () => {
    const rows = indicatorRows(IND);
    expect(rows.map((r) => r.key)).toEqual([
      'lighting_availability',
      'transit_proximity',
      'help_point_proximity',
      'route_openness',
    ]);
  });

  it('never maps any rating to a danger/alarm tone', () => {
    const tones = Object.values(RATING_TONE);
    for (const t of tones) expect(['ok', 'neutral', 'muted']).toContain(t);
  });

  it('labels unknown data honestly rather than guessing', () => {
    expect(RATING_LABEL.unknown).toMatch(/not enough data/i);
    expect(RATING_TONE.unknown).toBe('muted');
  });
});
