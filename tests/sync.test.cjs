const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const names = [...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((match) => match[1]);
  return new Function(...Object.keys(dependencies), source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + `\nreturn {${names.join(',')}};`)(...Object.values(dependencies));
}

test('queue timestamps, conflict resolution, tombstones and no sync echo', async () => {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database(fs.readFileSync(path.join(__dirname, '../db/cardly.db')));
  const model = load('db/syncModel.js');
  const queries = load('db/queries.js', model);
  const cache = load('db/cache.js');
  const repo = load('db/repository.js', { ...model, queries, cache, LANGUAGE_CODES: {} });
  const select = (sql, params, first) => {
    const statement = sqlite.prepare(sql);
    try {
      statement.bind(params);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return first ? rows[0] ?? null : rows;
    } finally { statement.free(); }
  };
  const db = {
    execAsync: async (sql) => sqlite.run(sql),
    runAsync: async (sql, ...params) => sqlite.run(sql, params),
    getFirstAsync: async (sql, ...params) => select(sql, params, true),
    getAllAsync: async (sql, ...params) => select(sql, params, false),
    withTransactionAsync: async (task) => {
      sqlite.run('BEGIN');
      try { await task(); sqlite.run('COMMIT'); }
      catch (error) { sqlite.run('ROLLBACK'); throw error; }
    },
  };
  await repo.initializeSyncStorage(db, true);
  await repo.setSessionValue(db, 'test', 'local', 'English');
  let queue = await repo.getSyncQueue(db);
  assert.equal(queue.length, 1);
  const local = JSON.parse(queue[0].payload);
  assert.ok(Date.parse(local.last_modified_at));
  const change = (value, time, deleted = false) => ({ table_name: 'session', deleted,
    last_modified_at: time, payload: { key: 'test', language: 'English', value, last_modified_at: time } });
  await repo.applyRemoteChanges(db, [change('old', new Date(0).toISOString())]);
  assert.equal(await repo.getSessionValue(db, 'test', 'English'), 'local');
  await repo.acknowledgeSyncEntry(db, queue[0].id);
  const future = new Date(Date.now() + 5000).toISOString();
  await repo.applyRemoteChanges(db, [change('remote', future)]);
  assert.equal(await repo.getSessionValue(db, 'test', 'English'), 'remote');
  assert.equal((await repo.getSyncQueue(db)).length, 0);
  await repo.deleteSessionValue(db, 'test', 'English');
  queue = await repo.getSyncQueue(db);
  const deletion = JSON.parse(queue[0].payload);
  assert.ok(Date.parse(deletion.last_modified_at) > Date.parse(future));
  await repo.acknowledgeSyncEntry(db, queue[0].id);
  await repo.applyRemoteChanges(db, [change('stale resurrection', future)]);
  assert.equal(await repo.getSessionValue(db, 'test', 'English'), null);
  const newer = new Date(Date.parse(deletion.last_modified_at) + 1000).toISOString();
  await repo.applyRemoteChanges(db, [change('recreated', newer)]);
  assert.equal(await repo.getSessionValue(db, 'test', 'English'), 'recreated');
  const deletedAt = new Date(Date.parse(newer) + 1000).toISOString();
  await repo.applyRemoteChanges(db, [change(null, deletedAt, true)]);
  assert.equal(await repo.getSessionValue(db, 'test', 'English'), null);
  await repo.initializeSyncStorage(db, true); // Reopening must not erase existing metadata.
  assert.equal((await repo.getSyncQueue(db)).length, 0);
  sqlite.close();
});

test('sync retains failed uploads and acknowledges successful retries', async () => {
  const queue = [{ id: 'operation-1', table_name: 'session', operation: 'insert',
    payload: JSON.stringify({ key: 'test', value: '1', language: 'English', last_modified_at: new Date().toISOString() }) }];
  let offline = true;
  let account = 'account-a';
  let receivedOwner;
  let imported = 0;
  const channel = { on() { return this; }, subscribe() { return this; } };
  const query = { select() { return this; }, eq() { return this; }, order() { return this; }, range() { return this; },
    async abortSignal() { return { data: [], error: null }; } };
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: account } } } }) },
    rpc(_name, args) {
      receivedOwner = args.p_payload.user_id;
      return { abortSignal: async () => offline ? { error: new Error('offline') } : { data: null, error: null } };
    },
    from: () => query,
    channel: () => channel,
    removeChannel() {},
  };
  const engine = load('lib/sync.js', {
    supabase,
    AppState: { addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'ios' },
    getSyncQueue: async () => [...queue],
    acknowledgeSyncEntry: async (_db, id) => { queue.splice(queue.findIndex((entry) => entry.id === id), 1); },
    applyRemoteChanges: async () => { imported += 1; },
    subscribeToDatabase: () => () => {},
  });
  const db = {};
  const stop = engine.startSync(db, 'account-a');
  try {
    await assert.rejects(engine.syncDatabase(db), /offline/);
    assert.equal(queue.length, 1);
    offline = false;
    await engine.syncDatabase(db);
    assert.equal(queue.length, 0);
    assert.equal(receivedOwner, 'account-a');
    assert.equal(imported, 1);
    account = 'account-b';
    await assert.rejects(engine.syncDatabase(db), /account changed/);
    assert.equal(imported, 1);
  } finally { stop(); }
});
