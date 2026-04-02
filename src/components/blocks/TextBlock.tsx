import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme/colors";
import { useColors } from "../../contexts/BackgroundContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";

type TextBlockProps = {
  title?: string;
  subtitle: string;
};

export function TextBlock({ subtitle }: TextBlockProps) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    subtitle: {
      ...typography.subtitle,
      color: colors.text,
    },
  });
}
