import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import NewWordScreen from './screens/NewWordScreen';
import OnboardingScreen from './screens/OnboardingScreen';

export default function App() {
  const [screen, setScreen] = useState('onboarding');
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
      {screen === 'onboarding' && (
        <OnboardingScreen onContinue={() => setScreen('home')} />
      )}
      {screen === 'home' && (
        <HomeScreen onStart={() => setScreen('newWord')} />
      )}
      {screen === 'newWord' && (
        <NewWordScreen
          word="Hola"
          nextWord="Adiós"
          progress={0.3}
          onClose={() => setScreen('home')}
          onLearn={() => {}}
          onAlreadyKnow={() => {}}
        />
      )}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
