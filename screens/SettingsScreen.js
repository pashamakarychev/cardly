import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { colors, typography } from '../theme';

// Bottom nav geometry (matches BottomNavigation + App nav overlay).
const NAV_BOTTOM_PADDING = 16;
const NAV_HEIGHT = 64;
// Matches Figma content top inset under the Top Gradient.
const CONTENT_TOP_PADDING = 19;

export default function SettingsScreen({
  preferences,
  onPreferencesChange,
  onBack,
}) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const topInset = insets.top + CONTENT_TOP_PADDING;
  const navBottom = insets.bottom + NAV_BOTTOM_PADDING;
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

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset, paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <IconButton icon={<ChevronLeftIcon />} onPress={onBack} />
        <Text style={styles.title}>Settings</Text>
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
    gap: 24,
    paddingHorizontal: 16,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  content: {
    gap: 24,
  },
});
