export const SYNC_COLUMNS = {
  active_words: ['word_id', 'position', 'correct_streak', 'added_as', 'language', 'last_modified_at'],
  learning_progress: ['word_id', 'state', 'next_review_at', 'interval_index', 'language', 'last_modified_at'],
  session: ['key', 'value', 'language', 'last_modified_at'],
  settings: ['id', 'native_language', 'learning_language', 'level', 'new_words_per_day', 'onboarding_completed', 'last_modified_at'],
};

export function syncRecordId(table, row) {
  return table === 'session' ? JSON.stringify([row.key, row.language]) : String(row.id ?? row.word_id);
}

export function timestamp(value) {
  return value == null ? 0 : Date.parse(value);
}
