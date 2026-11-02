import { createContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { createSessionFromUrl, isPasswordRecoveryUrl } from '../lib/auth';

export const PasswordRecoveryContext = createContext(null);

// Keep link handling above AccountDatabase: restoring a session can replace
// the account database and unmount every screen before navigation is ready.
export function usePasswordRecovery() {
  const [ready, setReady] = useState(false);
  const [recoveryUserId, setRecoveryUserId] = useState(null);

  useEffect(() => {
    let active = true;
    const handledUrls = new Map();
    const handleUrl = (url) => {
      if (!url) return Promise.resolve();
      if (!handledUrls.has(url)) {
        handledUrls.set(url, (async () => {
          const session = await createSessionFromUrl(url);
          if (active && session && isPasswordRecoveryUrl(url)) {
            setRecoveryUserId(session.user.id);
          }
        })());
      }
      return handledUrls.get(url);
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(() => {});
    });
    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {})
      .finally(() => { if (active) setReady(true); });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return {
    ready,
    recoveryUserId,
    completeRecovery: () => setRecoveryUserId(null),
  };
}
