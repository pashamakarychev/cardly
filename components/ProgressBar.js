import { StyleSheet, View } from 'react-native';

import { colors, palette } from '../theme';

export default function ProgressBar({ progress = 0, style }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const percent = Math.round(clamped * 100);

  return (
    <View
      style={[styles.track, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${percent}%`}
    >
      <View
        style={[styles.fill, { width: `${clamped * 100}%` }]}
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.gray300,
    borderRadius: 2,
    height: 4,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.textSecondary,
    height: 4,
  },
});
