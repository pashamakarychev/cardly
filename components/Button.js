import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '../theme';

// status ('correct' | 'incorrect') shows answer feedback on secondary buttons
export default function Button({
  title,
  onPress,
  variant = 'primary',
  status,
  disabled = false,
  style,
}) {
  const secondary = variant === 'secondary';
  const showFeedback = status === 'correct' || status === 'incorrect';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && (secondary ? styles.secondaryDisabled : styles.primaryDisabled),
        !disabled &&
          pressed &&
          (secondary ? styles.secondaryPressed : styles.primaryPressed),
        showFeedback && status === 'correct' && styles.correct,
        showFeedback && status === 'incorrect' && styles.incorrect,
        style,
      ]}
    >
      <Text
        style={[
          styles.title,
          secondary && styles.titleSecondary,
          disabled && secondary && styles.titleSecondaryDisabled,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: '100%',
  },
  buttonSecondary: {
    backgroundColor: colors.background,
  },
  primaryDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  secondaryDisabled: {
    backgroundColor: colors.surfaceSubtle,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondaryPressed: {
    backgroundColor: colors.surface,
  },
  correct: {
    backgroundColor: colors.success,
  },
  incorrect: {
    backgroundColor: colors.error,
  },
  title: {
    ...typography.button,
    color: colors.textInverse,
  },
  titleSecondary: {
    color: colors.textPrimary,
  },
  titleSecondaryDisabled: {
    color: colors.textSecondary,
  },
});
