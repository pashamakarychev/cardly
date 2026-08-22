// Data-access layer: every SQL query and db.* call lives here.
// Callers pass the expo-sqlite connection; this module does not change query results.

// TEMP: log every SQL call
function logSql(method, sql, params) {
  const text = typeof sql === 'string' ? sql.replace(/\s+/g, ' ').trim() : String(sql);
  console.log(`db ${method}: ${text}`, ...params);
}

function getFirstAsync(db, sql, ...params) {
  logSql('getFirstAsync', sql, params);
  return db.getFirstAsync(sql, ...params);
}

function getAllAsync(db, sql, ...params) {
  logSql('getAllAsync', sql, params);
  return db.getAllAsync(sql, ...params);
}

function runAsync(db, sql, ...params) {
  logSql('runAsync', sql, params);
  return db.runAsync(sql, ...params);
}

function execAsync(db, sql, ...params) {
  logSql('execAsync', sql, params);
  return db.execAsync(sql, ...params);
}

export async function configureConnection(db) {
  await execAsync(db, 'PRAGMA foreign_keys = ON');
  await execAsync(db, 'PRAGMA journal_mode = WAL');
}

export async function getSettings(db) {
  return getFirstAsync(db, 
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
  await runAsync(db, 
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
    await runAsync(db, 
      `UPDATE settings SET native_language = ? WHERE id = 1`,
      nativeLanguage
    );
  }

  if (learningLanguage != null) {
    await runAsync(db, 
      `UPDATE settings SET learning_language = ? WHERE id = 1`,
      learningLanguage
    );
  }

  if (level != null) {
    await runAsync(db, `UPDATE settings SET level = ? WHERE id = 1`, level);
  }

  if (newWordsPerDay != null) {
    await runAsync(db, 
      `UPDATE settings SET new_words_per_day = ? WHERE id = 1`,
      Number(newWordsPerDay)
    );
  }
}

export async function getSessionValue(db, key, language) {
  const row = await getFirstAsync(db, 
    'SELECT value FROM session WHERE key = ? AND language = ?',
    key,
    language
  );
  return row?.value ?? null;
}

export async function setSessionValue(db, key, value, language) {
  await runAsync(db, 
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
  await runAsync(db, 
    'DELETE FROM session WHERE key = ? AND language = ?',
    key,
    language
  );
}

export async function getLearningProgressIntervalIndex(db, wordId, language) {
  return getFirstAsync(db, 
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
  await runAsync(db, 
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
  await runAsync(db, 
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

export async function selectDueLearningWords(db, language, state, now) {
  return getAllAsync(db, 
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
      LEFT JOIN active_words aw
        ON aw.word_id = lp.word_id AND aw.language = ?
      WHERE lp.language = ?
        AND lp.state = ?
        AND lp.next_review_at IS NOT NULL
        AND CAST(lp.next_review_at AS INTEGER) <= ?
        AND aw.word_id IS NULL
      ORDER BY CAST(lp.next_review_at AS INTEGER) ASC
    `,
    language,
    language,
    state,
    now
  );
}

export async function selectNearestNextReviewAt(db, language, state, now) {
  return getFirstAsync(db, 
    `
      SELECT lp.next_review_at AS next_review_at
      FROM learning_progress lp
      LEFT JOIN active_words aw
        ON aw.word_id = lp.word_id AND aw.language = ?
      WHERE lp.language = ?
        AND lp.state = ?
        AND lp.next_review_at IS NOT NULL
        AND CAST(lp.next_review_at AS INTEGER) > ?
        AND aw.word_id IS NULL
      ORDER BY CAST(lp.next_review_at AS INTEGER) ASC
      LIMIT 1
    `,
    language,
    language,
    state,
    now
  );
}

export async function selectActiveWordStreaks(db, language) {
  return getAllAsync(db, 
    'SELECT correct_streak FROM active_words WHERE language = ?',
    language
  );
}

export async function countActiveWords(db, language) {
  return getFirstAsync(db, 
    'SELECT COUNT(*) AS count FROM active_words WHERE language = ?',
    language
  );
}

export async function selectActiveWordAtPosition(db, position, language) {
  return getFirstAsync(db, 
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
  return getFirstAsync(db, 
    'SELECT position FROM active_words WHERE position = ? AND language = ?',
    position,
    language
  );
}

export async function incrementActiveWordStreak(db, wordId, language) {
  await runAsync(db, 
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
  return getFirstAsync(db, 
    'SELECT correct_streak, added_as FROM active_words WHERE word_id = ? AND language = ?',
    wordId,
    language
  );
}

export async function deleteActiveWord(db, wordId, language) {
  await runAsync(db, 
    'DELETE FROM active_words WHERE word_id = ? AND language = ?',
    wordId,
    language
  );
}

export async function resetActiveWordStreak(db, wordId, language) {
  await runAsync(db, 
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
  return getAllAsync(db, 
    'SELECT position FROM active_words WHERE language = ?',
    language
  );
}

export async function insertActiveWord(db, wordId, position, addedAs, language) {
  await runAsync(db, 
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
  return getAllAsync(db, 
    `
      SELECT added_as, COUNT(*) AS count
      FROM active_words
      WHERE language = ?
      GROUP BY added_as
    `,
    language
  );
}

export async function countUndisplayedWords(db, language, wordLanguage, levels) {
  const placeholders = levels.map(() => '?').join(', ');
  return getFirstAsync(db, 
    `
      SELECT COUNT(*) AS count
      FROM words w
      LEFT JOIN learning_progress lp
        ON lp.word_id = w.id AND lp.language = ?
      LEFT JOIN active_words aw
        ON aw.word_id = w.id AND aw.language = ?
      WHERE lp.word_id IS NULL
        AND aw.word_id IS NULL
        AND w.language = ?
        AND w.level IN (${placeholders})
    `,
    language,
    language,
    wordLanguage,
    ...levels
  );
}

export async function selectTranslation(db, wordId, language) {
  return getFirstAsync(db, 
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
  return getAllAsync(db, 
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

  return getAllAsync(db, 
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
  excludeWordId
) {
  if (excludeWordId != null) {
    return getFirstAsync(db, 
      `
        SELECT w.id, w.text, w.language, w.level
        FROM words w
        LEFT JOIN learning_progress lp
          ON lp.word_id = w.id AND lp.language = ?
        LEFT JOIN active_words aw
          ON aw.word_id = w.id AND aw.language = ?
        WHERE lp.word_id IS NULL
          AND aw.word_id IS NULL
          AND w.language = ?
          AND w.level = ?
          AND w.id != ?
        ORDER BY RANDOM()
        LIMIT 1
      `,
      settingsLanguage,
      settingsLanguage,
      wordLanguage,
      level,
      excludeWordId
    );
  }

  return getFirstAsync(db, 
    `
      SELECT w.id, w.text, w.language, w.level
      FROM words w
      LEFT JOIN learning_progress lp
        ON lp.word_id = w.id AND lp.language = ?
      LEFT JOIN active_words aw
        ON aw.word_id = w.id AND aw.language = ?
      WHERE lp.word_id IS NULL
        AND aw.word_id IS NULL
        AND w.language = ?
        AND w.level = ?
      ORDER BY RANDOM()
      LIMIT 1
    `,
    settingsLanguage,
    settingsLanguage,
    wordLanguage,
    level
  );
}
