import * as queries from './queries';

// Runs for databases that were copied before the analytics setting existed.
export async function migrateLocalDatabase(db) {
  await queries.addAnalyticsSettingIfMissing(db);
}
