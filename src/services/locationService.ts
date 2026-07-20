import * as Location from 'expo-location';
import Constants from 'expo-constants';
import type { Coords } from '@/types';

const GEOCODE_URL = 'https://graphhopper.com/api/1/geocode';

export interface AddressHit {
  label: string; 
  sub: string; 
  latitude: number;
  longitude: number;
}

function ghKey(): string {
  return (Constants.expoConfig?.extra?.graphhopperKey as string | undefined) ?? '';
}

interface GeoHit {
  point: { lat: number; lng: number };
  name?: string; street?: string; housenumber?: string;
  city?: string; postcode?: string; country?: string; state?: string;
}

function toHit(h: GeoHit): AddressHit {
  const label = h.name || h.street || h.city || 'Unknown place';
  const subParts = [
    h.street && h.street !== label ? h.street : null,
    [h.postcode, h.city].filter(Boolean).join(' ') || null,
    h.country && h.country !== h.city ? h.country : null,
  ].filter(Boolean);
  return { label, sub: subParts.join(', '), latitude: h.point.lat, longitude: h.point.lng };
}


export const locationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async hasPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrent(): Promise<Coords> {
    if (!(await this.hasPermission())) throw new Error('LOCATION_DENIED');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  },

  async suggest(query: string, limit = 5): Promise<AddressHit[]> {
    const q = query.trim();
    if (q.length < 3) return [];
    const key = ghKey();
    if (!key) return [];
    try {
      const url = `${GEOCODE_URL}?q=${encodeURIComponent(q)}&limit=${limit}&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = (await res.json()) as { hits?: GeoHit[] };
      return (json.hits ?? []).filter((h) => h.point).map(toHit);
    } catch {
      return [];
    }
  },


  async geocode(query: string): Promise<Coords> {
    const hits = await this.suggest(query, 1);
    if (hits[0]) return { latitude: hits[0].latitude, longitude: hits[0].longitude };
    const results = await Location.geocodeAsync(query).catch(() => []);
    const first = results[0];
    if (!first) throw new Error('ADDRESS_NOT_FOUND');
    return { latitude: first.latitude, longitude: first.longitude };
  },


  async startTracking(onUpdate: (c: Coords) => void): Promise<() => void> {
    if (!(await this.hasPermission())) throw new Error('LOCATION_DENIED');
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 25 },
      (pos) => onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    );
    return () => sub.remove();
  },
};
