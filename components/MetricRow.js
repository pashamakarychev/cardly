import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

export default function MetricRow({ label, value }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={styles.label} importantForAccessibility="no">
        {label}
      </Text>
      <Text style={styles.value} importantForAccessibility="no">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    width: '100%',
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});
