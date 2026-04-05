export const GLASS_BACKGROUND_OPTIONS = [
  "#35412A",
  "#213127",
  "#2B30AF",
] as const;

export type GlassBackgroundColor = (typeof GLASS_BACKGROUND_OPTIONS)[number];

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
 * Onboarding-inspired palette — dark frosted cards over scenic image background
 */
export const onboardingColors = {
  background: "#1B2417",
  card: "rgba(15, 13, 10, 0.78)",
  cardBorder: "rgba(239, 237, 225, 0.18)",
  text: "#EFEDE1",
  iconbBg: "rgba(255, 255, 255, 0.16)",
  textOnIconBg: "#EFEDE1",
  textMuted: "rgba(239, 237, 225, 0.62)",
  badgeBg: "rgba(255, 255, 255, 0.08)",
  divider: "rgba(239, 237, 225, 0.14)",
} as const;

/**
 * Glassmorphism palette — semi-transparent cards over a muted green base
 */
export function createGlassColors(background: GlassBackgroundColor = GLASS_BACKGROUND_OPTIONS[1]) {
  return {
  background,
  card: "rgba(255, 255, 255, 0.14)",
  cardBorder: "rgba(255, 255, 255, 0.28)",
  text: "#F0EBE0",
  iconbBg: "rgba(255, 255, 255, 0.18)",
  textOnIconBg: "#F0EBE0",
  textMuted: "rgba(240, 235, 224, 0.65)",
  badgeBg: "rgba(255, 255, 255, 0.14)",
  divider: "rgba(255, 255, 255, 0.2)",
} as const;
}

export const glassColors = createGlassColors();

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

export type Colors = {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  iconbBg: string;
  textOnIconBg: string;
  textMuted: string;
  badgeBg: string;
  divider: string;
};

// Default export kept for files not yet on the theme system
export const colors = lightColors;
