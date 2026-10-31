import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

const PHONE_SPACER_HEIGHT = 137;
const NEW_PASSWORD_CONTENT_WIDTH = 375;

export default function NewPasswordScreen({ onResetPassword }) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (submitting) {
      return;
    }
    if (password === '' || confirmPassword === '') {
      setError('Enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onResetPassword?.(password);
    } catch (authError) {
      setError(authError?.message ?? 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const paddingTop = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;
  const paddingBottom = Math.max(insets.bottom, layout.screenPaddingBottom);
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.scrollContentTablet,
            {
              paddingTop,
              paddingBottom,
              paddingHorizontal,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, !isTablet && styles.contentPhone]}>
            {!isTablet && <View style={styles.spacer} />}
            <View style={styles.form}>
              <AccessibleText style={styles.title} accessibilityRole="header">
                Create a new password
              </AccessibleText>
              <TextField
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                secureTextEntry={!passwordVisible}
                autoComplete="new-password"
                textContentType="newPassword"
                rightIcon={<EyeOffIcon />}
                onRightIconPress={() => {
                  setPasswordVisible((visible) => !visible);
                }}
                rightIconAccessibilityLabel={
                  passwordVisible ? 'Hide password' : 'Show password'
                }
              />
              <TextField
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                secureTextEntry={!confirmVisible}
                autoComplete="new-password"
                textContentType="newPassword"
                rightIcon={<EyeOffIcon />}
                onRightIconPress={() => {
                  setConfirmVisible((visible) => !visible);
                }}
                rightIconAccessibilityLabel={
                  confirmVisible
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
              />
              <Button
                title="Reset password"
                size="medium"
                disabled={submitting}
                onPress={handleResetPassword}
              />
              {error != null ? (
                <AccessibleText style={styles.error}>{error}</AccessibleText>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  scrollContentTablet: {
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    maxWidth: NEW_PASSWORD_CONTENT_WIDTH,
    width: '100%',
  },
  contentPhone: {
    flexGrow: 1,
  },
  spacer: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: PHONE_SPACER_HEIGHT,
    minHeight: 0,
    width: '100%',
  },
  form: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  error: {
    ...typography.body,
    color: colors.errorStrong,
    textAlign: 'center',
    width: '100%',
  },
});
