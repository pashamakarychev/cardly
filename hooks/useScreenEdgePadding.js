import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../theme';
import { useIsDesktop } from './useIsDesktop';

export function useScreenEdgePadding() {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  return {
    isDesktop,
    top: isDesktop ? layout.desktopScreenPaddingY : insets.top + layout.safeAreaContentGap,
    bottom: isDesktop ? layout.desktopScreenPaddingY : insets.bottom + layout.safeAreaContentGap,
  };
}
