import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { colors, typography } from '../theme';

export default function LoginScreen({
  onLogIn,
  onSignUpPress,
  onForgotPasswordPress,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogIn = async () => {
    if (submitting) {
      return;
    }
    const nextEmailError = email.trim() === '' ? 'Enter your email.' : null;
    const nextPasswordError = password === '' ? 'Enter your password.' : null;
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError != null || nextPasswordError != null) {
      return;
    }
    setSubmitting(true);
    try {
      await onLogIn?.(email, password);
    } catch (authError) {
      setPasswordError(authError?.message ?? 'Could not log in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AccessibleText style={styles.title} accessibilityRole="header">
        Welcome back!
      </AccessibleText>
      <View style={styles.fields}>
        <TextField
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setEmailError(null);
          }}
          placeholder="Email"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          error={emailError}
        />
        <TextField
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (!value) setPasswordVisible(false);
            setPasswordError(null);
          }}
          placeholder="Password"
          secureTextEntry={!passwordVisible}
          autoComplete="password"
          textContentType="password"
          rightIcon={passwordVisible ? <EyeIcon /> : <EyeOffIcon />}
          onRightIconPress={() => {
            setPasswordVisible((visible) => !visible);
          }}
          rightIconAccessibilityLabel={
            passwordVisible ? 'Hide password' : 'Show password'
          }
          error={passwordError}
        />
        <Button
          title="Log in"
          size="medium"
          loading={submitting}
          onPress={handleLogIn}
        />
      </View>
      <Pressable
        onPress={onForgotPasswordPress}
        accessibilityRole="button"
        accessibilityLabel="Forgot password?"
      >
        <Text style={styles.body}>Forgot password?</Text>
      </Pressable>
      <View style={styles.signupRow}>
        <Text style={styles.body}>Don't have an account? </Text>
        <Pressable
          onPress={onSignUpPress}
          accessibilityRole="button"
          accessibilityLabel="Sign up"
        >
          <Text style={[styles.body, styles.signup]}>Sign up</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  fields: {
    gap: 12,
    width: '100%',
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  signupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  signup: {
    color: colors.primary,
  },
});
