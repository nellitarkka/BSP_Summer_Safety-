// Shared geospatial helpers.

const EARTH_R = 6371000; // metres
const toRad = (d: number): number => (d * Math.PI) / 180;

// Great-circle distance between two lat/lon points, in metres.
export function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}
