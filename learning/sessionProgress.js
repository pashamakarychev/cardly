// Session progress: total steps to complete a session, and progress as the
// user works through them. Logic will live here so getNextStep / App stay focused
// on what to show next, not how far along the session is.

import { getLearningLanguage } from '../db/settings';
import { getDueLearningWords, getNewWordsRemainingToday } from './learning';

/** Correct first-attempt answers needed before a word leaves active_words. */
const ACTIVE_STREAK_TO_REMOVE = 3;

const PROGRESS_KEYS = {
  COMPLETED_STEPS: 'completed_steps',
};

/**
 * Steps still needed for each active word to leave the pool
 * (streak must reach ACTIVE_STREAK_TO_REMOVE).
 */
async function countActiveWordsSteps(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }

  const rows = await db.getAllAsync(
    'SELECT correct_streak FROM active_words WHERE language = ?',
    language
  );

  return rows.reduce((total, row) => {
    const streak = Number(row.correct_streak);
    const remaining = ACTIVE_STREAK_TO_REMOVE - (Number.isFinite(streak) ? streak : 0);
    return total + Math.max(remaining, 0);
  }, 0);
}

/**
 * Counts the total number of steps still required to complete the session.
 */
export async function countTotalSteps(db) {
  const activeSteps = await countActiveWordsSteps(db);
  const dueWords = await getDueLearningWords(db);
  const dueSteps = dueWords.length * ACTIVE_STREAK_TO_REMOVE;
  const newWordsRemaining = await getNewWordsRemainingToday(db);
  const newWordSteps = newWordsRemaining * (ACTIVE_STREAK_TO_REMOVE + 1);
  return activeSteps + dueSteps + newWordSteps;
}

async function getCompletedSteps(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }

  const row = await db.getFirstAsync(
    'SELECT value FROM session WHERE key = ? AND language = ?',
    PROGRESS_KEYS.COMPLETED_STEPS,
    language
  );
  const value = Number(row?.value);
  return Number.isFinite(value) ? value : 0;
}

async function setCompletedSteps(db, value) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }

  const next = Math.max(0, value);
  await db.runAsync(
    `
      INSERT INTO session (key, value, language) VALUES (?, ?, ?)
      ON CONFLICT(key, language) DO UPDATE SET value = excluded.value
    `,
    PROGRESS_KEYS.COMPLETED_STEPS,
    String(next),
    language
  );
  return next;
}

async function adjustCompletedSteps(db, delta) {
  const current = await getCompletedSteps(db);
  return setCompletedSteps(db, current + delta);
}

/**
 * Recalculates remaining totalSteps and returns progress for the UI.
 * progress = completed / (completed + remaining).
 */
export async function syncSessionProgress(db) {
  const completedSteps = await getCompletedSteps(db);
  const totalSteps = await countTotalSteps(db);
  const denominator = completedSteps + totalSteps;
  const progress = denominator === 0 ? 1 : completedSteps / denominator;

  return { completedSteps, totalSteps, progress };
}

/** Resets completed steps after a session is finished. */
export async function resetSessionProgress(db) {
  await setCompletedSteps(db, 0);
  return syncSessionProgress(db);
}

/** Correct first-attempt answer on a due review word. */
export async function onReviewCorrect(db) {
  await adjustCompletedSteps(db, 4);
  return syncSessionProgress(db);
}

/** Incorrect first attempt on a due review word (eventually answered). */
export async function onReviewIncorrect(db) {
  await adjustCompletedSteps(db, 1);
  return syncSessionProgress(db);
}

/** User tapped Learn on a new word. */
export async function onLearnWord(db) {
  await adjustCompletedSteps(db, 1);
  return syncSessionProgress(db);
}

/** Correct first-attempt answer on an active-queue word. */
export async function onActiveCorrect(db) {
  await adjustCompletedSteps(db, 1);
  return syncSessionProgress(db);
}

/**
 * Incorrect first attempt on an active-queue word.
 * Decreases completedSteps by the streak before the mistake.
 */
export async function onActiveIncorrect(db, streakBeforeMistake) {
  const streak = Number(streakBeforeMistake);
  const delta = Number.isFinite(streak) ? streak : 0;
  await adjustCompletedSteps(db, -delta);
  return syncSessionProgress(db);
}

/** User tapped Already know — completedSteps unchanged. */
export async function onAlreadyKnow(db) {
  return syncSessionProgress(db);
}

/**
 * Returns the current session progress as a fraction in [0, 1].
 */
export async function getSessionProgress(db) {
  const { progress } = await syncSessionProgress(db);
  return progress;
}
