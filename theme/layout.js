// Layout tokens from the Cardly Figma responsive frames.
// Phone content columns cap at 600px. Above tabletBreakpoint, screens use
// the tablet frames (40px padding, vertically centered content).

export const layout = {
  maxContentWidth: 600,
  screenPaddingX: 16,
  // Bottom inset used when a screen pins a primary control above the home
  // indicator (Continue / Home / session actions).
  screenPaddingBottom: 50,
  contentTopPadding: 19,

  // Figma Onboarding/Settings: space from last content to Continue / nav.
  // Onboarding container pb 124 = 64 + 60px button; Settings pb 128 = 64 + 64px nav.
  contentToOverlayGap: 64,
  topGradientFade: 48,
  bottomGradientFade: 64,

  // Wider than this uses the tablet compositions.
  tabletBreakpoint: 768,
  tabletScreenPadding: 40,
  tabletContentPaddingTop: 48,
  tabletContentPaddingBottom: 64,
  // Session (Exercise / New Word) tablet body under the fixed header.
  tabletSessionPaddingTop: 24,
};
