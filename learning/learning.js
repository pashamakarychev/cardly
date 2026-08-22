// Learning-session helpers: picking the next word to show, answer options, etc.

import { LANGUAGE_CODES, LEVELS } from '../constants/preferences';
import { WORD_STATES } from '../db/database';
import {
  countActiveWords,
  countUndisplayedWords,
  deleteActiveWord,
  deleteSessionValue,
  getLearningLanguage,
  getLearningProgressIntervalIndex,
  getSessionValue,
  getSettings,
  incrementActiveWordStreak,
  insertActiveWord,
  resetActiveWordStreak,
  selectActiveWordAtPosition,
  selectActiveWordsAddedAsCounts,
  selectActiveWordPositions,
  selectActiveWordStreakAndAddedAs,
  selectDueLearningWords,
  selectNearestNextReviewAt,
  selectOccupiedActivePosition,
  selectOtherLevelDistractors,
  selectSameLevelDistractors,
  selectTranslation,
  selectUndisplayedWordAtLevel,
  setSessionValue,
  updateLearningProgressReview,
  updateSettings,
  upsertLearningProgress,
} from '../db/queries';

export const SESSION_KEYS = {
  ACTIVE_POSITION: 'active_position',
  WORDS_ADDED_TODAY: 'words_added_today',
  LAST_WORDS_ADDED_DATE: 'last_words_added_date',
  NEW_WORDS_LEARNED: 'new_words_learned',
  WORDS_REVIEWED: 'words_reviewed',
  LEVEL_COMPLETED: 'level_completed',
};

/** How a word entered active_words: as a new word or as a due review. */
export const ADDED_AS = {
  NEW: 'NEW',
  REVIEW: 'REVIEW',
};

async function getSessionCounter(db, key) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }
  const value = Number(await getSessionValue(db, key, language));
  return Number.isFinite(value) ? value : 0;
}

async function setSessionCounter(db, key, value) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return;
  }
  await setSessionValue(db, key, String(value), language);
}

/** Words learned / reviewed during the current session. */
export async function getSessionStats(db) {
  return {
    newWordsLearned: await getSessionCounter(db, SESSION_KEYS.NEW_WORDS_LEARNED),
    wordsReviewed: await getSessionCounter(db, SESSION_KEYS.WORDS_REVIEWED),
  };
}

/** Resets the learned/reviewed counters after a session summary is shown. */
export async function resetSessionStats(db) {
  await setSessionCounter(db, SESSION_KEYS.NEW_WORDS_LEARNED, 0);
  await setSessionCounter(db, SESSION_KEYS.WORDS_REVIEWED, 0);
}

/** Increments words_reviewed (used when a due review is answered correctly). */
export async function incrementWordsReviewed(db) {
  const current = await getSessionCounter(db, SESSION_KEYS.WORDS_REVIEWED);
  await setSessionCounter(db, SESSION_KEYS.WORDS_REVIEWED, current + 1);
}

/** Reads and parses the level_completed session entry, or null if absent. */
export async function getLevelCompleted(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const raw = await getSessionValue(db, SESSION_KEYS.LEVEL_COMPLETED, language);
  if (raw == null || raw === '') {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Removes the level_completed session entry after the user dismisses the dialog. */
export async function clearLevelCompleted(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return;
  }

  await deleteSessionValue(db, SESSION_KEYS.LEVEL_COMPLETED, language);
}

/** Fixed spaced-repetition ladder: 90s → 30m → 12h → 2d → 2w → 2m. */
export const REVIEW_INTERVALS_MS = [
  90 * 1000,
  30 * 60 * 1000,
  12 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  60 * 24 * 60 * 60 * 1000,
];

async function setReviewInterval(db, wordId, intervalIndex) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const clamped = Math.max(
    0,
    Math.min(intervalIndex, REVIEW_INTERVALS_MS.length - 1)
  );
  const nextReviewAt = Date.now() + REVIEW_INTERVALS_MS[clamped];

  await updateLearningProgressReview(
    db,
    wordId,
    language,
    clamped,
    nextReviewAt
  );

  return { intervalIndex: clamped, nextReviewAt };
}

