import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
  getActiveWordsCounts,
  getLevelCompleted,
  clearLevelCompleted,
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
  const [levelCompleted, setLevelCompleted] = useState(null);

  const refreshHomeStats = async () => {
    const [newWordsRemaining, dueWords, activeCounts] = await Promise.all([
      getNewWordsRemainingToday(db),
      getDueLearningWords(db),
      getActiveWordsCounts(db),
    ]);
    setHomeStats({
      newWords: newWordsRemaining + activeCounts.new,
      wordsToReview: dueWords.length + activeCounts.review,
      activeWords: activeCounts.total,
    });
  };

  const loadLevelCompleted = async () => {
    setLevelCompleted(await getLevelCompleted(db));
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
        await loadLevelCompleted();
        setScreen('home');
        return;
      }

      setScreen('onboarding');
    }

    loadInitialScreen();
  }, [db]);

  // Next step prepared while the answer feedback and card transition play,
  // so the round can advance in the same batch as the card slot swap.
  const pendingStepRef = useRef(null);
  const resolvedStepRef = useRef(null);
  const [upcomingWord, setUpcomingWord] = useState(null);

  const prepareNextStep = () =>
    getNextStep(db, {
      nativeLanguageName: preferences?.speaks,
      learningLanguageName: preferences?.learning,
      levelName: preferences?.level,
    });

  // The word the card revealed by the lift should display for a given step.
  const stepUpcomingWord = (step) => {
    if (step.type === STEP_TYPES.EXERCISE) {
      return step.exercise.text;
    }
    if (step.type === STEP_TYPES.NEW_WORD) {
      return step.word.text;
    }
    return null;
  };

  // What to show next (exercise, new word, or session complete) is decided
  // by getNextStep in learning/learning.js; this only maps the step to a screen.
  // For exercise and new-word steps the state updates run synchronously, so
  // callers inside the same event keep everything in one render batch.
  const showStep = async (step) => {
    if (step.type === STEP_TYPES.EXERCISE) {
      setCurrentWord(step.exercise);
      setScreen('exercise');
      return;
    }

    if (step.type === STEP_TYPES.NEW_WORD) {
      if (step.word.promotedLevel != null) {
        setPreferences((current) => ({
          ...current,
          level: step.word.promotedLevel,
        }));
      }
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

  const continueSession = async () => {
    await showStep(await prepareNextStep());
  };

  const handleStart = async () => {
    const session = await syncSessionProgress(db);
    setProgress(session.progress);
    await continueSession();
  };

  // Prefetch the next step while card feedback/transition plays. Once resolved,
  // upcomingWord is set so the card revealed by the lift already shows it.
  // The round itself only advances in handleCardTransitionEnd.
  // Returns whether the card stack should animate (false for the last card).
  const queueNextStep = (prepare) => {
    const pending = prepare();
    pendingStepRef.current = pending;
    return pending.then(({ step, shouldAnimate }) => {
      if (pendingStepRef.current === pending) {
        resolvedStepRef.current = step;
        setUpcomingWord(stepUpcomingWord(step));
      }
      return shouldAnimate;
    });
  };

  // Last card when remaining work is 0 after this action.
  // syncSessionProgress: totalSteps = remaining, completedSteps = done;
  // session size is completedSteps + totalSteps.
  const shouldAnimateAfterSession = (session) => {
    if (session == null) {
      return true;
    }
    const { completedSteps, totalSteps } = session;
    return completedSteps + totalSteps > 0 && totalSteps > 0;
  };

  const handleExerciseAnswer = (firstAttemptCorrect) =>
    queueNextStep(async () => {
      if (currentWord?.id == null) {
        return { step: await prepareNextStep(), shouldAnimate: true };
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
      return {
        step: await prepareNextStep(),
        shouldAnimate: shouldAnimateAfterSession(session),
      };
    });

  // Runs synchronously from the card stack's animation callback, in the same
  // batch as its slot flip: the new front card keeps showing the same string
  // while the round data underneath it is replaced.
  const handleCardTransitionEnd = () => {
    const step = resolvedStepRef.current;
    const pending = pendingStepRef.current;
    resolvedStepRef.current = null;
    pendingStepRef.current = null;
    setUpcomingWord(null);

    if (step != null) {
      showStep(step);
    } else if (pending != null) {
      // The database was slower than the animation; apply once ready.
      pending.then((result) => showStep(result.step));
    }
  };

  const handleLearn = () =>
    queueNextStep(async () => {
      if (newWord?.id == null) {
        return { step: await prepareNextStep(), shouldAnimate: true };
      }
      await addToLearningProgress(db, newWord.id, WORD_STATES.LEARNING);
      await addToActiveWords(db, newWord.id, ADDED_AS.NEW);
      await incrementWordsAddedToday(db);
      const session = await onLearnWord(db);
      setProgress(session.progress);
      return {
        step: await prepareNextStep(),
        shouldAnimate: shouldAnimateAfterSession(session),
      };
    });

  const handleAlreadyKnow = () =>
    queueNextStep(async () => {
      if (newWord?.id == null) {
        return { step: await prepareNextStep(), shouldAnimate: true };
      }
      await addToLearningProgress(db, newWord.id, WORD_STATES.KNOWN);
      const session = await onAlreadyKnow(db);
      setProgress(session.progress);
      return {
        step: await prepareNextStep(),
        shouldAnimate: shouldAnimateAfterSession(session),
      };
    });

  const goHome = async () => {
    pendingStepRef.current = null;
    resolvedStepRef.current = null;
    setUpcomingWord(null);
    await refreshHomeStats();
    await loadLevelCompleted();
    setScreen('home');
  };

  const handleLevelCompletedConfirm = async () => {
    await clearLevelCompleted(db);
    setLevelCompleted(null);
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
          currentLevel={preferences?.level}
          levelCompleted={levelCompleted}
          onLevelCompletedConfirm={handleLevelCompletedConfirm}
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
          word={newWord.text}
          nextWord={upcomingWord}
          progress={progress}
          onClose={() => {
            goHome();
          }}
          onLearn={handleLearn}
          onAlreadyKnow={handleAlreadyKnow}
          onTransitionEnd={handleCardTransitionEnd}
        />
      )}
      {screen === 'exercise' && currentWord != null && (
        <ExerciseScreen
          word={currentWord.text}
          nextWord={upcomingWord}
          options={currentWord.options}
          correctAnswer={currentWord.correctAnswer}
          progress={progress}
          onClose={() => {
            goHome();
          }}
          onAnswer={handleExerciseAnswer}
          onTransitionEnd={handleCardTransitionEnd}
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
