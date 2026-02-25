import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type NavbarTitleProps = {
  title: string;
  rightElement?: React.ReactNode;
};

export function NavbarTitle({ title, rightElement }: NavbarTitleProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {rightElement != null ? (
        <>
          <View style={styles.spacer} />
          {rightElement}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  title: {
    ...typography.navbarTitle,
    color: colors.text,
  },
});
