import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '../theme';

// status ('correct' | 'incorrect') shows answer feedback on secondary buttons
export default function Button({ title, onPress, variant = 'primary', status, style }) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        pressed && (secondary ? styles.secondaryPressed : styles.primaryPressed),
        status === 'correct' && styles.correct,
        status === 'incorrect' && styles.incorrect,
        style,
      ]}
    >
      <Text style={[styles.title, secondary && styles.titleSecondary]}>
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
});