/** Moves one step up the interval ladder and schedules the next review. */
export async function increaseInterval(db, wordId) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const row = await getLearningProgressIntervalIndex(db, wordId, language);

  if (row == null) {
    return null;
  }

  const current = Number.isFinite(row.interval_index) ? row.interval_index : 0;
  return setReviewInterval(db, wordId, current + 1);
}

/** Moves one step down the interval ladder and schedules the next review. */
export async function decreaseInterval(db, wordId) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const row = await getLearningProgressIntervalIndex(db, wordId, language);

  if (row == null) {
    return null;
  }

  const current = Number.isFinite(row.interval_index) ? row.interval_index : 0;
  return setReviewInterval(db, wordId, current - 1);
}

function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Words added today. Returns 0 if last_words_added_date is not today.
 */
export async function getWordsAddedToday(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }

  const dateValue = await getSessionValue(
    db,
    SESSION_KEYS.LAST_WORDS_ADDED_DATE,
    language
  );

  if (dateValue !== todayDateString()) {
    return 0;
  }

  const count = Number(
    await getSessionValue(db, SESSION_KEYS.WORDS_ADDED_TODAY, language)
  );
  return Number.isFinite(count) ? count : 0;
}

/** Increments words_added_today, resetting the counter when the date rolls over. */
export async function incrementWordsAddedToday(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }

  const today = todayDateString();
  const current = await getWordsAddedToday(db);

  await setSessionValue(
    db,
    SESSION_KEYS.WORDS_ADDED_TODAY,
    String(current + 1),
    language
  );
  await setSessionValue(
    db,
    SESSION_KEYS.LAST_WORDS_ADDED_DATE,
    today,
    language
  );

  return current + 1;
}

/** How many new words can still be added today given settings + session counters. */
export async function getNewWordsRemainingToday(db) {
  const settings = await getSettings(db);
  const dailyLimit = Number(settings?.new_words_per_day);
  if (!Number.isFinite(dailyLimit)) {
    return 0;
  }

  const wordsAddedToday = await getWordsAddedToday(db);
  const dailyRemaining = Math.max(0, dailyLimit - wordsAddedToday);
  const undisplayedRemaining = await countUndisplayedNewWords(db);

  return Math.min(dailyRemaining, undisplayedRemaining);
}

/**
 * Undisplayed words left on the current settings level and all higher levels
 * for the learning language.
 */
export async function countUndisplayedNewWords(db) {
  const language = await getLearningLanguage(db);
  const settings = await getSettings(db);
  const learningLanguageName = settings?.learning_language;
  const wordLanguage = LANGUAGE_CODES[learningLanguageName];
  const currentLevelName = settings?.level;
  const startLevel = currentLevelName?.toLowerCase();

  if (language == null || wordLanguage == null || startLevel == null) {
    return 0;
  }

  const startIndex = LEVELS.findIndex(
    (name) => name.toLowerCase() === startLevel
  );
  if (startIndex < 0) {
    return 0;
  }

  const levels = LEVELS.slice(startIndex).map((name) => name.toLowerCase());
  const row = await countUndisplayedWords(
    db,
    language,
    wordLanguage,
    levels
  );

  return row?.count ?? 0;
}

/** Size of the active learning pool. */
export const ACTIVE_WORDS_TARGET = 3;

/** Kinds of steps the learning session can present. */
export const STEP_TYPES = {
  EXERCISE: 'EXERCISE',
  NEW_WORD: 'NEW_WORD',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
};

/** Where an exercise word came from (drives answer side-effects). */
export const EXERCISE_SOURCES = {
  ACTIVE: 'ACTIVE',
  REVIEW: 'REVIEW',
};

/**
 * Single decision point for what to show next in a learning session.
 * Priority logic lives here — change this function to reorder priorities.
 *
 * Current priority:
 * 1. If active_words is full (3 words), continue exercising the queue.
 * 2. If a LEARNING word is due for review, show it.
 * 3. Otherwise, if under the daily new-word limit, offer a random new word.
 * 4. Otherwise, if any active words remain, exercise one of them.
 * 5. If nothing left to show, the session is complete.
 *
 * Returns { type: STEP_TYPES.*, exercise? , word? }.
 */
