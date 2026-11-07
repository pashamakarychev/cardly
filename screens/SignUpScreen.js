import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { colors, typography } from '../theme';

export default function SignUpScreen({
  onSignUp,
  onLogInPress,
  onPrivacyPress,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
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
      await onSignUp?.(email, password);
    } catch (authError) {
      setEmailError(authError?.message ?? 'Could not create an account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <Text style={styles.acknowledgment}>
          {'By signing up, you acknowledge our '}
          <Text
            accessibilityRole="link"
            href={Platform.OS === 'web' ? '/privacy' : undefined}
            onPress={(event) => {
              if (Platform.OS === 'web') {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
              }
              onPrivacyPress();
            }}
            style={styles.privacyLink}
          >
            Privacy Policy
          </Text>
        </Text>
      }
    >
      <AccessibleText style={styles.title} accessibilityRole="header">
        Create an account
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
        <Button
          title="Sign up"
          size="medium"
          loading={submitting}
          onPress={handleSignUp}
        />
      </View>
      <View style={styles.loginRow}>
        <Text style={styles.body}>Already have an account? </Text>
        <Pressable
          onPress={onLogInPress}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <Text style={[styles.body, styles.login]}>Log in</Text>
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
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  login: {
    color: colors.primary,
  },
  acknowledgment: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  privacyLink: {
    textDecorationLine: 'underline',
  },
});
