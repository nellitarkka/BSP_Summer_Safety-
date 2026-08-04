import { useEffect, useRef, useState } from 'react';
import { locationService } from '@/services/locationService';
import { evaluateSession, type MonitorStatus } from '@/lib/sessionMonitor';
import type { Coords, SafetySession } from '@/types';

const TICK_MS = 30_000;

// Monitors an active session for ETA overdue / route deviation (approach doc
// step 6). Owns the location subscription (only while sharing is on, FR-55) and
// a periodic tick so ETA is re-checked even without new location updates.
// Reports status only — never triggers alerts (that stays user-confirmed).
export function useSessionMonitor(session: SafetySession | null | undefined): MonitorStatus {
  const [loc, setLoc] = useState<Coords | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const stopRef = useRef<(() => void) | null>(null);

  const sharing = session?.location_sharing_enabled ?? false;

  useEffect(() => {
    if (sharing) {
      locationService
        .startTracking(setLoc)
        .then((stop) => { stopRef.current = stop; })
        .catch(() => {});
    }
    return () => { stopRef.current?.(); stopRef.current = null; };
  }, [sharing]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return evaluateSession({
    now,
    expectedArrivalMs: session?.expected_arrival_time ? Date.parse(session.expected_arrival_time) : null,
    currentLocation: sharing ? loc : null,
    routeCoords: session?.route_data?.coordinates ?? [],
  });
}
