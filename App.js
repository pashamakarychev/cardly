import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  NavigationContainer,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNavigation, { TAB_KEYS } from './components/BottomNavigation';
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
  getCompletedSteps,
} from './learning/sessionProgress';
import {
  forSlideFromLeft,
  forSlideFromRight,
  slideTransitionSpec,
} from './navigation/transitions';
import { useIsTablet } from './hooks/useIsTablet';
import MainTabsScreen from './screens/MainTabsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import SessionScreen, { SESSION_MODES } from './screens/SessionScreen';
import { colors, layout } from './theme';
import {
  announceForAccessibility,
  routeAnnouncement,
  tabAnnouncement,
} from './utils/accessibility';

const Stack = createStackNavigator();

// Ref-based navigation so session logic (showStep, goHome) can navigate
// without living inside a screen component.
const navigationRef = createNavigationContainerRef();

// Bottom-nav tabs live inside a single Main stack screen (interactive pager).
const MAIN_ROUTE = 'Main';

// Screen state must live inside SQLiteProvider's children. The provider is
// memoized without comparing children, so updating screens from the parent
// would not trigger a re-render.
function AppContent() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [initialRoute, setInitialRoute] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [slideFrom, setSlideFrom] = useState('right');
  const tabsRef = useRef(null);
  const [sessionMode, setSessionMode] = useState(SESSION_MODES.EXERCISE);
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
    completedSteps: 0,
  });
  const [levelCompleted, setLevelCompleted] = useState(null);

  const refreshHomeStats = async () => {
    const [newWordsRemaining, dueWords, activeCounts, completedSteps] =
      await Promise.all([
        getNewWordsRemainingToday(db),
        getDueLearningWords(db),
        getActiveWordsCounts(db),
        getCompletedSteps(db),
      ]);
    setHomeStats({
      newWords: newWordsRemaining + activeCounts.new,
      wordsToReview: dueWords.length + activeCounts.review,
      activeWords: activeCounts.total,
      completedSteps,
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
        setActiveTab('home');
        setInitialRoute(MAIN_ROUTE);
        return;
      }

      setInitialRoute('Onboarding');
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

  // Every transition is a horizontal slide; `from` is the edge the incoming
  // screen enters from. It is applied to the whole navigator rather than to a
  // single screen so the entering and leaving screens move as a pair, and it
  // is set in the same batch as the navigation action so the animation that
  // runs on the next commit already uses the new direction.
  const navigateTo = (routeName, { from = 'right', replace = false } = {}) => {
    if (!navigationRef.isReady()) {
      return;
    }
    setSlideFrom(from);
    if (replace) {
      navigationRef.dispatch(StackActions.replace(routeName));
    } else {
      navigationRef.navigate(routeName);
    }
  };

  // Rounds within a session update state on the already-mounted Session
  // screen; only navigate when coming from another screen.
  const navigateToSession = () => {
    if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name !== 'Session') {
      navigateTo('Session');
    }
  };

  // What to show next (exercise, new word, or session complete) is decided
  // by getNextStep in learning/learning.js; this only maps the step to a screen.
  // For exercise and new-word steps the state updates run synchronously, so
  // callers inside the same event keep everything in one render batch.
  const showStep = async (step) => {
    if (step.type === STEP_TYPES.EXERCISE) {
      setCurrentWord(step.exercise);
      setSessionMode(SESSION_MODES.EXERCISE);
      navigateToSession();
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
      setSessionMode(SESSION_MODES.NEW_WORD);
      navigateToSession();
      return;
    }

    const stats = await getSessionStats(db);
    setSessionStats(stats);
    await resetSessionStats(db);

    const session = await resetSessionProgress(db);
    setProgress(session.progress);
    // Replace the Session screen so back can't return to a finished session.
    if (navigationRef.isReady()) {
      navigateTo('SessionComplete', {
        replace: navigationRef.getCurrentRoute()?.name === 'Session',
      });
    }
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

  const clearPendingSession = () => {
    pendingStepRef.current = null;
    resolvedStepRef.current = null;
    setUpcomingWord(null);
  };

  // Pop back to Main when possible so the close animation mirrors Android
  // back (left to right). navigateTo would push Main with a forward
  // slide-from-right instead.
  const goHome = () => {
    if (!navigationRef.isReady()) {
      return;
    }
    setActiveTab('home');
    tabsRef.current?.setPage(0, false);
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    navigateTo(MAIN_ROUTE);
  };

  // Bottom nav is only shown on Main; its active item follows the pager.
  const handleNavigationStateChange = () => {
    const routeName = navigationRef.getCurrentRoute()?.name;
    if (routeName === MAIN_ROUTE) {
      setActiveTab((tab) => {
        const next = tab ?? 'home';
        announceForAccessibility(tabAnnouncement(next));
        return next;
      });
      clearPendingSession();
      refreshHomeStats();
      loadLevelCompleted();
      return;
    }
    setActiveTab(null);
    const announcement = routeAnnouncement(routeName);
    if (announcement) {
      announceForAccessibility(announcement);
    }
  };

  // Tab taps animate the pager; swipes are handled interactively inside it.
  const handleTabPress = (tab) => {
    const targetIndex = TAB_KEYS.indexOf(tab);
    if (targetIndex === -1 || tab === activeTab) {
      return;
    }
    setActiveTab(tab);
    announceForAccessibility(tabAnnouncement(tab));
    tabsRef.current?.setPage(targetIndex, true);
  };

  // Nothing to pop from a secondary tab, so Android back would otherwise leave
  // the app. Send it to the first tab instead.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigationRef.isReady()) {
        return false;
      }
      if (navigationRef.getCurrentRoute()?.name !== MAIN_ROUTE) {
        return false;
      }
      const currentIndex = TAB_KEYS.indexOf(activeTab);
      if (currentIndex <= 0) {
        return false;
      }
      handleTabPress(TAB_KEYS[0]);
      return true;
    });
    return () => subscription.remove();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLevelCompletedConfirm = async () => {
    await clearLevelCompleted(db);
    setLevelCompleted(null);
  };

  const renderSession = () => {
    const isNewWord = sessionMode === SESSION_MODES.NEW_WORD;
    const roundWord = isNewWord ? newWord : currentWord;
    if (roundWord == null) {
      return null;
    }
    return (
      <SessionScreen
        mode={sessionMode}
        word={roundWord.text}
        nextWord={upcomingWord}
        options={isNewWord ? undefined : currentWord.options}
        correctAnswer={isNewWord ? undefined : currentWord.correctAnswer}
        progress={progress}
        onClose={() => {
          goHome();
        }}
        onAnswer={handleExerciseAnswer}
        onLearn={handleLearn}
        onAlreadyKnow={handleAlreadyKnow}
        onTransitionEnd={handleCardTransitionEnd}
      />
    );
  };

  if (initialRoute == null) {
    return null;
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={handleNavigationStateChange}
      >
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            cardStyle: styles.card,
            cardStyleInterpolator:
              slideFrom === 'left' ? forSlideFromLeft : forSlideFromRight,
            headerShown: false,
            transitionSpec: slideTransitionSpec,
          }}
        >
          <Stack.Screen
            name="Onboarding"
            options={{ title: "Let's get started" }}
          >
            {() => (
              <OnboardingScreen
                onContinue={(prefs) => {
                  setPreferences(prefs);
                  setActiveTab('home');
                  // Main becomes the new root; back must not return here.
                  // Arriving at Main triggers the stats refresh.
                  navigationRef.reset({
                    index: 0,
                    routes: [{ name: MAIN_ROUTE }],
                  });
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name={MAIN_ROUTE} options={{ title: 'Home' }}>
            {() => (
              <MainTabsScreen
                ref={tabsRef}
                onPageIndexChange={(index) => {
                  const tab = TAB_KEYS[index];
                  if (tab == null) {
                    return;
                  }
                  setActiveTab((prev) => {
                    if (prev !== tab) {
                      announceForAccessibility(tabAnnouncement(tab));
                    }
                    return tab;
                  });
                }}
                homeProps={{
                  newWords: homeStats.newWords,
                  wordsToReview: homeStats.wordsToReview,
                  canStart:
                    homeStats.newWords > 0 ||
                    homeStats.wordsToReview > 0 ||
                    homeStats.activeWords > 0,
                  canContinue: homeStats.completedSteps > 0,
                  currentLevel: preferences?.level,
                  levelCompleted,
                  onLevelCompletedConfirm: handleLevelCompletedConfirm,
                  onStart: handleStart,
                }}
                settingsProps={{
                  preferences,
                  onPreferencesChange: setPreferences,
                  onBack: () => {
                    handleTabPress('home');
                  },
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Session" options={{ title: 'Study session' }}>
            {() => renderSession()}
          </Stack.Screen>
          <Stack.Screen
            name="SessionComplete"
            options={{ title: 'Session complete' }}
          >
            {() => (
              <SessionCompleteScreen
                newWords={sessionStats.newWordsLearned}
                wordsReviewed={sessionStats.wordsReviewed}
                onHome={() => {
                  goHome();
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
      {activeTab != null && (
        <View pointerEvents="box-none" style={styles.navOverlay}>
          <View
            style={[
              styles.navContainer,
              {
                // Phone: 16px above the home indicator. Tablet frames pin the
                // bar 50px from the bottom edge (Figma Home / Settings).
                bottom: isTablet
                  ? Math.max(insets.bottom, layout.screenPaddingBottom)
                  : insets.bottom + 16,
              },
            ]}
          >
            <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
          </View>
        </View>
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          assetSource={{ assetId: DATABASE_ASSET }}
          onInit={initDb}
        >
          <AppContent />
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
  },
  navOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  navContainer: {
    alignSelf: 'center',
    position: 'absolute',
  },
});
