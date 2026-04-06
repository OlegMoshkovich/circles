import React from "react";
import { ImageBackground, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useBackground } from "../../contexts/BackgroundContext";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  backgroundColor?: string;
  backgroundBlurIntensity?: number;
};

export function ThemedBackground({
  children,
  style,
  backgroundColor,
  backgroundBlurIntensity = 0,
}: Props) {
  const { bgOption, colors } = useBackground();
  const resolvedBackgroundColor = backgroundColor ?? colors.background;

  if (bgOption === "onboarding") {
    return (
      <ImageBackground
        source={require("../../../assets/Background.webp")}
        style={[styles.fill, style]}
        resizeMode="cover"
      >
        {backgroundBlurIntensity > 0 ? (
          <BlurView intensity={backgroundBlurIntensity} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        {children}
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: resolvedBackgroundColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
