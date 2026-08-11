import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomGradient from '../components/BottomGradient';
import Button from '../components/Button';
import ChipSection from '../components/ChipSection';
import TopGradient from '../components/TopGradient';
import { LEARN_LANGUAGES, LEVELS, SPEAK_LANGUAGES, WORDS_PER_DAY } from '../constants/preferences';
import { completeOnboarding } from '../db/settings';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

// Continue button geometry (matches Button + footer placement).
const CONTINUE_HEIGHT = 60;

export default function OnboardingScreen({ onContinue }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
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

  const topInset = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;
  const continueBottom = isTablet
    ? Math.max(insets.bottom, layout.tabletScreenPadding)
    : layout.screenPaddingBottom;
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topInset,
            paddingHorizontal,
            // Clears the absolutely positioned Continue button.
            paddingBottom: CONTINUE_HEIGHT + continueBottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.container,
            isTablet ? styles.containerTablet : null,
          ]}
        >
          <Text style={styles.title}>Let's get started</Text>
          <View style={styles.content}>
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
              options={LEVELS}
              selected={level}
              onSelect={setLevel}
            />
            <ChipSection
              label="New words per day"
              options={WORDS_PER_DAY}
              selected={wordsPerDay}
              onSelect={setWordsPerDay}
            />
          </View>
        </View>
      </ScrollView>
      <TopGradient height={topInset} />
      <BottomGradient bottom={continueBottom} height={CONTINUE_HEIGHT} />
      <View
        style={[
          styles.footer,
          { bottom: continueBottom, paddingHorizontal },
        ]}
      >
        <View style={styles.footerInner}>
          <Button
            title="Continue"
            disabled={!isComplete || saving}
            onPress={handleContinue}
          />
        </View>
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
  containerTablet: {
    // Vertically centers the form when it fits; still scrolls when it doesn't.
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: layout.tabletContentPaddingBottom,
    paddingTop: layout.tabletContentPaddingTop,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
  },
  content: {
    gap: 24,
  },
  footer: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  footerInner: {
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
});
