// Learning-session helpers: picking the next word to show, answer options, etc.

import { LANGUAGE_CODES } from '../constants/preferences';
import { WORD_STATES } from './database';

export const SESSION_KEYS = {
  ACTIVE_POSITION: 'active_position',
  WORDS_ADDED_TODAY: 'words_added_today',
  LAST_WORDS_ADDED_DATE: 'last_words_added_date',
};

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
  const clamped = Math.max(
    0,
    Math.min(intervalIndex, REVIEW_INTERVALS_MS.length - 1)
  );
  const nextReviewAt = Date.now() + REVIEW_INTERVALS_MS[clamped];

  await db.runAsync(
    `
      UPDATE learning_progress
      SET interval_index = ?, next_review_at = ?
      WHERE word_id = ?
    `,
    clamped,
    nextReviewAt,
    wordId
  );

  return { intervalIndex: clamped, nextReviewAt };
}

/** Moves one step up the interval ladder and schedules the next review. */
export async function increaseInterval(db, wordId) {
  const row = await db.getFirstAsync(
    'SELECT interval_index FROM learning_progress WHERE word_id = ?',
    wordId
  );

  if (row == null) {
    return null;
  }

  const current = Number.isFinite(row.interval_index) ? row.interval_index : 0;
  return setReviewInterval(db, wordId, current + 1);
}

/** Moves one step down the interval ladder and schedules the next review. */
export async function decreaseInterval(db, wordId) {
  const row = await db.getFirstAsync(
    'SELECT interval_index FROM learning_progress WHERE word_id = ?',
    wordId
  );

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
  const dateRow = await db.getFirstAsync(
    'SELECT value FROM session WHERE key = ?',
    SESSION_KEYS.LAST_WORDS_ADDED_DATE
  );

  if (dateRow?.value !== todayDateString()) {
    return 0;
  }

  const countRow = await db.getFirstAsync(
    'SELECT value FROM session WHERE key = ?',
    SESSION_KEYS.WORDS_ADDED_TODAY
  );
  const count = Number(countRow?.value);
  return Number.isFinite(count) ? count : 0;
}

