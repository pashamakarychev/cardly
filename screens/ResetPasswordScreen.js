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
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

const PHONE_SPACER_HEIGHT = 137;
const RESET_CONTENT_WIDTH = 375;

export default function ResetPasswordScreen({ onSendResetLink }) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
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
                Reset password
              </AccessibleText>
              <AccessibleText style={styles.description}>
                {"Enter your email address and we'll send you a link to reset your password."}
              </AccessibleText>
              <TextField
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Button
                title="Send reset link"
                size="medium"
                disabled={submitting}
                onPress={handleSendResetLink}
              />
              {error != null ? (
                <AccessibleText style={styles.error}>{error}</AccessibleText>
              ) : null}
              {sent ? (
                <AccessibleText style={styles.success}>
                  If an account exists for that email, we sent a reset link.
                </AccessibleText>
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
    maxWidth: RESET_CONTENT_WIDTH,
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
  description: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
  },
  error: {
    ...typography.body,
    color: colors.errorStrong,
    textAlign: 'center',
    width: '100%',
  },
  success: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
  },
});
