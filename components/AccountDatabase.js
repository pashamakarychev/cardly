import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { SQLiteProvider } from '../db/SQLiteProvider';
import { DATABASE_ASSET, DATABASE_NAME, initDb } from '../db/database';
import { flushDatabaseWrites, initializeSyncStorage } from '../db/repository';
import { supabase } from '../lib/supabase';

const assetSource = { assetId: DATABASE_ASSET };

export default function AccountDatabase({ children }) {
  const [account, setAccount] = useState(null);
  const databaseRef = useRef(null);
  useEffect(() => {
    let generation = 0;
    let active = true;
    let selected;
    const select = async (session) => {
      const userId = session?.user.id ?? null;
      if (selected === userId) return;
      selected = userId;
      const version = ++generation;
      if (databaseRef.current) await flushDatabaseWrites(databaseRef.current);
      if (!active || version !== generation) return;
      setAccount(null);
      // The first signed-in account keeps the existing database and offline work.
      let primary = await AsyncStorage.getItem('cardly.primaryDatabaseOwner');
      if (userId && !primary) {
        primary = userId;
        await AsyncStorage.setItem('cardly.primaryDatabaseOwner', userId);
      }
      const legacy = userId != null && userId === primary;
      if (!active || version !== generation) return;
      setAccount({
        userId,
        name: legacy ? DATABASE_NAME : `cardly-${userId ?? 'guest'}.db`,
        initialize: async (db) => {
          await initDb(db);
          await initializeSyncStorage(db, !legacy);
          databaseRef.current = db;
        },
      });
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Do not perform asynchronous auth work inside Supabase's auth callback.
      setTimeout(() => { if (active) select(session).catch(console.error); }, 0);
    });
    supabase.auth.getSession().then(({ data: result, error }) => {
      if (error) throw error;
      if (active && selected === undefined) return select(result.session);
    }).catch(console.error);
    return () => { active = false; generation += 1; data.subscription.unsubscribe(); };
  }, []);
  if (!account) return null;
  return (
    <SQLiteProvider key={account.name} databaseName={account.name} assetSource={assetSource} onInit={account.initialize}>
      {children(account.userId)}
    </SQLiteProvider>
  );
}
