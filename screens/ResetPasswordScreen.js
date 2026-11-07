import { useState } from 'react';
import { StyleSheet } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { colors, typography } from '../theme';

export default function ResetPasswordScreen({ onSendResetLink }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSendResetLink = async () => {
    if (submitting) {
      return;
    }
    if (email.trim() === '') {
      setError('Enter your email address.');
      setSent(false);
      return;
    }
    setError(null);
    setSent(false);
    setSubmitting(true);
    try {
      await onSendResetLink?.(email);
      setSent(true);
    } catch (authError) {
      setError(authError?.message ?? 'Could not send a reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AccessibleText style={styles.title} accessibilityRole="header">
        Reset password
      </AccessibleText>
      <AccessibleText style={styles.description}>
        {
          "Enter your email address and we'll send you a link to reset your password."
        }
      </AccessibleText>
      <TextField
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(null);
          setSent(false);
        }}
        placeholder="Email"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        error={error}
        helperText={
          sent
            ? 'If an account exists for that email, we sent a reset link.'
            : undefined
        }
      />
      <Button
        title="Send reset link"
        size="medium"
        loading={submitting}
        onPress={handleSendResetLink}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
  },
});
