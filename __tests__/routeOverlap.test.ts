import { routeOverlap } from '@/lib/geo';
import type { Coords } from '@/types';

const line = (pts: [number, number][]): Coords[] => pts.map(([lat, lon]) => ({ latitude: lat, longitude: lon }));

// A dense polyline around Luxembourg City.
const A = line([
  [49.6000, 6.1300],
  [49.6010, 6.1310],
  [49.6020, 6.1320],
  [49.6030, 6.1330],
  [49.6040, 6.1340],
]);

// @feature US-013 @priority must
// Gap 6 (TECHNICAL_DECISIONS.md §7): geometric overlap replaces the length-only check.
describe('routeOverlap (Gap 6)', () => {
  it('identical polylines overlap ~1.0 and are rejected as duplicates', () => {
    const overlap = routeOverlap(A, A);
    expect(overlap).toBeGreaterThanOrEqual(0.99);
    expect(overlap).toBeLessThanOrEqual(1);
  });

  it('disjoint polylines (far apart) overlap ~0', () => {
    const far = line([
      [49.7000, 6.3000],
      [49.7010, 6.3010],
      [49.7020, 6.3020],
    ]);
    expect(routeOverlap(A, far)).toBeLessThan(0.05);
  });

  it('partly shared polylines overlap between 0 and 1', () => {
    // B shares the first half of A exactly, then diverges far away.
    const B = line([
      [49.6000, 6.1300],
      [49.6010, 6.1310],
      [49.6020, 6.1320],
      [49.6500, 6.2000],
      [49.6600, 6.2100],
    ]);
    const overlap = routeOverlap(A, B);
    expect(overlap).toBeGreaterThan(0.1);
    expect(overlap).toBeLessThan(0.9);
  });

  it('empty inputs never count as duplicates', () => {
    expect(routeOverlap([], A)).toBe(0);
    expect(routeOverlap(A, [])).toBe(0);
  });
});
