import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
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
  rsvp?: "going" | "maybe";
  circleName?: string | null;
  noteCount?: number;
  hasNewActivity?: boolean;
  onPress?: () => void;
};

export function EventCard({
  title,
  organizer,
  date,
  time,
  location,
  going,
  maybe,
  rsvp,
  circleName,
  noteCount = 0,
  hasNewActivity = false,
  onPress,
}: EventCardProps) {
  const { t } = useLanguage();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {hasNewActivity && (
          <View style={styles.activityBell}>
            <Ionicons name="notifications-outline" size={11} color="#FFFFFF" />
          </View>
        )}
        {rsvp != null && (
          <View style={[styles.badge, rsvp === "going" ? styles.badgeGoing : styles.badgeMaybe]}>
            <Text style={[styles.badgeText, rsvp === "going" ? styles.badgeTextGoing : styles.badgeTextMaybe]}>
              {rsvp === "going" ? t.events.badgeGoing : t.events.badgeMaybe}
            </Text>
          </View>
        )}
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

      <View style={styles.divider} />

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: "#2C2A26",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
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
  title: {
    fontSize: 16,
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
    backgroundColor: colors.iconbBg,
  },
  badgeMaybe: {
    backgroundColor: colors.badgeBg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  badgeTextGoing: {
    color: colors.card,
  },
  badgeTextMaybe: {
    color: colors.text,
  },
  organizer: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
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
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
