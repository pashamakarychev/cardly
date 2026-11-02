const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function setup({ failWrite = false } = {}) {
  const plain = new Map([['session', 'old-session']]);
  const encrypted = new Map();
  const AsyncStorage = {
    getItem: async key => plain.get(key) ?? null,
    removeItem: async key => plain.delete(key),
  };
  const SecureStore = {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async key => encrypted.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (failWrite) throw new Error('Storage unavailable');
      encrypted.set(key, value);
    },
    deleteItemAsync: async key => encrypted.delete(key),
  };
  const source = fs.readFileSync(path.join(__dirname, '../lib/authStorage.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const storage = new Function('AsyncStorage', 'SecureStore', source + '\nreturn authStorage;')(AsyncStorage, SecureStore);
  return { storage, plain, encrypted };
}

test('mobile sessions migrate to encrypted storage and remove the plaintext copy', async () => {
  const { storage, plain, encrypted } = setup();
  assert.equal(await storage.getItem('session'), 'old-session');
  assert.equal(plain.has('session'), false);
  assert.equal(encrypted.get('session'), 'old-session');
  await storage.setItem('session', 'refreshed-session');
  assert.equal(await storage.getItem('session'), 'refreshed-session');
  await storage.removeItem('session');
  assert.equal(await storage.getItem('session'), null);
});

test('failed encrypted writes preserve the existing session for a later retry', async () => {
  const { storage, plain, encrypted } = setup({ failWrite: true });
  await assert.rejects(storage.getItem('session'), /Storage unavailable/);
  assert.equal(plain.get('session'), 'old-session');
  assert.equal(encrypted.size, 0);
});
