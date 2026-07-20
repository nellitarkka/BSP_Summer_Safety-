import { useRef } from 'react';
import MapView, { Marker, Polyline, type MapViewProps } from 'react-native-maps';
import type { Coords } from '@/types';
import { colors } from '@/lib/theme';

interface RouteMapProps {
  coordinates: Coords[];
  style?: MapViewProps['style'];
}

export function RouteMap({ coordinates, style }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];

  return (
    <MapView
      ref={mapRef}
      style={style ?? { width: '100%', height: 220, borderRadius: 16 }}
      initialRegion={
        start
          ? { latitude: start.latitude, longitude: start.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
          : undefined
      }
      onLayout={() => {
        if (coordinates.length > 1) {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
            animated: false,
          });
        }
      }}
    >
      {coordinates.length > 1 ? (
        <Polyline coordinates={coordinates} strokeColor={colors.brand} strokeWidth={5} />
      ) : null}
      {start ? <Marker coordinate={start} title="Start" pinColor={colors.midnight} /> : null}
      {end ? <Marker coordinate={end} title="Destination" pinColor={colors.danger} /> : null}
    </MapView>
  );
}
