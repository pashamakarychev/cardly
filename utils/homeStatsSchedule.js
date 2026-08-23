/** Milliseconds until the next local midnight (00:00). */
export function msUntilLocalMidnight(now = Date.now()) {
  const date = new Date(now);
  const nextMidnight = new Date(date);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - now);
}

/** setTimeout delays above this can overflow; wake and reschedule. */
export const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/** Delay until `at` (epoch ms), capped for setTimeout safety. */
export function msUntilTimestamp(at, now = Date.now()) {
  const target = Number(at);
  if (!Number.isFinite(target)) {
    return null;
  }
  return Math.min(Math.max(0, target - now), MAX_TIMEOUT_MS);
}

/**
 * Soonest time words can appear: a scheduled review, and/or local midnight
 * when the daily new-word allowance resets.
 */
export function nextWordsAvailableAt(
  now,
  { nextReviewAt, hasNewWordsAtMidnight }
) {
  const candidates = [];
  if (hasNewWordsAtMidnight) {
    candidates.push(now + msUntilLocalMidnight(now));
  }
  const review = Number(nextReviewAt);
  if (Number.isFinite(review) && review > now) {
    candidates.push(review);
  }
  if (candidates.length === 0) {
    return null;
  }
  return Math.min(...candidates);
}

/** Remaining time as “3h 24m 17s”, omitting hours under 1h and minutes under 1m. */
export function formatWordsAvailableIn(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours >= 1) {
    parts.push(`${hours}h`);
  }
  if (hours >= 1 || minutes >= 1) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(' ');
}
