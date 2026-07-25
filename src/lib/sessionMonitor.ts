import type { Coords } from '@/types';
import { haversineM } from '@/lib/geo';

export interface MonitorInput {
  now: number; 
  expectedArrivalMs: number | null; 
  currentLocation: Coords | null; 
  routeCoords: readonly Coords[]; 
  overdueGraceMin?: number; 
  offRouteThresholdM?: number; 
}

export interface MonitorStatus {
  overdue: boolean;
  minutesOverdue: number; 
  offRoute: boolean;
  deviationM: number | null; 
}


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
