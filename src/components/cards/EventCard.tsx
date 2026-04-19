import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { useLanguage } from "../../i18n/LanguageContext";

type EventCardProps = {
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  going: number;
  maybe: number;
  maxParticipants?: number | null;
  rsvp?: "going" | "maybe";
  isOwner?: boolean;
  circleName?: string | null;
  noteCount?: number;
  hasNewActivity?: boolean;
  onPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

export function EventCard({
  title,
  organizer,
  date,
  time,
  location,
  going,
  maybe,
  maxParticipants,
  rsvp,
  isOwner = false,
  circleName,
  noteCount = 0,
  hasNewActivity = false,
  onPress,
  onActionPress,
  actionIcon,
}: EventCardProps) {
  const isFilled = maxParticipants != null && going >= maxParticipants;
  const { t } = useLanguage();
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRight}>
          {hasNewActivity && (
            <View style={styles.activityBell}>
              <Ionicons name="notifications-outline" size={11} color="#FFFFFF" />
            </View>
          )}

          {isOwner ? (
            <View style={[styles.badge, styles.badgeGoing]}>
              <Text style={[styles.badgeText, styles.badgeTextGoing]}>{t.events.badgeHost}</Text>
            </View>
          ) : rsvp != null ? (
            <View style={[styles.badge, rsvp === "going" ? styles.badgeGoing : styles.badgeMaybe]}>
              <Text style={[styles.badgeText, rsvp === "going" ? styles.badgeTextGoing : styles.badgeTextMaybe]}>
                {rsvp === "going" ? t.events.badgeGoing : t.events.badgeMaybe}
              </Text>
            </View>
          ) : isFilled ? (
            <View style={[styles.badge, styles.badgeFilled]}>
              <Text style={[styles.badgeText, styles.badgeTextFilled]}>Filled</Text>
            </View>
          ) : null}
          {actionIcon && onActionPress ? (
            <TouchableOpacity style={styles.headerAction} onPress={onActionPress} activeOpacity={0.8}>
              <Ionicons name={actionIcon} size={12} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.organizer}>{t.events.by} {organizer}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
        <Text style={styles.metaText}>{date} · {time}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
        <Text style={styles.metaText}>{location}</Text>
      </View>

      {circleName ? (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{circleName}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          <Text style={styles.footerCount}>{going}</Text>
          <Text style={styles.footerLabel}> {t.events.goingLabel}</Text>
          {"   "}
          <Text style={styles.footerCount}>{maybe}</Text>
          <Text style={styles.footerLabel}> {t.events.maybeLabel}</Text>
        </Text>
        <View style={styles.noteCountRow}>
          {noteCount > 0 && (
            <Text style={styles.noteCountText}>{noteCount}</Text>
          )}
          <Ionicons name="chatbubble-outline" size={16} color={noteCount > 0 ? colors.text : colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: spacing.cardPadding,
      marginBottom: spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isOnboarding ? 0.14 : 0.06,
          shadowRadius: 3,
        },
        android: { elevation: 2 },
        default: {},
      }),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      flexShrink: 0,
    },
    title: {
      fontSize: 18,
      fontWeight: "400" as const,
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeGoing: {
      backgroundColor: isOnboarding ? "rgba(255,255,255,0.12)" : colors.iconbBg,
    },
    badgeMaybe: {
      backgroundColor: colors.badgeBg,
    },
    badgeFilled: {
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    badgeTextFilled: {
      color: colors.textMuted,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
    },
    badgeTextGoing: {
      color: colors.textOnIconBg,
    },
    badgeTextMaybe: {
      color: colors.text,
    },
    organizer: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginBottom: spacing.md,
      fontFamily: "Lora_400Regular",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    metaIcon: {
      marginRight: spacing.sm,
    },
    metaText: {
      ...typography.bodySmall,
      color: colors.text,
      fontFamily: "Lora_400Regular",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.md,
    },
    footerText: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    footerCount: {
      color: colors.text,
      fontWeight: "400" as const,
    },
    footerLabel: {
      color: colors.textMuted,
    },
    activityBell: {
      backgroundColor: "#FF4D00",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginRight: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    headerAction: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.badgeBg,
      marginLeft: spacing.sm,
    },
    noteCountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    noteCountText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "500" as const,
    },
  });
}
