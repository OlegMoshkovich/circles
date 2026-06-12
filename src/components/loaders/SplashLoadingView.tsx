import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Spinner } from "./Spinner";

/**
 * Full-screen branded loading view: the same splash image the native splash
 * screen shows (full-bleed cover) with a subtle progress ring near the bottom.
 * Reused for every "still setting up" wait so the loading experience looks
 * like a seamless continuation of the splash rather than a bare spinner or the
 * themed app background.
 */
export function SplashLoadingView() {
  return (
    <View style={styles.fill}>
      <Image
        source={require("../../../assets/splash.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={styles.loader}>
        <Spinner size={32} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loader: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 64,
    alignItems: "center",
  },
});
