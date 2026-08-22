// Data-access layer: every SQL query and db.* call lives here.
// Callers pass the expo-sqlite connection; this module does not change query results.

export async function configureConnection(db) {
  await db.execAsync( 'PRAGMA foreign_keys = ON');
  await db.execAsync( 'PRAGMA journal_mode = WAL');
}

export async function getSettings(db) {
  return db.getFirstAsync( 
    `
      SELECT
        native_language,
        learning_language,
        level,
        new_words_per_day,
        onboarding_completed
      FROM settings
      WHERE id = 1
    `
  );
}

/** Current learning_language from settings, or null if unset. */
export async function getLearningLanguage(db) {
  const settings = await getSettings(db);
  return settings?.learning_language ?? null;
}

export async function completeOnboarding(
  db,
  { nativeLanguage, learningLanguage, level, newWordsPerDay }
) {
  await db.runAsync( 
    `
      INSERT INTO settings (
        id,
        native_language,
        learning_language,
        level,
        new_words_per_day,
        onboarding_completed
      ) VALUES (1, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        native_language = excluded.native_language,
        learning_language = excluded.learning_language,
        level = excluded.level,
        new_words_per_day = excluded.new_words_per_day,
        onboarding_completed = 1
    `,
    nativeLanguage,
    learningLanguage,
    level,
    newWordsPerDay
  );
}

export async function updateSettings(
  db,
  { nativeLanguage, learningLanguage, level, newWordsPerDay }
) {
  if (nativeLanguage != null) {
    await db.runAsync( 
      `UPDATE settings SET native_language = ? WHERE id = 1`,
      nativeLanguage
    );
  }

  if (learningLanguage != null) {
    await db.runAsync( 
      `UPDATE settings SET learning_language = ? WHERE id = 1`,
      learningLanguage
    );
  }

  if (level != null) {
    await db.runAsync( `UPDATE settings SET level = ? WHERE id = 1`, level);
  }

  if (newWordsPerDay != null) {
    await db.runAsync( 
      `UPDATE settings SET new_words_per_day = ? WHERE id = 1`,
      Number(newWordsPerDay)
    );
  }
}

function notInClause(column, ids) {
  if (ids.length === 0) {
    return { sql: '', params: [] };
  }
  const placeholders = ids.map(() => '?').join(', ');
  return {
    sql: `AND ${column} NOT IN (${placeholders})`,
    params: ids,
  };
}

export async function selectSessionRows(db, language) {
  return db.getAllAsync(
    'SELECT key, value FROM session WHERE language = ?',
    language
  );
}

export async function getSessionValue(db, key, language) {
  const row = await db.getFirstAsync( 
    'SELECT value FROM session WHERE key = ? AND language = ?',
    key,
    language
  );
  return row?.value ?? null;
}

export async function setSessionValue(db, key, value, language) {
  await db.runAsync( 
    `
      INSERT INTO session (key, value, language) VALUES (?, ?, ?)
      ON CONFLICT(key, language) DO UPDATE SET value = excluded.value
    `,
    key,
    value,
    language
  );
}

export async function deleteSessionValue(db, key, language) {
  await db.runAsync( 
    'DELETE FROM session WHERE key = ? AND language = ?',
    key,
    language
  );
}

export async function selectLearningProgressRows(db, language) {
  return db.getAllAsync(
    `
      SELECT
        lp.word_id,
        lp.state,
        lp.next_review_at,
        lp.interval_index,
        lp.language,
        w.text,
        w.language AS word_language,
        w.level
      FROM learning_progress lp
      JOIN words w ON w.id = lp.word_id
      WHERE lp.language = ?
    `,
    language
  );
}

export async function getLearningProgressIntervalIndex(db, wordId, language) {
  return db.getFirstAsync( 
    'SELECT interval_index FROM learning_progress WHERE word_id = ? AND language = ?',
    wordId,
    language
  );
}

export async function updateLearningProgressReview(
  db,
  wordId,
  language,
  intervalIndex,
  nextReviewAt
) {
  await db.runAsync( 
    `
      UPDATE learning_progress
      SET interval_index = ?, next_review_at = ?
      WHERE word_id = ? AND language = ?
    `,
    intervalIndex,
    nextReviewAt,
    wordId,
    language
  );
}

