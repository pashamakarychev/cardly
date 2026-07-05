// Typography tokens from the Cardly Figma design
// https://www.figma.com/design/Wnh4tOOUxkTTUC5Wx0ej6f/Cardly
//
// All text styles use Inter. Figma line-height is 100%, so lineHeight
// equals fontSize for every style.

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
};

export const typography = {
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 32,
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 24,
  },
  h3: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 16,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 14,
  },
  button: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 16,
  },
  cardWord: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    lineHeight: 36,
  },
  navActive: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    lineHeight: 12,
  },
  navInactive: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 12,
  },
};