export async function getNextStep(
  db,
  { nativeLanguageName, learningLanguageName, levelName }
) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return { type: STEP_TYPES.SESSION_COMPLETE };
  }

  const { count } = await countActiveWords(db, language);

  if (count >= ACTIVE_WORDS_TARGET) {
    const exercise = await loadExercise(db, nativeLanguageName);
    if (exercise != null) {
      return { type: STEP_TYPES.EXERCISE, exercise };
    }
  }

  const review = await loadDueReview(db, nativeLanguageName);
  if (review != null) {
    return { type: STEP_TYPES.EXERCISE, exercise: review };
  }

  if ((await getNewWordsRemainingToday(db)) > 0) {
    let word = await getRandomNewWord(db, learningLanguageName, levelName);

    // If the current level was already empty (e.g. after a prior transition
    // was missed), advance once and try again before giving up on new words.
    if (word == null) {
      await resolveLevelAfterNewWordDisplayed(db, learningLanguageName);
      word = await getRandomNewWord(db, learningLanguageName, levelName);
    }

    if (word != null) {
      const promotion = await resolveLevelAfterNewWordDisplayed(
        db,
        learningLanguageName,
        word.id
      );
      return {
        type: STEP_TYPES.NEW_WORD,
        word: {
          ...word,
          promotedLevel: promotion?.promotedLevel,
        },
      };
    }
  }

  if (count >= 1) {
    const exercise = await loadExercise(db, nativeLanguageName);
    if (exercise != null) {
      return { type: STEP_TYPES.EXERCISE, exercise };
    }
  }

  return { type: STEP_TYPES.SESSION_COMPLETE };
}

/** Returns a word from the active queue, starting at active_position. */
export async function getNextWord(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const start = Number(
    await getSessionValue(db, SESSION_KEYS.ACTIVE_POSITION, language)
  );
  const position = Number.isFinite(start) ? start : 0;

  for (let offset = 0; offset < ACTIVE_WORDS_TARGET; offset += 1) {
    const candidate = (position + offset) % ACTIVE_WORDS_TARGET;
    const word = await selectActiveWordAtPosition(db, candidate, language);

    if (word != null) {
      return word;
    }
  }

  return null;
}

/** Advances active_position to the next occupied slot, wrapping within 0..2. */
export async function advanceActivePosition(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return 0;
  }

  const current = Number(
    await getSessionValue(db, SESSION_KEYS.ACTIVE_POSITION, language)
  );
  const start = Number.isFinite(current) ? current : 0;

  let next = start;
  for (let offset = 1; offset <= ACTIVE_WORDS_TARGET; offset += 1) {
    const candidate = (start + offset) % ACTIVE_WORDS_TARGET;
    const occupied = await selectOccupiedActivePosition(
      db,
      candidate,
      language
    );
    if (occupied != null) {
      next = candidate;
      break;
    }
  }

  await setSessionValue(
    db,
    SESSION_KEYS.ACTIVE_POSITION,
    String(next),
    language
  );

  return next;
}

/**
 * Increments correct_streak for the word. Removes it from active_words
 * once the streak reaches 3, incrementing the session counter that matches
 * how the word was added (new word learned vs word reviewed).
 */
export async function recordCorrectAnswer(db, wordId) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return { removed: false, correctStreak: 0 };
  }

  await incrementActiveWordStreak(db, wordId, language);

  const row = await selectActiveWordStreakAndAddedAs(db, wordId, language);

  if (row != null && row.correct_streak >= 3) {
    await deleteActiveWord(db, wordId, language);

    const counterKey =
      row.added_as === ADDED_AS.REVIEW
        ? SESSION_KEYS.WORDS_REVIEWED
        : SESSION_KEYS.NEW_WORDS_LEARNED;
    const current = await getSessionCounter(db, counterKey);
    await setSessionCounter(db, counterKey, current + 1);

    return { removed: true, correctStreak: row.correct_streak };
  }

  return { removed: false, correctStreak: row?.correct_streak ?? 0 };
}

