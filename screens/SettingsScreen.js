import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNavigation from '../components/BottomNavigation';
import ChipSection from '../components/ChipSection';
import IconButton from '../components/IconButton';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { LANGUAGES, LEVELS, WORDS_PER_DAY } from '../constants/preferences';
import { colors, typography } from '../theme';

export default function SettingsScreen({
  preferences,
  onPreferencesChange,
  onBack,
  onTabPress,
}) {
  const insets = useSafeAreaInsets();
  const [speaks, setSpeaks] = useState(preferences?.speaks ?? 'English');
  const [learning, setLearning] = useState(preferences?.learning ?? 'Spanish');
  const [level, setLevel] = useState(preferences?.level ?? 'Beginner');
  const [wordsPerDay, setWordsPerDay] = useState(
    preferences?.wordsPerDay ?? '10'
  );

  const update = (patch) => {
    onPreferencesChange?.({ speaks, learning, level, wordsPerDay, ...patch });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 19 }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <IconButton icon={<ChevronLeftIcon />} onPress={onBack} />
        <Text style={styles.title}>Settings</Text>
        <View style={styles.content}>
          <ChipSection
            label="I speak"
            options={LANGUAGES}
            selected={speaks}
            onSelect={(value) => {
              setSpeaks(value);
              update({ speaks: value });
            }}
          />
          <ChipSection
            label="I want to learn"
            options={LANGUAGES}
            selected={learning}
            onSelect={(value) => {
              setLearning(value);
              update({ learning: value });
            }}
          />
          <ChipSection
            label="My level"
            options={LEVELS}
            selected={level}
            onSelect={(value) => {
              setLevel(value);
              update({ level: value });
            }}
          />
          <ChipSection
            label="New words per day"
            options={WORDS_PER_DAY}
            selected={wordsPerDay}
            onSelect={(value) => {
              setWordsPerDay(value);
              update({ wordsPerDay: value });
            }}
          />
        </View>
      </ScrollView>
      <View style={[styles.navContainer, { bottom: insets.bottom + 16 }]}>
        <BottomNavigation activeTab="settings" onTabPress={onTabPress} />
      </View>
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
  navContainer: {
    alignSelf: 'center',
    position: 'absolute',
  },
});
