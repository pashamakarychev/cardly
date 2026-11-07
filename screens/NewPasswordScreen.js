import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { colors, typography } from '../theme';

export default function NewPasswordScreen({
  onResetPassword,
  requireCurrentPassword = false,
  onForgotPasswordPress,
}) {
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
    const nextCurrentError =
      requireCurrentPassword && currentPassword === ''
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
      await onResetPassword?.(
        password,
        requireCurrentPassword ? currentPassword : undefined,
      );
    } catch (authError) {
      if (
        requireCurrentPassword &&
        ['invalid_credentials', 'invalid_current_password'].includes(
          authError?.code,
        )
      ) {
        setCurrentError('Current password is incorrect.');
      } else {
        setPasswordError(authError?.message ?? 'Could not reset password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout phoneTopAligned={requireCurrentPassword}>
      <AccessibleText
        style={[
          styles.title,
          isDesktop && !requireCurrentPassword && typography.h2,
        ]}
        accessibilityRole="header"
      >
        Create a new password
      </AccessibleText>
      {requireCurrentPassword && (
        <TextField
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            if (!value) setCurrentVisible(false);
            setCurrentError(null);
          }}
          placeholder="Current password"
          secureTextEntry={!currentVisible}
          autoComplete="current-password"
          textContentType="password"
          rightIcon={currentVisible ? <EyeIcon /> : <EyeOffIcon />}
          onRightIconPress={() => setCurrentVisible((visible) => !visible)}
          rightIconAccessibilityLabel={
            currentVisible ? 'Hide current password' : 'Show current password'
          }
          error={currentError}
        />
      )}
      <TextField
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (!value) setPasswordVisible(false);
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
          if (!value) setConfirmVisible(false);
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
          confirmVisible ? 'Hide confirm password' : 'Show confirm password'
        }
        error={confirmError}
      />
      <Button
        title="Reset password"
        size="medium"
        loading={submitting}
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
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  link: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
