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

import { DATABASE_NAME, initDb } from './db/database';
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
          onStart={() => setScreen('newWord')}
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
      {screen === 'newWord' && (
        <NewWordScreen
          word="Hola"
          nextWord="Adiós"
          progress={0.3}
          onClose={() => setScreen('home')}
          onLearn={() => setScreen('exercise')}
          onAlreadyKnow={() => setScreen('exercise')}
        />
      )}
      {screen === 'exercise' && (
        <ExerciseScreen
          word="Hola"
          nextWord="Adiós"
          options={['Hello', 'Book', 'City', 'Food']}
          correctAnswer="Hello"
          progress={0.3}
          onClose={() => setScreen('home')}
          onAnswer={() => {
            setTimeout(() => setScreen('sessionComplete'), 800);
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
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
        <AppContent />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
