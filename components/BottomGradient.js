import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

// Figma "Bottom Gradient": fade across the bottom control, then a
// semi-transparent surface fill down to the screen edge.
// - `height` = control height (gradient spans top → bottom of the control)
// - `bottom` = control's bottom offset (fill spans below the control)
// Matches Gray 100 (#F0EFF6) at 75% opacity from the design.
const SURFACE_FADE = 'rgba(240, 239, 246, 0.75)';

export default function BottomGradient({ bottom = 0, height }) {
  if (height == null || height <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.container, { height: bottom + height }]}>
      <LinearGradient
        colors={['rgba(240, 239, 246, 0)', SURFACE_FADE]}
        locations={[0, 1]}
        style={{ height }}
      />
      <View style={[styles.fill, { height: bottom }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  fill: {
    backgroundColor: SURFACE_FADE,
    width: '100%',
  },
});
