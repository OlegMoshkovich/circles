import React from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type ScreenLayoutProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function ScreenLayout({ header, children, contentStyle }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left + spacing.pageHorizontal,
          paddingRight: insets.right + spacing.pageHorizontal,
        },
      ]}
    >
      <View style={styles.headerArea}>{header}</View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
});
