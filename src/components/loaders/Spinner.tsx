import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { GradientRingLoader } from "./GradientRingLoader";

export type SpinnerSize = "small" | "medium" | "large";

// One set of sizes for the whole app so every loading state looks the same.
const SIZE_PX: Record<SpinnerSize, number> = {
  small: 18, // inline: buttons, list rows, small fields
  medium: 28, // modal / section level
  large: 40, // full-screen / primary list loading
};

type Props = {
  /** Named preset, or an explicit pixel size. Defaults to "medium". */
  size?: SpinnerSize | number;
  /**
   * Override color for surfaces where the themed text color wouldn't read
   * (e.g. a spinner inside a tinted button). Omit to follow the theme.
   */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The single loading spinner for the app. Wraps GradientRingLoader so every
 * loading state -- buttons, lists, modals, full screens -- shares one look,
 * animation, and theming. Replaces the previous mix of GradientRingLoader and
 * React Native's ActivityIndicator.
 */
export function Spinner({ size = "medium", color, style }: Props) {
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const strokeWidth = Math.max(2, Math.round(px / 6));
  return <GradientRingLoader size={px} strokeWidth={strokeWidth} color={color} style={style} />;
}
