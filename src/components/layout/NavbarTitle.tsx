import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type NavbarTitleProps = {
  title: string;
  rightElement?: React.ReactNode;
};

export function NavbarTitle({ title, rightElement }: NavbarTitleProps) {
  return (
    <View style={styles.row}>
      <Svg width={14} height={27} viewBox="0 0 132 175" fill="none">
        <Path
          d="M128.5 3.0005L66.1263 112.457C65.7404 113.135 64.7625 113.13 64.3836 112.448L3.5 3.00048"
          stroke={colors.text}
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Path
          d="M3 171.5V47.8296C3 46.7998 4.36875 46.4423 4.87231 47.3407L64.6312 153.95C65.0124 154.631 65.9906 154.632 66.3741 153.953L126.629 47.3112C127.135 46.4162 128.5 46.7751 128.5 47.8031V171.5"
          stroke={colors.text}
          strokeWidth={8}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.title}>{title}</Text>
      {rightElement != null ? (
        <>
          <View style={styles.spacer} />
          {rightElement}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontFamily: "CormorantGaramond_300Light",
    color: colors.text,
  },
  spacer: {
    flex: 1,
  },
});
