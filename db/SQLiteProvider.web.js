import { Asset } from 'expo-asset';
import { openDB } from 'idb';
import initSqlJs from 'sql.js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const SQLiteContext = createContext(null);
const STORAGE_NAME = 'cardly';
const STORAGE_VERSION = 1;
const DATABASE_STORE = 'databases';
const SQL_WASM = require('sql.js/dist/sql-wasm.wasm');

function normalizeParams(params) {
  if (params.length === 1 && (Array.isArray(params[0]) || typeof params[0] === 'object')) {
    return params[0];
  }
  return params;
}

async function getStorage() {
  return openDB(STORAGE_NAME, STORAGE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(DATABASE_STORE)) {
        database.createObjectStore(DATABASE_STORE);
      }
    },
  });
}

async function loadBundledDatabase(assetId) {
  const asset = await Asset.fromModule(assetId).downloadAsync();
  if (!asset.localUri) {
    throw new Error('Unable to load the bundled database for web.');
  }

  const response = await fetch(asset.localUri);
  if (!response.ok) {
    throw new Error('Unable to read the bundled database for web.');
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function createDatabase(databaseName, assetSource) {
  const wasmAsset = Asset.fromModule(SQL_WASM);
  await wasmAsset.downloadAsync();
  const SQL = await initSqlJs({
    locateFile: (fileName) =>
      fileName.endsWith('.wasm') ? wasmAsset.localUri ?? wasmAsset.uri : fileName,
  });

  const storage = await getStorage();
  const savedDatabase = await storage.get(DATABASE_STORE, databaseName);
  const databaseData =
    savedDatabase == null
      ? await loadBundledDatabase(assetSource?.assetId)
      : new Uint8Array(savedDatabase);
  let database = new SQL.Database(databaseData);

  // sql.js export reopens its connection and resets connection PRAGMAs.
  const exportDatabase = (connection) => {
    const foreignKeys = connection.exec('PRAGMA foreign_keys')[0]?.values[0][0] ?? 0;
    const bytes = connection.export();
    connection.run(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
    return bytes;
  };
  const persist = () => storage.put(DATABASE_STORE, exportDatabase(database), databaseName);

  let writeChain = Promise.resolve();
  const scheduleWrite = (task) => {
    const pending = writeChain.then(task);
    writeChain = pending.catch(() => {});
    return pending;
  };

  const execute = (connection, source, params, firstOnly) => {
    const statement = connection.prepare(source);
    try {
      statement.bind(params);
      const rows = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
        if (firstOnly) {
          break;
        }
      }
      return firstOnly ? rows[0] ?? null : rows;
    } finally {
      statement.free();
    }
  };

  const run = (connection, source, params) => {
    connection.run(source, normalizeParams(params));
    return {
      changes: connection.getRowsModified(),
      lastInsertRowId:
        connection.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ?? 0,
    };
  };

  return {
    async execAsync(source) {
      await scheduleWrite(async () => {
        database.run(source);
        await persist();
      });
    },
    async runAsync(source, ...params) {
      return scheduleWrite(async () => {
        const result = run(database, source, params);
        await persist();
        return result;
      });
    },
    async getAllAsync(source, ...params) {
      return execute(database, source, normalizeParams(params), false);
    },
    async getFirstAsync(source, ...params) {
      return execute(database, source, normalizeParams(params), true);
    },
    async withExclusiveTransactionAsync(task) {
      await scheduleWrite(async () => {
        // Stage the entire transaction on a separate connection. Readers see
        // committed data, and IndexedDB never receives a partial transaction.
        const foreignKeys = database.exec('PRAGMA foreign_keys')[0]?.values[0][0] ?? 0;
        const staged = new SQL.Database(exportDatabase(database));
        staged.run(`PRAGMA foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
        try {
          staged.run('BEGIN');
          await task({
            async execAsync(source) { staged.run(source); },
            async runAsync(source, ...params) { return run(staged, source, params); },
            async getAllAsync(source, ...params) {
              return execute(staged, source, normalizeParams(params), false);
            },
            async getFirstAsync(source, ...params) {
              return execute(staged, source, normalizeParams(params), true);
            },
          });
          staged.run('COMMIT');
          await storage.put(DATABASE_STORE, exportDatabase(staged), databaseName);
        } catch (error) {
          // Discarding the staged connection also rolls back on write/storage failure.
          staged.close();
          throw error;
        }
        const previous = database;
        database = staged;
        previous.close();
      });
    },
    async closeAsync() {
      await scheduleWrite(async () => {
        await persist();
        database.close();
        storage.close();
      });
    },
  };
}

export function SQLiteProvider({ databaseName, assetSource, children, onError, onInit }) {
  const databaseRef = useRef(null);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      try {
        const database = await createDatabase(databaseName, assetSource);
        await onInit?.(database);
        if (isMounted) {
          databaseRef.current = database;
          setIsReady(true);
        } else {
          await database.closeAsync();
        }
      } catch (setupError) {
        if (isMounted) {
          setError(setupError);
        }
      }
    }

    setup();
    return () => {
      isMounted = false;
      const database = databaseRef.current;
      databaseRef.current = null;
      setIsReady(false);
      database?.closeAsync();
    };
  }, [assetSource, databaseName, onInit]);

  if (error != null) {
    if (onError != null) {
      onError(error);
      return null;
    }
    throw error;
  }

  if (!isReady || databaseRef.current == null) {
    return null;
  }

  return <SQLiteContext.Provider value={databaseRef.current}>{children}</SQLiteContext.Provider>;
}

export function useSQLiteContext() {
  const database = useContext(SQLiteContext);
  if (database == null) {
    throw new Error('useSQLiteContext must be used within a <SQLiteProvider>');
  }
  return database;
}
