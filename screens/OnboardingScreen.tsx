import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";
import { colors, glassColors, greenColors, lightColors, onboardingColors, Colors } from "../src/theme/colors";
import { BgOption, useBackground } from "../src/contexts/BackgroundContext";
import { supabase, Circle } from "../lib/supabase";

const DEFAULT_MAP_REGION: Region = {
  latitude: 46.8,
  longitude: 8.2,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type UserType = "local" | "visitor";

type OnboardingData = {
  userType: UserType | null;
  interests: string[];
  location: string;
  displayName: string;
  bio: string;
  joinedCircleIds: string[];
};

function makeInitialData(displayName: string): OnboardingData {
  return { userType: null, interests: [], location: "", displayName, bio: "", joinedCircleIds: [] };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const THEME_OPTIONS: {
  key: BgOption;
  title: string;
  subtitle: string;
  swatches: [string, string, string];
}[] = [
  {
    key: "onboarding",
    title: "Photo",
    subtitle: "Scenic background with dark frosted cards",
    swatches: ["#1B2417", "rgba(15, 13, 10, 0.78)", "#EFEDE1"],
  },
  {
    key: "glass",
    title: "Green",
    subtitle: "Moody translucent cards over a soft green base",
    swatches: ["#35412A", "rgba(255, 255, 255, 0.14)", "#F0EBE0"],
  },
];

const USER_TYPES: { key: UserType; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { key: "local", label: "Local", icon: "home-outline", desc: "I live here year-round" },
  { key: "visitor", label: "Visitor", icon: "airplane-outline", desc: "I'm visiting for a while" },
];

const INTERESTS: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "Hiking", icon: "trail-sign-outline" },
  { key: "Sports", icon: "football-outline" },
  { key: "Food", icon: "restaurant-outline" },
  { key: "Culture", icon: "library-outline" },
  { key: "Music", icon: "musical-notes-outline" },
  { key: "Art", icon: "color-palette-outline" },
  { key: "Family", icon: "people-outline" },
  { key: "Nature", icon: "leaf-outline" },
  { key: "Wellness", icon: "heart-outline" },
  { key: "Yoga", icon: "body-outline" },
  { key: "Skiing", icon: "snow-outline" },
  { key: "Biking", icon: "bicycle-outline" },
  { key: "Community", icon: "globe-outline" },
  { key: "Volunteering", icon: "hand-left-outline" },
  { key: "Business", icon: "briefcase-outline" },
  { key: "Entrepreneurs", icon: "rocket-outline" },
];

function getThemePreviewColors(theme: BgOption): Colors {
  if (theme === "light") return lightColors;
  if (theme === "glass") return glassColors;
  if (theme === "solid") return greenColors;
  return onboardingColors;
}

function isDarkPreviewTheme(theme: BgOption) {
  return theme !== "light";
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const anim = useRef(new Animated.Value(step / total)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: step / total, duration: 280, useNativeDriver: false }).start();
  }, [step, total]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
      />
    </View>
  );
}

// ─── Glass Button ─────────────────────────────────────────────────────────────

