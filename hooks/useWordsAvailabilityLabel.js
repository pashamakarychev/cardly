import { useEffect, useState } from 'react';

import {
  formatWordsAvailableIn,
  nextWordsAvailableAt,
} from '../utils/homeStatsSchedule';

/**
 * Live “Words will be available in 3h 24m 17s” label while Start is disabled.
 * Uses the same review / local-midnight times as the Home stats timers.
 */
export function useWordsAvailabilityLabel({
  canStart,
  nextReviewAt,
  hasNewWordsAtMidnight,
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (canStart) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [canStart]);

  if (canStart) {
    return null;
  }

  const now = Date.now();
  const availableAt = nextWordsAvailableAt(now, {
    nextReviewAt,
    hasNewWordsAtMidnight,
  });
  if (availableAt == null) {
    return null;
  }

  const remaining = availableAt - now;
  if (remaining <= 0) {
    return null;
  }

  return `Words will be available in ${formatWordsAvailableIn(remaining)}`;
}
