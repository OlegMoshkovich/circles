import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useBackground, useColors } from "../../contexts/BackgroundContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeaderCard({ children, style }: Props) {
  const { bgOption } = useBackground();
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors, bgOption === "onboarding"), [colors, bgOption]);
  return <View style={[styles.card, style]}>{children}</View>;
}

function makeStyles(colors: Colors, isOnboarding: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: spacing.cardPadding,
      paddingTop: 0,
      paddingBottom: spacing.cardPadding,
      marginTop: 20,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isOnboarding ? 0.16 : 0.06,
          shadowRadius: 3,
        },
        android: { elevation: 2 },
        default: {},
      }),
    },
  });
}