export async function upsertLearningProgress(
  db,
  wordId,
  state,
  nextReviewAt,
  intervalIndex,
  language
) {
  await db.runAsync( 
    `
      INSERT INTO learning_progress (word_id, state, next_review_at, interval_index, language)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        state = excluded.state,
        next_review_at = excluded.next_review_at,
        interval_index = excluded.interval_index,
        language = excluded.language
    `,
    wordId,
    state,
    nextReviewAt,
    intervalIndex,
    language
  );
}

export async function selectDueLearningWords(
  db,
  language,
  state,
  now,
  excludeWordIds = []
) {
  const exclude = notInClause('lp.word_id', excludeWordIds);
  return db.getAllAsync(
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
      WHERE lp.language = ?
        AND lp.state = ?
        AND lp.next_review_at IS NOT NULL
        AND CAST(lp.next_review_at AS INTEGER) <= ?
        ${exclude.sql}
      ORDER BY CAST(lp.next_review_at AS INTEGER) ASC
    `,
    language,
    state,
    now,
    ...exclude.params
  );
}

export async function selectNearestNextReviewAt(
  db,
  language,
  state,
  now,
  excludeWordIds = []
) {
  const exclude = notInClause('lp.word_id', excludeWordIds);
  return db.getFirstAsync(
    `
      SELECT lp.next_review_at AS next_review_at
      FROM learning_progress lp
      WHERE lp.language = ?
        AND lp.state = ?
        AND lp.next_review_at IS NOT NULL
        AND CAST(lp.next_review_at AS INTEGER) > ?
        ${exclude.sql}
      ORDER BY CAST(lp.next_review_at AS INTEGER) ASC
      LIMIT 1
    `,
    language,
    state,
    now,
    ...exclude.params
  );
}

export async function selectActiveWordRows(db, language) {
  return db.getAllAsync(
    `
      SELECT
        aw.word_id,
        aw.position,
        aw.correct_streak,
        aw.added_as,
        aw.language,
        w.text,
        w.language AS word_language,
        w.level
      FROM active_words aw
      JOIN words w ON w.id = aw.word_id
      WHERE aw.language = ?
    `,
    language
  );
}

export async function selectWord(db, wordId) {
  return db.getFirstAsync(
    'SELECT id, text, language, level FROM words WHERE id = ?',
    wordId
  );
}

export async function selectWordsByLanguage(db, wordLanguage) {
  return db.getAllAsync(
    `
      SELECT id, text, language, level
      FROM words
      WHERE language = ?
    `,
    wordLanguage
  );
}

export async function selectTranslationsForLanguage(db, wordLanguage) {
  return db.getAllAsync(
    `
      SELECT t.word_id, t.language, t.translation
      FROM translations t
      JOIN words w ON w.id = t.word_id
      WHERE w.language = ?
    `,
    wordLanguage
  );
}

export async function selectActiveWordStreaks(db, language) {
  return db.getAllAsync( 
    'SELECT correct_streak FROM active_words WHERE language = ?',
    language
  );
}

export async function countActiveWords(db, language) {
  return db.getFirstAsync( 
    'SELECT COUNT(*) AS count FROM active_words WHERE language = ?',
    language
  );
}

export async function selectActiveWordAtPosition(db, position, language) {
  return db.getFirstAsync( 
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
      WHERE aw.position = ? AND aw.language = ?
    `,
    position,
    language
  );
}

export async function selectOccupiedActivePosition(db, position, language) {
  return db.getFirstAsync( 
    'SELECT position FROM active_words WHERE position = ? AND language = ?',
    position,
    language
  );
}

export async function incrementActiveWordStreak(db, wordId, language) {
  await db.runAsync( 
    `
      UPDATE active_words
      SET correct_streak = correct_streak + 1
      WHERE word_id = ? AND language = ?
    `,
    wordId,
    language
  );
}

export async function selectActiveWordStreakAndAddedAs(db, wordId, language) {
  return db.getFirstAsync( 
    'SELECT correct_streak, added_as FROM active_words WHERE word_id = ? AND language = ?',
    wordId,
    language
  );
}

