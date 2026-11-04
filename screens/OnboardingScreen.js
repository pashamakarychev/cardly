import { useSQLiteContext } from '../db/SQLiteProvider';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AccessibleText from '../components/AccessibleText';
import BottomGradient from '../components/BottomGradient';
import Button from '../components/Button';
import ChipSection from '../components/ChipSection';
import TopGradient from '../components/TopGradient';
import { LEARN_LANGUAGES, LEVELS, SPEAK_LANGUAGES, WORDS_PER_DAY } from '../constants/preferences';
import { completeOnboarding } from '../db/repository';
import { useFontScale } from '../hooks/useFontScale';
import { useIsTablet } from '../hooks/useIsTablet';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { colors, layout, typography } from '../theme';

// Continue button geometry (matches Button + footer placement).
const CONTINUE_HEIGHT = 60;
const HEADER_HEIGHT = 48;
const HEADER_CONTENT_GAP = 24;

export default function OnboardingScreen({ onContinue }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const { height: windowHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const fontScale = useFontScale();
  const headerHeight = HEADER_HEIGHT * fontScale;
  const continueHeight = CONTINUE_HEIGHT * fontScale;
  const [speaks, setSpeaks] = useState(null);
  const [learning, setLearning] = useState(null);
  const [level, setLevel] = useState(null);
  const [wordsPerDay, setWordsPerDay] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSpeaksSelect = (value) => {
    setSpeaks(value);
    if (value === learning) {
      setLearning(null);
    }
  };

  const handleLearningSelect = (value) => {
    setLearning(value);
    if (value === speaks) {
      setSpeaks(null);
    }
  };

  const isComplete =
    speaks != null &&
    learning != null &&
    level != null &&
    wordsPerDay != null;

  const handleContinue = async () => {
    if (!isComplete || saving) {
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding(db, {
        nativeLanguage: speaks,
        learningLanguage: learning,
        level,
        newWordsPerDay: Number(wordsPerDay),
      });
      onContinue?.({ speaks, learning, level, wordsPerDay });
    } finally {
      setSaving(false);
    }
  };

  // Content inset below the status bar (header sits here on phone).
  const topInset = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;
  // Fill under Continue must cover the full bottom safe zone.
  const continueBottom = isTablet
    ? Math.max(insets.bottom, layout.tabletScreenPadding)
    : Math.max(insets.bottom, layout.screenPaddingBottom);
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;

  // Phone: clears the fixed title. Tablet: title lives in the centered column.
  const scrollPaddingTop = isTablet
    ? topInset
    : topInset + headerHeight + HEADER_CONTENT_GAP;
  const canCenterDesktopContent = isDesktop && contentHeight > 0 &&
    windowHeight >= contentHeight + 2 * (continueHeight + continueBottom + layout.contentToOverlayGap);

  return (
    <View style={styles.screen}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
          {
            paddingTop: scrollPaddingTop,
            paddingHorizontal,
            // Clears the pinned Continue button with Figma’s 64px gap.
            paddingBottom: canCenterDesktopContent ? topInset
              : continueHeight + continueBottom + layout.contentToOverlayGap,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.container,
            isTablet ? styles.containerTablet : null,
            isDesktop && styles.containerDesktop,
          ]}
          onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
        >
          {isTablet && (
            <AccessibleText style={styles.title} accessibilityRole="header">
              Let's get started
            </AccessibleText>
          )}
          <ChipSection
            label="I speak"
            options={SPEAK_LANGUAGES}
            selected={speaks}
            onSelect={handleSpeaksSelect}
            disabledOptions={learning ? [learning] : []}
          />
          <ChipSection
            label="I want to learn"
            options={LEARN_LANGUAGES}
            selected={learning}
            onSelect={handleLearningSelect}
            disabledOptions={speaks ? [speaks] : []}
          />
          <ChipSection
            label="My level"
            gap={24}
            options={LEVELS}
            selected={level}
            onSelect={setLevel}
          />
          <ChipSection
            label="New words per day"
            gap={24}
            options={WORDS_PER_DAY}
            selected={wordsPerDay}
            onSelect={setWordsPerDay}
          />
        </View>
      </ScrollView>

      {/* Phone only — tablet Onboarding has no top gradient in Figma. */}
      {!isTablet && (
        <>
          <TopGradient fillHeight={insets.top} />
          <View
            pointerEvents="box-none"
            style={[
              styles.header,
              { top: topInset, height: headerHeight, paddingHorizontal },
            ]}
          >
            <AccessibleText style={styles.title} accessibilityRole="header">
              Let's get started
            </AccessibleText>
          </View>
        </>
      )}

      <BottomGradient bottom={isDesktop ? Math.max(insets.bottom, layout.screenPaddingBottom) : continueBottom} />
      <View style={[styles.footer, { bottom: continueBottom, paddingHorizontal }]}>
        <Button
          title="Continue"
          disabled={!isComplete || saving}
          onPress={handleContinue}
          style={styles.footerButton}
        />
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
  },
  container: {
    gap: 24,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  // Tablet: title + chips vertically centered; Continue stays pinned below.
  containerTablet: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollContentDesktop: { justifyContent: 'center' },
  containerDesktop: { flexGrow: 0 },
  header: {
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
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
});
