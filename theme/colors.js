// Color tokens from the Cardly Figma design
// https://www.figma.com/design/Wnh4tOOUxkTTUC5Wx0ej6f/Cardly

export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  azure100: '#3B82F6',
  azure200: '#385FEB',
  azure50: '#ABC7F5',

  gray100: '#F0EFF6',
  gray200: '#E6E4EB',
  gray300: '#7D7C80',
  gray400: '#1A1A1A',
  gray500: '#0D0D0D',

  green100: '#C3EED0',
  green200: '#446E51',
  red100: '#FCD3D3',
  red200: '#7D4343',
};

// Semantic aliases — prefer these over raw palette values in screens/components
export const colors = {
  background: palette.white,
  surface: palette.gray100,
  surfaceSubtle: palette.gray200,

  textPrimary: palette.black,
  textSecondary: palette.gray300,
  textInverse: palette.white,
  textCard: palette.gray500,
  textCardSecondary: palette.gray400,

  primary: palette.azure100,
  primaryPressed: palette.azure200,
  primaryDisabled: palette.azure50,

  success: palette.green100,
  successStrong: palette.green200,
  error: palette.red100,
  errorStrong: palette.red200,
};
