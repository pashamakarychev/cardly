import { Pressable, StyleSheet, Text } from 'react-native';

import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

export default function Chip({
  label,
  selected = false,
  disabled = false,
  onPress,
}) {
  const fontScale = useFontScale();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        {
          paddingHorizontal: 16 * fontScale,
          paddingVertical: 12 * fontScale,
        },
        disabled && styles.chipDisabled,
        selected && !disabled && styles.chipSelected,
      ]}
    >
      <Text
        style={[
          styles.label,
          disabled && styles.labelDisabled,
          selected && !disabled && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.background,
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipDisabled: {
    backgroundColor: colors.surfaceSubtle,
  },
  label: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
});
