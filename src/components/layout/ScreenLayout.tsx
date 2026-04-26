import React from "react";
import { ImageBackground, ImageSourcePropType, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useBackground } from "../../contexts/BackgroundContext";
import { ThemedBackground } from "./ThemedBackground";
import { GradientRingLoader } from "../loaders/GradientRingLoader";

type ScreenLayoutProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  stickyTop?: React.ReactNode;
  contentStyle?: ViewStyle;
  backgroundImage?: ImageSourcePropType;
  backgroundBlurIntensity?: number;
  backgroundColor?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function ScreenLayout({ header, children, stickyTop, contentStyle, backgroundImage, backgroundBlurIntensity = 55, backgroundColor, onRefresh, refreshing = false }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const resolvedBg = backgroundColor ?? colors.background;
  const { bgOption } = useBackground();
  const shouldUseThemedBackground = backgroundImage == null && bgOption === "onboarding";

  const inner = (
    <View
      style={[
        styles.wrapper,
        !backgroundImage && !shouldUseThemedBackground && { backgroundColor: resolvedBg },
        {
          paddingTop: insets.top,
          paddingLeft: insets.left + spacing.pageHorizontal,
          paddingRight: insets.right + spacing.pageHorizontal,
        },
      ]}
    >
      {header != null && <View style={[styles.headerArea, !backgroundImage && { backgroundColor: resolvedBg }]}>{header}</View>}
      {stickyTop != null && <View>{stickyTop}</View>}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
      {/* <TabFocusOverlay /> */}
    </View>
  );

  if (backgroundImage) {
    return (
      <ImageBackground source={backgroundImage} style={styles.fill} resizeMode="cover">
        <BlurView intensity={backgroundBlurIntensity} tint="light" style={StyleSheet.absoluteFill} />
        {inner}
      </ImageBackground>
    );
  }

  if (shouldUseThemedBackground) {
    return <ThemedBackground backgroundBlurIntensity={0}>{inner}</ThemedBackground>;
  }

  return inner;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  headerArea: {},
  scroll: {
    flex: 1,
  },
  content: {},
});
