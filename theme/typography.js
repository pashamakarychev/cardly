// Typography tokens from the Cardly Figma design
// https://www.figma.com/design/TJ4GwpMPqGa5uQOMWQ6hup/Cardly?node-id=11-6
//
// All text styles use Inter. Figma line-height is 100%, so lineHeight
// equals fontSize on iOS. Android needs slightly more room for descenders.
//
// Font sizes respect the system Accessibility / Display text size via React
// Native’s default Text allowFontScaling. Fixed-height text containers
// (buttons, nav, cards) should multiply their heights by useFontScale().

import { Platform } from 'react-native';

function lineHeight(fontSize) {
  return Platform.OS === 'android' ? Math.round(fontSize * 1.2) : fontSize;
}

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
};

export const typography = {
  logo: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    lineHeight: lineHeight(20),
  },
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: lineHeight(32),
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: lineHeight(24),
  },
  h3: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: lineHeight(16),
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: lineHeight(14),
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: lineHeight(16),
  },
  bodySmall: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: lineHeight(14),
  },
  button: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: lineHeight(16),
  },
  cardWord: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    lineHeight: lineHeight(36),
  },
  navActive: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    lineHeight: lineHeight(12),
  },
  navInactive: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: lineHeight(12),
  },
  navSidebar: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: lineHeight(14),
  },
};
