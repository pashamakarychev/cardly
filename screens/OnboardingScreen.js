import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import Chip from '../components/Chip';
import { colors, typography } from '../theme';

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Ukrainian',
  'Russian',
];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const WORDS_PER_DAY = ['5', '10', '15', '20'];

function ChipSection({ label, options, selected, onSelect }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={option === selected}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}

export default function OnboardingScreen({ onContinue }) {
  const insets = useSafeAreaInsets();
  const [speaks, setSpeaks] = useState(null);
  const [learning, setLearning] = useState(null);
  const [level, setLevel] = useState(null);
  const [wordsPerDay, setWordsPerDay] = useState(null);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 19 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Let's get started</Text>
        <View style={styles.content}>
          <ChipSection
            label="I speak"
            options={LANGUAGES}
            selected={speaks}
            onSelect={setSpeaks}
          />
          <ChipSection
            label="I want to learn"
            options={LANGUAGES}
            selected={learning}
            onSelect={setLearning}
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
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title="Continue"
          onPress={() =>
            onContinue?.({ speaks, learning, level, wordsPerDay })
          }
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
    gap: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  content: {
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  options: {
    columnGap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
