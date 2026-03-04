import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export type InfoCardItem = {
  icon?: string;
  label: string;
};

type InfoCardProps = {
  title: string;
  titleIcon?: string;
  items: InfoCardItem[];
  note?: string;
};

export function InfoCard({ title, titleIcon, items, note }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        {titleIcon != null && (
          <Ionicons name={titleIcon as any} size={14} color={colors.textMuted} style={styles.titleIcon} />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.iconWrap}>
            {item.icon != null ? (
              <Ionicons name={item.icon as any} size={18} color={colors.textMuted} />
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
      {note != null && (
        <>
          <View style={styles.divider} />
          <Text style={styles.note}>{note}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  titleIcon: {
    marginRight: 6,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 26,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  iconPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    opacity: 0.35,
  },
  label: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  note: {
    ...typography.note,
    color: colors.textMuted,
  },
});
