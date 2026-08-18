import { offsetVia, isPlausibleDetour, pickDetourCandidates } from '@/lib/routeCandidates';
import { haversineM } from '@/lib/geo';
import type { GraphHopperPath } from '@/lib/routeDerivation';

const START = { latitude: 49.6003, longitude: 6.1342 };
const DEST = { latitude: 49.6118, longitude: 6.136 };

// Build a straight-ish GraphHopper path fixture between two points with N samples.
function path(distance: number, from: [number, number], to: [number, number], n = 6): GraphHopperPath {
  const coords: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    coords.push([from[1] + (to[1] - from[1]) * t, from[0] + (to[0] - from[0]) * t]); // [lon,lat]
  }
  return { distance, time: distance * 800, points: { coordinates: coords } };
}

// @feature US-013 @priority should
// Gap 7: offsetVia geometry at known coordinates.
describe('offsetVia geometry (Gap 7)', () => {
  it('places the via-point ~offset metres from the route midpoint', () => {
    const via = offsetVia(START, DEST, 450);
    const midLat = (START.latitude + DEST.latitude) / 2;
    const midLon = (START.longitude + DEST.longitude) / 2;
    const d = haversineM(via.latitude, via.longitude, midLat, midLon);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(500);
  });

  it('mirrors to the opposite side for a negative offset', () => {
    const left = offsetVia(START, DEST, 450);
    const right = offsetVia(START, DEST, -450);
    const midLat = (START.latitude + DEST.latitude) / 2;
    // Left and right lie on opposite sides of the midpoint latitude.
    expect(Math.sign(left.latitude - midLat)).toBe(-Math.sign(right.latitude - midLat));
  });
});

// @feature US-013 @priority must
// Gap 7: plausibility rejection; Gap 6: overlap-based diversity in candidate selection.
describe('candidate selection (Gap 6/7)', () => {
  const direct = path(1000, [49.6003, 6.1342], [49.6118, 6.136]);

  it('rejects a degenerate or absurdly long detour', () => {
    expect(isPlausibleDetour(direct, { distance: 1200, time: 1, points: { coordinates: [[6.13, 49.6]] } })).toBe(false); // 1 point
    expect(isPlausibleDetour(direct, path(5000, [49.6003, 6.1342], [49.7, 6.3]))).toBe(false); // > 3× direct
    expect(isPlausibleDetour(direct, path(1500, [49.6003, 6.1342], [49.6118, 6.14]))).toBe(true);
  });

  it('keeps only the direct route when the alternative nearly duplicates it', () => {
    const nearDup = path(1010, [49.6003, 6.1342], [49.6118, 6.136]); // same geometry
    const kept = pickDetourCandidates(direct, [nearDup]);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.generation_method).toBe('direct');
  });

  it('keeps a genuinely different, plausible detour and tags its method', () => {
    const distinct = path(1300, [49.6003, 6.1342], [49.6118, 6.136], 6);
    // Shift the detour far enough to be geometrically distinct.
    distinct.points.coordinates = distinct.points.coordinates.map(([lon, lat]) => [lon + 0.01, lat + 0.005]);
    const kept = pickDetourCandidates(direct, [distinct]);
    expect(kept).toHaveLength(2);
    expect(kept[1]!.generation_method).toBe('waypoint_detour');
  });
});
