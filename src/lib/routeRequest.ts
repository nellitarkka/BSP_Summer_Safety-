import type { Coords } from '@/types';

// Stable identity of the current route request (or 'none' when nothing is computed).
// Changing the origin or destination changes this key, which route.tsx uses to discard
// the previous route comparison so stale results never linger (Bug 1). Pure — no expo
// deps, so it stays unit-testable.
export function routeRequestKey(coords: { start: Coords; destination: Coords } | null): string {
  if (!coords) return 'none';
  const { start, destination } = coords;
  return `${start.latitude},${start.longitude}->${destination.latitude},${destination.longitude}`;
}
