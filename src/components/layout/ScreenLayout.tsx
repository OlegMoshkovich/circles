import React from "react";
import { ImageBackground, ImageSourcePropType, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type ScreenLayoutProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  backgroundImage?: ImageSourcePropType;
  backgroundBlurIntensity?: number;
};

export function ScreenLayout({ header, children, contentStyle, backgroundImage, backgroundBlurIntensity = 40 }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  const inner = (
    <View
      style={[
        styles.wrapper,
        !backgroundImage && { backgroundColor: colors.background },
        {
          paddingTop: insets.top,
          paddingLeft: insets.left + spacing.pageHorizontal,
          paddingRight: insets.right + spacing.pageHorizontal,
        },
      ]}
    >
      <View style={[styles.headerArea, !backgroundImage && { backgroundColor: colors.background }]}>{header}</View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
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
