import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import Dialog from '../components/Dialog';
import MetricRow from '../components/MetricRow';
import { colors, typography } from '../theme';

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
  const dialog = levelCompletedCopy(levelCompleted, currentLevel);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 19, paddingBottom: insets.bottom + 80 },
      ]}
    >
      <View style={styles.content}>
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
    backgroundColor: colors.surface,
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 24,
    paddingTop: 137,
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
