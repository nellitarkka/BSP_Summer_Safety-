import { routeRequestKey } from '@/lib/routeRequest';
import type { Coords } from '@/types';

const c = (lat: number, lon: number): Coords => ({ latitude: lat, longitude: lon });

// @feature US-013 @priority must
// Bug 1: changing origin/destination must invalidate the previous route request, so its
// results (candidates, selection, AI explanation) are discarded. The request identity
// is the trigger; this pins that it discriminates correctly.
describe('routeRequestKey — route-request identity (Bug 1)', () => {
  it('is "none" when nothing is computed', () => {
    expect(routeRequestKey(null)).toBe('none');
  });

  it('changes when the origin changes', () => {
    const a = routeRequestKey({ start: c(49.6, 6.13), destination: c(49.61, 6.14) });
    const b = routeRequestKey({ start: c(49.62, 6.10), destination: c(49.61, 6.14) });
    expect(a).not.toBe(b);
  });

  it('changes when the destination changes', () => {
    const a = routeRequestKey({ start: c(49.6, 6.13), destination: c(49.61, 6.14) });
    const b = routeRequestKey({ start: c(49.6, 6.13), destination: c(49.63, 6.16) });
    expect(a).not.toBe(b);
  });

  it('is stable for the same origin/destination', () => {
    const pair = { start: c(49.6, 6.13), destination: c(49.61, 6.14) };
    expect(routeRequestKey(pair)).toBe(routeRequestKey({ start: c(49.6, 6.13), destination: c(49.61, 6.14) }));
  });
});
