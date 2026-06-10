import React from "react";
import { FlatList, ImageBackground, ImageSourcePropType, ListRenderItem, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { spacing } from "../../theme/spacing";
import { useBackground, useColors } from "../../contexts/BackgroundContext";
import { ThemedBackground } from "./ThemedBackground";

type ScreenLayoutProps = {
  header?: React.ReactNode;
  children?: React.ReactNode;
  stickyTop?: React.ReactNode;
  contentStyle?: ViewStyle;
  backgroundImage?: ImageSourcePropType;
  backgroundBlurIntensity?: number;
  backgroundColor?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  /**
   * List mode: when listData + renderItem are provided, the content area is
   * a virtualized FlatList instead of a ScrollView (children are ignored).
   * Use for screens that render long card lists so off-screen items don't
   * stay mounted.
   */
  listData?: readonly any[];
  renderItem?: ListRenderItem<any>;
  keyExtractor?: (item: any, index: number) => string;
  listEmptyComponent?: React.ReactElement | null;
};

export function ScreenLayout({ header, children, stickyTop, contentStyle, backgroundImage, backgroundBlurIntensity = 55, backgroundColor, onRefresh, refreshing = false, listData, renderItem, keyExtractor, listEmptyComponent }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const resolvedBg = backgroundColor ?? colors.background;
  const { bgOption } = useBackground();
  const shouldUseThemedBackground = backgroundImage == null && bgOption === "onboarding";

  const contentContainerStyle = [styles.content, { paddingBottom: insets.bottom + 80 }, contentStyle];
  const refreshControl = onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={["#FFFFFF"]} /> : undefined;

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
      {listData != null && renderItem != null ? (
        <FlatList
          style={styles.scroll}
          data={listData as any[]}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={listEmptyComponent}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      )}
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
