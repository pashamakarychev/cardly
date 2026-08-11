import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomGradient from '../components/BottomGradient';
import ChipSection from '../components/ChipSection';
import Dialog from '../components/Dialog';
import IconButton from '../components/IconButton';
import TopGradient from '../components/TopGradient';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import {
  LEARN_LANGUAGES,
  LEVELS,
  SPEAK_LANGUAGES,
  WORDS_PER_DAY,
} from '../constants/preferences';
import { updateSettings } from '../db/settings';
import { useIsTablet } from '../hooks/useIsTablet';
import { colors, layout, typography } from '../theme';

// Bottom nav geometry (matches BottomNavigation + App nav overlay).
const NAV_BOTTOM_PADDING = 16;
const NAV_HEIGHT = 64;

export default function SettingsScreen({
  preferences,
  onPreferencesChange,
  onBack,
}) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const topInset = isTablet
    ? Math.max(insets.top, layout.tabletScreenPadding)
    : insets.top + layout.contentTopPadding;
  const navBottom = isTablet
    ? Math.max(insets.bottom, layout.screenPaddingBottom)
    : insets.bottom + NAV_BOTTOM_PADDING;
  const paddingHorizontal = isTablet
    ? layout.tabletScreenPadding
    : layout.screenPaddingX;
  const [speaks, setSpeaks] = useState(preferences?.speaks ?? 'English');
  const [learning, setLearning] = useState(preferences?.learning ?? 'Spanish');
  const [level, setLevel] = useState(preferences?.level ?? 'Beginner');
  const [wordsPerDay, setWordsPerDay] = useState(
    preferences?.wordsPerDay ?? '10'
  );
  const [languageDialog, setLanguageDialog] = useState(null);

  const updatePreferences = (patch) => {
    onPreferencesChange?.({ speaks, learning, level, wordsPerDay, ...patch });
  };

  const handleSpeaksSelect = async (value) => {
    setSpeaks(value);
    updatePreferences({ speaks: value });
    await updateSettings(db, { nativeLanguage: value });
  };

  const handleLearningSelect = async (value) => {
    if (value === learning) {
      return;
    }

    const previousLanguage = learning;
    setLearning(value);
    updatePreferences({ learning: value });
    await updateSettings(db, { learningLanguage: value });
    setLanguageDialog({ previousLanguage, nextLanguage: value });
  };

  const handleLevelSelect = async (value) => {
    setLevel(value);
    updatePreferences({ level: value });
    await updateSettings(db, { level: value });
  };

  const handleWordsPerDaySelect = async (value) => {
    setWordsPerDay(value);
    updatePreferences({ wordsPerDay: value });
    await updateSettings(db, { newWordsPerDay: value });
  };

  const chipSections = (
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
        onSelect={handleLevelSelect}
      />
      <ChipSection
        label="New words per day"
        options={WORDS_PER_DAY}
        selected={wordsPerDay}
        onSelect={handleWordsPerDaySelect}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topInset,
            paddingHorizontal,
            paddingBottom: Math.max(
              navBottom + NAV_HEIGHT + 16,
              isTablet
                ? layout.tabletScreenPadding
                : layout.screenPaddingBottom,
            ),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isTablet ? (
          <>
            {/* Tablet: back stays top-left; title + chips center in the 600px column. */}
            <View style={styles.tabletBackRow}>
              <IconButton icon={<ChevronLeftIcon />} onPress={onBack} />
            </View>
            <View style={styles.tabletContainer}>
              <View style={styles.tabletTitleRow}>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.headerSpacer} />
              </View>
              {chipSections}
            </View>
          </>
        ) : (
          <View style={styles.container}>
            <View style={styles.header}>
              <IconButton icon={<ChevronLeftIcon />} onPress={onBack} />
              <Text style={styles.title}>Settings</Text>
              {/* Balances the back button so the title stays visually centered. */}
              <View style={styles.headerSpacer} />
            </View>
            {chipSections}
          </View>
        )}
      </ScrollView>
      <TopGradient height={topInset} />
      <BottomGradient bottom={navBottom} height={NAV_HEIGHT} />
      <Dialog
        visible={languageDialog != null}
        title={`You're now learning ${languageDialog?.nextLanguage ?? ''}`}
        description={`Your ${languageDialog?.previousLanguage ?? ''} progress is saved. You can switch back anytime.`}
        onConfirm={() => setLanguageDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  container: {
    flexGrow: 1,
    gap: 24,
    maxWidth: layout.maxContentWidth,
    width: '100%',
  },
  tabletBackRow: {
    // Matches Figma screen gap-[24px] between the back control and container.
    marginBottom: 24,
    width: '100%',
  },
  tabletContainer: {
    flexGrow: 1,
    gap: 24,
    justifyContent: 'center',
    maxWidth: layout.maxContentWidth,
    paddingBottom: layout.tabletContentPaddingBottom,
    paddingTop: layout.tabletContentPaddingTop,
    width: '100%',
  },
  tabletTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    width: '100%',
  },
  headerSpacer: {
    height: 48,
    width: 48,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  content: {
    gap: 24,
    width: '100%',
  },
});
