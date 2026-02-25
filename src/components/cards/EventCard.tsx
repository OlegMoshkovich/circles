import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type EventCardProps = {
  title: string;
  organizer: string;
  date: string;
  location: string;
  going: number;
  maybe: number;
  rsvp?: "going" | "maybe";
};

export function EventCard({
  title,
  organizer,
  date,
  location,
  going,
  maybe,
  rsvp,
}: EventCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {rsvp != null && (
          <View style={[styles.badge, rsvp === "going" ? styles.badgeGoing : styles.badgeMaybe]}>
            <Text style={[styles.badgeText, rsvp === "going" ? styles.badgeTextGoing : styles.badgeTextMaybe]}>
              {rsvp === "going" ? "GOING" : "MAYBE"}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.organizer}>by {organizer}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
        <Text style={styles.metaText}>{date}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} style={styles.metaIcon} />
        <Text style={styles.metaText}>{location}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          <Text style={styles.footerCount}>{going}</Text>
          <Text style={styles.footerLabel}> going</Text>
          {"   "}
          <Text style={styles.footerCount}>{maybe}</Text>
          <Text style={styles.footerLabel}> maybe</Text>
        </Text>
        <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
      </View>
    </View>
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
    fontSize: 18,
    fontWeight: "500" as const,
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
    backgroundColor: colors.text,
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
    ...typography.body,
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
});
