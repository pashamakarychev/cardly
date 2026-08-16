import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomGradient from '../components/BottomGradient';
import { NAV_HEIGHT } from '../components/BottomNavigation';
import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import MetricRow from '../components/MetricRow';
import { useFontScale } from '../hooks/useFontScale';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

// Figma phone Home Content → Spacer.
const PHONE_SPACER_HEIGHT = 137;

function levelCompletedCopy(levelCompleted, currentLevel) {
  if (levelCompleted == null) {
    return null;
  }

  if (levelCompleted.changed) {
    const from = levelCompleted.from ?? currentLevel ?? '';
    const to = levelCompleted.to ?? '';
    return {
      title: `You've learned all ${from} words!`,
      description: `You'll now start learning ${to} words. Your ${from} words will continue to appear for review.`,
    };
  }

  const level = currentLevel ?? levelCompleted.from ?? '';
  return {
    title: `You've learned all ${level} words!`,
    description: `New words will no longer be introduced. Your ${level} words will continue to appear for review.`,
  };
}

export default function HomeScreen({
  newWords = 0,
  wordsToReview = 0,
  canStart = false,
  currentLevel,
  levelCompleted,
  onLevelCompletedConfirm,
  onStart,
}) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const fontScale = useFontScale();
  const dialog = levelCompletedCopy(levelCompleted, currentLevel);
  const navHeight = NAV_HEIGHT * fontScale;

  // Nav sits 50px from the bottom on tablet (Figma) and insets+16 on phone;
  // keep content clear of the scaled nav bar. Fill under the nav covers the safe zone.
  const navBottom = isTablet
    ? Math.max(insets.bottom, layout.screenPaddingBottom)
    : insets.bottom + 16;

  const paddingTop = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;
  const paddingBottom = navBottom + navHeight;
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
          {
            paddingTop,
            paddingBottom,
            paddingHorizontal,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, !isTablet && styles.contentPhone]}>
          {!isTablet && <View style={styles.spacer} />}
          <AccessibleText style={styles.title} accessibilityRole="header">
            Study Session
          </AccessibleText>
          <View style={styles.metricsContainer}>
            <MetricRow label="New Words" value={String(newWords)} />
            <MetricRow label="Words to Review" value={String(wordsToReview)} />
          </View>
          <Button
            title="Start"
            onPress={onStart}
            disabled={!canStart}
          />
        </View>
      </ScrollView>
      <BottomGradient bottom={navBottom} />
      <Dialog
        visible={dialog != null}
        title={dialog?.title ?? ''}
        description={dialog?.description ?? ''}
        onConfirm={onLevelCompletedConfirm}
      />
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
  },
  scrollContentTablet: {
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  // Fills the scroll viewport so the spacer can grow/shrink before scrolling.
  contentPhone: {
    flexGrow: 1,
  },
  spacer: {
    // Prefer Figma’s 137px; shrink first when the column can’t fit.
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: PHONE_SPACER_HEIGHT,
    minHeight: 0,
    width: '100%',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  metricsContainer: {
    backgroundColor: colors.background,
    borderRadius: 32,
    width: '100%',
  },
});
