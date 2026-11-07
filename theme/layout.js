// Layout tokens from the Cardly Figma responsive frames.
// Compact study columns cap at 375px; preference columns at 600px.
// Phone and tablet use safe-area insets for vertical edge spacing.

export const layout = {
  maxContentWidth: 600,
  compactContentWidth: 375,
  cardStackAspectRatio: 370 / 220,
  sessionProgressMaxWidth: 376,
  sessionContentMinHeight: 547,
  authContentWidth: 371,
  desktopScreenPaddingX: 24,
  desktopScreenPaddingY: 20,
  safeAreaContentGap: 16,
  screenPaddingX: 16,

  // Figma Onboarding/Settings: space from last content to Continue / nav.
  // Onboarding container pb 124 = 64 + 60px button; Settings pb 128 = 64 + 64px nav.
  contentToOverlayGap: 64,
  topGradientFade: 48,
  bottomGradientFade: 64,

  // Wider than this uses the tablet compositions.
  tabletBreakpoint: 768,
  desktopBreakpoint: 1200,
  tabletScreenPaddingX: 40,
};
