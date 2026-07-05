import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

export default function MetricCard({ value, label }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
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
    height: 96,
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
