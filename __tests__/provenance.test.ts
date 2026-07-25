import { DATASET_SOURCES, sourcesFeedingIndicators } from '@/data/provenance';

// @feature US-013/US-015 @priority must
// NFR-14: every dataset is documented (source/license/limitations); crime
// statistics are background-only and can never feed route indicators.
describe('data provenance registry (NFR-14)', () => {
  it('documents source, license and limitations for every dataset', () => {
    expect(DATASET_SOURCES.length).toBeGreaterThan(0);
    for (const s of DATASET_SOURCES) {
      expect(s.source_url).toMatch(/^https?:\/\//);
      expect(s.license.trim().length).toBeGreaterThan(0);
      expect(s.limitations.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks official crime statistics as background-only', () => {
    const crime = DATASET_SOURCES.find((s) => s.role === 'background_context');
    expect(crime).toBeDefined();
    expect(crime?.background_only).toBe(true);
  });

  it('never lets a background-only source feed route indicators', () => {
    const feeding = sourcesFeedingIndicators();
    expect(feeding.length).toBeGreaterThan(0);
    for (const s of feeding) expect(s.background_only).toBe(false);
    // Crime stats specifically must be absent from the indicator-feeding set.
    expect(feeding.some((s) => s.role === 'background_context')).toBe(false);
  });
});
