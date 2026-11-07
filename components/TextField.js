import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import AccessibleText from './AccessibleText';
import { useFontScale } from '../hooks/useFontScale';
import { colors, typography } from '../theme';

const FIELD_HEIGHT = 52;

export default function TextField({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  disabled = false,
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
  const [focused, setFocused] = useState(false);
  const hasError = error != null && error !== '';
  const helper = hasError ? error : helperText;
  const isPassword =
    secureTextEntry ||
    ['password', 'newPassword'].includes(textContentType) ||
    ['password', 'current-password', 'new-password'].includes(autoComplete);
  const showRightIcon =
    rightIcon != null && (!isPassword || (value?.length ?? 0) > 0);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.field,
          focused && !disabled && styles.fieldFocused,
          hasError && styles.fieldError,
          disabled && styles.fieldDisabled,
          { height: FIELD_HEIGHT * fontScale },
        ]}
      >
        <TextInput
          value={value}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
          accessibilityState={{ invalid: hasError, disabled }}
          accessibilityHint={hasError ? error : undefined}
          style={[
            styles.input,
            Platform.OS === 'web' && styles.webInput,
            hasError && styles.inputError,
            disabled && styles.inputDisabled,
          ]}
        />
        {showRightIcon ? (
          onRightIconPress != null ? (
            <Pressable
              onPress={onRightIconPress}
              disabled={disabled}
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
        <AccessibleText style={hasError ? styles.helperError : styles.helper}>
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
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: 30,
    gap: 8,
    width: '100%',
  },
  fieldError: {
    backgroundColor: colors.error,
    borderColor: 'transparent',
  },
  fieldFocused: { borderColor: colors.primary },
  fieldDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: 'transparent',
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
    includeFontPadding: false,
    paddingVertical: 0,
  },
  webInput: { outlineStyle: 'none' },
  inputDisabled: { color: colors.textSecondary },
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
