import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

// Figma "Top Gradient": fade from semi-transparent surface at the top of the
// screen down to transparent. Height should match the content top inset
// (safe area + spacing) so the fade covers the status-bar region.
const SURFACE_FADE = 'rgba(240, 239, 246, 0.75)';

export default function TopGradient({ height }) {
  if (height == null || height <= 0) {
    return null;
  }

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[SURFACE_FADE, 'rgba(240, 239, 246, 0)']}
      locations={[0, 1]}
      style={[styles.gradient, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
