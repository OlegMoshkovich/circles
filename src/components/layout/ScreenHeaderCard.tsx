import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useColors } from "../../contexts/BackgroundContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  glass?: boolean;
};

export function ScreenHeaderCard({ children, style, glass = false }: Props) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.card, glass && styles.glassCard, style]}>
      {glass ? (
        <>
          <BlurView
            intensity={72}
            tint="systemUltraThinMaterialLight"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.glassOverlay]} />
        </>
      ) : null}
      {children}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: spacing.cardPadding,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 20,
      marginBottom: spacing.md,
    },
    glassCard: {
      backgroundColor: "transparent",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255, 255, 255, 0.55)",
      overflow: "hidden",
    },
    glassOverlay: {
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
  });
}
