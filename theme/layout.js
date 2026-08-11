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

  // Wider than this uses the tablet compositions.
  tabletBreakpoint: 768,
  tabletScreenPadding: 40,
  tabletContentPaddingTop: 48,
  tabletContentPaddingBottom: 64,
};
