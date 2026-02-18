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
  /** Extra bottom padding when used inside a tab layout (e.g. 72) so content doesn't sit under the tab bar */
  bottomPadding?: number;
};

export function PageContainer({
  children,
  style,
  bottomPadding = 0,
}: PageContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left + spacing.pageHorizontal,
          paddingRight: insets.right + spacing.pageHorizontal,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl + bottomPadding },
          style,
        ]}
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
