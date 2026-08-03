import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { useDelayedPressed } from './useDelayedPressed';
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
  const iconColor =
    status === 'correct' ? colors.successStrong : colors.errorStrong;
  const { showPressed, onPressIn, onPressOut } = useDelayedPressed({
    disabled: disabled || showFeedback,
  });

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && (secondary ? styles.secondaryDisabled : styles.primaryDisabled),
        !disabled &&
          showPressed &&
          (secondary ? styles.secondaryPressed : styles.primaryPressed),
        showFeedback && status === 'correct' && styles.correct,
        showFeedback && status === 'incorrect' && styles.incorrect,
        style,
      ]}
    >
      <View style={styles.content}>
        {showFeedback ? (
          status === 'correct' ? (
            <CheckIcon size={24} color={iconColor} />
          ) : (
            <XIcon size={24} color={iconColor} />
          )
        ) : null}
        <Text
          style={[
            styles.title,
            secondary && styles.titleSecondary,
            disabled && secondary && styles.titleSecondaryDisabled,
          ]}
        >
          {title}
        </Text>
        {showFeedback ? <View style={styles.iconSpacer} /> : null}
      </View>
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
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  iconSpacer: {
    height: 24,
    width: 24,
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
