import { Platform, useWindowDimensions } from 'react-native';
import { layout } from '../theme';

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= layout.desktopBreakpoint;
}
