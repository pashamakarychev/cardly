import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import MetricCard from '../components/MetricCard';
import { CheckIcon } from '../components/icons/CheckIcon';
import { colors, typography } from '../theme';

export default function SessionCompleteScreen({
  newWords = 10,
  wordsReviewed = 0,
  onHome,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 19, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckIcon size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Session complete!</Text>
        <View style={styles.metrics}>
          <MetricCard value={String(newWords)} label="New Words" />
          <MetricCard value={String(wordsReviewed)} label="Words Reviewed" />
        </View>
      </View>
      <Button title="Home" onPress={onHome} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    gap: 24,
    paddingHorizontal: 16,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 24,
    justifyContent: 'center',
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
