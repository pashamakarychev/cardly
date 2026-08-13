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
const HEADER_HEIGHT = 48;
// Gap between the fixed back row and the content column (Figma gap-[24px]).
const HEADER_CONTENT_GAP = 24;

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

  // Clears the fixed back / header row + gap under the top inset.
  const scrollPaddingTop = topInset + HEADER_HEIGHT + HEADER_CONTENT_GAP;

  const chipSections = (
    <>
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
    </>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: scrollPaddingTop,
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
        <View
          style={[styles.container, isTablet && styles.containerTablet]}
        >
          {isTablet && (
            <View style={styles.tabletTitleRow}>
              <Text style={styles.title}>Settings</Text>
              <View style={styles.headerSpacer} />
            </View>
          )}
          {chipSections}
        </View>
      </ScrollView>

      {/* Phone only — tablet Settings has no top gradient in Figma. */}
      {!isTablet && <TopGradient fillHeight={insets.top} />}
      <View
        pointerEvents="box-none"
        style={[styles.header, { top: topInset, paddingHorizontal }]}
      >
        {isTablet ? (
          <IconButton icon={<ChevronLeftIcon />} onPress={onBack} />
        ) : (
          <>
            <IconButton icon={<ChevronLeftIcon />} onPress={onBack} />
            <Text style={styles.title}>Settings</Text>
            {/* Balances the back button so the title stays visually centered. */}
            <View style={styles.headerSpacer} />
          </>
        )}
      </View>

      {/* Fade across the nav; fill covers the bottom safe zone under it. */}
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
  // Tablet: title + chips vertically centered in the space below the back row.
  containerTablet: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  tabletTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    justifyContent: 'space-between',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    justifyContent: 'space-between',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
  },
  headerSpacer: {
    height: HEADER_HEIGHT,
    width: HEADER_HEIGHT,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
});
