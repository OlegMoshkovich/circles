import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useBackground, useColors } from "../../contexts/BackgroundContext";

type Props = {
  /** Total width/height of the loader */
  size?: number;
  /** Ring thickness */
  strokeWidth?: number;
  /** How many wedges form the conic ramp (more = smoother gradient) */
  segments?: number;
  /** One full spin duration (ms) */
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * When true, ramp goes from faint to full `text` (good on dark UI).
   * Defaults from theme: light paper → darker ramp; dark/glass → lighter ramp.
   */
  darkBackground?: boolean;
};

/** degCW: 0° = top, increases clockwise; y-down coordinates */
function ringPoint(cx: number, cy: number, radius: number, degCW: number) {
  const rad = (degCW * Math.PI) / 180;
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) };
}

/** One annulus sector from degCW d0 → d1 (filled, no gaps between adjacent sectors) */
function donutSectorPath(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  d0: number,
  d1: number,
): string {
  const p = (r: number, d: number) => ringPoint(cx, cy, r, d);
  const o0 = p(rOut, d0);
  const o1 = p(rOut, d1);
  const i1 = p(rIn, d1);
  const i0 = p(rIn, d0);
  const delta = d1 - d0;
  const large = Math.abs(delta) > 180 ? 1 : 0;
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${i0.x} ${i0.y}`,
    "Z",
  ].join(" ");
}

/**
 * Rotating ring loader with a smooth light→dark sweep (conic-style).
 * Uses filled annulus wedges so the ring is visually continuous (no stroke gaps).
 */
export function GradientRingLoader({
  size = 36,
  strokeWidth = 3,
  segments = 72,
  durationMs = 900,
  style,
  darkBackground: darkBackgroundProp,
}: Props) {
  const { bgOption } = useBackground();
  const colors = useColors();
  const rampDark = darkBackgroundProp ?? bgOption !== "light";
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [durationMs, spin]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const cx = size / 2;
  const cy = size / 2;
  const rMid = Math.max(1, size / 2 - strokeWidth / 2 - 0.5);
  const rOut = rMid + strokeWidth / 2;
  const rIn = Math.max(0.5, rMid - strokeWidth / 2);

  const seg = Math.max(8, segments);
  const step = 360 / seg;

  const wedges = React.useMemo(() => {
    const items: React.ReactNode[] = [];
    for (let i = 0; i < seg; i++) {
      const t = seg <= 1 ? 0 : i / (seg - 1);
      const fillOpacity = rampDark ? 0.12 + 0.88 * t : 0.08 + 0.92 * t;
      const d0 = step * i;
      const d1 = step * (i + 1);
      items.push(
        <Path
          key={i}
          d={donutSectorPath(cx, cy, rOut, rIn, d0, d1)}
          fill={colors.text}
          fillOpacity={fillOpacity}
        />,
      );
    }
    return items;
  }, [seg, step, cx, cy, rOut, rIn, colors.text, rampDark]);

  return (
    <Animated.View
      style={[{ width: size, height: size, transform: [{ rotate: rotation }] }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {wedges}
        </Svg>
      </View>
    </Animated.View>
  );
}
