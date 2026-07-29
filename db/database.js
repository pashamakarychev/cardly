// SQLite setup for Cardly. SQLiteProvider copies the bundled database into
// local storage on first launch via assetSource, then runs initDb.

export const DATABASE_NAME = 'cardly.db';

export const DATABASE_ASSET = require('./cardly.db');

export const WORD_STATES = {
  NEW: 'NEW',
  LEARNING: 'LEARNING',
  LEARNED: 'LEARNED',
  KNOWN: 'KNOWN',
};

export async function initDb(db) {
  // Must be enabled on every connection, not just at creation time
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync('PRAGMA journal_mode = WAL');
}
