import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDbIfNeeded } from './db/database';
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
  const [screen, setScreen] = useState('onboarding');
  const [preferences, setPreferences] = useState(null);

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
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <AppContent />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
