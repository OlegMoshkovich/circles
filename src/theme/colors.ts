/**
 * Calm "paper on warm background" palette
 */
export const colors = {
  background: "#F7F4EF",
  card: "#FDFBF7",
  cardBorder: "#E8E4DD",
  text: "#2C2A26",
  textMuted: "#6B6560",
  badgeBg: "#E5E2DC",
  divider: "#E8E4DD",
} as const;

export type Colors = typeof colors;
