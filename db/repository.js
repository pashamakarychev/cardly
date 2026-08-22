// App-facing data layer. Screens and learning code import from here;
// this module is the only caller of ./queries.

import * as queries from './queries';

export async function configureConnection(db) {
  return queries.configureConnection(db);
}

export async function getSettings(db) {
  return queries.getSettings(db);
}

export async function getLearningLanguage(db) {
  return queries.getLearningLanguage(db);
}

export async function completeOnboarding(db, values) {
  return queries.completeOnboarding(db, values);
}

export async function updateSettings(db, values) {
  return queries.updateSettings(db, values);
}

export async function getSessionValue(db, key, language) {
  return queries.getSessionValue(db, key, language);
}

export async function setSessionValue(db, key, value, language) {
  return queries.setSessionValue(db, key, value, language);
}

export async function deleteSessionValue(db, key, language) {
  return queries.deleteSessionValue(db, key, language);
}

export async function getLearningProgressIntervalIndex(db, wordId, language) {
  return queries.getLearningProgressIntervalIndex(db, wordId, language);
}

export async function updateLearningProgressReview(
  db,
  wordId,
  language,
  intervalIndex,
  nextReviewAt
) {
  return queries.updateLearningProgressReview(
    db,
    wordId,
    language,
    intervalIndex,
    nextReviewAt
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
  return queries.upsertLearningProgress(
    db,
    wordId,
    state,
    nextReviewAt,
    intervalIndex,
    language
  );
}

export async function selectDueLearningWords(db, language, state, now) {
  return queries.selectDueLearningWords(db, language, state, now);
}

export async function selectNearestNextReviewAt(db, language, state, now) {
  return queries.selectNearestNextReviewAt(db, language, state, now);
}

export async function selectActiveWordStreaks(db, language) {
  return queries.selectActiveWordStreaks(db, language);
}

export async function countActiveWords(db, language) {
  return queries.countActiveWords(db, language);
}

export async function selectActiveWordAtPosition(db, position, language) {
  return queries.selectActiveWordAtPosition(db, position, language);
}

export async function selectOccupiedActivePosition(db, position, language) {
  return queries.selectOccupiedActivePosition(db, position, language);
}

export async function incrementActiveWordStreak(db, wordId, language) {
  return queries.incrementActiveWordStreak(db, wordId, language);
}

export async function selectActiveWordStreakAndAddedAs(db, wordId, language) {
  return queries.selectActiveWordStreakAndAddedAs(db, wordId, language);
}

export async function deleteActiveWord(db, wordId, language) {
  return queries.deleteActiveWord(db, wordId, language);
}

export async function resetActiveWordStreak(db, wordId, language) {
  return queries.resetActiveWordStreak(db, wordId, language);
}

export async function selectActiveWordPositions(db, language) {
  return queries.selectActiveWordPositions(db, language);
}

export async function insertActiveWord(db, wordId, position, addedAs, language) {
  return queries.insertActiveWord(db, wordId, position, addedAs, language);
}

export async function selectActiveWordsAddedAsCounts(db, language) {
  return queries.selectActiveWordsAddedAsCounts(db, language);
}

export async function countUndisplayedWords(db, language, wordLanguage, levels) {
  return queries.countUndisplayedWords(db, language, wordLanguage, levels);
}

export async function selectTranslation(db, wordId, language) {
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
  return queries.selectSameLevelDistractors(
    db,
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

export async function selectUndisplayedWordAtLevel(
  db,
  wordLanguage,
  settingsLanguage,
  level,
  excludeWordId
) {
  return queries.selectUndisplayedWordAtLevel(
    db,
    wordLanguage,
    settingsLanguage,
    level,
    excludeWordId
  );
}
