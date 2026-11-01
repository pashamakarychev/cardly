import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import AccessibleText from './AccessibleText';
import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

const FIELD_HEIGHT = 52;

export default function TextField({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  autoCorrect = false,
  textContentType,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  error,
  helperText,
}) {
  const fontScale = useFontScale();
  const hasError = error != null && error !== '';
  const helper = hasError ? error : helperText;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          hasError && styles.fieldError,
          { height: FIELD_HEIGHT * fontScale },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={
            hasError ? colors.errorStrong : colors.textSecondary
          }
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          textContentType={textContentType}
          accessibilityLabel={placeholder}
          accessibilityState={{ invalid: hasError }}
          accessibilityHint={hasError ? error : undefined}
          style={[styles.input, hasError && styles.inputError]}
        />
        {rightIcon != null ? (
          onRightIconPress != null ? (
            <Pressable
              onPress={onRightIconPress}
              accessibilityRole="button"
              accessibilityLabel={rightIconAccessibilityLabel}
              hitSlop={8}
            >
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                {rightIcon}
              </View>
            </Pressable>
          ) : (
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              {rightIcon}
            </View>
          )
        ) : null}
      </View>
      {helper != null && helper !== '' ? (
        <AccessibleText
          style={hasError ? styles.helperError : styles.helper}
        >
          {helper}
        </AccessibleText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 30,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: 32,
    width: '100%',
  },
  fieldError: {
    backgroundColor: colors.error,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    includeFontPadding: false,
    paddingVertical: 0,
  },
  inputError: {
    color: colors.errorStrong,
  },
  helper: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  helperError: {
    ...typography.caption,
    color: colors.errorStrong,
    textAlign: 'center',
    width: '100%',
  },
});
