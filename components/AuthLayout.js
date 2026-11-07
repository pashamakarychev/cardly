import { useScreenEdgePadding } from '../hooks/useScreenEdgePadding';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout } from '../theme';

// The form stays centered independently of the sign-up acknowledgment.
// Short screens and enlarged text can scroll clear of that pinned footer.
export default function AuthLayout({
  children,
  footer,
  phoneTopAligned = false,
}) {
  const { isDesktop, top, bottom } = useScreenEdgePadding();
  const isTablet = useIsTablet();
  const { height } = useWindowDimensions();
  const [formHeight, setFormHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const footerBottom = bottom;
  const footerClearance = footer ? footerBottom + footerHeight + 24 : bottom;
  const centeredBottom = (height + top - bottom + formHeight) / 2;
  const paddingBottom =
    centeredBottom > height - footerClearance
      ? Math.max(bottom, footerClearance)
      : bottom;
  const paddingHorizontal = isDesktop
    ? layout.desktopScreenPaddingX
    : layout.screenPaddingX;
  const topAligned = phoneTopAligned && !isTablet;
  const phoneSpacer = Math.min(161, Math.max(0, height - top - paddingBottom - formHeight));

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
            {
              paddingTop: topAligned ? top + phoneSpacer : top,
              paddingBottom,
              paddingHorizontal,
            },
            topAligned && styles.topAligned,
          ]}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={styles.form}
            onLayout={(event) => setFormHeight(event.nativeEvent.layout.height)}
          >
            {children}
          </View>
        </ScrollView>
        {footer && (
          <View
            style={[styles.footer, { bottom: footerBottom, paddingHorizontal }]}
            onLayout={(event) =>
              setFooterHeight(event.nativeEvent.layout.height)
            }
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1, minHeight: 0 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAligned: { justifyContent: 'flex-start' },
  form: {
    width: '100%',
    maxWidth: layout.authContentWidth,
    alignItems: 'center',
    gap: 16,
  },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
