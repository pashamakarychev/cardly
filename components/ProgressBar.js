import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

export default function ProgressBar({ progress = 0 }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const percent = Math.round(clamped * 100);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${percent}%`}
    >
      <View
        style={styles.track}
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={[styles.fill, { width: `${clamped * 100}%` }]}
          importantForAccessibility="no"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 26,
    elevation: 2,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  track: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 6,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
  },
});
