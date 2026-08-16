import { StyleSheet, Text, View } from 'react-native';

import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

export default function MetricCard({ value, label }) {
  const fontScale = useFontScale();

  return (
    <View
      style={[styles.card, { minHeight: 96 * fontScale }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}
    >
      <Text style={styles.value} importantForAccessibility="no">
        {value}
      </Text>
      <Text style={styles.label} importantForAccessibility="no">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 32,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 16,
  },
  value: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
