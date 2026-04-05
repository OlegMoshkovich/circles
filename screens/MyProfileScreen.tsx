import React, { useCallback, useState } from "react";
import { Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { Colors, GLASS_BACKGROUND_OPTIONS } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { typography } from "../src/theme/typography";
import { useLanguage, Language } from "../src/i18n/LanguageContext";
import { OnboardingRestartContext } from "../App";
import { supabase, AppNotification } from "../lib/supabase";
import { useNotificationContext } from "../src/contexts/NotificationContext";
import { useBackground, useColors } from "../src/contexts/BackgroundContext";

async function handleSignOut(signOut: () => Promise<void>) {
  try {
    await signOut();
  } catch (_) {}
}

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: "de", flag: "🇨🇭", label: "DE" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "it", flag: "🇮🇹", label: "IT" },
  { code: "en", flag: "🇬🇧", label: "EN" },
];

export default function MyProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { restart: restartOnboarding } = React.useContext(OnboardingRestartContext);
  const { language, setLanguage, t } = useLanguage();
  const { setUnreadCount } = useNotificationContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showGlassPalette, setShowGlassPalette] = useState(false);
  const [showCustomHex, setShowCustomHex] = useState(false);
  const [customHex, setCustomHex] = useState("");
  const [circleCount, setCircleCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const { bgOption, setBgOption, glassBackground, setGlassBackground } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  const headerCardStyle = React.useMemo(
    () => ({
      marginBottom: spacing.lg,
      ...(bgOption === "onboarding" ? { borderRadius: 16, paddingTop: 0 } : null),
    }),
    [bgOption]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false });
    if (data) {
      setNotifications(data as AppNotification[]);
      setUnreadCount(data.length);
    }
  }, [user, setUnreadCount]);

  const fetchProfileCounts = useCallback(async () => {
    if (!user) return;

    const [circlesResult, eventsResult] = await Promise.all([
      supabase
        .from("circle_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    setCircleCount(circlesResult.count ?? 0);
    setEventCount(eventsResult.count ?? 0);
  }, [user]);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
    fetchProfileCounts();
  }, [fetchNotifications, fetchProfileCounts]));

  React.useEffect(() => {
    if (bgOption !== "glass") {
      setShowGlassPalette(false);
    }
  }, [bgOption]);

  async function handleAccept(notif: AppNotification) {
    if (!user) return;

    if (notif.type === "circle_invitation" && notif.data?.circle_id) {
      await Promise.all([
        supabase.from("circle_members").upsert(
          { circle_id: notif.data.circle_id, user_id: user.id, role: "member", status: "active" },
          { onConflict: "circle_id,user_id" }
        ),
        supabase.from("notifications").update({ read: true }).eq("id", notif.id),
      ]);
    } else if (notif.type === "event_invitation" && notif.data?.event_id) {
      await Promise.all([
        supabase.from("event_rsvps").upsert(
          { event_id: notif.data.event_id, user_id: user.id, status: "going" },
          { onConflict: "event_id,user_id" }
        ),
        supabase.from("notifications").update({ read: true }).eq("id", notif.id),
      ]);
    }

    fetchNotifications();
  }

  async function handleDecline(notif: AppNotification) {
    await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
    fetchNotifications();
  }

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Member";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const photoUrl = (() => {
    for (const account of (user?.externalAccounts ?? [])) {
      const url = (account as any).imageUrl || (account as any).avatarUrl;
      if (url) return url as string;
    }
    return user?.imageUrl || null;
  })();
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "M";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(t.locale, {
        month: "long",
        year: "numeric",
      })
    : "—";

  const screenBgColor = colors.background;

  return (
    <ScreenLayout backgroundColor={screenBgColor}>
      <ScreenHeaderCard style={headerCardStyle}>
        <NavbarTitle
          title={t.nav.profile}
          rightElement={
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={restartOnboarding}
                style={styles.iconButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="play-outline" size={16} color={colors.textOnIconBg} />
              </TouchableOpacity>
              {/* Theme Toggle Button */}
              <View style={styles.paletteAnchor}>
                <TouchableOpacity
                  onPress={() => {
                    setShowGlassPalette(false);
                    setBgOption((prev) => {
                      if (prev === "glass") return "onboarding";
                      return "glass";
                    });
                  }}
                  onLongPress={() => {
                    if (bgOption === "glass") {
                      setShowGlassPalette((prev) => !prev);
                    }
                  }}
                  delayLongPress={220}
                  style={styles.iconButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {bgOption === "onboarding" && (
                    <Ionicons name="images-outline" size={16} color={colors.textOnIconBg} />
                  )}
                  {bgOption === "glass" && (
                    <Ionicons name="moon-outline" size={16} color={colors.textOnIconBg} />
                  )}
                  {bgOption !== "onboarding" && bgOption !== "glass" && (
                    <Ionicons name="images-outline" size={16} color={colors.textOnIconBg} />
                  )}
                </TouchableOpacity>
                {bgOption === "glass" && showGlassPalette ? (
                  <View style={styles.glassPalette}>
                    {GLASS_BACKGROUND_OPTIONS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        onPress={() => {
                          setGlassBackground(color);
                          setShowCustomHex(false);
                          setShowGlassPalette(false);
                        }}
                        style={[
                          styles.glassPaletteSwatchButton,
                          glassBackground === color && styles.glassPaletteSwatchButtonSelected,
                        ]}
                        activeOpacity={0.85}
                      >
                        <View style={[styles.glassPaletteSwatch, { backgroundColor: color }]} />
                      </TouchableOpacity>
                    ))}
                    {/* Custom color button */}
                    <TouchableOpacity
                      onPress={() => setShowCustomHex((prev) => !prev)}
                      style={[
                        styles.glassPaletteSwatchButton,
                        showCustomHex && styles.glassPaletteSwatchButtonSelected,
                      ]}
                      activeOpacity={0.85}
                    >
                      <View style={styles.glassPaletteCustomSwatch}>
                        <Text style={styles.glassPaletteCustomPlus}>+</Text>
                      </View>
                    </TouchableOpacity>
                    {showCustomHex ? (
                      <View style={styles.hexInputRow}>
                        <Text style={styles.hexHash}>#</Text>
                        <TextInput
                          value={customHex}
                          onChangeText={(v) => setCustomHex(v.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))}
                          placeholder="3D5A3E"
                          placeholderTextColor="rgba(255,255,255,0.35)"
                          style={styles.hexInput}
                          maxLength={6}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            const hex = `#${customHex}`;
                            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                              setGlassBackground(hex);
                              setShowCustomHex(false);
                              setShowGlassPalette(false);
                            }
                          }}
                          style={styles.hexConfirm}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.hexConfirmText}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleSignOut(signOut)}
                style={styles.iconButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="log-out-outline" size={16} color={colors.textOnIconBg} />
              </TouchableOpacity>
            </View>
          }
        />
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
          <Text style={styles.name}>{name}</Text>
          {email.length > 0 && <Text style={styles.email}>{email}</Text>}
        </View>

      </ScreenHeaderCard>
      {/* Neighbourhood card */}
      {/* <Text style={styles.sectionLabel}>{t.profile.neighbourhood}</Text> */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.profile.location}</Text>
          <Text style={styles.rowValue}>{t.profile.locationValue}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.profile.neighbours}</Text>
          <Text style={styles.rowValue}>{t.profile.neighboursValue}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.nav.circles}</Text>
          <Text style={styles.rowValue}>{circleCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.nav.events}</Text>
          <Text style={styles.rowValue}>{eventCount}</Text>
        </View>
      </View>

      <View style={styles.sectionGap} />

      {/* Language selector */}
      {/* <Text style={styles.sectionLabel}>{t.profile.language}</Text> */}
      <View style={styles.flagRow}>
        {LANGUAGES.map(({ code, flag, label }) => {
          const selected = language === code;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => setLanguage(code)}
              style={[styles.flagButton, selected && styles.flagButtonSelected]}
              activeOpacity={0.7}
            >
              <Text style={styles.flagEmoji}>{flag}</Text>
              <Text style={[styles.flagLabel, selected && styles.flagLabelSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionGap} />

      {notifications.length > 0 ? (
        <>
          {notifications.map((notif) => (
            <View key={notif.id} style={styles.notifCard}>
              <View style={styles.notifIcon}>
                <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                {notif.body ? <Text style={styles.notifBody}>{notif.body}</Text> : null}
              </View>
              <View style={styles.notifActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(notif)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(notif)}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : null}

    </ScreenLayout>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    cardDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginTop: spacing.md,
    },
    avatarSection: {
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.badgeBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    avatarImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
    avatarInitials: {
      fontSize: 24,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    name: {
      fontSize: 20,
      fontWeight: "400" as const,
      fontFamily: "Lora_400Regular",
      color: colors.text,
      marginBottom: spacing.xs,
    },
    email: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    divider: {
      height: 1,
      // backgroundColor: colors.divider,
      marginVertical: spacing.md,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.8,
      color: colors.textMuted,
      textTransform: "uppercase" as const,
      marginBottom: spacing.sm,
    },
    sectionGap: {
      height: spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: { elevation: 1 },
        default: {},
      }),
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: 14,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginHorizontal: spacing.cardPadding,
    },
    rowLabel: {
      ...typography.body,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
      fontFamily: "Lora_400Regular",
    },
    headerButtons: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
      zIndex: 10,
    },
    paletteAnchor: {
      position: "relative",
      alignItems: "center",
    },
    iconButton: {
      width: 30,
      height: 30,
      borderRadius: 16,
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.12)" : colors.iconbBg,
      borderWidth: isOnboarding ? 1 : 0,
      borderColor: isOnboarding ? colors.cardBorder : "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    glassPalette: {
      position: "absolute",
      top: 38,
      alignItems: "center",
      gap: 8,
      zIndex: 20,
    },
    glassPaletteSwatchButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: "transparent",
    },
    glassPaletteSwatchButtonSelected: {
      borderColor: colors.text,
    },
    glassPaletteSwatch: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    glassPaletteCustomSwatch: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.55)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    hexInputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 2,
      marginTop: 2,
    },
    glassPaletteCustomPlus: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 13,
      lineHeight: 16,
      fontWeight: "600" as const,
    },
    hexHash: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 13,
      fontFamily: "Lora_400Regular",
    },
    hexInput: {
      color: "#fff",
      fontSize: 13,
      fontFamily: "Lora_400Regular",
      width: 52,
      height: 24,
      padding: 0,
    },
    hexConfirm: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    hexConfirmText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600" as const,
    },
    flagRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    flagButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    flagButtonSelected: {
      borderColor: isOnboarding ? "rgba(239,237,225,0.38)" : colors.text,
      backgroundColor: colors.card,
    },
    flagEmoji: {
      fontSize: 20,
    },
    flagLabel: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.textMuted,
    },
    flagLabelSelected: {
      color: colors.text,
    },
    notifCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      marginBottom: spacing.sm,
    },
    notifIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.badgeBg,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    notifContent: {
      flex: 1,
      marginRight: 8,
    },
    notifTitle: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.text,
      marginBottom: 2,
    },
    notifBody: {
      fontSize: 12,
      color: colors.textMuted,
    },
    notifActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    acceptBtn: {
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.14)" : colors.text,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: isOnboarding ? 1 : 0,
      borderColor: isOnboarding ? "rgba(239,237,225,0.28)" : "transparent",
    },
    acceptBtnText: {
      color: isOnboarding ? colors.text : colors.background,
      fontSize: 12,
      fontWeight: "600" as const,
    },
    declineBtn: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    bgRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    bgSwatch: {
      width: 52,
      height: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    bgSwatchImage: {
      width: 52,
      height: 52,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    bgSwatchImageInner: {
      width: "100%",
      height: "100%",
    },
    bgSwatchSelected: {
      borderColor: colors.text,
      borderWidth: 2.5,
    },
  });
}
