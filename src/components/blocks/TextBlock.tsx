import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type TextBlockProps = {
  title?: string;
  subtitle: string;
};

export function TextBlock({ subtitle }: TextBlockProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text,
  },
});
