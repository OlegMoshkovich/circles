/**
 * Spacing tokens for consistent layout
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  pageHorizontal: 24,
  cardPadding: 16,
  /** Use as bottomPadding in PageContainer when screen is inside bottom tab bar */
  tabBarBottomPadding: 72,
} as const;

export type Spacing = typeof spacing;