function GlassButton({
  label,
  onPress,
  disabled,
  previewTheme,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  previewTheme?: BgOption;
}) {
  const themeColors = previewTheme ? getThemePreviewColors(previewTheme) : onboardingColors;
  const isDark = previewTheme ? isDarkPreviewTheme(previewTheme) : true;
  const fillColor =
    previewTheme === "light"
      ? "rgba(44,42,38,0.08)"
      : previewTheme === "solid"
        ? "rgba(240,235,224,0.14)"
        : "rgba(255,255,255,0.15)";
  const borderColor =
    previewTheme === "light"
      ? "rgba(44,42,38,0.16)"
      : "rgba(255,255,255,0.35)";

  return (
    <TouchableOpacity
      style={[styles.glassBtn, disabled && styles.glassBtnDisabled]}
      onPress={!disabled ? onPress : undefined}
      activeOpacity={0.85}
    >
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fillColor }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 50, borderWidth: 1, borderColor }]} />
      <Text style={[styles.glassBtnText, { color: isDark ? themeColors.text : themeColors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Step Header ──────────────────────────────────────────────────────────────

function StepHeader({
  title,
  subtitle,
  onBack,
  previewTheme,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  previewTheme?: BgOption;
}) {
  const themeColors = previewTheme ? getThemePreviewColors(previewTheme) : onboardingColors;
  return (
    <View style={styles.stepHeader}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={themeColors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.stepSubtitle, { color: themeColors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.welcomeOuter}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Valmia</Text>
        <Text style={styles.welcomeSub}>Local community platform</Text>
        <View style={styles.bulletList}>
          {(
            [
              ["calendar-outline", "Discover what's happening around you"],
              ["people-outline", "Join circles and connect with locals"],
              ["location-outline", "Find events in your destination"],
            ] as [keyof typeof Ionicons.glyphMap, string][]
          ).map(([icon, text]) => (
            <View key={text} style={styles.bulletRow}>
              <Ionicons name={icon} size={20} color="rgba(239,237,225,0.75)" style={styles.bulletIcon} />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
      <GlassButton label="Get Started" onPress={onNext} />
    </View>
  );
}

// ─── Step 1: User Type ────────────────────────────────────────────────────────

function UserTypeStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onUpdate: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.formStep}>
      <View style={styles.panel}>
        <StepHeader title="Who are you?" subtitle="This helps us personalise your experience." onBack={onBack} />
        <View style={{ paddingBottom: 8 }}>
          {USER_TYPES.map((opt) => {
            const sel = data.userType === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.typeCard, sel && styles.typeCardSel]}
                onPress={() => onUpdate({ userType: opt.key })}
                activeOpacity={0.75}
              >
                <View style={[styles.typeIconBox, sel && styles.typeIconBoxSel]}>
                  <Ionicons name={opt.icon} size={22} color={sel ? "#efede1" : "rgba(239,237,225,0.6)"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, sel && styles.typeLabelSel]}>{opt.label}</Text>
                  <Text style={styles.typeDesc}>{opt.desc}</Text>
                </View>
                {sel && <Ionicons name="checkmark-circle" size={20} color="rgba(239,237,225,0.7)" />}
              </TouchableOpacity>
            );
          })}
        </View>
        <GlassButton label="Continue" onPress={data.userType ? onNext : undefined} disabled={!data.userType} />
      </View>
    </View>
  );
}

// ─── Step 2: Interests ────────────────────────────────────────────────────────

function InterestsStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onUpdate: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function toggle(key: string) {
    const next = data.interests.includes(key)
      ? data.interests.filter((k) => k !== key)
      : [...data.interests, key];
    onUpdate({ interests: next });
  }
  const canContinue = data.interests.length > 0;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} />
      <View style={[styles.panel, { flex: 3 }]}>
        <StepHeader
          title="What are you into?"
          subtitle="Select interests to see relevant events."
          onBack={onBack}
        />
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.chipsGrid}>
            {INTERESTS.map(({ key, icon }) => {
              const sel = data.interests.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, sel && styles.chipSel]}
                  onPress={() => toggle(key)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={icon} size={13} color={sel ? "#efede1" : "rgba(239,237,225,0.6)"} style={{ marginRight: 5 }} />
                  <Text style={[styles.chipLabel, sel && styles.chipLabelSel]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {data.interests.length > 0 && (
            <Text style={styles.selectionHint}>{data.interests.length} selected</Text>
          )}
        </ScrollView>
        <GlassButton label="Continue" onPress={canContinue ? onNext : undefined} disabled={!canContinue} />
      </View>
    </View>
  );
}

// ─── Step 3: Location (interactive map) ──────────────────────────────────────

function LocationStep({
  onUpdate,
  onNext,
  onBack,
  onSkip,
}: {
  onUpdate: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_MAP_REGION);
  const [address, setAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { centerOnUser(); }, []);

  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { reverseGeocode(DEFAULT_MAP_REGION.latitude, DEFAULT_MAP_REGION.longitude); return; }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r: Region = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 500);
    } catch { reverseGeocode(DEFAULT_MAP_REGION.latitude, DEFAULT_MAP_REGION.longitude); }
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
    } catch { setAddress(null); }
    finally { setGeocoding(false); }
  }

  function handleRegionChangeComplete(r: Region) {
    setRegion(r);
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(() => reverseGeocode(r.latitude, r.longitude), 400);
  }

  async function handleMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      );
    } catch {}
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />
      <View style={locStyles.pin} pointerEvents="none">
        <Ionicons name="location" size={44} color="#FF4D00" />
        <View style={locStyles.pinDot} />
      </View>
      <View style={locStyles.topBar}>
        <TouchableOpacity style={locStyles.iconBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={locStyles.topTitle}>Where are you?</Text>
        <TouchableOpacity style={locStyles.iconBtn} onPress={handleMyLocation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="locate" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={locStyles.bottomPanel}>
        <Text style={locStyles.hint}>Move the map to place the pin</Text>
        <View style={locStyles.addressRow}>
          {geocoding
            ? <ActivityIndicator size="small" color="rgba(239,237,225,0.6)" />
            : <Text style={locStyles.addressText} numberOfLines={2}>{address ?? "Locating…"}</Text>}
        </View>
        <GlassButton
          label="Confirm Location"
          onPress={() => { if (address) { onUpdate({ location: address }); onNext(); } }}
          disabled={!address || geocoding}
        />
        <TouchableOpacity style={styles.skipLink} onPress={onSkip}>
          <Text style={styles.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 4: Profile ──────────────────────────────────────────────────────────

function ProfileStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onUpdate: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = !!data.displayName.trim();
  return (
    <KeyboardAvoidingView
      style={styles.formStep}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.profileStepContent}
        >
          <StepHeader title="Your profile" subtitle="Let the community know who you are." onBack={onBack} />
          <View style={{ paddingBottom: 8 }}>
            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={data.displayName}
                onChangeText={(v) => onUpdate({ displayName: v })}
                placeholder="Your name"
                placeholderTextColor="rgba(239,237,225,0.35)"
                style={styles.textInput}
                autoCapitalize="words"
              />
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
              Bio <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <View style={[styles.inputRow, { alignItems: "flex-start", paddingTop: 8, height: 90 }]}>
              <TextInput
                value={data.bio}
                onChangeText={(v) => onUpdate({ bio: v })}
                placeholder="A few words about yourself…"
                placeholderTextColor="rgba(239,237,225,0.35)"
                style={[styles.textInput, { height: 64, textAlignVertical: "top" }]}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
          <GlassButton label="Continue" onPress={canContinue ? onNext : undefined} disabled={!canContinue} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Step 5: Circle Suggestions ───────────────────────────────────────────────

function CircleSuggestionsStep({
  data,
  onUpdate,
  onNext,
  onBack,
  onSkip,
}: {
  data: OnboardingData;
  onUpdate: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("circles").select("*").eq("visibility", "public").limit(14)
      .then(({ data: rows }) => { if (rows) setCircles(rows as Circle[]); setLoading(false); });
  }, []);

  function toggle(id: string) {
    const next = data.joinedCircleIds.includes(id)
      ? data.joinedCircleIds.filter((c) => c !== id)
      : [...data.joinedCircleIds, id];
    onUpdate({ joinedCircleIds: next });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} />
      <View style={[styles.panel, { flex: 3 }]}>
        <StepHeader title="Join your community" subtitle="Connect with circles that interest you." onBack={onBack} />
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
          {loading ? (
            <ActivityIndicator color="rgba(239,237,225,0.6)" style={{ marginTop: 32 }} />
          ) : circles.length === 0 ? (
            <Text style={styles.emptyText}>No circles available yet.</Text>
          ) : (
            circles.map((circle) => {
              const joined = data.joinedCircleIds.includes(circle.id);
              return (
                <TouchableOpacity
                  key={circle.id}
                  style={[styles.circleRow, joined && styles.circleRowSel]}
                  onPress={() => toggle(circle.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.circleInfo}>
                    <Text style={styles.circleName}>{circle.name}</Text>
                    {circle.description ? <Text style={styles.circleDesc} numberOfLines={1}>{circle.description}</Text> : null}
                  </View>
                  <View style={[styles.joinBtn, joined && styles.joinBtnSel]}>
                    <Text style={[styles.joinBtnText, joined && styles.joinBtnTextSel]}>
                      {joined ? "Joined ✓" : "Join"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
        <TouchableOpacity style={styles.skipLink} onPress={onSkip}>
          <Text style={styles.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
        <GlassButton label="Continue" onPress={onNext} />
      </View>
    </View>
  );
}

// ─── Step 6: Theme Picker ────────────────────────────────────────────────────

function ThemeStep({
  selectedTheme,
  onSelectTheme,
  onDone,
  onBack,
}: {
  selectedTheme: BgOption;
  onSelectTheme: (theme: BgOption) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const previewColors = getThemePreviewColors(selectedTheme);
  const isDark = isDarkPreviewTheme(selectedTheme);
  const panelBackground =
    selectedTheme === "light"
      ? "rgba(253,251,247,0.95)"
      : selectedTheme === "glass"
        ? "rgba(255,255,255,0.12)"
        : previewColors.card;
  const cardBackground =
    selectedTheme === "light"
      ? "rgba(44,42,38,0.03)"
      : selectedTheme === "solid"
        ? "rgba(240,235,224,0.08)"
        : "rgba(255,255,255,0.07)";
  const selectedCardBackground =
    selectedTheme === "light"
      ? "rgba(44,42,38,0.08)"
      : selectedTheme === "solid"
        ? "rgba(240,235,224,0.16)"
        : "rgba(255,255,255,0.18)";

  return (
    <View style={styles.formStep}>
      <View style={[styles.panel, styles.themePanel, { backgroundColor: panelBackground, borderColor: previewColors.cardBorder }]}>
        <StepHeader
          title="Choose your theme"
          subtitle="Pick the look you want to enter the app with. You can change it later in your profile."
          onBack={onBack}
          previewTheme={selectedTheme}
        />
        <View style={styles.themeList}>
          {THEME_OPTIONS.map((theme) => {
            const selected = selectedTheme === theme.key;
            return (
              <TouchableOpacity
                key={theme.key}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: selected ? selectedCardBackground : cardBackground,
                    borderColor: selected ? previewColors.cardBorder : previewColors.divider,
                  },
                  selected && styles.themeCardSelected,
                ]}
                onPress={() => onSelectTheme(theme.key)}
                activeOpacity={0.8}
              >
                <View style={styles.themePreviewRow}>
                  {theme.swatches.map((swatch, index) => (
                    <View
                      key={`${theme.key}-${index}`}
                      style={[styles.themeSwatch, { backgroundColor: swatch }]}
                    />
                  ))}
                </View>
                <View style={styles.themeTextWrap}>
                  <Text style={[styles.themeTitle, { color: previewColors.text }]}>{theme.title}</Text>
                  <Text style={[styles.themeSubtitleText, { color: previewColors.textMuted }]}>{theme.subtitle}</Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={20} color={previewColors.text} />
                ) : (
                  <View style={[styles.themeRadio, { borderColor: previewColors.cardBorder }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <GlassButton label="Enter App" onPress={onDone} previewTheme={selectedTheme} />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Props = { onComplete: () => void };

export default function OnboardingScreen({ onComplete }: Props) {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(() =>
    makeInitialData(user?.fullName ?? user?.firstName ?? "")
  );
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function update(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function goTo(next: number) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function onNext() { goTo(step + 1); }
  function onBack() { goTo(step - 1); }
  function onSkip() { goTo(step + 1); }

  async function handleComplete() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          display_name: data.displayName.trim() || null,
          bio: data.bio.trim() || null,
          location: data.location || null,
          interests: data.interests.length > 0 ? data.interests : null,
          user_type: data.userType || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (data.joinedCircleIds.length > 0) {
        const rows = data.joinedCircleIds.map((circleId) => ({
          circle_id: circleId,
          user_id: user.id,
          display_name: data.displayName.trim() || null,
          role: "member" as const,
          status: "active" as const,
        }));
        const { error: upsertError } = await supabase.from("circle_members").upsert(rows, { onConflict: "circle_id,user_id" });
        if (upsertError) {
          // Fallback without display_name in case that column doesn't exist yet
          const baseRows = data.joinedCircleIds.map((circleId) => ({
            circle_id: circleId,
            user_id: user.id,
            role: "member" as const,
            status: "active" as const,
          }));
          await supabase.from("circle_members").upsert(baseRows, { onConflict: "circle_id,user_id" });
        }
      }
      await AsyncStorage.setItem(`onboarding_v1_${user.id}`, "1");
    } catch {
      if (user) await AsyncStorage.setItem(`onboarding_v1_${user.id}`, "1");
    } finally {
      setSaving(false);
      onComplete();
    }
  }

  const steps = [
    <WelcomeStep onNext={onNext} />,
    <UserTypeStep data={data} onUpdate={update} onNext={onNext} onBack={onBack} />,
    <InterestsStep data={data} onUpdate={update} onNext={onNext} onBack={onBack} />,
    <LocationStep onUpdate={update} onNext={onNext} onBack={onBack} onSkip={onSkip} />,
    <ProfileStep data={data} onUpdate={update} onNext={onNext} onBack={onBack} />,
    <CircleSuggestionsStep data={data} onUpdate={update} onNext={handleComplete} onBack={onBack} onSkip={handleComplete} />,
  ];

  const content = (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
    >
      {step > 0 && (
        <ProgressBar step={step} total={TOTAL_STEPS} />
      )}
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {saving ? (
          <View style={styles.savingOverlay}>
            <ActivityIndicator color="#2C2A26" size="large" />
          </View>
        ) : (
          steps[step]
        )}
      </Animated.View>
    </SafeAreaView>
  );

  return (
    <ImageBackground source={require("../assets/Background.webp")} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      {content}
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  // Progress bar
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressFill: {
    height: 2,
    backgroundColor: "rgba(239,237,225,0.85)",
  },
  // Glass button
  glassBtn: {
    borderRadius: 50,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 12,
  },
  glassBtnDisabled: { opacity: 0.35 },
  glassBtnText: {
    color: "#efede1",
    fontSize: 16,
    fontWeight: "600",
  },
  // Step header
  stepHeader: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  backBtn: {
    height: 36,
    width: 36,
    justifyContent: "center",
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 30,
    fontFamily: "CormorantGaramond_300Light",
    color: "#efede1",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.6)",
    lineHeight: 20,
  },
  // Welcome
  welcomeOuter: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "flex-end",
  },
  welcomeContent: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 56,
    fontFamily: "CormorantGaramond_300Light",
    color: "#efede1",
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 18,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.65)",
    marginBottom: 36,
  },
  bulletList: { gap: 16 },
  bulletRow: { flexDirection: "row", alignItems: "center" },
  bulletIcon: { marginRight: 14, width: 24 },
  bulletText: {
    fontSize: 16,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.85)",
    flex: 1,
    lineHeight: 22,
  },
  // Form step wrapper
  formStep: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // Dark frosted panel
  panel: {
    backgroundColor: "rgba(15,13,10,0.78)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  themePanel: {
    borderWidth: 1,
  },
  panelTall: {
    maxHeight: "76%",
  },
  profileStepContent: {
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  // User type cards
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.15)",
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 10,
    gap: 14,
  },
  typeCardSel: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(239,237,225,0.55)",
  },
  typeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconBoxSel: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  typeLabel: {
    fontSize: 16,
    fontFamily: "Lora_400Regular",
    color: "#efede1",
    marginBottom: 2,
  },
  typeLabelSel: { color: "#efede1" },
  typeDesc: { fontSize: 12, color: "rgba(239,237,225,0.5)" },
  // Interest chips
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 12,
    paddingTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.18)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  chipSel: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(239,237,225,0.6)",
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.75)",
  },
  chipLabelSel: { color: "#efede1" },
  selectionHint: {
    fontSize: 12,
    color: "rgba(239,237,225,0.45)",
    textAlign: "center",
    paddingBottom: 8,
  },
  // Text inputs
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "rgba(239,237,225,0.5)",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  optionalLabel: {
    fontSize: 10,
    fontWeight: "400",
    letterSpacing: 0,
    textTransform: "none",
    color: "rgba(239,237,225,0.4)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239,237,225,0.25)",
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Lora_400Regular",
    color: "#efede1",
    height: 36,
  },
  // Circle suggestions
  circleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.15)",
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 8,
  },
  circleRowSel: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(239,237,225,0.55)",
  },
  circleInfo: { flex: 1, marginRight: 10 },
  circleName: {
    fontSize: 15,
    fontFamily: "Lora_400Regular",
    color: "#efede1",
  },
  circleDesc: { fontSize: 12, color: "rgba(239,237,225,0.5)", marginTop: 2 },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  joinBtnSel: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(239,237,225,0.6)",
  },
  joinBtnText: { fontSize: 13, color: "rgba(239,237,225,0.75)" },
  joinBtnTextSel: { color: "#efede1" },
  emptyText: {
    textAlign: "center",
    color: "rgba(239,237,225,0.5)",
    paddingVertical: 32,
    fontFamily: "Lora_400Regular",
    fontSize: 14,
  },
  // Notifications
  notifIconBox: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  notifTitle: {
    fontSize: 24,
    fontFamily: "CormorantGaramond_300Light",
    color: "#efede1",
    textAlign: "center",
    marginBottom: 10,
  },
  notifBody: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.6)",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  notifBullet: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  notifBulletText: {
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.8)",
  },
  themeList: {
    gap: 10,
    paddingBottom: 8,
  },
  themeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.15)",
    backgroundColor: "rgba(255,255,255,0.07)",
    gap: 14,
  },
  themeCardSelected: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(239,237,225,0.55)",
  },
  themePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  themeSwatch: {
    width: 18,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.12)",
  },
  themeTextWrap: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 17,
    fontFamily: "Lora_400Regular",
    color: "#efede1",
    marginBottom: 2,
  },
  themeSubtitleText: {
    fontSize: 12,
    fontFamily: "Lora_400Regular",
    color: "rgba(239,237,225,0.55)",
    lineHeight: 18,
  },
  themeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(239,237,225,0.35)",
  },
  // Skip link
  skipLink: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  skipLinkText: {
    fontSize: 13,
    color: "rgba(239,237,225,0.45)",
    textDecorationLine: "underline",
  },
  // Saving overlay
  savingOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Location step styles ─────────────────────────────────────────────────────

const locStyles = StyleSheet.create({
  pin: {
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
    backgroundColor: "#FF4D00",
    opacity: 0.5,
    marginTop: -2,
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 16 : 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
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
    backgroundColor: "rgba(15,13,10,0.82)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "rgba(239,237,225,0.5)",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  addressRow: {
    minHeight: 44,
    justifyContent: "center",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 17,
    fontFamily: "Lora_400Regular",
    color: "#efede1",
    lineHeight: 24,
  },
});
