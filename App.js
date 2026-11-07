import { useScreenEdgePadding } from './hooks/useScreenEdgePadding';
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
import { useSQLiteContext } from './db/SQLiteProvider';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BottomNavigation, { TAB_KEYS } from './components/BottomNavigation';
import AnalyticsConsentDialog from './components/AnalyticsConsentDialog';
import { WORD_STATES } from './db/database';
import { getSettings, subscribeToDatabase, updateSettings } from './db/repository';
import AccountDatabase from './components/AccountDatabase';
import { startSync, syncDatabase } from './lib/sync';
import { applyAnalyticsPreference } from './lib/analytics';
import {
  ADDED_AS,
  EXERCISE_SOURCES,
  STEP_TYPES,
  addToActiveWords,
  addToLearningProgress,
  advanceActivePosition,
  decreaseInterval,
  countUndisplayedNewWords,
  getDueLearningWords,
  getNearestNextReviewAt,
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
import { useHomeStatsSchedule } from './hooks/useHomeStatsSchedule';
import { PasswordRecoveryContext, usePasswordRecovery } from './hooks/usePasswordRecovery';

import {
  getSession,
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  updatePassword,
} from './lib/auth';
import LoginScreen from './screens/LoginScreen';
import MainTabsScreen from './screens/MainTabsScreen';
import NewPasswordScreen from './screens/NewPasswordScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import SignUpScreen from './screens/SignUpScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import SessionScreen, { SESSION_MODES } from './screens/SessionScreen';
import { colors } from './theme';
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
function AppContent({ userId, userEmail }) {
  // Context reaches the screens even when SQLiteProvider memoizes its children.
  const { recoveryUserId, completeRecovery: onRecoveryComplete } = useContext(PasswordRecoveryContext);
  const db = useSQLiteContext();
  useEffect(() => startSync(db, userId, () =>
    !navigationRef.isReady() || navigationRef.getCurrentRoute()?.name !== 'Session'), [db, userId]);
  const { isDesktop, bottom: navBottom } = useScreenEdgePadding();
  const [initialRoute, setInitialRoute] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [slideFrom, setSlideFrom] = useState('right');
  const tabsRef = useRef(null);
  const [sessionMode, setSessionMode] = useState(SESSION_MODES.EXERCISE);
  const [preferences, setPreferences] = useState(null);
  const [consentVisible, setConsentVisible] = useState(false);
  const analyticsReady = useRef(false);
  const consentSaving = useRef(false);
  useEffect(() => () => { applyAnalyticsPreference('rejected').catch(console.error); }, [db]);
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
    nextReviewAt: null,
    hasNewWordsAtMidnight: false,
  });
  const [levelCompleted, setLevelCompleted] = useState(null);

  const refreshHomeStats = useCallback(async () => {
    const [
      newWordsRemaining,
      dueWords,
      activeCounts,
      completedSteps,
      nextReviewAt,
      undisplayedNewWords,
    ] = await Promise.all([
      getNewWordsRemainingToday(db),
      getDueLearningWords(db),
      getActiveWordsCounts(db),
      getCompletedSteps(db),
      getNearestNextReviewAt(db),
      countUndisplayedNewWords(db),
    ]);
    setHomeStats({
      newWords: newWordsRemaining + activeCounts.new,
      wordsToReview: dueWords.length + activeCounts.review,
      activeWords: activeCounts.total,
      completedSteps,
      nextReviewAt,
      hasNewWordsAtMidnight: undisplayedNewWords > 0,
    });
  }, [db]);

  useHomeStatsSchedule(db, refreshHomeStats, activeTab === 'home');

  // Leaving Settings (or any non-Home tab) and returning to Home.
  useEffect(() => {
    if (activeTab === 'home') {
      refreshHomeStats();
    }
  }, [activeTab, refreshHomeStats]);

  const loadLevelCompleted = async () => {
    setLevelCompleted(await getLevelCompleted(db));
  };

  const applySettings = async (settings) => {
    if (settings?.onboarding_completed !== 1) {
      return false;
    }
    setPreferences({
      speaks: settings.native_language,
      learning: settings.learning_language,
      level: settings.level,
      wordsPerDay: String(settings.new_words_per_day),
      analytics: settings.analytics ?? 'unknown',
    });
    await loadLevelCompleted();
    return true;
  };

  const enterAuthenticatedApp = async ({ replace = false, isActive = () => true } = {}) => {
    const syncAttempt = syncDatabase(db).catch(() => {});
    const settings = await getSettings(db);
    const hasSettings = await applySettings(settings);
    if (!isActive()) return;
    syncAttempt.then(async () => {
      if (!isActive()) return;
      const syncedSettings = await getSettings(db);
      if (!isActive()) return;
      analyticsReady.current = true;
      applyAnalyticsPreference(syncedSettings?.analytics).catch(console.error);
      setConsentVisible(syncedSettings?.onboarding_completed === 1 && (syncedSettings?.analytics ?? 'unknown') === 'unknown');
      if (!hasSettings && syncedSettings?.onboarding_completed === 1) {
        await applySettings(syncedSettings);
        setActiveTab('home');
        if (navigationRef.isReady()) {
          navigationRef.reset({ index: 0, routes: [{ name: MAIN_ROUTE }] });
        } else {
          setInitialRoute(MAIN_ROUTE);
        }
      }
    }).catch(console.error);
    if (hasSettings) {
      setActiveTab('home');
      if (replace) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: MAIN_ROUTE }],
        });
        return;
      }
      setInitialRoute(MAIN_ROUTE);
      return;
    }
    if (replace) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
      return;
    }
    setInitialRoute('Onboarding');
  };

  useEffect(() => {
    let active = true;
    async function loadInitialScreen() {
      if (recoveryUserId != null && recoveryUserId === userId) {
        setActiveTab(null);
        setInitialRoute('NewPassword');
        if (navigationRef.isReady()) {
          navigationRef.reset({ index: 0, routes: [{ name: 'NewPassword' }] });
        }
        return;
      }
      try {
        const session = await getSession();
        if (!active) return;
        if (session == null) {
          setInitialRoute('Login');
          return;
        }
        await enterAuthenticatedApp({ isActive: () => active });
      } catch {
        if (active) setInitialRoute('Login');
      }
    }

    loadInitialScreen();
    return () => { active = false; };
  }, [db, userId, recoveryUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => subscribeToDatabase(db, (source) => {
    if (source === 'remote') {
      getSettings(db).then(async (settings) => {
        if (analyticsReady.current) {
          applyAnalyticsPreference(settings?.analytics).catch(console.error);
          setConsentVisible(settings?.onboarding_completed === 1 && (settings?.analytics ?? 'unknown') === 'unknown');
        }
        await applySettings(settings);
        await refreshHomeStats();
      }).catch(console.error);
    }
  }), [db, refreshHomeStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseAnalytics = async (analytics) => {
    if (consentSaving.current) return;
    consentSaving.current = true;
    try {
      await updateSettings(db, { analytics });
      setPreferences((current) => current && ({ ...current, analytics }));
      setConsentVisible(false);
      applyAnalyticsPreference(analytics).catch(console.error);
    } finally {
      consentSaving.current = false;
    }
  };

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
    syncDatabase(db).catch(() => {});
    const routeName = navigationRef.getCurrentRoute()?.name;
    if (routeName === MAIN_ROUTE) {
      if (analyticsReady.current && preferences?.analytics === 'unknown') setConsentVisible(true);
      setActiveTab((tab) => {
        const next = tab ?? 'home';
        announceForAccessibility(tabAnnouncement(next));
        return next;
      });
      clearPendingSession();
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
        onReady={() => {
          if (recoveryUserId != null && recoveryUserId === userId &&
              navigationRef.getCurrentRoute()?.name !== 'NewPassword') {
            navigationRef.reset({ index: 0, routes: [{ name: 'NewPassword' }] });
          }
        }}
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
            name="Login"
            options={{ title: 'Welcome back!' }}
          >
            {() => (
              <LoginScreen
                onLogIn={async (email, password) => {
                  await signInWithEmail(email, password);
                }}
                onSignUpPress={() => {
                  navigateTo('SignUp');
                }}
                onForgotPasswordPress={() => {
                  navigateTo('ResetPassword');
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="SignUp"
            options={{ title: 'Create an account' }}
          >
            {() => (
              <SignUpScreen
                onSignUp={async (email, password) => {
                  await signUpWithEmail(email, password);
                }}
                onPrivacyPress={() => navigateTo('Privacy')}
                onLogInPress={() => {
                  navigateTo('Login', { from: 'left' });
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Privacy"
            options={{ title: 'Privacy policy' }}
          >
            {({ navigation }) => <PrivacyScreen onBack={() => navigation.goBack()} />}
          </Stack.Screen>
          <Stack.Screen
            name="ResetPassword"
            options={{ title: 'Reset password' }}
          >
            {() => (
              <ResetPasswordScreen
                onSendResetLink={requestPasswordReset}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="ChangePassword"
            options={{ title: 'Create a new password' }}
          >
            {({ navigation }) => (
              <NewPasswordScreen
                requireCurrentPassword
                onForgotPasswordPress={() => navigation.navigate('ResetPassword')}
                onResetPassword={async (password, currentPassword) => {
                  await updatePassword(password, currentPassword);
                  if (navigation.isFocused()) {
                    navigation.goBack();
                  }
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="NewPassword"
            options={{ title: 'Create a new password' }}
          >
            {() => (
              <NewPasswordScreen
                onResetPassword={async (password) => {
                  await updatePassword(password);
                  await enterAuthenticatedApp({ replace: true });
                  onRecoveryComplete();
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="Onboarding"
            options={{ title: "Let's get started" }}
          >
            {() => (
              <OnboardingScreen
                onContinue={(prefs) => {
                  setPreferences({ ...prefs, analytics: 'unknown' });
                  setActiveTab('home');
                  if (analyticsReady.current) setConsentVisible(true);
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
                  nextReviewAt: homeStats.nextReviewAt,
                  hasNewWordsAtMidnight: homeStats.hasNewWordsAtMidnight,
                  currentLevel: preferences?.level,
                  levelCompleted,
                  onLevelCompletedConfirm: handleLevelCompletedConfirm,
                  onStart: handleStart,
                }}
                settingsProps={{
                  preferences,
                  userEmail,
                  onPreferencesChange: setPreferences,
                  onAnalyticsChange: (analytics) => {
                    if (analyticsReady.current) applyAnalyticsPreference(analytics).catch(console.error);
                  },
                  onChangePassword: () => navigateTo('ChangePassword'),
                  onPrivacyPress: () => {
                    if (Platform.OS === 'web') {
                      window.location.assign('/privacy');
                    } else {
                      navigateTo('Privacy');
                    }
                  },
                  onLogOut: async () => {
                    await applyAnalyticsPreference('rejected').catch(console.error);
                    await signOut();
                  },
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
      <AnalyticsConsentDialog visible={consentVisible} onAccept={() => chooseAnalytics('accepted').catch(console.error)}
        onDecline={() => chooseAnalytics('rejected').catch(console.error)}
        onPrivacyPress={() => { setConsentVisible(false); navigateTo('Privacy'); }} />
      {activeTab != null && !isDesktop && (
        <View pointerEvents="box-none" style={styles.navOverlay}>
          <View
            style={[
              styles.navContainer,
              { bottom: navBottom },
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
  const passwordRecovery = usePasswordRecovery();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  if (!fontsLoaded || !passwordRecovery.ready) {
    return null;
  }

  if (Platform.OS === 'web' && window.location.pathname === '/privacy') {
    return <GestureHandlerRootView style={styles.webPrivacyRoot}>
      <SafeAreaProvider>
        <PrivacyScreen onBack={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')} />
      </SafeAreaProvider>
    </GestureHandlerRootView>;
  }

  return (
    <GestureHandlerRootView style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
      <SafeAreaProvider>
        <PasswordRecoveryContext.Provider value={passwordRecovery}>
          <AccountDatabase>{(userId, userEmail) => <AppContent userId={userId} userEmail={userEmail} />}</AccountDatabase>
        </PasswordRecoveryContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webRoot: {
    overflow: 'hidden',
    overscrollBehavior: 'none',
  },
  webPrivacyRoot: {
    ...StyleSheet.absoluteFillObject,
    position: 'fixed',
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
