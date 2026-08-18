import { registerRootComponent } from 'expo';
import * as Clarity from '@microsoft/react-native-clarity';
import { Platform, Text, TextInput } from 'react-native';

import App from './App';

if (Platform.OS !== 'web') {
  Clarity.initialize('y4c81c7o73', {
    logLevel: Clarity.LogLevel.None, // Note: Use "LogLevel.Verbose" value while testing to debug initialization issues.
  });
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
