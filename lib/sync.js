import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';
import { acknowledgeSyncEntry, applyRemoteChanges, getSyncQueue, subscribeToDatabase } from '../db/repository';

const workers = new WeakMap();

export function startSync(db, userId, canPull = () => true) {
  if (!userId) return () => {};
  let stopped = false;
  let timer;
  let running = null;
  let requested = false;
  let retryDelay = 1000;
  let controller;

  const schedule = (delay = 250) => {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => { run().catch(() => {}); }, delay);
  };
  async function checkAccount() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (stopped || data.session?.user.id !== userId) throw new Error('Sync account changed');
  }
  async function request(query) {
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const { data, error } = await query.abortSignal(controller.signal);
      if (error) throw error;
      return data;
    } finally { clearTimeout(timeout); }
  }
  async function perform() {
    await checkAccount();
    for (const entry of await getSyncQueue(db)) {
      await checkAccount();
      const payload = JSON.parse(entry.payload);
      await request(supabase.rpc('apply_sync_change', {
        p_table: entry.table_name,
        p_operation: entry.operation,
        p_payload: { ...payload, user_id: userId, last_modified_at: payload.last_modified_at ?? new Date(0).toISOString() },
      }));
      if (stopped) return;
      await acknowledgeSyncEntry(db, entry.id);
    }
    if (!canPull()) return;
    // Read complete, ordered pages: no timestamp cursor can miss a delayed commit.
    const changes = [];
    for (let offset = 0; ; offset += 500) {
      await checkAccount();
      const page = await request(supabase.from('sync_records').select('*').eq('user_id', userId)
        .order('table_name').order('record_id').range(offset, offset + 499));
      changes.push(...page);
      if (page.length < 500) break;
    }
    await checkAccount();
    if (canPull()) await applyRemoteChanges(db, changes);
  }
  function run() {
    if (stopped) return Promise.resolve();
    if (running) { requested = true; return running; }
    running = perform().then(() => { retryDelay = 1000; }).catch((error) => {
      schedule(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 60000);
      throw error;
    }).finally(() => {
      running = null;
      if (requested) { requested = false; schedule(); }
    });
    return running;
  }
  workers.set(db, run);
  const unsubscribe = subscribeToDatabase(db, (source) => { if (source === 'local') schedule(); });
  const state = AppState.addEventListener('change', (value) => { if (value === 'active') schedule(0); });
  const online = () => schedule(0);
  if (Platform.OS === 'web') globalThis.addEventListener?.('online', online);
  const channel = supabase.channel(`sync:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_records', filter: `user_id=eq.${userId}` }, () => schedule())
    .subscribe((status) => { if (status === 'SUBSCRIBED') schedule(0); });
  schedule(0);
  return () => {
    stopped = true;
    clearTimeout(timer);
    controller?.abort();
    workers.delete(db);
    unsubscribe();
    state.remove();
    if (Platform.OS === 'web') globalThis.removeEventListener?.('online', online);
    supabase.removeChannel(channel);
  };
}

export function syncDatabase(db) {
  return workers.get(db)?.() ?? Promise.resolve();
}