/** Increments words_added_today, resetting the counter when the date rolls over. */
export async function incrementWordsAddedToday(db) {
  const today = todayDateString();
  const current = await getWordsAddedToday(db);

  await db.runAsync(
    `
      INSERT INTO session (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    SESSION_KEYS.WORDS_ADDED_TODAY,
    String(current + 1)
  );
  await db.runAsync(
    `
      INSERT INTO session (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    SESSION_KEYS.LAST_WORDS_ADDED_DATE,
    today
  );

  return current + 1;
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
  const { count } = await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM active_words'
  );

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

  const settings = await db.getFirstAsync(
    'SELECT new_words_per_day FROM settings WHERE id = 1'
  );
  const dailyLimit = Number(settings?.new_words_per_day);
  const wordsAddedToday = await getWordsAddedToday(db);

  if (Number.isFinite(dailyLimit) && wordsAddedToday < dailyLimit) {
    const word = await getRandomNewWord(db, learningLanguageName, levelName);
    if (word != null) {
      return { type: STEP_TYPES.NEW_WORD, word };
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
  const row = await db.getFirstAsync(
    'SELECT value FROM session WHERE key = ?',
    SESSION_KEYS.ACTIVE_POSITION
  );
  const start = Number(row?.value);
  const position = Number.isFinite(start) ? start : 0;

  for (let offset = 0; offset < ACTIVE_WORDS_TARGET; offset += 1) {
    const candidate = (position + offset) % ACTIVE_WORDS_TARGET;
    const word = await db.getFirstAsync(
      `
        SELECT
          aw.word_id AS id,
          aw.position,
          aw.correct_streak,
          w.text,
          w.language,
          w.level
        FROM active_words aw
        JOIN words w ON w.id = aw.word_id
        WHERE aw.position = ?
      `,
      candidate
    );

    if (word != null) {
      return word;
    }
  }

  return null;
}

/** Advances active_position to the next occupied slot, wrapping within 0..2. */
export async function advanceActivePosition(db) {
  const row = await db.getFirstAsync(
    'SELECT value FROM session WHERE key = ?',
    SESSION_KEYS.ACTIVE_POSITION
  );
  const current = Number(row?.value);
  const start = Number.isFinite(current) ? current : 0;

  let next = start;
  for (let offset = 1; offset <= ACTIVE_WORDS_TARGET; offset += 1) {
    const candidate = (start + offset) % ACTIVE_WORDS_TARGET;
    const occupied = await db.getFirstAsync(
      'SELECT position FROM active_words WHERE position = ?',
      candidate
    );
    if (occupied != null) {
      next = candidate;
      break;
    }
  }

  await db.runAsync(
    `
      INSERT INTO session (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    SESSION_KEYS.ACTIVE_POSITION,
    String(next)
  );

  return next;
}

/**
 * Increments correct_streak for the word. Removes it from active_words
 * once the streak reaches 3.
 */
export async function recordCorrectAnswer(db, wordId) {
  await db.runAsync(
    `
      UPDATE active_words
      SET correct_streak = correct_streak + 1
      WHERE word_id = ?
    `,
    wordId
  );

  const row = await db.getFirstAsync(
    'SELECT correct_streak FROM active_words WHERE word_id = ?',
    wordId
  );

  if (row != null && row.correct_streak >= 3) {
    await db.runAsync('DELETE FROM active_words WHERE word_id = ?', wordId);
    return { removed: true, correctStreak: row.correct_streak };
  }

  return { removed: false, correctStreak: row?.correct_streak ?? 0 };
}

/**
 * Builds one correct translation + 3 incorrect ones for the exercise.
 * Incorrect options are random translations of other words with the same
 * language and level, into the user's native language.
 */
export async function getAnswerOptions(db, word, nativeLanguageName) {
  const nativeLanguage = LANGUAGE_CODES[nativeLanguageName];
  if (nativeLanguage == null) {
    return null;
  }

  const correct = await db.getFirstAsync(
    `
      SELECT translation
      FROM translations
      WHERE word_id = ? AND language = ?
    `,
    word.id,
    nativeLanguage
  );

  if (correct == null) {
    return null;
  }

  const distractors = await db.getAllAsync(
    `
      SELECT t.translation
      FROM words w
      JOIN translations t ON t.word_id = w.id
      WHERE w.language = ?
        AND w.level = ?
        AND w.id != ?
        AND t.language = ?
        AND t.translation != ?
      ORDER BY RANDOM()
      LIMIT 3
    `,
    word.language,
    word.level,
    word.id,
    nativeLanguage,
    correct.translation
  );

  if (distractors.length < 3) {
    return null;
  }

  const options = shuffle([
    correct.translation,
    ...distractors.map((row) => row.translation),
  ]);

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
 * Due LEARNING word (next_review_at in the past), not currently in the
 * active pool.
 */
export async function getDueLearningWord(db) {
  return db.getFirstAsync(
    `
      SELECT
        w.id,
        w.text,
        w.language,
        w.level,
        lp.interval_index,
        lp.next_review_at
      FROM learning_progress lp
      JOIN words w ON w.id = lp.word_id
      LEFT JOIN active_words aw ON aw.word_id = lp.word_id
      WHERE lp.state = ?
        AND lp.next_review_at IS NOT NULL
        AND lp.next_review_at < ?
        AND aw.word_id IS NULL
      ORDER BY lp.next_review_at ASC
      LIMIT 1
    `,
    WORD_STATES.LEARNING,
    Date.now()
  );
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
 * Random word for the user's learning language/level that is not yet in
 * learning_progress.
 */
export async function getRandomNewWord(db, learningLanguageName, levelName) {
  const language = LANGUAGE_CODES[learningLanguageName];
  const level = levelName?.toLowerCase();

  if (language == null || level == null) {
    return null;
  }

  return db.getFirstAsync(
    `
      SELECT w.id, w.text, w.language, w.level
      FROM words w
      LEFT JOIN learning_progress lp ON lp.word_id = w.id
      LEFT JOIN active_words aw ON aw.word_id = w.id
      WHERE lp.word_id IS NULL
        AND aw.word_id IS NULL
        AND w.language = ?
        AND w.level = ?
      ORDER BY RANDOM()
      LIMIT 1
    `,
    language,
    level
  );
}

export async function addToLearningProgress(db, wordId, state) {
  const intervalIndex = 0;
  const nextReviewAt =
    state === WORD_STATES.LEARNING
      ? Date.now() + REVIEW_INTERVALS_MS[intervalIndex]
      : null;

  await db.runAsync(
    `
      INSERT INTO learning_progress (word_id, state, next_review_at, interval_index)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        state = excluded.state,
        next_review_at = excluded.next_review_at,
        interval_index = excluded.interval_index
    `,
    wordId,
    state,
    nextReviewAt,
    intervalIndex
  );
}

/** Adds a word to active_words at the first free position (0..2). */
export async function addToActiveWords(db, wordId) {
  const rows = await db.getAllAsync('SELECT position FROM active_words');
  const used = new Set(rows.map((row) => row.position));

  let position = 0;
  while (used.has(position) && position < 3) {
    position += 1;
  }

  if (position >= 3) {
    return null;
  }

  await db.runAsync(
    `
      INSERT INTO active_words (word_id, position, correct_streak)
      VALUES (?, ?, 0)
    `,
    wordId,
    position
  );

  return position;
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
