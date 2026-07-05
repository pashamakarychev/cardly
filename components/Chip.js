import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '../theme';

export default function Chip({ label, selected = false, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
});
