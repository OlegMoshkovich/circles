import React from "react";
import { StyleSheet, Text } from "react-native";
import { PageContainer } from "../components/layout/PageContainer";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { colors } from "../theme/colors";

export default function EventsScreen() {
  return (
    <PageContainer bottomPadding={spacing.tabBarBottomPadding}>
      <Text style={styles.title}>Events</Text>
      <Text style={styles.subtitle}>
        Upcoming events will appear here.
      </Text>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.navbarTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
});
