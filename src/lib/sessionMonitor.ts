import type { Coords } from '@/types';
import { haversineM } from '@/lib/geo';

// Pure ETA / route-deviation monitoring for an active safety session (approach
// doc step 6). Deterministic — `now` is passed in, so it is unit-testable.
//
// This NEVER auto-triggers anything: it only reports whether the user seems
// overdue or off their planned route, so the UI can gently ask "everything ok?".
// Any alert stays confirmation-gated (FR-34/35). No location is persisted (NFR-07).

export interface MonitorInput {
  now: number; // Date.now()
  expectedArrivalMs: number | null; // session.expected_arrival_time
  currentLocation: Coords | null; // only when location sharing is on
  routeCoords: readonly Coords[]; // planned route geometry
  overdueGraceMin?: number; // minutes past ETA before flagging (default 10)
  offRouteThresholdM?: number; // metres from route before flagging (default 150)
}

export interface MonitorStatus {
  overdue: boolean;
  minutesOverdue: number; // 0 when not overdue
  offRoute: boolean;
  deviationM: number | null; // null when no location / no route
}

// Nearest distance from a point to the planned route (nearest vertex — route
// vertices are densely spaced, so this is a good approximation).
function distanceToRouteM(loc: Coords, route: readonly Coords[]): number | null {
  if (route.length === 0) return null;
  let min = Infinity;
  for (const c of route) {
    const d = haversineM(loc.latitude, loc.longitude, c.latitude, c.longitude);
    if (d < min) min = d;
  }
  return min;
}

export function evaluateSession(input: MonitorInput): MonitorStatus {
  const graceMs = (input.overdueGraceMin ?? 10) * 60_000;
  const threshold = input.offRouteThresholdM ?? 150;

  let overdue = false;
  let minutesOverdue = 0;
  if (input.expectedArrivalMs !== null && input.now > input.expectedArrivalMs + graceMs) {
    overdue = true;
    minutesOverdue = Math.floor((input.now - input.expectedArrivalMs) / 60_000);
  }

  const deviationM = input.currentLocation
    ? distanceToRouteM(input.currentLocation, input.routeCoords)
    : null;
  const offRoute = deviationM !== null && deviationM > threshold;

  return { overdue, minutesOverdue, offRoute, deviationM };
}
