import { useWindowDimensions } from 'react-native';

import { layout } from '../theme';

/** True when the window is wider than the tablet breakpoint (768px).
 *  Recomputes on rotation / resize via useWindowDimensions. */
export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width > layout.tabletBreakpoint;
}
