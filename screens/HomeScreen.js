import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import Dialog from '../components/Dialog';
import MetricRow from '../components/MetricRow';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

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
  const dialog = levelCompletedCopy(levelCompleted, currentLevel);

  // Nav sits 50px from the bottom on tablet (Figma) and insets+16 on phone;
  // keep content clear of the 64px bar.
  const navBottom = isTablet
    ? Math.max(insets.bottom, layout.screenPaddingBottom)
    : insets.bottom + 16;

  const screenPadding = isTablet
    ? {
        paddingTop: Math.max(insets.top, layout.tabletScreenPadding),
        paddingBottom: navBottom + 64,
        paddingHorizontal: layout.tabletScreenPadding,
      }
    : {
        paddingTop: insets.top + layout.contentTopPadding,
        // navBottom is insets+16; +64 clears the bar → insets+80 total.
        paddingBottom: navBottom + 64,
        paddingHorizontal: layout.screenPaddingX,
      };

  return (
    <View style={[styles.screen, screenPadding]}>
      <View
        style={[
          styles.content,
          isTablet ? styles.contentTablet : styles.contentPhone,
        ]}
      >
        <Text style={styles.title}>Study Session</Text>
        <View style={styles.metricsContainer}>
          <MetricRow label="New Words" value={String(newWords)} />
          <MetricRow label="Words to Review" value={String(wordsToReview)} />
        </View>
        <Button title="Start" onPress={onStart} disabled={!canStart} />
      </View>
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 24,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  contentPhone: {
    paddingTop: 137,
  },
  contentTablet: {
    justifyContent: 'center',
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
