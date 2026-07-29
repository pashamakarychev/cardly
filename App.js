import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_ASSET, DATABASE_NAME, WORD_STATES, initDb } from './db/database';
import {
  EXERCISE_SOURCES,
  STEP_TYPES,
  addToActiveWords,
  addToLearningProgress,
  advanceActivePosition,
  decreaseInterval,
  getNextStep,
  increaseInterval,
  incrementWordsAddedToday,
  recordCorrectAnswer,
} from './db/learning';
import { getSettings } from './db/settings';
import ExerciseScreen from './screens/ExerciseScreen';
import HomeScreen from './screens/HomeScreen';
import NewWordScreen from './screens/NewWordScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import SettingsScreen from './screens/SettingsScreen';

// Screen state must live inside SQLiteProvider's children. The provider is
// memoized without comparing children, so updating screens from the parent
// would not trigger a re-render.
function AppContent() {
  const db = useSQLiteContext();
  const [screen, setScreen] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [newWord, setNewWord] = useState(null);

  useEffect(() => {
    async function loadInitialScreen() {
      const settings = await getSettings(db);

      if (settings?.onboarding_completed === 1) {
        setPreferences({
          speaks: settings.native_language,
          learning: settings.learning_language,
          level: settings.level,
          wordsPerDay: String(settings.new_words_per_day),
        });
        setScreen('home');
        return;
      }

      setScreen('onboarding');
    }

    loadInitialScreen();
  }, [db]);

  // What to show next (exercise, new word, or session complete) is decided
  // by getNextStep in db/learning.js; this only maps the step to a screen.
  const continueSession = async () => {
    const step = await getNextStep(db, {
      nativeLanguageName: preferences?.speaks,
      learningLanguageName: preferences?.learning,
      levelName: preferences?.level,
    });

    if (step.type === STEP_TYPES.EXERCISE) {
      setCurrentWord(step.exercise);
      setScreen('exercise');
      return;
    }

    if (step.type === STEP_TYPES.NEW_WORD) {
      setNewWord(step.word);
      setScreen('newWord');
      return;
    }

    setScreen('sessionComplete');
  };

  const handleStart = async () => {
    await continueSession();
  };

  const handleExerciseAnswer = async (firstAttemptCorrect) => {
    if (currentWord?.id == null) {
      await continueSession();
      return;
    }

    if (currentWord.source === EXERCISE_SOURCES.REVIEW) {
      if (firstAttemptCorrect) {
        await increaseInterval(db, currentWord.id);
      } else {
        await decreaseInterval(db, currentWord.id);
        await addToActiveWords(db, currentWord.id);
      }
    } else {
      // Active-queue drills only update streak; interval stays unchanged.
      if (firstAttemptCorrect) {
        await recordCorrectAnswer(db, currentWord.id);
      }
      await advanceActivePosition(db);
    }

    await continueSession();
  };

  const handleLearn = async () => {
    if (newWord?.id == null) {
      return;
    }
    await addToLearningProgress(db, newWord.id, WORD_STATES.LEARNING);
    await addToActiveWords(db, newWord.id);
    await incrementWordsAddedToday(db);
    await continueSession();
  };

  const handleAlreadyKnow = async () => {
    if (newWord?.id == null) {
      return;
    }
    await addToLearningProgress(db, newWord.id, WORD_STATES.KNOWN);
    await continueSession();
  };

  if (screen == null) {
    return null;
  }

  return (
    <>
      {screen === 'onboarding' && (
        <OnboardingScreen
          onContinue={(prefs) => {
            setPreferences(prefs);
            setScreen('home');
          }}
        />
      )}
      {screen === 'home' && (
        <HomeScreen
          onStart={handleStart}
          onTabPress={(tab) => {
            if (tab === 'settings') {
              setScreen('settings');
            }
          }}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onBack={() => setScreen('home')}
          onTabPress={(tab) => {
            if (tab === 'home') {
              setScreen('home');
            }
          }}
        />
      )}
      {screen === 'newWord' && newWord != null && (
        <NewWordScreen
          key={newWord.id}
          word={newWord.text}
          progress={0.3}
          onClose={() => setScreen('home')}
          onLearn={handleLearn}
          onAlreadyKnow={handleAlreadyKnow}
        />
      )}
      {screen === 'exercise' && currentWord != null && (
        <ExerciseScreen
          key={`${currentWord.source}-${currentWord.id}-${currentWord.position ?? 'review'}`}
          word={currentWord.text}
          options={currentWord.options}
          correctAnswer={currentWord.correctAnswer}
          progress={0.3}
          onClose={() => setScreen('home')}
          onAnswer={(firstAttemptCorrect) => {
            setTimeout(() => {
              handleExerciseAnswer(firstAttemptCorrect);
            }, 800);
          }}
        />
      )}
      {screen === 'sessionComplete' && (
        <SessionCompleteScreen
          newWords={10}
          wordsReviewed={0}
          onHome={() => setScreen('home')}
        />
      )}
      <StatusBar style="dark" />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        assetSource={{ assetId: DATABASE_ASSET }}
        onInit={initDb}
      >
        <AppContent />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
