import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Whether TalkBack / VoiceOver (or similar) is currently enabled. */
export function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // React Native Web always resolves isScreenReaderEnabled() to true even
    // when no browser screen reader is active. The native feedback delay
    // would therefore run for every web answer.
    if (Platform.OS === 'web') {
      setEnabled(false);
      return undefined;
    }

    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) {
        setEnabled(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setEnabled,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
