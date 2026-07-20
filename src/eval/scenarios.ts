import type { Coords, TimeOfDay } from '@/types';

// Sample night-out scenarios for the route-engine / AI evaluation (FR-69, US-015).
// Coordinates are approximate points in Luxembourg City — the reference region
// that lets us ground the engine in real open data. Scenarios are illustrative
// and contain no personal data.
export interface EvalScenario {
  id: string;
  name: string;
  start: Coords;
  destination: Coords;
  time_of_day: TimeOfDay;
  expect: {
    minCandidates: number; // engine should return at least this many (1..3)
    requiresComparison: boolean; // a comparison explanation is expected
  };
}

export const SCENARIOS: EvalScenario[] = [
  {
    id: 'SC-01',
    name: 'Gare → Clausen nightlife, late night',
    start: { latitude: 49.6003, longitude: 6.1342 }, // Luxembourg central station
    destination: { latitude: 49.6118, longitude: 6.136 }, // Clausen / Rives de Clausen
    time_of_day: 'night',
    expect: { minCandidates: 1, requiresComparison: true },
  },
  {
    id: 'SC-02',
    name: 'City centre → Limpertsberg residential, evening',
    start: { latitude: 49.6116, longitude: 6.13 }, // city centre
    destination: { latitude: 49.621, longitude: 6.12 }, // Limpertsberg
    time_of_day: 'evening',
    expect: { minCandidates: 1, requiresComparison: true },
  },
  {
    id: 'SC-03',
    name: 'Kirchberg → Glacis, night',
    start: { latitude: 49.63, longitude: 6.16 }, // Kirchberg
    destination: { latitude: 49.6165, longitude: 6.128 }, // Glacis / Limpertsberg edge
    time_of_day: 'night',
    expect: { minCandidates: 1, requiresComparison: true },
  },
  {
    id: 'SC-04',
    name: 'Belair → Gare, night (longer walk)',
    start: { latitude: 49.608, longitude: 6.105 }, // Belair
    destination: { latitude: 49.6003, longitude: 6.1342 }, // station
    time_of_day: 'night',
    expect: { minCandidates: 1, requiresComparison: true },
  },
];
