import { ScrollView, StyleSheet, View } from 'react-native';

import BottomGradient from '../components/BottomGradient';
import { NAV_HEIGHT } from '../components/BottomNavigation';
import AccessibleText from '../components/AccessibleText';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import CardStack from '../components/CardStack';
import IconButton from '../components/IconButton';
import { SettingsIcon } from '../components/icons/SettingsIcon';
import { useStudyScreenLayout } from '../hooks/useStudyScreenLayout';
import { useWordsAvailabilityLabel } from '../hooks/useWordsAvailabilityLabel';
import { colors, layout, typography } from '../theme';

// The desktop gradient has its own height in Figma and doesn't position content.
const DESKTOP_GRADIENT_FILL_HEIGHT = 50;

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
  canContinue = false,
  nextReviewAt = null,
  hasNewWordsAtMidnight = false,
  currentLevel,
  levelCompleted,
  onLevelCompletedConfirm,
  onStart,
  onSettings,
}) {
  const {
    isDesktop, isTablet, top, bottom: navBottom, fontScale, paddingHorizontal, cardTop,
  } = useStudyScreenLayout();
  const dialog = levelCompletedCopy(levelCompleted, currentLevel);
  const availabilityLabel = useWordsAvailabilityLabel({
    canStart,
    nextReviewAt,
    hasNewWordsAtMidnight,
  });
  const navHeight = NAV_HEIGHT * fontScale;

  const paddingBottom = isDesktop ? navBottom : navBottom + navHeight + 24;

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: cardTop,
            paddingBottom,
            paddingHorizontal,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentFrame}>
          <View style={[styles.content, !isTablet && styles.contentPhone]}>
            <CardStack word="Hola" nextWord="Adiós" />
            <View style={styles.studySession}>
              <AccessibleText style={styles.title} accessibilityRole="header">
                Study Session
              </AccessibleText>
              <View style={styles.availability}>
                {availabilityLabel != null ? (
                  <AccessibleText style={styles.availabilityLabel}>
                    {availabilityLabel}
                  </AccessibleText>
                ) : (
                  <>
                    <AccessibleText
                      style={styles.availabilityLabel}
                    >{`${newWords} New words`}</AccessibleText>
                    <AccessibleText
                      style={styles.availabilityLabel}
                    >{`${wordsToReview} Words to review`}</AccessibleText>
                  </>
                )}
              </View>
            </View>
            <Button
              title={canContinue ? 'Continue' : 'Start'}
              onPress={onStart}
              disabled={!canStart}
            />
          </View>
        </View>
      </ScrollView>
      <BottomGradient
        bottom={isDesktop ? DESKTOP_GRADIENT_FILL_HEIGHT : navBottom}
        height={isDesktop ? undefined : navHeight}
      />
      {isDesktop && (
        <View style={[styles.settingsButton, { top }]}>
          <IconButton
            icon={<SettingsIcon size={24} />}
            variant="ghost"
            size="large"
            shadow={false}
            accessibilityLabel="Settings"
            onPress={onSettings}
          />
        </View>
      )}
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
  screen: { backgroundColor: colors.surface, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  contentFrame: {
    maxWidth: layout.compactContentWidth,
    width: '100%',
  },
  content: { alignItems: 'center', gap: 24, width: '100%' },
  contentPhone: { gap: 32 },
  studySession: { alignItems: 'center', gap: 16, width: '100%' },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
  availability: { alignItems: 'center', gap: 12, width: '100%' },
  availabilityLabel: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  settingsButton: { position: 'absolute', right: layout.desktopScreenPaddingX },
});
