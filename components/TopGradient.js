import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { layout } from '../theme';

// Figma "Top Gradient": semi-transparent fill over the status / safe-area
// band, then a fade so scrolled content softens underneath the header.
// Matches Gray 100 (#F0EFF6) at 75% opacity from the design.
const SURFACE_FADE = 'rgba(240, 239, 246, 0.75)';

/**
 * @param {number} fillHeight Safe-area top inset — semi-transparent fill covers it.
 * @param {number} [fadeHeight] Gradient below the fill (Figma header fade = 48).
 */
export default function TopGradient({
  fillHeight = 0,
  fadeHeight = layout.topGradientFade,
}) {
  if (fillHeight <= 0 && fadeHeight <= 0) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { height: fillHeight + fadeHeight }]}
    >
      {fillHeight > 0 ? (
        <View style={[styles.fill, { height: fillHeight }]} />
      ) : null}
      {fadeHeight > 0 ? (
        <LinearGradient
          colors={[SURFACE_FADE, 'rgba(240, 239, 246, 0)']}
          locations={[0, 1]}
          style={{ height: fadeHeight }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fill: {
    backgroundColor: SURFACE_FADE,
    width: '100%',
  },
});