/** Resets correct_streak after an incorrect first attempt on an active word. */
export async function recordIncorrectAnswer(db, wordId) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return;
  }

  await resetActiveWordStreak(db, wordId, language);
}

/**
 * Builds one correct translation + 3 incorrect ones for the exercise.
 * Incorrect options prefer words with the same language and level; when the
 * level has too few words, they are topped up from other levels.
 */
export async function getAnswerOptions(db, word, nativeLanguageName) {
  const nativeLanguage = LANGUAGE_CODES[nativeLanguageName];
  if (nativeLanguage == null) {
    return null;
  }

  const correct = await selectTranslation(db, word.id, nativeLanguage);

  if (correct == null) {
    return null;
  }

  const sameLevel = await selectSameLevelDistractors(
    db,
    word.language,
    word.level,
    word.id,
    nativeLanguage,
    correct.translation
  );

  const distractors = sameLevel.map((row) => row.translation);

  if (distractors.length < 3) {
    const otherLevels = await selectOtherLevelDistractors(
      db,
      word.language,
      word.level,
      word.id,
      nativeLanguage,
      correct.translation,
      distractors,
      3 - distractors.length
    );

    distractors.push(...otherLevels.map((row) => row.translation));
  }

  if (distractors.length < 3) {
    return null;
  }

  const options = shuffle([correct.translation, ...distractors]);

  return {
    options,
    correctAnswer: correct.translation,
  };
}

/** Loads the next exercise word together with shuffled answer options. */
export async function loadExercise(db, nativeLanguageName) {
  const word = await getNextWord(db);
  if (word == null) {
    return null;
  }

  const answers = await getAnswerOptions(db, word, nativeLanguageName);
  if (answers == null) {
    return null;
  }

  return {
    ...word,
    source: EXERCISE_SOURCES.ACTIVE,
    options: answers.options,
    correctAnswer: answers.correctAnswer,
  };
}

/**
 * Due LEARNING words (next_review_at in the past), not currently in the
 * active pool. Ordered by soonest due first.
 */
export async function getDueLearningWords(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return [];
  }

  return selectDueLearningWords(
    db,
    language,
    WORD_STATES.LEARNING,
    Date.now()
  );
}

/**
 * Soonest future review time for a LEARNING word not in the active pool.
 * Used to refresh the Home “Words to Review” counter without polling.
 */
export async function getNearestNextReviewAt(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const now = Date.now();
  const row = await selectNearestNextReviewAt(
    db,
    language,
    WORD_STATES.LEARNING,
    now
  );

  const value = Number(row?.next_review_at);
  return Number.isFinite(value) ? value : null;
}

/** Next due LEARNING word, or null if none. */
export async function getDueLearningWord(db) {
  const words = await getDueLearningWords(db);
  return words[0] ?? null;
}

/** Loads a due review word together with shuffled answer options. */
export async function loadDueReview(db, nativeLanguageName) {
  const word = await getDueLearningWord(db);
  if (word == null) {
    return null;
  }

  const answers = await getAnswerOptions(db, word, nativeLanguageName);
  if (answers == null) {
    return null;
  }

  return {
    ...word,
    source: EXERCISE_SOURCES.REVIEW,
    options: answers.options,
    correctAnswer: answers.correctAnswer,
  };
}

/**
 * Undisplayed word at a specific level (not in learning_progress / active_words).
 */
async function getUndisplayedWordAtLevel(
  db,
  wordLanguage,
  settingsLanguage,
  level,
  { excludeWordId } = {}
) {
  return selectUndisplayedWordAtLevel(
    db,
    wordLanguage,
    settingsLanguage,
    level,
    excludeWordId
  );
}

/**
 * Next new word at the current settings level only (no level promotion here).
 */
