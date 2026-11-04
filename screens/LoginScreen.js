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
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { useIsTablet } from '../hooks/useIsTablet';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { colors, layout, typography } from '../theme';

const PHONE_SPACER_HEIGHT = 137;
const LOGIN_CONTENT_WIDTH = 375;
const APP_ICON_SIZE = 64;

export default function LoginScreen({ onLogIn, onSignUpPress, onForgotPasswordPress }) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
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
                  disabled={submitting}
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
    maxWidth: LOGIN_CONTENT_WIDTH,
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
