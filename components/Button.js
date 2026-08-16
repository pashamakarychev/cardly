import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { useDelayedPressed } from './useDelayedPressed';
import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

const BUTTON_HEIGHT = 60;

function feedbackLabel(status) {
  if (status === 'correct') {
    return 'correct';
  }
  if (status === 'incorrect') {
    return 'incorrect';
  }
  return null;
}

// status ('correct' | 'incorrect') shows answer feedback on secondary buttons
export default function Button({
  title,
  onPress,
  variant = 'primary',
  status,
  disabled = false,
  style,
}) {
  const fontScale = useFontScale();
  const secondary = variant === 'secondary';
  const showFeedback = status === 'correct' || status === 'incorrect';
  const iconColor =
    status === 'correct' ? colors.successStrong : colors.errorStrong;
  const { showPressed, pressProps } = useDelayedPressed({
    disabled: disabled || showFeedback,
  });
  const feedback = feedbackLabel(status);
  const accessibilityLabel = feedback ? `${title}, ${feedback}` : title;

  return (
    <Pressable
      disabled={disabled || showFeedback}
      onPress={onPress}
      {...pressProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: disabled || showFeedback,
      }}
      style={[
        styles.button,
        { height: BUTTON_HEIGHT * fontScale },
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
      <View
        style={styles.content}
        importantForAccessibility="no-hide-descendants"
      >
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
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          accessible={false}
          importantForAccessibility="no"
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
    maxWidth: '100%',
    paddingHorizontal: 16,
  },
  iconSpacer: {
    height: 24,
    width: 24,
  },
  title: {
    ...typography.button,
    color: colors.textInverse,
    flexShrink: 1,
    textAlign: 'center',
  },
  titleSecondary: {
    color: colors.textPrimary,
  },
  titleSecondaryDisabled: {
    color: colors.textSecondary,
  },
});
