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
