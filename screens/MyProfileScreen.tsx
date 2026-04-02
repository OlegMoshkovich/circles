import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { Colors } from "../src/theme/colors";
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
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const { bgOption, setBgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoadingNotifs(true);
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
    setLoadingNotifs(false);
  }, [user, setUnreadCount]);

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]));

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

  const screenBgColor = bgOption !== "green" ? colors.background : undefined;

  return (
    <ScreenLayout
      backgroundColor={screenBgColor}
      backgroundImage={bgOption === "green" ? require("../assets/Background.webp") : undefined}
    >
      <View style={styles.headerCard}>
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
              <TouchableOpacity
                onPress={() => {
                  setBgOption((prev) => {
                    if (prev === "light") return "solid";
                    if (prev === "solid") return "green";
                    return "light";
                  });
                }}
                style={styles.iconButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {bgOption === "light" && (
                  <Ionicons name="sunny-outline" size={16} color={colors.textOnIconBg} />
                )}
                {bgOption === "green" && (
                  <Ionicons name="leaf-outline" size={16} color={colors.textOnIconBg} />
                )}
                {bgOption === "solid" && (
                  <Ionicons name="contrast-outline" size={16} color={colors.textOnIconBg} />
                )}
              </TouchableOpacity>
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
 
      </View>
      {loadingNotifs ? (
        <ActivityIndicator size="small" color={colors.textMuted} style={{ marginBottom: spacing.lg }} />
      ) : notifications.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Notifications</Text>
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
          <View style={styles.divider} />
        </>
      ) : null}

      {/* Account card */}
      <Text style={styles.sectionLabel}>{t.profile.account}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.profile.circle}</Text>
          <Text style={styles.rowValue}>{t.profile.circleValue}</Text>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.profile.memberSince}</Text>
          <Text style={styles.rowValue}>{memberSince}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Neighbourhood card */}
      <Text style={styles.sectionLabel}>{t.profile.neighbourhood}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.profile.location}</Text>
          <Text style={styles.rowValue}>{t.profile.locationValue}</Text>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t.profile.neighbours}</Text>
          <Text style={styles.rowValue}>{t.profile.neighboursValue}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Language selector */}
      <Text style={styles.sectionLabel}>{t.profile.language}</Text>
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

      <View style={styles.divider} />

     

    </ScreenLayout>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    headerCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: spacing.cardPadding,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: { shadowColor: "#2C2A26", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
        android: { elevation: 2 },
        default: {},
      }),
    },
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
      backgroundColor: colors.divider,
      marginVertical: spacing.lg,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.8,
      color: colors.textMuted,
      textTransform: "uppercase" as const,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: "#2C2A26",
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
    },
    rowValue: {
      ...typography.body,
      color: colors.textMuted,
    },
    headerButtons: {
      flexDirection: "row",
      gap: 8,
    },
    iconButton: {
      width: 30,
      height: 30,
      borderRadius: 16,
      backgroundColor: colors.iconbBg,
      alignItems: "center",
      justifyContent: "center",
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
      borderWidth: 0.4,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    flagButtonSelected: {
      borderColor: colors.text,
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
      backgroundColor: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    acceptBtnText: {
      color: colors.background,
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
