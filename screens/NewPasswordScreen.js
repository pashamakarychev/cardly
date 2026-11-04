import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { useIsTablet } from '../hooks/useIsTablet';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { colors, layout, typography } from '../theme';

const PHONE_SPACER_HEIGHT = 137;
const NEW_PASSWORD_CONTENT_WIDTH = 375;

export default function NewPasswordScreen({
  onResetPassword,
  requireCurrentPassword = false,
  onForgotPasswordPress,
}) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentVisible, setCurrentVisible] = useState(false);
  const [currentError, setCurrentError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (submitting) {
      return;
    }
    const nextCurrentError = requireCurrentPassword && currentPassword === ''
      ? 'Enter your current password.'
      : null;
    const nextPasswordError =
      password === '' ? 'Enter your new password.' : null;
    const nextConfirmError =
      confirmPassword === ''
        ? 'Confirm your new password.'
        : password !== '' && password !== confirmPassword
          ? 'Passwords do not match.'
          : null;
    setCurrentError(nextCurrentError);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);
    if (nextCurrentError || nextPasswordError || nextConfirmError) {
      return;
    }
    setSubmitting(true);
    try {
      await onResetPassword?.(password, requireCurrentPassword ? currentPassword : undefined);
    } catch (authError) {
      if (requireCurrentPassword && ['invalid_credentials', 'invalid_current_password'].includes(authError?.code)) {
        setCurrentError('Current password is incorrect.');
      } else {
        setPasswordError(authError?.message ?? 'Could not reset password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const paddingTop = isDesktop ? Math.max(insets.top, layout.desktopAuthPaddingTop) : isTablet
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
          bounces={false}
          overScrollMode="never"
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            (isTablet || requireCurrentPassword) && styles.scrollContentCentered,
            {
              paddingTop,
              paddingBottom,
              paddingHorizontal,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, !isTablet && !requireCurrentPassword && styles.contentPhone]}>
            {!isTablet && !requireCurrentPassword && <View style={styles.spacer} />}
            <View style={styles.form}>
              <AccessibleText style={styles.title} accessibilityRole="header">
                Create a new password
              </AccessibleText>
              {requireCurrentPassword && (
                <TextField
                  value={currentPassword}
                  onChangeText={(value) => {
                    setCurrentPassword(value);
                    setCurrentError(null);
                  }}
                  placeholder="Current password"
                  secureTextEntry={!currentVisible}
                  autoComplete="current-password"
                  textContentType="password"
                  rightIcon={currentVisible ? <EyeIcon /> : <EyeOffIcon />}
                  onRightIconPress={() => setCurrentVisible((visible) => !visible)}
                  rightIconAccessibilityLabel={currentVisible ? 'Hide current password' : 'Show current password'}
                  error={currentError}
                />
              )}
              <TextField
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setPasswordError(null);
                }}
                placeholder="New password"
                secureTextEntry={!passwordVisible}
                autoComplete="new-password"
                textContentType="newPassword"
                rightIcon={passwordVisible ? <EyeIcon /> : <EyeOffIcon />}
                onRightIconPress={() => {
                  setPasswordVisible((visible) => !visible);
                }}
                rightIconAccessibilityLabel={
                  passwordVisible ? 'Hide password' : 'Show password'
                }
                error={passwordError}
              />
              <TextField
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setConfirmError(null);
                }}
                placeholder="Confirm password"
                secureTextEntry={!confirmVisible}
                autoComplete="new-password"
                textContentType="newPassword"
                rightIcon={confirmVisible ? <EyeIcon /> : <EyeOffIcon />}
                onRightIconPress={() => {
                  setConfirmVisible((visible) => !visible);
                }}
                rightIconAccessibilityLabel={
                  confirmVisible
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
                error={confirmError}
              />
              <Button
                title="Reset password"
                size="medium"
                disabled={submitting}
                onPress={handleResetPassword}
              />
              {onForgotPasswordPress && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password?"
                  disabled={submitting}
                  onPress={onForgotPasswordPress}
                >
                  <AccessibleText style={styles.link}>Forgot password?</AccessibleText>
                </Pressable>
              )}
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
  scrollContentCentered: {
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
  link: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
