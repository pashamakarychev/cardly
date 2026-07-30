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
import { getSettings } from './db/settings';
import {
  ADDED_AS,
  EXERCISE_SOURCES,
  STEP_TYPES,
  addToActiveWords,
  addToLearningProgress,
  advanceActivePosition,
  decreaseInterval,
  getDueLearningWords,
  getNewWordsRemainingToday,
  getNextStep,
  getSessionStats,
  increaseInterval,
  incrementWordsAddedToday,
  incrementWordsReviewed,
  recordCorrectAnswer,
  recordIncorrectAnswer,
  resetSessionStats,
} from './learning/learning';
import {
  onActiveCorrect,
  onActiveIncorrect,
  onAlreadyKnow,
  onLearnWord,
  onReviewCorrect,
  onReviewIncorrect,
  resetSessionProgress,
  syncSessionProgress,
} from './learning/sessionProgress';
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
  const [progress, setProgress] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    newWordsLearned: 0,
    wordsReviewed: 0,
  });
  const [homeStats, setHomeStats] = useState({
    newWords: 0,
    wordsToReview: 0,
    activeWords: 0,
  });

  const refreshHomeStats = async () => {
    const [newWordsRemaining, dueWords, activeCountRow] = await Promise.all([
      getNewWordsRemainingToday(db),
      getDueLearningWords(db),
      db.getFirstAsync('SELECT COUNT(*) AS count FROM active_words'),
    ]);
    const activeWords = activeCountRow?.count ?? 0;
    setHomeStats({
      newWords: newWordsRemaining + activeWords,
      wordsToReview: dueWords.length,
      activeWords,
    });
  };

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
        await refreshHomeStats();
        setScreen('home');
        return;
      }

      setScreen('onboarding');
    }

    loadInitialScreen();
  }, [db]);

  // What to show next (exercise, new word, or session complete) is decided
  // by getNextStep in learning/learning.js; this only maps the step to a screen.
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

    const stats = await getSessionStats(db);
    setSessionStats(stats);
    await resetSessionStats(db);

    const session = await resetSessionProgress(db);
    setProgress(session.progress);
    setScreen('sessionComplete');
  };

  const handleStart = async () => {
    const session = await syncSessionProgress(db);
    setProgress(session.progress);
    await continueSession();
  };

  const handleExerciseAnswer = async (firstAttemptCorrect) => {
    if (currentWord?.id == null) {
      await continueSession();
      return;
    }

    let session;

    if (currentWord.source === EXERCISE_SOURCES.REVIEW) {
      if (firstAttemptCorrect) {
        await increaseInterval(db, currentWord.id);
        await incrementWordsReviewed(db);
        session = await onReviewCorrect(db);
      } else {
        await decreaseInterval(db, currentWord.id);
        await addToActiveWords(db, currentWord.id, ADDED_AS.REVIEW);
        session = await onReviewIncorrect(db);
      }
    } else {
      // Active-queue drills only update streak; interval stays unchanged.
      if (firstAttemptCorrect) {
        await recordCorrectAnswer(db, currentWord.id);
        session = await onActiveCorrect(db);
      } else {
        const streakBeforeMistake = currentWord.correct_streak ?? 0;
        await recordIncorrectAnswer(db, currentWord.id);
        session = await onActiveIncorrect(db, streakBeforeMistake);
      }
      await advanceActivePosition(db);
    }

    if (session != null) {
      setProgress(session.progress);
    }
    await continueSession();
  };

  const handleLearn = async () => {
    if (newWord?.id == null) {
      return;
    }
    await addToLearningProgress(db, newWord.id, WORD_STATES.LEARNING);
    await addToActiveWords(db, newWord.id, ADDED_AS.NEW);
    await incrementWordsAddedToday(db);
    const session = await onLearnWord(db);
    setProgress(session.progress);
    await continueSession();
  };

  const handleAlreadyKnow = async () => {
    if (newWord?.id == null) {
      return;
    }
    await addToLearningProgress(db, newWord.id, WORD_STATES.KNOWN);
    const session = await onAlreadyKnow(db);
    setProgress(session.progress);
    await continueSession();
  };

  const goHome = async () => {
    await refreshHomeStats();
    setScreen('home');
  };

  if (screen == null) {
    return null;
  }

  return (
    <>
      {screen === 'onboarding' && (
        <OnboardingScreen
          onContinue={async (prefs) => {
            setPreferences(prefs);
            await goHome();
          }}
        />
      )}
      {screen === 'home' && (
        <HomeScreen
          newWords={homeStats.newWords}
          wordsToReview={homeStats.wordsToReview}
          canStart={
            homeStats.newWords > 0 ||
            homeStats.wordsToReview > 0 ||
            homeStats.activeWords > 0
          }
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
          onBack={() => {
            goHome();
          }}
          onTabPress={(tab) => {
            if (tab === 'home') {
              goHome();
            }
          }}
        />
      )}
      {screen === 'newWord' && newWord != null && (
        <NewWordScreen
          key={newWord.id}
          word={newWord.text}
          progress={progress}
          onClose={() => {
            goHome();
          }}
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
          progress={progress}
          onClose={() => {
            goHome();
          }}
          onAnswer={(firstAttemptCorrect) => {
            setTimeout(() => {
              handleExerciseAnswer(firstAttemptCorrect);
            }, 800);
          }}
        />
      )}
      {screen === 'sessionComplete' && (
        <SessionCompleteScreen
          newWords={sessionStats.newWordsLearned}
          wordsReviewed={sessionStats.wordsReviewed}
          onHome={() => {
            goHome();
          }}
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
