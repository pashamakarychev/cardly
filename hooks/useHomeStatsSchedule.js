import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getNearestNextReviewAt } from '../learning/learning';
import {
  MAX_TIMEOUT_MS,
  msUntilLocalMidnight,
  msUntilTimestamp,
} from '../utils/homeStatsSchedule';

/**
 * Home-only counter timers (cleared when Home is closed):
 * - Words to Review: fire at min(nextReviewAt > now), refresh, then reschedule
 * - New Words: fire at local midnight, refresh, then reschedule
 * - App foreground while Home is open: refresh and reschedule both
 */
export function useHomeStatsSchedule(db, refreshHomeStats, isHomeActive) {
  const refreshRef = useRef(refreshHomeStats);
  refreshRef.current = refreshHomeStats;

  useEffect(() => {
    if (!isHomeActive) {
      return undefined;
    }

    let reviewTimeoutId = null;
    let midnightTimeoutId = null;
    let cancelled = false;

    const clearReviewTimer = () => {
      if (reviewTimeoutId != null) {
        clearTimeout(reviewTimeoutId);
        reviewTimeoutId = null;
      }
    };

    const clearMidnightTimer = () => {
      if (midnightTimeoutId != null) {
        clearTimeout(midnightTimeoutId);
        midnightTimeoutId = null;
      }
    };

    const clearAllTimers = () => {
      clearReviewTimer();
      clearMidnightTimer();
    };

    const scheduleReviewTimer = async () => {
      clearReviewTimer();
      if (cancelled) {
        return;
      }

      const nextReviewAt = await getNearestNextReviewAt(db);
      if (cancelled) {
        return;
      }

      if (nextReviewAt == null) {
        return;
      }

      const delay = msUntilTimestamp(nextReviewAt);
      if (delay == null) {
        return;
      }

      reviewTimeoutId = setTimeout(async () => {
        reviewTimeoutId = null;
        if (cancelled) {
          return;
        }
        // If we woke early due to the 24h cap, wait for the real time.
        if (Date.now() < nextReviewAt) {
          scheduleReviewTimer();
          return;
        }
        await refreshRef.current();
        if (!cancelled) {
          scheduleReviewTimer();
        }
      }, delay);
    };

    const scheduleMidnightTimer = () => {
      clearMidnightTimer();
      if (cancelled) {
        return;
      }

      const delay = Math.min(msUntilLocalMidnight(), MAX_TIMEOUT_MS);

      midnightTimeoutId = setTimeout(async () => {
        midnightTimeoutId = null;
        if (cancelled) {
          return;
        }
        await refreshRef.current();
        if (!cancelled) {
          scheduleMidnightTimer();
        }
      }, delay);
    };

    scheduleReviewTimer();
    scheduleMidnightTimer();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || cancelled) {
        return;
      }
      refreshRef.current().then(() => {
        if (!cancelled) {
          scheduleReviewTimer();
          scheduleMidnightTimer();
        }
      });
    });

    return () => {
      cancelled = true;
      clearAllTimers();
      subscription.remove();
    };
  }, [db, isHomeActive]);
}
