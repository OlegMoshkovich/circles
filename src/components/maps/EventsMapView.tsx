import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useLanguage } from "../../i18n/LanguageContext";
import { useColors } from "../../contexts/BackgroundContext";
import { GRAYSCALE_MAP_STYLE } from "../../theme/mapStyles";
import { Spinner } from "../loaders/Spinner";

export type MapEvent = {
  id: string;
  title: string;
  location: string | null;
};

type Coords = { latitude: number; longitude: number };

type Props = {
  events: MapEvent[];
  onEventPress: (event: MapEvent) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 47.3769,
  longitude: 8.5417,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const geocodeCache = new Map<string, Coords | null>();

async function geocodeAddress(address: string): Promise<Coords | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address) ?? null;
  try {
    const results = await Location.geocodeAsync(address);
    const hit = results[0];
    const coords = hit
      ? { latitude: hit.latitude, longitude: hit.longitude }
      : null;
    geocodeCache.set(address, coords);
    return coords;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}

function offsetOverlapping(coords: Coords, index: number, total: number): Coords {
  if (total <= 1) return coords;
  const angle = (index / total) * Math.PI * 2;
  const radius = 0.00035;
  return {
    latitude: coords.latitude + Math.sin(angle) * radius,
    longitude: coords.longitude + Math.cos(angle) * radius,
  };
}

export function EventsMapView({ events, onEventPress }: Props) {
  const { t } = useLanguage();
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [coordsById, setCoordsById] = useState<Record<string, Coords>>({});

  const locatedEvents = useMemo(
    () => events.filter((e) => (e.location ?? "").trim().length > 0),
    [events]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCoordinates() {
      setLoading(true);
      const next: Record<string, Coords> = {};
      const uniqueLocations = [
        ...new Set(locatedEvents.map((e) => (e.location ?? "").trim()).filter(Boolean)),
      ];

      for (const address of uniqueLocations) {
        const coords = await geocodeAddress(address);
        if (cancelled || !coords) continue;
        const atAddress = locatedEvents.filter((e) => (e.location ?? "").trim() === address);
        atAddress.forEach((event, index) => {
          next[event.id] = offsetOverlapping(coords, index, atAddress.length);
        });
      }

      if (!cancelled) {
        setCoordsById(next);
        setLoading(false);
      }
    }

    void loadCoordinates();
    return () => {
      cancelled = true;
    };
  }, [locatedEvents]);

  useEffect(() => {
    const points = Object.values(coordsById);
    if (points.length === 0 || loading) return;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 80, right: 32, bottom: 80, left: 32 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(id);
  }, [coordsById, loading]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
        customMapStyle={Platform.OS === "android" ? GRAYSCALE_MAP_STYLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {locatedEvents.map((event) => {
          const coords = coordsById[event.id];
          if (!coords) return null;
          return (
            <Marker
              key={event.id}
              coordinate={coords}
              title={event.title}
              description={event.location ?? undefined}
              onPress={() => onEventPress(event)}
            />
          );
        })}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Spinner size="small" />
        </View>
      )}

      {!loading && locatedEvents.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t.circles.mapNoEvents}
          </Text>
        </View>
      )}

      {!loading && locatedEvents.length > 0 && Object.keys(coordsById).length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t.circles.mapGeocodeFailed}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  emptyOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    textAlign: "center",
  },
});
