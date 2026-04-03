import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useColors } from "../../contexts/BackgroundContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeaderCard({ children, style }: Props) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: spacing.cardPadding,
      paddingBottom: spacing.cardPadding,
      marginTop: 20,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: { shadowColor: "#2C2A26", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
        android: { elevation: 2 },
        default: {},
      }),
    },
  });
}
