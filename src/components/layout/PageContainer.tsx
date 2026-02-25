import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type PageContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function PageContainer({ children, style }: PageContainerProps) {
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, style]}
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
});
