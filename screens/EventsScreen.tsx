import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PageContainer } from "../src/components/layout/PageContainer";
import { NavbarTitle } from "../src/components/layout/NavbarTitle";
import { colors } from "../src/theme/colors";
import { typography } from "../src/theme/typography";
import { spacing } from "../src/theme/spacing";

export default function EventsScreen() {
  return (
    <PageContainer>
      <NavbarTitle title="Events" />
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No upcoming events</Text>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
