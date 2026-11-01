import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';

/** Announce a short message to TalkBack / VoiceOver when focus shouldn't move. */
export function announceForAccessibility(message) {
  if (message) {
    AccessibilityInfo.announceForAccessibility(String(message));
  }
}

/** Move TalkBack / VoiceOver focus to a component ref after the tree settles. */
export function setAccessibilityFocusOn(ref) {
  // React Native Web does not implement findNodeHandle or imperative
  // accessibility focus. Browser screen readers retain DOM focus themselves.
  if (Platform.OS === 'web') {
    return;
  }

  const node = ref?.current ?? ref;
  if (node == null) {
    return;
  }
  const reactTag = typeof node === 'number' ? node : findNodeHandle(node);
  if (reactTag == null) {
    return;
  }
  // Defer so focus runs after button state / card swap commit.
  requestAnimationFrame(() => {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  });
}

export function tabAnnouncement(tabKey) {
  if (tabKey === 'settings') {
    return 'Settings';
  }
  return 'Home';
}

export function routeAnnouncement(routeName) {
  switch (routeName) {
    case 'Login':
      return 'Welcome back!';
    case 'SignUp':
      return 'Create an account';
    case 'ResetPassword':
      return 'Reset password';
    case 'NewPassword':
      return 'Create a new password';
    case 'Onboarding':
      return "Let's get started";
    case 'Session':
      return 'Study session';
    case 'SessionComplete':
      return 'Session complete';
    default:
      return null;
  }
}
