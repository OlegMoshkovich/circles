import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import { useLanguage } from "../../i18n/LanguageContext";
import { useColors } from "../../contexts/BackgroundContext";
import { GRAYSCALE_MAP_STYLE, GRAYSCALE_TILE_URL } from "../../theme/mapStyles";
import { greenColors } from "../../theme/colors";
import { Spinner } from "../loaders/Spinner";

export type MapCircle = {
  id: string;
  name: string;
  location: string | null;
  event_count: number;
};

type Coords = { latitude: number; longitude: number };

type Props = {
  circles: MapCircle[];
  onCirclePress: (circle: MapCircle) => void;
  emptyMessage?: string;
  geocodeFailedMessage?: string;
  spreadOverlappingMarkers?: boolean;
};

const DEFAULT_REGION: Region = {
  latitude: 46.8,
  longitude: 8.2,
  latitudeDelta: 2.5,
  longitudeDelta: 2.5,
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

export function CirclesMapView({
  circles,
  onCirclePress,
  emptyMessage,
  geocodeFailedMessage,
  spreadOverlappingMarkers = false,
}: Props) {
  const { t } = useLanguage();
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [coordsById, setCoordsById] = useState<Record<string, Coords>>({});

  const locatedCircles = useMemo(
    () => circles.filter((c) => (c.location ?? "").trim().length > 0),
    [circles]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCoordinates() {
      setLoading(true);
      const next: Record<string, Coords> = {};
      const uniqueLocations = [...new Set(
        locatedCircles.map((c) => (c.location ?? "").trim()).filter(Boolean)
      )];

      for (const address of uniqueLocations) {
        const coords = await geocodeAddress(address);
        if (cancelled || !coords) continue;
        const matches = locatedCircles.filter(
          (circle) => (circle.location ?? "").trim() === address
        );
        for (const [index, circle] of matches.entries()) {
          if (!spreadOverlappingMarkers || matches.length === 1) {
            next[circle.id] = coords;
            continue;
          }

          // Events frequently share a venue. Place their markers in a small
          // ring so every event remains visible and tappable.
          const angle = (index / matches.length) * Math.PI * 2;
          const radius = 0.008 + Math.floor(index / 8) * 0.004;
          next[circle.id] = {
            latitude: coords.latitude + Math.sin(angle) * radius,
            longitude:
              coords.longitude +
              (Math.cos(angle) * radius) /
                Math.max(0.3, Math.cos((coords.latitude * Math.PI) / 180)),
          };
        }
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
  }, [locatedCircles, spreadOverlappingMarkers]);

  useEffect(() => {
    const points = Object.values(coordsById);
    if (points.length === 0 || loading) return;
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 120, right: 32, bottom: 120, left: 32 },
        animated: Platform.OS !== "ios",
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
        mapType={Platform.OS === "ios" ? "mutedStandard" : "none"}
        customMapStyle={Platform.OS === "android" ? GRAYSCALE_MAP_STYLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <UrlTile
          urlTemplate={GRAYSCALE_TILE_URL}
          maximumZ={20}
          minimumZ={0}
          tileSize={256}
          shouldReplaceMapContent
        />
        {locatedCircles.map((circle) => {
          const coords = coordsById[circle.id];
          if (!coords) return null;
          const eventCount = circle.event_count ?? 0;
          return (
            <Marker
              key={circle.id}
              coordinate={coords}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => onCirclePress(circle)}
            >
              <View style={styles.markerOuter}>
                <Text style={styles.markerCount}>{eventCount}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Spinner size="small" />
        </View>
      )}

      {!loading && locatedCircles.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {emptyMessage ?? t.circles.mapNoLocations}
          </Text>
        </View>
      )}

      {!loading && locatedCircles.length > 0 && Object.keys(coordsById).length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {geocodeFailedMessage ?? t.circles.mapGeocodeFailed}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
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
  markerOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: greenColors.background,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.5,
    elevation: 2,
  },
  markerCount: {
    color: greenColors.text,
    fontSize: 11,
    fontFamily: "Lora_700Bold",
    lineHeight: 13,
  },
});
