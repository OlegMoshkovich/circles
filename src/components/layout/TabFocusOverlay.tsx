import React, { useCallback, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import { useColors } from "../../contexts/BackgroundContext";

export function TabFocusOverlay() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useFocusEffect(
    useCallback(() => {
      setVisible(true);
      opacity.setValue(1);

      animRef.current = Animated.sequence([
        Animated.delay(1200),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);

      animRef.current.start(({ finished }) => {
        if (finished) setVisible(false);
      });

      return () => {
        animRef.current?.stop();
      };
    }, [])
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: colors.background, opacity }]}
      pointerEvents="none"
    >
      <View style={styles.center}>
        <Svg width={30} height={40} viewBox="0 0 132 175" fill="none">
          <Path
            d="M128.5 3.0005L66.1263 112.457C65.7404 113.135 64.7625 113.13 64.3836 112.448L3.5 3.00048"
            stroke={colors.text}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Path
            d="M3 171.5V47.8296C3 46.7998 4.36875 46.4423 4.87231 47.3407L64.6312 153.95C65.0124 154.631 65.9906 154.632 66.3741 153.953L126.629 47.3112C127.135 46.4162 128.5 46.7751 128.5 47.8031V171.5"
            stroke={colors.text}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
