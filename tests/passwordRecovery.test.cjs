const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function load(file, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const names = [...source.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map(match => match[1]);
  return new Function(...Object.keys(dependencies), source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + `\nreturn {${names.join(',')}};`)(...Object.values(dependencies));
}

test('recovery links support token fragments, code redirects and mixed parameters', async () => {
  let exchanged;
  const session = { user: { id: 'recovering-user' } };
  const auth = load('lib/auth.js', {
    Linking: { createURL: () => 'cardly://new-password' },
    supabase: { auth: {
      exchangeCodeForSession: async code => { exchanged = code; return { data: { session } }; },
      setSession: async tokens => { exchanged = tokens; return { data: { session } }; },
    } },
  });
  assert.equal(auth.isPasswordRecoveryUrl('cardly://new-password?code=test-code'), true);
  assert.equal(auth.isPasswordRecoveryUrl('exp://localhost/--/new-password?code=test-code'), true);
  assert.equal(auth.isPasswordRecoveryUrl('https://cardly.test/new-password?code=test-code'), true);
  assert.equal(auth.isPasswordRecoveryUrl('cardly://?type=recovery#access_token=test&refresh_token=test'), true);
  assert.equal(auth.isPasswordRecoveryUrl('cardly://other?code=test'), false);
  assert.equal(auth.isPasswordRecoveryUrl('cardly://new-password?type=signup'), false);
  assert.equal(await auth.createSessionFromUrl('cardly://new-password?code=test-code'), session);
  assert.equal(exchanged, 'test-code');
  assert.equal(await auth.createSessionFromUrl('cardly://new-password?access_token=test-access#refresh_token=test-refresh'), session);
  assert.deepEqual(exchanged, { access_token: 'test-access', refresh_token: 'test-refresh' });
  exchanged = null;
  for (const url of [
    'https://evil.example/new-password?code=attacker',
    'cardly://other#access_token=attacker&refresh_token=attacker&type=recovery',
    'cardly://new-password?type=signup&code=attacker',
  ]) {
    assert.equal(await auth.createSessionFromUrl(url), null);
    assert.equal(exchanged, null);
  }
});

const flush = () => new Promise(resolve => setImmediate(resolve));

function recoveryHarness(initialUrl, createSessionFromUrl) {
  const state = [];
  let listener;
  let cleanup;
  let removed = false;
  const hooks = load('hooks/usePasswordRecovery.js', {
    createContext: () => ({}),
    useState: initial => {
      const index = state.length;
      state.push(initial);
      return [initial, value => { state[index] = value; }];
    },
    useEffect: effect => { cleanup = effect(); },
    Linking: {
      getInitialURL: async () => initialUrl,
      addEventListener: (_, callback) => {
        listener = callback;
        return { remove: () => { removed = true; } };
      },
    },
    createSessionFromUrl,
    isPasswordRecoveryUrl: url => url.includes('new-password'),
  });
  const result = hooks.usePasswordRecovery();
  return { state, result, event: url => listener({ url }), cleanup: () => cleanup(), removed: () => removed };
}

test('startup waits for recovery and consumes duplicate link delivery only once', async () => {
  let resolveSession;
  let calls = 0;
  const url = 'cardly://new-password?code=single-use';
  const harness = recoveryHarness(url, () => {
    calls++;
    return new Promise(resolve => { resolveSession = resolve; });
  });
  await flush();
  harness.event(url);
  assert.equal(harness.state[0], false);
  resolveSession({ user: { id: 'user-a' } });
  await flush();
  assert.deepEqual(harness.state, [true, 'user-a']);
  assert.equal(calls, 1);
  harness.cleanup();
  assert.equal(harness.removed(), true);
});

test('warm links preserve recovery intent independently of account screen remounts', async () => {
  const harness = recoveryHarness(null, async () => ({ user: { id: 'user-b' } }));
  await flush();
  assert.deepEqual(harness.state, [true, null]);
  harness.event('cardly://new-password?code=warm');
  await flush();
  assert.deepEqual(harness.state, [true, 'user-b']);
  harness.result.completeRecovery();
  assert.deepEqual(harness.state, [true, null]);
  harness.cleanup();
});

test('invalid links do not activate recovery or prevent startup', async () => {
  const harness = recoveryHarness('cardly://new-password?code=expired', async () => { throw new Error('Expired'); });
  await flush();
  assert.deepEqual(harness.state, [true, null]);
  harness.cleanup();
});
