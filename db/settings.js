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
