import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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
}) {
  const fontScale = useFontScale();

  return (
    <View
      style={[
        styles.field,
        { height: FIELD_HEIGHT * fontScale },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        textContentType={textContentType}
        accessibilityLabel={placeholder}
        style={styles.input}
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
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 30,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: 32,
    width: '100%',
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    includeFontPadding: false,
    paddingVertical: 0,
  },
});
