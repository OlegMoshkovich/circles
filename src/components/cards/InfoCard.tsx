import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

export type InfoCardItem = {
  icon?: string;
  label: string;
};

type InfoCardProps = {
  title: string;
  items: InfoCardItem[];
  note?: string;
};

export function InfoCard({ title, items, note }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.iconPlaceholder} />
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
  title: {
    ...typography.cardTitle,
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textMuted,
    opacity: 0.35,
    marginRight: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
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
