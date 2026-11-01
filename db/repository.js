// App-facing data layer. Screens and learning code import from here;
// this module is the only caller of ./queries.

import { LANGUAGE_CODES } from '../constants/preferences';
import * as cache from './cache';
import * as queries from './queries';
import { syncRecordId, timestamp } from './syncModel';

const listeners = new WeakMap();
export function subscribeToDatabase(db, callback) {
  if (!listeners.has(db)) listeners.set(db, new Set());
  listeners.get(db).add(callback);
  return () => listeners.get(db)?.delete(callback);
}
function notify(db, source) {
  listeners.get(db)?.forEach((callback) => callback(source));
}

export async function initializeSyncStorage(db, resetPersonalData) {
  await queries.initializeSyncStorage(db, resetPersonalData);
  cache.clearUserCache();
}

export async function flushDatabaseWrites(db) {
  await persistChain;
  await writeChains.get(db);
}

export async function getSyncQueue(db) {
  await flushDatabaseWrites(db);
  return queries.getSyncQueue(db);
}

function serializedWrite(db, task) {
  const pending = (writeChains.get(db) ?? Promise.resolve()).then(() => queries.withWriteTransaction(db, task));
  writeChains.set(db, pending.catch(() => {}));
  return pending;
}

export async function acknowledgeSyncEntry(db, id) {
  await serializedWrite(db, (tx) => queries.acknowledgeSyncEntry(tx, id));
}

export async function applyRemoteChanges(db, changes) {
  await flushDatabaseWrites(db);
  let changed = false;
  await serializedWrite(db, async (tx) => {
    const queued = await queries.getSyncQueue(tx);
    for (const change of changes) {
      const id = syncRecordId(change.table_name, change.payload);
      const version = await queries.getSyncVersion(tx, change.table_name, id);
      const local = await queries.selectSyncRecord(tx, change.table_name, change.payload);
      const pending = queued.filter((entry) => entry.table_name === change.table_name && entry.record_id === id);
      const latest = Math.max(timestamp(version?.last_modified_at), timestamp(local?.last_modified_at),
        ...pending.map((entry) => timestamp(JSON.parse(entry.payload).last_modified_at)));
      if (timestamp(change.last_modified_at) < latest) continue;
      const row = { ...change.payload, last_modified_at: new Date(change.last_modified_at).toISOString() };
      // Avoid invalidating caches and refreshing screens for unchanged snapshots.
      if (timestamp(change.last_modified_at) === latest && pending.length === 0 &&
          (change.deleted ? local == null : local && Object.keys(local).every((key) => local[key] === row[key]))) continue;
      await queries.applySyncRecord(tx, { ...change, payload: row });
      await queries.setSyncVersion(tx, change.table_name, id, row.last_modified_at);
      changed = true;
    }
  });
  if (changed) {
    cache.clearUserCache();
    notify(db, 'remote');
  }
}

const writeChains = new WeakMap();

function writeWithSync(db, tableName, identity, write) {
  const previous = writeChains.get(db) ?? Promise.resolve();
  const pending = previous.then(() => queries.withWriteTransaction(db, async (transaction) => {
    const before = await queries.selectSyncRecord(transaction, tableName, identity);
    await write(transaction);
    let after = await queries.selectSyncRecord(transaction, tableName, identity);
    if (JSON.stringify(before) === JSON.stringify(after)) {
      return;
    }

    const operation = before == null ? 'insert' : after == null ? 'delete' : 'update';
    // Session rows have a composite key. Language also stays in the payload
    // for word records so the receiver can scope every operation correctly.
    const recordId = tableName === 'session'
      ? JSON.stringify([identity.key, identity.language])
      : String(identity.id ?? identity.word_id);
    const version = await queries.getSyncVersion(transaction, tableName, recordId);
    const time = new Date(Math.max(Date.now(), timestamp(before?.last_modified_at) + 1,
      timestamp(version?.last_modified_at) + 1)).toISOString();
    if (after != null) {
      await queries.stampSyncRecord(transaction, tableName, identity, time);
      after = { ...after, last_modified_at: time };
    }
    await queries.setSyncVersion(transaction, tableName, recordId, time);
    await queries.insertSyncQueueEntry(
      transaction, tableName, recordId, operation, after ?? { ...before, last_modified_at: time }
    );
  }));
  // A failed write must not prevent later transactions from running.
  writeChains.set(db, pending.catch(() => {}));
  return pending.then(() => notify(db, 'local'));
}

