import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccessibleText from '../components/AccessibleText';
import BottomGradient from '../components/BottomGradient';
import Button from '../components/Button';
import MetricCard from '../components/MetricCard';
import { CheckIcon } from '../components/icons/CheckIcon';
import { useFontScale } from '../hooks/useFontScale';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

const HOME_BUTTON_HEIGHT = 60;

export default function SessionCompleteScreen({
  newWords = 10,
  wordsReviewed = 0,
  onHome,
}) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const fontScale = useFontScale();
  const homeButtonHeight = HOME_BUTTON_HEIGHT * fontScale;

  // Fill under Home must cover the full bottom safe zone.
  const homeBottom = isTablet
    ? Math.max(insets.bottom, layout.tabletScreenPadding)
    : Math.max(insets.bottom, layout.screenPaddingBottom);
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;
  const paddingTop = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop,
            paddingHorizontal,
            // Clears the absolutely positioned Home button.
            paddingBottom: homeButtonHeight + homeBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View
            style={styles.iconContainer}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <CheckIcon size={48} color={colors.primary} />
          </View>
          <AccessibleText style={styles.title} accessibilityRole="header">
            Session complete!
          </AccessibleText>
          <View style={styles.metrics}>
            <MetricCard value={String(newWords)} label="New Words" />
            <MetricCard value={String(wordsReviewed)} label="Words Reviewed" />
          </View>
        </View>
      </ScrollView>
      <BottomGradient bottom={homeBottom} />
      <View style={[styles.footer, { bottom: homeBottom, paddingHorizontal }]}>
        <Button title="Home" onPress={onHome} style={styles.footerButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  footerButton: {
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  iconContainer: {
    backgroundColor: colors.background,
    borderRadius: 999,
    padding: 16,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
