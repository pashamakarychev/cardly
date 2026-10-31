import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
const SIGN_UP_CONTENT_WIDTH = 375;
const APP_ICON_SIZE = 64;

export default function SignUpScreen({ onSignUp, onLogInPress }) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (submitting) {
      return;
    }
    if (email.trim() === '' || password === '') {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSignUp?.(email, password);
    } catch (authError) {
      setError(authError?.message ?? 'Could not create an account.');
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
            <View style={styles.logoWrap}>
              <Image
                source={require('../images/app-icon.png')}
                style={styles.logo}
                accessibilityIgnoresInvertColors
              />
            </View>
            <View style={styles.form}>
              <AccessibleText style={styles.title} accessibilityRole="header">
                Create an account
              </AccessibleText>
              <View style={styles.fields}>
                <TextField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <TextField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry={!passwordVisible}
                  autoComplete="password"
                  textContentType="newPassword"
                  rightIcon={<EyeOffIcon />}
                  onRightIconPress={() => {
                    setPasswordVisible((visible) => !visible);
                  }}
                  rightIconAccessibilityLabel={
                    passwordVisible ? 'Hide password' : 'Show password'
                  }
                />
                <Button
                  title="Sign up"
                  size="medium"
                  disabled={submitting}
                  onPress={handleSignUp}
                />
              </View>
              {error != null ? (
                <AccessibleText style={styles.error}>{error}</AccessibleText>
              ) : null}
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
    maxWidth: SIGN_UP_CONTENT_WIDTH,
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
  logoWrap: {
    borderRadius: 16,
    height: APP_ICON_SIZE,
    overflow: 'hidden',
    width: APP_ICON_SIZE,
  },
  logo: {
    height: APP_ICON_SIZE,
    width: APP_ICON_SIZE,
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
  fields: {
    gap: 12,
    width: '100%',
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  error: {
    ...typography.body,
    color: colors.errorStrong,
    textAlign: 'center',
    width: '100%',
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
});
