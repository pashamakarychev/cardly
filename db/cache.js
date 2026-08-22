// In-memory cache. Settings, session, active_words, learning_progress,
// and words/translations for the selected language.

let settings = null;
const sessionByLanguage = new Map();
const activeWordsByLanguage = new Map();
const learningProgressByLanguage = new Map();
const wordsByLanguage = new Map();
const wordsById = new Map();
const translationsByWordId = new Map();

export function getSettingsCache() {
  return settings;
}

export function setSettingsCache(row) {
  if (row == null) {
    settings = null;
    return;
  }

  settings = {
    native_language: row.native_language,
    learning_language: row.learning_language,
    level: row.level,
    new_words_per_day: row.new_words_per_day,
    onboarding_completed: row.onboarding_completed,
  };
}

export function patchSettingsCache(patch) {
  if (settings == null) {
    return;
  }

  settings = {
    ...settings,
    ...patch,
  };
}

export function hasSessionCache(language) {
  return sessionByLanguage.has(language);
}

export function getSessionCacheValue(language, key) {
  const values = sessionByLanguage.get(language);
  if (values == null || !values.has(key)) {
    return null;
  }
  return values.get(key);
}

export function setSessionLanguageCache(language, rows) {
  const values = new Map();
  for (const row of rows) {
    values.set(row.key, row.value);
  }
  sessionByLanguage.set(language, values);
}

export function setSessionCacheValue(language, key, value) {
  let values = sessionByLanguage.get(language);
  if (values == null) {
    values = new Map();
    sessionByLanguage.set(language, values);
  }
  values.set(key, value);
}

export function deleteSessionCacheValue(language, key) {
  const values = sessionByLanguage.get(language);
  if (values == null) {
    return;
  }
  values.delete(key);
}

function cloneActiveWord(row) {
  return {
    word_id: row.word_id,
    position: row.position,
    correct_streak: row.correct_streak,
    added_as: row.added_as,
    language: row.language,
    text: row.text,
    word_language: row.word_language,
    level: row.level,
  };
}

function sameWordId(left, right) {
  return Number(left) === Number(right);
}

export function hasActiveWordsCache(language) {
  return activeWordsByLanguage.has(language);
}

export function getActiveWordsCache(language) {
  const rows = activeWordsByLanguage.get(language);
  if (rows == null) {
    return null;
  }
  return rows.map(cloneActiveWord);
}

export function setActiveWordsCache(language, rows) {
  activeWordsByLanguage.set(language, rows.map(cloneActiveWord));
}

export function incrementActiveWordStreakCache(language, wordId) {
  const rows = activeWordsByLanguage.get(language);
  const row = rows?.find((item) => sameWordId(item.word_id, wordId));
  if (row == null) {
    return;
  }
  row.correct_streak += 1;
}

export function resetActiveWordStreakCache(language, wordId) {
  const rows = activeWordsByLanguage.get(language);
  const row = rows?.find((item) => sameWordId(item.word_id, wordId));
  if (row == null) {
    return;
  }
  row.correct_streak = 0;
}

export function deleteActiveWordCache(language, wordId) {
  const rows = activeWordsByLanguage.get(language);
  if (rows == null) {
    return;
  }
  activeWordsByLanguage.set(
    language,
    rows.filter((item) => !sameWordId(item.word_id, wordId))
  );
}

export function insertActiveWordCache(language, row) {
  const rows = activeWordsByLanguage.get(language);
  if (rows == null) {
    activeWordsByLanguage.set(language, [cloneActiveWord(row)]);
    return;
  }
  rows.push(cloneActiveWord(row));
}

function cloneLearningProgress(row) {
  return {
    word_id: row.word_id,
    state: row.state,
    next_review_at: row.next_review_at,
    interval_index: row.interval_index,
    language: row.language,
    text: row.text,
    word_language: row.word_language,
    level: row.level,
  };
}

export function hasLearningProgressCache(language) {
  return learningProgressByLanguage.has(language);
}

export function getLearningProgressCache(language) {
  const rows = learningProgressByLanguage.get(language);
  if (rows == null) {
    return null;
  }
  return rows.map(cloneLearningProgress);
}

export function setLearningProgressCache(language, rows) {
  learningProgressByLanguage.set(language, rows.map(cloneLearningProgress));
}

export function upsertLearningProgressCache(language, row) {
  const rows = learningProgressByLanguage.get(language);
  const next = cloneLearningProgress(row);
  if (rows == null) {
    learningProgressByLanguage.set(language, [next]);
    return;
  }

  const index = rows.findIndex((item) => sameWordId(item.word_id, row.word_id));
  if (index >= 0) {
    rows[index] = next;
    return;
  }
  rows.push(next);
}

export function updateLearningProgressReviewCache(
  language,
  wordId,
  intervalIndex,
  nextReviewAt
) {
  const rows = learningProgressByLanguage.get(language);
  const row = rows?.find((item) => sameWordId(item.word_id, wordId));
  if (row == null) {
    return;
  }
  row.interval_index = intervalIndex;
  row.next_review_at = nextReviewAt;
}

export function deleteLearningProgressCache(language, wordId) {
  const rows = learningProgressByLanguage.get(language);
  if (rows == null) {
    return;
  }
  learningProgressByLanguage.set(
    language,
    rows.filter((item) => !sameWordId(item.word_id, wordId))
  );
}

function cloneWord(row) {
  return {
    id: row.id,
    text: row.text,
    language: row.language,
    level: row.level,
  };
}

function cloneTranslation(row) {
  return {
    language: row.language,
    translation: row.translation,
  };
}

export function hasWordsCache(wordLanguage) {
  return wordsByLanguage.has(wordLanguage);
}

export function getWordsCache(wordLanguage, level) {
  const rows = wordsByLanguage.get(wordLanguage);
  if (rows == null) {
    return null;
  }

  const cloned = rows.map(cloneWord);
  if (level == null) {
    return cloned;
  }

  const normalizedLevel = String(level).toLowerCase();
  return cloned.filter(
    (word) => String(word.level).toLowerCase() === normalizedLevel
  );
}

export function getWordCache(wordId) {
  const row = wordsById.get(Number(wordId));
  return row == null ? null : cloneWord(row);
}

export function getTranslationsCache(wordId) {
  const rows = translationsByWordId.get(Number(wordId));
  if (rows == null) {
    return null;
  }
  return rows.map(cloneTranslation);
}

export function setWordsAndTranslationsCache(wordLanguage, words, translations) {
  const clonedWords = words.map(cloneWord);
  wordsByLanguage.set(wordLanguage, clonedWords);

  for (const word of clonedWords) {
    wordsById.set(Number(word.id), cloneWord(word));
  }

  const grouped = new Map();
  for (const row of translations) {
    const id = Number(row.word_id);
    if (!grouped.has(id)) {
      grouped.set(id, []);
    }
    grouped.get(id).push(cloneTranslation(row));
  }

  for (const word of clonedWords) {
    translationsByWordId.set(
      Number(word.id),
      grouped.get(Number(word.id)) ?? []
    );
  }
}
