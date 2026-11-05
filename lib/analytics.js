import * as Clarity from '@microsoft/react-native-clarity';
import { Platform } from 'react-native';

let initialized = false;
let pending = Promise.resolve();
let captureAllowed = false;

export function applyAnalyticsPreference(preference) {
  if (Platform.OS === 'web') return Promise.resolve();
  const enabled = preference === 'accepted';
  captureAllowed = enabled;
  pending = pending.catch(() => {}).then(async () => {
    if (enabled && !initialized) {
      Clarity.setOnSessionStartedCallback(() => {
        Clarity.consent(false, captureAllowed).catch(console.error);
        if (!captureAllowed) Clarity.pause().catch(console.error);
      });
      Clarity.initialize('y4c81c7o73', { logLevel: Clarity.LogLevel.None });
      initialized = true;
    }
    if (!initialized) return;
    if (enabled) {
      await Clarity.consent(false, true);
      await Clarity.resume();
    } else {
      await Clarity.pause();
      await Clarity.consent(false, false);
    }
  });
  return pending;
}
