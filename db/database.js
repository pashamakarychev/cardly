// SQLite setup for Cardly. The database is opened via SQLiteProvider in
// App.js, which runs migrateDbIfNeeded before rendering the app.

export const DATABASE_NAME = 'cardly.db';

export const WORD_STATES = {
  NEW: 'NEW',
  LEARNING: 'LEARNING',
  LEARNED: 'LEARNED',
};

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db) {
  // Must be enabled on every connection, not just at creation time
  await db.execAsync('PRAGMA foreign_keys = ON');

  const { user_version: currentVersion } = await db.getFirstAsync(
    'PRAGMA user_version'
  );
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        text TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
        language TEXT NOT NULL,
        translation TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_translations_word_language
        ON translations(word_id, language);

      -- Single-row table holding the user's preferences
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        native_language TEXT,
        learning_language TEXT,
        level TEXT,
        new_words_per_day INTEGER
      );

      CREATE TABLE IF NOT EXISTS learning_progress (
        word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
        state TEXT NOT NULL DEFAULT 'NEW'
          CHECK (state IN ('NEW', 'LEARNING', 'LEARNED')),
        next_review_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_learning_progress_state_review
        ON learning_progress(state, next_review_at);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
