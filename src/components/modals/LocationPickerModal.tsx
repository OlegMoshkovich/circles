import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

type MapPickerViewProps = {
  onBack: () => void;
  onConfirm: (address: string) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 46.8,
  longitude: 8.2,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function MapPickerView({ onBack, onConfirm }: MapPickerViewProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [address, setAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    centerOnUser();
  }, []);

  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      reverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch {
      reverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
    }
  }

  async function reverseGeocode(lat: number, lng: number) {
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        const street = [r.streetNumber, r.street].filter(Boolean).join(" ");
        const locality = r.city ?? r.district ?? r.subregion ?? r.region ?? "";
        const parts = [street, locality].filter(Boolean);
        setAddress(parts.join(", ") || ((r as any).formattedAddress ?? null));
      }
    } catch {
      setAddress(null);
    } finally {
      setGeocoding(false);
    }
  }

  function handleRegionChangeComplete(r: Region) {
    setRegion(r);
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(() => {
      reverseGeocode(r.latitude, r.longitude);
    }, 400);
  }

  async function handleMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch {}
  }

  function handleConfirm() {
    if (!address) return;
    onConfirm(address);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* Fixed center pin */}
      <View style={styles.pinWrapper} pointerEvents="none">
        <Ionicons name="location" size={44} color={colors.iconbBg} />
        <View style={styles.pinDot} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, Platform.OS === "ios" && styles.topBarIos]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Choose Location</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleMyLocation}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="locate" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, Platform.OS === "ios" && styles.bottomPanelIos]}>
        <Text style={styles.hint}>Move the map to place the pin</Text>
        <View style={styles.addressRow}>
          {geocoding ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={styles.addressText} numberOfLines={2}>
              {address ?? "Locating…"}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, (!address || geocoding) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!address || geocoding}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinWrapper: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -22,
    marginTop: -44,
    alignItems: "center",
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.iconbBg,
    opacity: 0.5,
    marginTop: -2,
  },
  topBar: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topBarIos: {
    top: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  topTitle: {
    fontSize: 15,
    fontFamily: "Lora_400Regular",
    color: colors.text,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomPanelIos: {
    paddingBottom: 44,
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  addressRow: {
    minHeight: 44,
    justifyContent: "center",
    marginBottom: 16,
  },
  addressText: {
    fontSize: 17,
    fontFamily: "Lora_400Regular",
    color: colors.text,
    lineHeight: 24,
  },
  confirmButton: {
    backgroundColor: colors.text,
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.35,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
