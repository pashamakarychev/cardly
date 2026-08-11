import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// Figma "Top Gradient" (mobile): a semi-transparent fill over the status /
// safe-area band, then a 48px fade across the fixed header so scrolled
// content softens underneath.
// Matches Gray 100 (#F0EFF6) at 75% opacity from the design.
const SURFACE_FADE = 'rgba(240, 239, 246, 0.75)';

/**
 * @param {number} [fillHeight] Solid fade fill for the top inset (mobile).
 * @param {number} [fadeHeight=48] Gradient below the fill (header fade zone).
 * @param {number} [height] Legacy single-fade height (tablet / older callers).
 */
export default function TopGradient({
  fillHeight,
  fadeHeight = 48,
  height,
}) {
  // Legacy: one continuous fade over `height` (used on tablet).
  if (fillHeight == null) {
    if (height == null || height <= 0) {
      return null;
    }
    return (
      <LinearGradient
        pointerEvents="none"
        colors={[SURFACE_FADE, 'rgba(240, 239, 246, 0)']}
        locations={[0, 1]}
        style={[styles.overlay, { height }]}
      />
    );
  }

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
