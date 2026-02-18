import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type SuggestionCardProps = {
  title: string;
  metaLeft?: string;
  metaRight?: string;
  badge?: string;
  description: string;
};

export function SuggestionCard({
  title,
  metaLeft,
  metaRight,
  badge,
  description,
}: SuggestionCardProps) {
  const meta =
    metaLeft && metaRight
      ? `${metaLeft} · ${metaRight}`
      : metaLeft ?? metaRight ?? "";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {badge != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {meta.length > 0 && (
        <Text style={styles.meta}>{meta}</Text>
      )}
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
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
    ...typography.suggestionTitle,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.badgeBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  badgeText: {
    ...typography.cardTitle,
    color: colors.text,
    textTransform: "uppercase",
  },
  meta: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
});
