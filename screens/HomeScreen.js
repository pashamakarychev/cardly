import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNavigation from '../components/BottomNavigation';
import Button from '../components/Button';
import MetricRow from '../components/MetricRow';
import { colors, typography } from '../theme';

export default function HomeScreen({
  newWords = 0,
  wordsToReview = 0,
  onStart,
  onTabPress,
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
        <Text style={styles.title}>Study Session</Text>
        <View style={styles.metricsContainer}>
          <MetricRow label="New Words" value={String(newWords)} />
          <MetricRow label="Words to Review" value={String(wordsToReview)} />
        </View>
        <Button title="Start" onPress={onStart} />
      </View>
      <BottomNavigation activeTab="home" onTabPress={onTabPress} />
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
