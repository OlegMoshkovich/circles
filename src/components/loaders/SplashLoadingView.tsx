import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * Full-screen branded loading view: the foggy forest background image with the
 * M logo centered on top. Reused for every "still setting up" wait so the
 * loading experience looks like a seamless continuation of the splash rather
 * than a bare spinner or the themed app background.
 */
export function SplashLoadingView() {
  return (
    <View style={styles.fill}>
      <Image
        source={require("../../../assets/Background.webp")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.center}>
        <Svg width={66} height={88} viewBox="0 0 132 175" fill="none">
          <Path
            d="M128.5 3.0005L66.1263 112.457C65.7404 113.135 64.7625 113.13 64.3836 112.448L3.5 3.00048"
            stroke="#FFFFFF"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Path
            d="M3 171.5V47.8296C3 46.7998 4.36875 46.4423 4.87231 47.3407L64.6312 153.95C65.0124 154.631 65.9906 154.632 66.3741 153.953L126.629 47.3112C127.135 46.4162 128.5 46.7751 128.5 47.8031V171.5"
            stroke="#FFFFFF"
            strokeWidth={6}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: "#1B2417",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
