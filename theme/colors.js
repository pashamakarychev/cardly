// Color tokens from the Cardly Figma design
// https://www.figma.com/design/TJ4GwpMPqGa5uQOMWQ6hup/Cardly?node-id=11-6

export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  azure100: '#3B82F6',
  azure200: '#385FEB',
  azure50: '#ABC7F5',

  gray100: '#F0EFF6',
  gray200: '#E6E4EB',
  gray300: '#DBD8DF',
  gray400: '#7D7C80',
  gray500: '#1A1A1A',
  gray600: '#0D0D0D',

  green100: '#C3EED0',
  green200: '#446E51',
  red100: '#FCD3D3',
  red200: '#F53D3D',
  red300: '#7D4343',
};

// Semantic aliases — prefer these over raw palette values in screens/components
export const colors = {
  background: palette.white,
  surface: palette.gray100,
  surfaceSubtle: palette.gray200,

  textPrimary: palette.black,
  textSecondary: palette.gray400,
  textInverse: palette.white,
  textCard: palette.gray600,
  textCardSecondary: palette.gray500,

  primary: palette.azure100,
  primaryPressed: palette.azure200,
  primaryDisabled: palette.azure50,

  success: palette.green100,
  successStrong: palette.green200,
  error: palette.red100,
  errorStrong: palette.red300,
};
