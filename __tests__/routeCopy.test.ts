import {
  ROUTE_COPY,
  RATING_LABEL,
  GENERATION_METHOD_LABEL,
  FORBIDDEN_ROUTE_TERMS,
} from '@/lib/routePresentation';

// @feature US-013 @priority must
// Gap 15 (C1): no user-visible route copy claims a route is "safe" or "safer".
describe('route terminology (Gap 15 / C1)', () => {
  const allCopy = [
    ...Object.values(ROUTE_COPY),
    ...Object.values(RATING_LABEL),
    ...Object.values(GENERATION_METHOD_LABEL),
  ];

  it('contains no "safe/safer/safest" objective-safety claim', () => {
    for (const s of allCopy) {
      expect(FORBIDDEN_ROUTE_TERMS.test(s)).toBe(false);
    }
  });

  it('replaced the "Compare safer routes" button wording', () => {
    expect(ROUTE_COPY.compareButton).toBe('Compare route options');
    expect(/safer|safest/i.test(ROUTE_COPY.compareButton)).toBe(false);
  });

  it('the forbidden-terms guard actually catches the old wording (sanity)', () => {
    expect(FORBIDDEN_ROUTE_TERMS.test('Compare safer routes')).toBe(true);
    expect(FORBIDDEN_ROUTE_TERMS.test('the safest route')).toBe(true);
  });
});
