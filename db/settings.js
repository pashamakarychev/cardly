// Settings queries against the single-row settings table.

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

/** Updates one or more settings fields. Only provided keys are written. */
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
    await db.runAsync(`UPDATE settings SET level = ? WHERE id = 1`, level);
  }

  if (newWordsPerDay != null) {
    await db.runAsync(
      `UPDATE settings SET new_words_per_day = ? WHERE id = 1`,
      Number(newWordsPerDay)
    );
  }
}
