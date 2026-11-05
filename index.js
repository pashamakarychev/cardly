import { registerRootComponent } from 'expo';
import { Platform, Text, TextInput } from 'react-native';

import App from './App';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const overscrollStyle = document.createElement('style');
  overscrollStyle.textContent = 'html, body { overscroll-behavior: none; }';
  document.head.appendChild(overscrollStyle);
}

// Respect system Accessibility / Display font size app-wide.
Text.defaultProps = { ...Text.defaultProps, allowFontScaling: true };
TextInput.defaultProps = {
  ...TextInput.defaultProps,
  allowFontScaling: true,
};

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
