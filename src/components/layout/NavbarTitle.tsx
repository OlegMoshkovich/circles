import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type NavbarTitleProps = {
  title: string;
};

export function NavbarTitle({ title }: NavbarTitleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.iconPlaceholder} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  iconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.navbarTitle,
    color: colors.text,
  },
});
