import {
  indicatorRows,
  RATING_LABEL,
  RATING_TONE,
  formatIndicatorValue,
  explanationSourceLabel,
} from '@/lib/routePresentation';
import type { RouteIndicators, RouteMetrics } from '@/types';

const IND: RouteIndicators = {
  lighting_availability: 'higher',
  transit_proximity: 'moderate',
  help_point_proximity: 'lower',
  route_openness: 'unknown',
  time_of_day: 'night',
  uncertainty_note: 'stub',
};

const METRICS: RouteMetrics = {
  distance_m: 1400,
  duration_s: 1200,
  lit_fraction: 0.68,
  transit_median_distance_m: 210,
  help_point_min_distance_m: 900,
  active_span_share: null, // openness unavailable → matches route_openness: 'unknown'
};

// @feature US-013 @priority should
// FR-59/NFR-14: indicators are relative and route-level; presentation must not
// imply a per-street danger scale (no alarm/red tone for "lower").
describe('route indicator presentation (FR-59)', () => {
  it('exposes exactly the four route-level indicators in order', () => {
    const rows = indicatorRows(IND, METRICS);
    expect(rows.map((r) => r.key)).toEqual([
      'lighting_availability',
      'transit_proximity',
      'help_point_proximity',
      'route_openness',
    ]);
  });

  it('never maps any rating to a danger/alarm tone', () => {
    const tones = Object.values(RATING_TONE);
    // Only positive/neutral/muted tones exist — no "danger" concept.
    for (const t of tones) expect(['ok', 'neutral', 'muted']).toContain(t);
  });

  it('labels unknown data honestly rather than guessing', () => {
    expect(RATING_LABEL.unknown).toMatch(/not enough data/i);
    expect(RATING_TONE.unknown).toBe('muted');
  });

  // C2: every rating shows its underlying numeric value.
  it('renders the numeric evidence beside each category', () => {
    const rows = indicatorRows(IND, METRICS);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.lighting_availability!.valueText).toBe('68%');
    expect(byKey.transit_proximity!.valueText).toBe('210 m');
    expect(byKey.help_point_proximity!.valueText).toBe('900 m');
  });

  // C3: missing data is distinct from a measured 'lower' — never shown as 0.
  it('marks missing data as unavailable, not as 0 or "lower"', () => {
    const rows = indicatorRows(IND, METRICS);
    const openness = rows.find((r) => r.key === 'route_openness')!;
    expect(openness.available).toBe(false);
    expect(openness.valueText).toBe('No data');
    expect(openness.valueText).not.toBe('0%');
    // A measured 'lower' (help point at 900 m) stays available with a real number.
    const help = rows.find((r) => r.key === 'help_point_proximity')!;
    expect(help.available).toBe(true);
    expect(help.rating).toBe('lower');
  });

  it('formats fractions as percentages and distances as metres; null as No data', () => {
    expect(formatIndicatorValue('lighting_availability', 0.6)).toBe('60%');
    expect(formatIndicatorValue('route_openness', 0.925)).toBe('93%');
    expect(formatIndicatorValue('transit_proximity', 210.4)).toBe('210 m');
    expect(formatIndicatorValue('help_point_proximity', null)).toBe('No data');
  });
});

// @feature US-014 @priority must
// C5 / Gap 10: the explanation source label is driven ONLY by the source field, so it
// is structurally impossible to show "AI" for fallback text.
describe('AI/fallback source label (C5)', () => {
  it('labels live AI as AI-generated', () => {
    const l = explanationSourceLabel('ai');
    expect(l!.isAi).toBe(true);
    expect(l!.text).toMatch(/ai-generated/i);
  });

  it('labels fallback as a standard/offline explanation, never as AI', () => {
    const l = explanationSourceLabel('fallback');
    expect(l!.isAi).toBe(false);
    expect(l!.text).not.toMatch(/\bAI\b/);
  });

  it('returns null when there is no explanation yet', () => {
    expect(explanationSourceLabel(null)).toBeNull();
  });
});
