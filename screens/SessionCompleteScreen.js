import { useScreenEdgePadding } from '../hooks/useScreenEdgePadding';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

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
  const { isDesktop, top: paddingTop, bottom: homeBottom } = useScreenEdgePadding();
  const isTablet = useIsTablet();
  const fontScale = useFontScale();
  const { height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(259);
  const homeButtonHeight = HOME_BUTTON_HEIGHT * fontScale;

  // Fill under Home must cover the full bottom safe zone.
  const paddingHorizontal = isDesktop
    ? layout.desktopScreenPaddingX
    : isTablet
      ? layout.tabletScreenPaddingX
      : layout.screenPaddingX;
  const baseBottom = homeBottom;
  const clearance = homeButtonHeight + homeBottom + 24;
  const centeredBottom = (height + paddingTop - baseBottom + contentHeight) / 2;
  const paddingBottom =
    centeredBottom > height - clearance ? clearance : baseBottom;

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop,
            paddingHorizontal,
            // Clears the absolutely positioned Home button.
            paddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={styles.content}
          onLayout={(event) =>
            setContentHeight(event.nativeEvent.layout.height)
          }
        >
          <View
            style={styles.iconContainer}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <CheckIcon size={48} color={colors.primary} />
          </View>
          <View style={styles.summary}>
            <AccessibleText style={styles.title} accessibilityRole="header">
              Session complete!
            </AccessibleText>
            <View style={styles.metrics}>
              <MetricCard value={String(newWords)} label="New Words" />
              <MetricCard
                value={String(wordsReviewed)}
                label="Words Reviewed"
              />
            </View>
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
    gap: 32,
    maxWidth: layout.compactContentWidth,
    width: '100%',
  },
  summary: { gap: 12, alignItems: 'center', width: '100%' },
  footer: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  footerButton: {
    maxWidth: layout.compactContentWidth,
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
    textAlign: 'center',
  },
  metrics: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