export async function configureConnection(db) {
  return queries.configureConnection(db);
}

export async function getSettings(db) {
  const cached = cache.getSettingsCache();
  if (cached != null) {
    return { ...cached };
  }

  const row = await queries.getSettings(db);
  if (row != null) {
    cache.setSettingsCache(row);
  }
  return row;
}

export async function getLearningLanguage(db) {
  const settings = await getSettings(db);
  return settings?.learning_language ?? null;
}

export async function completeOnboarding(db, values) {
  await writeWithSync(db, 'settings', { id: 1 }, (transaction) =>
    queries.completeOnboarding(transaction, values));
  cache.setSettingsCache({
    native_language: values.nativeLanguage,
    learning_language: values.learningLanguage,
    level: values.level,
    new_words_per_day: values.newWordsPerDay,
    onboarding_completed: 1,
  });
  await ensureSelectedWordsCache(db);
}

export async function updateSettings(db, values) {
  await writeWithSync(db, 'settings', { id: 1 }, (transaction) =>
    queries.updateSettings(transaction, values));

  const patch = {};
  if (values.nativeLanguage != null) {
    patch.native_language = values.nativeLanguage;
  }
  if (values.learningLanguage != null) {
    patch.learning_language = values.learningLanguage;
  }
  if (values.level != null) {
    patch.level = values.level;
  }
  if (values.newWordsPerDay != null) {
    patch.new_words_per_day = Number(values.newWordsPerDay);
  }
  cache.patchSettingsCache(patch);
  if (patch.learning_language != null) {
    await ensureSelectedWordsCache(db);
  }
}

async function ensureSessionCache(db, language) {
  if (cache.hasSessionCache(language)) {
    return;
  }
  const rows = await queries.selectSessionRows(db, language);
  cache.setSessionLanguageCache(language, rows);
}

async function ensureActiveWordsCache(db, language) {
  if (cache.hasActiveWordsCache(language)) {
    return;
  }
  const rows = await queries.selectActiveWordRows(db, language);
  cache.setActiveWordsCache(language, rows);
}

function cachedActiveWordIds(language) {
  return cache.getActiveWordsCache(language).map((row) => row.word_id);
}

// Keep SQLite writes ordered without blocking cache reads used for the next card.
let persistChain = Promise.resolve();

function persist(task) {
  persistChain = persistChain.then(task).catch((error) => {
    console.error('Failed to persist database write', error);
  });
}

async function ensureLearningProgressCache(db, language) {
  if (cache.hasLearningProgressCache(language)) {
    return;
  }
  const rows = await queries.selectLearningProgressRows(db, language);
  cache.setLearningProgressCache(language, rows);
}

function sameId(left, right) {
  return Number(left) === Number(right);
}

function isExcludedWordId(wordId, excludeWordIds) {
  return excludeWordIds.some((id) => sameId(id, wordId));
}

function reviewTime(value) {
  if (value == null || value === '') {
    return null;
  }
  const time = Number(value);
  return Number.isFinite(time) ? time : null;
}

function normalizeWordLevel(level) {
  return level == null ? null : String(level).toLowerCase();
}

async function ensureWordsCache(db, wordLanguage) {
  if (wordLanguage == null) {
    return;
  }
  if (cache.hasWordsCache(wordLanguage)) {
    return;
  }

  const [words, translations] = await Promise.all([
    queries.selectWordsByLanguage(db, wordLanguage),
    queries.selectTranslationsForLanguage(db, wordLanguage),
  ]);
  cache.setWordsAndTranslationsCache(wordLanguage, words, translations);
}

async function ensureSelectedWordsCache(db) {
  const settings = await getSettings(db);
  const wordLanguage = LANGUAGE_CODES[settings?.learning_language];
  await ensureWordsCache(db, wordLanguage);
}

