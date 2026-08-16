import { registerRootComponent } from 'expo';
import { Text, TextInput } from 'react-native';

import App from './App';

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
