/**
 * Calm "paper on warm background" palette
 */
export const lightColors = {
  background: "#F7F4EF",
  card: "#FDFBF7",
  cardBorder: "#E8E4DD",
  text: "#2C2A26",
  iconbBg: "#5A4A3A",
  /** Text / icons on `iconbBg` (dark) surfaces — e.g. FAB, nav icon buttons, GOING badge */
  textOnIconBg: "#F0EBE0",
  textMuted: "#6B6560",
  badgeBg: "#E5E2DC",
  divider: "#E8E4DD",
} as const;

/**
 * Glassmorphism palette — semi-transparent cards over blurred image background
 */
export const glassColors = {
  background: "#35412A",
  card: "rgba(255, 255, 255, 0.14)",
  cardBorder: "rgba(255, 255, 255, 0.28)",
  text: "#F0EBE0",
  iconbBg: "rgba(255, 255, 255, 0.18)",
  textOnIconBg: "#F0EBE0",
  textMuted: "rgba(240, 235, 224, 0.65)",
  badgeBg: "rgba(255, 255, 255, 0.14)",
  divider: "rgba(255, 255, 255, 0.2)",
} as const;

/**
 * Forest green palette — cream text and lines on olive background
 */
export const greenColors = {
  background: "#35412A",
  card: "#717C43",
  cardBorder: "rgba(240, 235, 224, 0.15)",
  text: "white",
  iconbBg: "#4E5830",
  textOnIconBg: "#F0EBE0",
  textMuted: "#C4BDAA",
  badgeBg: "#4E5830",
  divider: "rgba(240, 235, 224, 0.18)",
} as const;

export type Colors = typeof lightColors;

// Default export kept for files not yet on the theme system
export const colors = lightColors;
