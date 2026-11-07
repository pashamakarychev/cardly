import { useWindowDimensions } from 'react-native';

import { layout } from '../theme';
import { useIsTablet } from './useIsTablet';
import { useScreenEdgePadding } from './useScreenEdgePadding';

export const SESSION_BUTTON_GAP = 12;
export const SESSION_CARD_GAP = 48;

export function useStudyScreenLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const { isDesktop, top, bottom } = useScreenEdgePadding();
  const isTablet = useIsTablet();
  const paddingHorizontal = isDesktop
    ? layout.desktopScreenPaddingX
    : isTablet
      ? layout.tabletScreenPaddingX
      : layout.screenPaddingX;
  const headerHeight = 48 * fontScale;
  const buttonsHeight = (4 * 60 + 3 * SESSION_BUTTON_GAP) * fontScale;
  const cardWidth = Math.min(
    layout.compactContentWidth,
    Math.max(0, width - 2 * paddingHorizontal),
  );
  // Both screens use the session's four-button frame to anchor the card.
  const frameHeight = Math.max(
    layout.sessionContentMinHeight,
    cardWidth / layout.cardStackAspectRatio + SESSION_CARD_GAP + buttonsHeight,
  );
  const centeredTop = (height + top - bottom - frameHeight) / 2;
  const cardTop = Math.max(centeredTop, top + headerHeight + 24);

  return {
    isDesktop, isTablet, top, bottom, fontScale,
    paddingHorizontal, headerHeight, buttonsHeight, cardTop,
  };
}
