import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import MetricCard from '../components/MetricCard';
import { CheckIcon } from '../components/icons/CheckIcon';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

export default function SessionCompleteScreen({
  newWords = 10,
  wordsReviewed = 0,
  onHome,
}) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const screenPadding = isTablet
    ? {
        paddingTop: Math.max(insets.top, layout.tabletScreenPadding),
        paddingBottom: Math.max(insets.bottom, layout.tabletScreenPadding),
        paddingHorizontal: layout.tabletScreenPadding,
      }
    : {
        paddingTop: insets.top + layout.contentTopPadding,
        paddingBottom: Math.max(insets.bottom, layout.screenPaddingBottom),
        paddingHorizontal: layout.screenPaddingX,
      };

  return (
    <View style={[styles.screen, screenPadding]}>
      <View style={styles.container}>
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
        {/* Pins Home to the bottom of the max-width column (Figma absolute bottom-0). */}
        <View style={styles.footer}>
          <Button title="Home" onPress={onHome} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
  },
  container: {
    flex: 1,
    gap: 10,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 24,
    justifyContent: 'center',
    width: '100%',
  },
  footer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
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
