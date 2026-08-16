import { useWindowDimensions } from 'react-native';

/**
 * System font scale from Accessibility / Display settings.
 * Recomputes when the user changes text size and returns to the app.
 */
export function useFontScale() {
  const { fontScale } = useWindowDimensions();
  return fontScale;
}
