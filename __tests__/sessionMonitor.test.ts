import { evaluateSession, type MonitorInput } from '@/lib/sessionMonitor';
import type { Coords } from '@/types';

const ROUTE: Coords[] = [
  { latitude: 49.6003, longitude: 6.1342 },
  { latitude: 49.6008, longitude: 6.135 },
  { latitude: 49.6012, longitude: 6.1358 },
];
const T0 = 1_000_000_000_000; // fixed "now" base

function input(over: Partial<MonitorInput>): MonitorInput {
  return {
    now: T0,
    expectedArrivalMs: null,
    currentLocation: null,
    routeCoords: ROUTE,
    ...over,
  };
}

// @feature US-007 @priority should
// Approach doc step 6: monitor ETA overdue + route deviation. Report only —
// never auto-trigger (that stays user-confirmed).
describe('session ETA / deviation monitor', () => {
  it('flags overdue past the grace window', () => {
    const s = evaluateSession(input({ expectedArrivalMs: T0 - 20 * 60_000 })); // 20 min ago
    expect(s.overdue).toBe(true);
    expect(s.minutesOverdue).toBe(20);
  });

  it('does not flag within the grace window', () => {
    const s = evaluateSession(input({ expectedArrivalMs: T0 - 5 * 60_000 })); // 5 min, grace 10
    expect(s.overdue).toBe(false);
    expect(s.minutesOverdue).toBe(0);
  });

  it('flags off-route when far from the planned route', () => {
    const s = evaluateSession(input({ currentLocation: { latitude: 49.62, longitude: 6.16 } }));
    expect(s.offRoute).toBe(true);
    expect(s.deviationM).toBeGreaterThan(150);
  });

  it('stays on-route when close to the planned route', () => {
    const s = evaluateSession(input({ currentLocation: { latitude: 49.6008, longitude: 6.1351 } }));
    expect(s.offRoute).toBe(false);
    expect(s.deviationM).toBeLessThan(150);
  });

  it('reports no deviation when location is unavailable (sharing off)', () => {
    const s = evaluateSession(input({ currentLocation: null }));
    expect(s.offRoute).toBe(false);
    expect(s.deviationM).toBeNull();
  });
});