export async function deleteActiveWord(db, wordId, language) {
  await db.runAsync( 
    'DELETE FROM active_words WHERE word_id = ? AND language = ?',
    wordId,
    language
  );
}

export async function resetActiveWordStreak(db, wordId, language) {
  await db.runAsync( 
    `
      UPDATE active_words
      SET correct_streak = 0
      WHERE word_id = ? AND language = ?
    `,
    wordId,
    language
  );
}

export async function selectActiveWordPositions(db, language) {
  return db.getAllAsync( 
    'SELECT position FROM active_words WHERE language = ?',
    language
  );
}

export async function insertActiveWord(db, wordId, position, addedAs, language) {
  await db.runAsync( 
    `
      INSERT INTO active_words (word_id, position, correct_streak, added_as, language)
      VALUES (?, ?, 0, ?, ?)
    `,
    wordId,
    position,
    addedAs,
    language
  );
}

export async function selectActiveWordsAddedAsCounts(db, language) {
  return db.getAllAsync( 
    `
      SELECT added_as, COUNT(*) AS count
      FROM active_words
      WHERE language = ?
      GROUP BY added_as
    `,
    language
  );
}

export async function countUndisplayedWords(
  db,
  language,
  wordLanguage,
  levels,
  excludeWordIds = []
) {
  const placeholders = levels.map(() => '?').join(', ');
  const exclude = notInClause('w.id', excludeWordIds);
  return db.getFirstAsync(
    `
      SELECT COUNT(*) AS count
      FROM words w
      LEFT JOIN learning_progress lp
        ON lp.word_id = w.id AND lp.language = ?
      WHERE lp.word_id IS NULL
        AND w.language = ?
        AND w.level IN (${placeholders})
        ${exclude.sql}
    `,
    language,
    wordLanguage,
    ...levels,
    ...exclude.params
  );
}

export async function selectTranslation(db, wordId, language) {
  return db.getFirstAsync( 
    `
      SELECT translation
      FROM translations
      WHERE word_id = ? AND language = ?
    `,
    wordId,
    language
  );
}

export async function selectSameLevelDistractors(
  db,
  wordLanguage,
  level,
  wordId,
  nativeLanguage,
  correctTranslation
) {
  return db.getAllAsync( 
    `
      SELECT DISTINCT t.translation
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
    wordLanguage,
    level,
    wordId,
    nativeLanguage,
    correctTranslation
  );
}

export async function selectOtherLevelDistractors(
  db,
  wordLanguage,
  level,
  wordId,
  nativeLanguage,
  correctTranslation,
  excludeTranslations,
  limit
) {
  const placeholders = excludeTranslations.map(() => '?').join(', ');
  const exclusions =
    excludeTranslations.length > 0
      ? `AND t.translation NOT IN (${placeholders})`
      : '';

  return db.getAllAsync( 
    `
      SELECT DISTINCT t.translation
      FROM words w
      JOIN translations t ON t.word_id = w.id
      WHERE w.language = ?
        AND w.level != ?
        AND w.id != ?
        AND t.language = ?
        AND t.translation != ?
        ${exclusions}
      ORDER BY RANDOM()
      LIMIT ?
    `,
    wordLanguage,
    level,
    wordId,
    nativeLanguage,
    correctTranslation,
    ...excludeTranslations,
    limit
  );
}

export async function selectUndisplayedWordAtLevel(
  db,
  wordLanguage,
  settingsLanguage,
  level,
  excludeWordId,
  excludeActiveWordIds = []
) {
  const excludeIds = [...excludeActiveWordIds];
  if (excludeWordId != null) {
    excludeIds.push(excludeWordId);
  }
  const exclude = notInClause('w.id', excludeIds);

  return db.getFirstAsync(
    `
      SELECT w.id, w.text, w.language, w.level
      FROM words w
      LEFT JOIN learning_progress lp
        ON lp.word_id = w.id AND lp.language = ?
      WHERE lp.word_id IS NULL
        AND w.language = ?
        AND w.level = ?
        ${exclude.sql}
      ORDER BY RANDOM()
      LIMIT 1
    `,
    settingsLanguage,
    wordLanguage,
    level,
    ...exclude.params
  );
}
