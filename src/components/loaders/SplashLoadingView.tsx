import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  /** Shown below the logo during first-time account setup. */
  statusMessage?: string;
};

/**
 * Full-screen branded loading view shown while the app is "still setting up".
 *
 * It must look pixel-identical to the native splash (assets/splash.png) so the
 * handoff between them has no visible jump. Rather than re-display the splash
 * image (whose `cover` scaling can render the logo at a slightly different size
 * than the native launch screen), we draw the M monogram directly on the same
 * green field, sized to match the native splash exactly.
 *
 * The constants below were sampled from the native splash screenshot: the green
 * field is rgb(55,65,44), the monogram is white, and it occupies ~12.48% of the
 * screen width, centered. If the splash artwork changes, re-sample and update.
 */
const SPLASH_GREEN = "#37412C";
const LOGO_COLOR = "#FFFFFF";
const LOGO_WIDTH_RATIO = 0.1248; // logo width as a fraction of the screen width
const LOGO_ASPECT = 175 / 132; // monogram viewBox is 132 x 175

export function SplashLoadingView({ statusMessage }: Props) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.round(width * LOGO_WIDTH_RATIO);
  const logoHeight = Math.round(logoWidth * LOGO_ASPECT);

  return (
    <View style={styles.fill}>
      <Svg width={logoWidth} height={logoHeight} viewBox="0 0 132 175" fill="none">
        <Path
          d="M128.5 3.0005L66.1263 112.457C65.7404 113.135 64.7625 113.13 64.3836 112.448L3.5 3.00048"
          stroke={LOGO_COLOR}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <Path
          d="M3 171.5V47.8296C3 46.7998 4.36875 46.4423 4.87231 47.3407L64.6312 153.95C65.0124 154.631 65.9906 154.632 66.3741 153.953L126.629 47.3112C127.135 46.4162 128.5 46.7751 128.5 47.8031V171.5"
          stroke={LOGO_COLOR}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </Svg>
      {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: SPLASH_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  statusMessage: {
    marginTop: 28,
    fontSize: 14,
    fontFamily: "Lora_400Regular",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.2,
  },
});