export async function getRandomNewWord(db, learningLanguageName, levelName) {
  const wordLanguage = LANGUAGE_CODES[learningLanguageName];
  const language = await getLearningLanguage(db);
  const settings = await getSettings(db);
  const currentLevelName = settings?.level ?? levelName;
  const level = currentLevelName?.toLowerCase();

  if (wordLanguage == null || level == null || language == null) {
    return null;
  }

  return getUndisplayedWordAtLevel(db, wordLanguage, language, level);
}

/**
 * After a new word is shown: if no other undisplayed words remain on the
 * current level, advance the level cursor and record level_completed.
 *
 * Returns { promotedLevel } when the settings level changes, otherwise null.
 */
export async function resolveLevelAfterNewWordDisplayed(
  db,
  learningLanguageName,
  displayedWordId
) {
  const wordLanguage = LANGUAGE_CODES[learningLanguageName];
  const language = await getLearningLanguage(db);
  const settings = await getSettings(db);
  const currentLevelName = settings?.level;
  const startLevel = currentLevelName?.toLowerCase();

  if (wordLanguage == null || startLevel == null || language == null) {
    return null;
  }

  const startIndex = LEVELS.findIndex(
    (name) => name.toLowerCase() === startLevel
  );
  if (startIndex < 0) {
    return null;
  }

  const fromLevel =
    LEVELS.find((name) => name.toLowerCase() === startLevel) ?? currentLevelName;

  const remainingOnCurrent = await getUndisplayedWordAtLevel(
    db,
    wordLanguage,
    language,
    startLevel,
    { excludeWordId: displayedWordId }
  );

  if (remainingOnCurrent != null) {
    return null;
  }

  for (let index = startIndex + 1; index < LEVELS.length; index += 1) {
    const levelDisplay = LEVELS[index];
    const level = levelDisplay.toLowerCase();
    const word = await getUndisplayedWordAtLevel(
      db,
      wordLanguage,
      language,
      level
    );

    if (word == null) {
      continue;
    }

    await updateSettings(db, { level: levelDisplay });
    await setSessionValue(
      db,
      SESSION_KEYS.LEVEL_COMPLETED,
      JSON.stringify({
        changed: true,
        from: fromLevel,
        to: levelDisplay,
      }),
      language
    );
    return { promotedLevel: levelDisplay };
  }

  await setSessionValue(
    db,
    SESSION_KEYS.LEVEL_COMPLETED,
    JSON.stringify({ changed: false }),
    language
  );

  return null;
}

export async function addToLearningProgress(db, wordId, state) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return;
  }

  const intervalIndex = 0;
  const nextReviewAt =
    state === WORD_STATES.LEARNING
      ? Date.now() + REVIEW_INTERVALS_MS[intervalIndex]
      : null;

  await upsertLearningProgress(
    db,
    wordId,
    state,
    nextReviewAt,
    intervalIndex,
    language
  );
}

/**
 * Adds a word to active_words at the first free position (0..2).
 * addedAs (ADDED_AS.NEW | ADDED_AS.REVIEW) records how the word got here.
 */
export async function addToActiveWords(db, wordId, addedAs) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return null;
  }

  const rows = await selectActiveWordPositions(db, language);
  const used = new Set(rows.map((row) => row.position));

  let position = 0;
  while (used.has(position) && position < 3) {
    position += 1;
  }

  if (position >= 3) {
    return null;
  }

  await insertActiveWord(db, wordId, position, addedAs, language);

  return position;
}

/** Active-pool counts for the learning language, split by added_as. */
export async function getActiveWordsCounts(db) {
  const language = await getLearningLanguage(db);
  if (language == null) {
    return { new: 0, review: 0, total: 0 };
  }

  const rows = await selectActiveWordsAddedAsCounts(db, language);

  let newCount = 0;
  let reviewCount = 0;
  for (const row of rows) {
    const count = row.count ?? 0;
    if (row.added_as === ADDED_AS.REVIEW) {
      reviewCount += count;
    } else {
      newCount += count;
    }
  }

  return {
    new: newCount,
    review: reviewCount,
    total: newCount + reviewCount,
  };
}

/** Count of words currently in the active pool for the learning language. */
export async function getActiveWordsCount(db) {
  const { total } = await getActiveWordsCounts(db);
  return total;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