async function getWordRow(db, wordId) {
  await ensureSelectedWordsCache(db);
  const cached = cache.getWordCache(wordId);
  if (cached != null) {
    return cached;
  }
  return queries.selectWord(db, wordId);
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function excludedLearningProgressWordIds(db, language) {
  await ensureLearningProgressCache(db, language);
  return cache.getLearningProgressCache(language).map((row) => row.word_id);
}

function isUndisplayedWord(word, excludeWordId, excludeActiveIds, excludeProgressIds) {
  if (excludeWordId != null && sameId(word.id, excludeWordId)) {
    return false;
  }
  return (
    !isExcludedWordId(word.id, excludeActiveIds) &&
    !isExcludedWordId(word.id, excludeProgressIds)
  );
}

export async function getSessionValue(db, key, language) {
  await ensureSessionCache(db, language);
  return cache.getSessionCacheValue(language, key);
}

export async function setSessionValue(db, key, value, language) {
  await ensureSessionCache(db, language);
  cache.setSessionCacheValue(language, key, value);
  persist(() => writeWithSync(db, 'session', { key, language }, (transaction) =>
    queries.setSessionValue(transaction, key, value, language)));
}

export async function deleteSessionValue(db, key, language) {
  await ensureSessionCache(db, language);
  cache.deleteSessionCacheValue(language, key);
  persist(() => writeWithSync(db, 'session', { key, language }, (transaction) =>
    queries.deleteSessionValue(transaction, key, language)));
}

export async function getLearningProgressIntervalIndex(db, wordId, language) {
  await ensureLearningProgressCache(db, language);
  const row = cache
    .getLearningProgressCache(language)
    .find((item) => sameId(item.word_id, wordId));
  if (row != null) {
    return { interval_index: row.interval_index };
  }
  return null;
}

export async function updateLearningProgressReview(
  db,
  wordId,
  language,
  intervalIndex,
  nextReviewAt
) {
  await ensureLearningProgressCache(db, language);
  cache.updateLearningProgressReviewCache(
    language,
    wordId,
    intervalIndex,
    nextReviewAt
  );
  persist(() => writeWithSync(db, 'learning_progress', { word_id: wordId, language }, (transaction) =>
    queries.updateLearningProgressReview(
      transaction,
      wordId,
      language,
      intervalIndex,
      nextReviewAt
    )
  ));
}

export async function upsertLearningProgress(
  db,
  wordId,
  state,
  nextReviewAt,
  intervalIndex,
  language
) {
  await ensureLearningProgressCache(db, language);
  const existing = cache
    .getLearningProgressCache(language)
    .find((item) => sameId(item.word_id, wordId));
  const word = existing == null ? await getWordRow(db, wordId) : null;
  cache.upsertLearningProgressCache(language, {
    word_id: wordId,
    state,
    next_review_at: nextReviewAt,
    interval_index: intervalIndex,
    language,
    text: existing?.text ?? word?.text,
    word_language: existing?.word_language ?? word?.language,
    level: existing?.level ?? word?.level,
  });
  persist(() => writeWithSync(db, 'learning_progress', { word_id: wordId, language }, (transaction) =>
    queries.upsertLearningProgress(
      transaction,
      wordId,
      state,
      nextReviewAt,
      intervalIndex,
      language
    )
  ));
}

export async function selectDueLearningWords(db, language, state, now) {
  await ensureActiveWordsCache(db, language);
  await ensureLearningProgressCache(db, language);
  const excludeWordIds = cachedActiveWordIds(language);

  return cache
    .getLearningProgressCache(language)
    .filter((row) => {
      if (row.state !== state) {
        return false;
      }
      const time = reviewTime(row.next_review_at);
      return (
        time != null &&
        time <= now &&
        !isExcludedWordId(row.word_id, excludeWordIds)
      );
    })
    .sort((left, right) => reviewTime(left.next_review_at) - reviewTime(right.next_review_at))
    .map((row) => ({
      id: row.word_id,
      text: row.text,
      language: row.word_language,
      level: row.level,
      interval_index: row.interval_index,
      next_review_at: row.next_review_at,
    }));
}

export async function selectNearestNextReviewAt(db, language, state, now) {
  await ensureActiveWordsCache(db, language);
  await ensureLearningProgressCache(db, language);
  const excludeWordIds = cachedActiveWordIds(language);

  let nearest = null;
  for (const row of cache.getLearningProgressCache(language)) {
    if (row.state !== state) {
      continue;
    }
    const time = reviewTime(row.next_review_at);
    if (
      time == null ||
      time <= now ||
      isExcludedWordId(row.word_id, excludeWordIds)
    ) {
      continue;
    }
    if (nearest == null || time < nearest) {
      nearest = time;
    }
  }

  return nearest == null ? null : { next_review_at: nearest };
}

export async function selectActiveWordStreaks(db, language) {
  await ensureActiveWordsCache(db, language);
  return cache
    .getActiveWordsCache(language)
    .map((row) => ({ correct_streak: row.correct_streak }));
}

export async function countActiveWords(db, language) {
  await ensureActiveWordsCache(db, language);
  return { count: cache.getActiveWordsCache(language).length };
}

export async function selectActiveWordAtPosition(db, position, language) {
  await ensureActiveWordsCache(db, language);
  const row = cache
    .getActiveWordsCache(language)
    .find((item) => Number(item.position) === Number(position));
  if (row == null) {
    return null;
  }
  return {
    id: row.word_id,
    position: row.position,
    correct_streak: row.correct_streak,
    text: row.text,
    language: row.word_language,
    level: row.level,
  };
}

export async function selectOccupiedActivePosition(db, position, language) {
  await ensureActiveWordsCache(db, language);
  const row = cache
    .getActiveWordsCache(language)
    .find((item) => Number(item.position) === Number(position));
  return row == null ? null : { position: row.position };
}

export async function incrementActiveWordStreak(db, wordId, language) {
  await ensureActiveWordsCache(db, language);
  cache.incrementActiveWordStreakCache(language, wordId);
  persist(() => writeWithSync(db, 'active_words', { word_id: wordId, language }, (transaction) =>
    queries.incrementActiveWordStreak(transaction, wordId, language)));
}

export async function selectActiveWordStreakAndAddedAs(db, wordId, language) {
  await ensureActiveWordsCache(db, language);
  const row = cache
    .getActiveWordsCache(language)
    .find((item) => Number(item.word_id) === Number(wordId));
  if (row == null) {
    return null;
  }
  return {
    correct_streak: row.correct_streak,
    added_as: row.added_as,
  };
}

export async function deleteActiveWord(db, wordId, language) {
  await ensureActiveWordsCache(db, language);
  cache.deleteActiveWordCache(language, wordId);
  persist(() => writeWithSync(db, 'active_words', { word_id: wordId, language }, (transaction) =>
    queries.deleteActiveWord(transaction, wordId, language)));
}

export async function resetActiveWordStreak(db, wordId, language) {
  await ensureActiveWordsCache(db, language);
  cache.resetActiveWordStreakCache(language, wordId);
  persist(() => writeWithSync(db, 'active_words', { word_id: wordId, language }, (transaction) =>
    queries.resetActiveWordStreak(transaction, wordId, language)));
}

export async function selectActiveWordPositions(db, language) {
  await ensureActiveWordsCache(db, language);
  return cache
    .getActiveWordsCache(language)
    .map((row) => ({ position: row.position }));
}

export async function insertActiveWord(db, wordId, position, addedAs, language) {
  await ensureActiveWordsCache(db, language);
  const word = await getWordRow(db, wordId);
  cache.insertActiveWordCache(language, {
    word_id: wordId,
    position,
    correct_streak: 0,
    added_as: addedAs,
    language,
    text: word?.text,
    word_language: word?.language,
    level: word?.level,
  });
  persist(() => writeWithSync(db, 'active_words', { word_id: wordId, language }, (transaction) =>
    queries.insertActiveWord(transaction, wordId, position, addedAs, language)
  ));
}

export async function selectActiveWordsAddedAsCounts(db, language) {
  await ensureActiveWordsCache(db, language);
  const counts = new Map();
  for (const row of cache.getActiveWordsCache(language)) {
    counts.set(row.added_as, (counts.get(row.added_as) ?? 0) + 1);
  }
  return [...counts.entries()].map(([added_as, count]) => ({
    added_as,
    count,
  }));
}

export async function countUndisplayedWords(db, language, wordLanguage, levels) {
  await ensureActiveWordsCache(db, language);
  await ensureSelectedWordsCache(db);
  const excludeActiveIds = cachedActiveWordIds(language);
  const excludeProgressIds = await excludedLearningProgressWordIds(
    db,
    language
  );

  if (!cache.hasWordsCache(wordLanguage)) {
    return queries.countUndisplayedWords(
      db,
      language,
      wordLanguage,
      levels,
      excludeActiveIds
    );
  }

  let count = 0;
  for (const level of levels) {
    count += cache
      .getWordsCache(wordLanguage, normalizeWordLevel(level))
      .filter((word) =>
        isUndisplayedWord(word, null, excludeActiveIds, excludeProgressIds)
      ).length;
  }

  return { count };
}

export async function selectTranslation(db, wordId, language) {
  await ensureSelectedWordsCache(db);
  const translations = cache.getTranslationsCache(wordId);
  if (translations != null) {
    const row = translations.find((item) => item.language === language);
    return row == null ? null : { translation: row.translation };
  }
  return queries.selectTranslation(db, wordId, language);
}

export async function selectSameLevelDistractors(
  db,
  wordLanguage,
  level,
  wordId,
  nativeLanguage,
  correctTranslation
) {
  await ensureSelectedWordsCache(db);
  if (!cache.hasWordsCache(wordLanguage)) {
    return queries.selectSameLevelDistractors(
      db,
      wordLanguage,
      level,
      wordId,
      nativeLanguage,
      correctTranslation
    );
  }

  const seen = new Set();
  const options = [];
  for (const word of cache.getWordsCache(
    wordLanguage,
    normalizeWordLevel(level)
  )) {
    if (sameId(word.id, wordId)) {
      continue;
    }
    const translations = cache.getTranslationsCache(word.id) ?? [];
    for (const row of translations) {
      if (
        row.language !== nativeLanguage ||
        row.translation === correctTranslation ||
        seen.has(row.translation)
      ) {
        continue;
      }
      seen.add(row.translation);
      options.push(row.translation);
    }
  }

  return shuffle(options)
    .slice(0, 3)
    .map((translation) => ({ translation }));
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
  await ensureSelectedWordsCache(db);
  if (!cache.hasWordsCache(wordLanguage)) {
    return queries.selectOtherLevelDistractors(
      db,
      wordLanguage,
      level,
      wordId,
      nativeLanguage,
      correctTranslation,
      excludeTranslations,
      limit
    );
  }

  const normalizedLevel = normalizeWordLevel(level);
  const excluded = new Set(excludeTranslations);
  const seen = new Set();
  const options = [];
  for (const word of cache.getWordsCache(wordLanguage)) {
    if (
      sameId(word.id, wordId) ||
      String(word.level).toLowerCase() === normalizedLevel
    ) {
      continue;
    }
    const translations = cache.getTranslationsCache(word.id) ?? [];
    for (const row of translations) {
      if (
        row.language !== nativeLanguage ||
        row.translation === correctTranslation ||
        excluded.has(row.translation) ||
        seen.has(row.translation)
      ) {
        continue;
      }
      seen.add(row.translation);
      options.push(row.translation);
    }
  }

  return shuffle(options)
    .slice(0, limit)
    .map((translation) => ({ translation }));
}

export async function selectUndisplayedWordAtLevel(
  db,
  wordLanguage,
  settingsLanguage,
  level,
  excludeWordId
) {
  await ensureActiveWordsCache(db, settingsLanguage);
  await ensureSelectedWordsCache(db);
  if (!cache.hasWordsCache(wordLanguage)) {
    return queries.selectUndisplayedWordAtLevel(
      db,
      wordLanguage,
      settingsLanguage,
      level,
      excludeWordId,
      cachedActiveWordIds(settingsLanguage)
    );
  }

  const excludeActiveIds = cachedActiveWordIds(settingsLanguage);
  const excludeProgressIds = await excludedLearningProgressWordIds(
    db,
    settingsLanguage
  );
  const candidates = cache
    .getWordsCache(wordLanguage, normalizeWordLevel(level))
    .filter((word) =>
      isUndisplayedWord(
        word,
        excludeWordId,
        excludeActiveIds,
        excludeProgressIds
      )
    );
  if (candidates.length === 0) {
    return null;
  }

  const word = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    id: word.id,
    text: word.text,
    language: word.language,
    level: word.level,
  };
}
