import { proximityRatings, type FeatureData } from '@/lib/routeFeatures';
import { buildResponseFromPaths, type GraphHopperPath } from '@/lib/routeDerivation';
import type { Coords } from '@/types';

const ROUTE: Coords[] = [
  { latitude: 49.6003, longitude: 6.1342 },
  { latitude: 49.6008, longitude: 6.135 },
  { latitude: 49.6012, longitude: 6.1358 },
];


describe('route proximity indicators (FR-58/59)', () => {
  it('rates transit "higher" when a stop sits on the route', () => {
    const data: FeatureData = { transitStops: [[49.6008, 6.135]], helpPoints: [] };
    const { transit, help } = proximityRatings(ROUTE, data);
    expect(transit).toBe('higher');
    expect(help).toBe('unknown'); 
  });

  it('rates transit "lower" when the nearest stop is far away', () => {
    const data: FeatureData = { transitStops: [[49.7, 6.3]], helpPoints: [] };
    expect(proximityRatings(ROUTE, data).transit).toBe('lower');
  });

  it('rates help points "higher" when one is beside the route', () => {
    const data: FeatureData = { transitStops: [], helpPoints: [[49.6009, 6.1351, 'police']] };
    expect(proximityRatings(ROUTE, data).help).toBe('higher');
  });

  it('returns unknown for empty datasets (honest, not guessed)', () => {
    const { transit, help, lighting } = proximityRatings(ROUTE, { transitStops: [], helpPoints: [] });
    expect(transit).toBe('unknown');
    expect(help).toBe('unknown');
    expect(lighting).toBe('unknown'); 
  });

  it('rates lighting from the street-lamp grid', () => {
    const li = Math.round(49.6008 / 0.002);
    const lo = Math.round(6.135 / 0.003);
    const data: FeatureData = {
      transitStops: [],
      helpPoints: [],
      lighting: { latStep: 0.002, lonStep: 0.003, cells: { [`${li},${lo}`]: 4 } },
    };
    expect(proximityRatings(ROUTE, data).lighting).toBe('higher');
    const far: FeatureData = {
      transitStops: [], helpPoints: [],
      lighting: { latStep: 0.002, lonStep: 0.003, cells: { '30000,4000': 9 } },
    };
    expect(proximityRatings(ROUTE, far).lighting).toBe('lower');
  });
});

describe('engine integrates proximity (FR-58/59)', () => {
  it('fills transit/help indicators from the dataset', () => {
    const paths: GraphHopperPath[] = [
      {
        distance: 900, time: 700000,
        points: { coordinates: [[6.1342, 49.6003], [6.135, 49.6008], [6.1358, 49.6012]] },
        details: { road_class: [[0, 1, 'secondary']] },
      },
    ];
    const data: FeatureData = {
      transitStops: [[49.6008, 6.135]],
      helpPoints: [[49.6009, 6.1351, 'hospital']],
    };
    const res = buildResponseFromPaths(paths, 'night', '1970-01-01T00:00:00.000Z', data);
    expect(res.candidates[0]!.indicators.transit_proximity).toBe('higher');
    expect(res.candidates[0]!.indicators.help_point_proximity).toBe('higher');
    expect(res.candidates[0]!.indicators.lighting_availability).toBe('unknown'); 
  });
});
