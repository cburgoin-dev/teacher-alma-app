const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { diagnosticIdentity } = require('../src/dev/diagnosticIdentity.ts');
const tools = require('../src/dev/diagnosticTools.ts');
const home = require('../src/features/home/resource.ts');
const progress = require('../src/features/progress/resource.ts');
const gamification = require('../src/features/gamification/resource.ts');
const { apiRequest } = require('../src/services/api/client.ts');
const fresh = { state: 'NEW', hero: { type: 'NEW', diagnosticAvailable: true, beginnerCourse: null }, learner: { displayName: 'DEV' }, review: { pendingCount: 0 }, featuredCourses: [] };

test('DEV scenario requests are closed, select fixed identity, replace caches and refresh real Home; errors never claim success', async () => {
  const oldFetch = global.fetch, oldDev = global.__DEV__, oldUrl = process.env.EXPO_PUBLIC_API_URL;
  global.__DEV__ = true; process.env.EXPO_PUBLIC_API_URL = 'http://dev.test';
  const calls = []; let fail = false;
  global.fetch = async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('/dev/diagnostic')) return fail ? new Response(JSON.stringify({ error: { code: 'MISSING_DEMO', message: 'Falta demo' } }), { status: 409 }) : new Response(JSON.stringify({ userId: 'fixed', scenario: 'NEW' }));
    assert.ok(url.endsWith('/me/home')); return new Response(JSON.stringify(fresh));
  };
  try {
    const previous = [home.homeResource, progress.progressResource, gamification.gamificationResource];
    const revision = diagnosticIdentity.snapshot();
    await tools.prepareDiagnosticScenario('NEW');
    assert.equal(diagnosticIdentity.selected(), true); assert.equal(diagnosticIdentity.snapshot(), revision + 1);
    assert.notEqual(home.homeResource, previous[0]); assert.notEqual(progress.progressResource, previous[1]); assert.notEqual(gamification.gamificationResource, previous[2]);
    assert.deepEqual(home.homeResource.snapshot().data, fresh);
    assert.deepEqual(JSON.parse(calls[0][1].body), { action: 'NEW' });
    assert.equal(calls[1][1].headers.get('X-Teacher-Alma-Dev-Learner'), 'diagnostic-dev');
    for (const action of ['ASSESSED_A1', 'ASSESSED_A2', 'CLEAR_ACTIVE']) await tools.prepareDiagnosticScenario(action);
    assert.ok(calls.filter(c => c[1].method === 'POST').every(c => c[0].endsWith('/dev/diagnostic')));
    fail = true; const current = home.homeResource;
    await assert.rejects(tools.prepareDiagnosticScenario('NEW'), /Falta demo/);
    assert.equal(home.homeResource, current); assert.doesNotMatch(tools.diagnosticDevState.snapshot().notice, /Preparado/);
    await tools.prepareDiagnosticScenario('DEFAULT'); assert.equal(diagnosticIdentity.selected(), false);
    assert.equal(calls.at(-1)[1].headers.has('X-Teacher-Alma-Dev-Learner'), false);
    global.__DEV__ = false; diagnosticIdentity.select(true);
    assert.throws(() => tools.diagnosticDevApi.status(), /DEV only/);
    await assert.rejects(tools.prepareDiagnosticScenario('NEW'), /DEV only/);
    await apiRequest('/me/home'); assert.equal(calls.at(-1)[1].headers.has('X-Teacher-Alma-Dev-Learner'), false);
  } finally { global.fetch = oldFetch; global.__DEV__ = oldDev; diagnosticIdentity.select(false); if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = oldUrl; }
});

test('late requests on an old Home resource cannot replace the selected identity snapshot', async () => {
  const oldFetch = global.fetch, oldDev = global.__DEV__, oldUrl = process.env.EXPO_PUBLIC_API_URL;
  global.__DEV__ = true; process.env.EXPO_PUBLIC_API_URL = 'http://dev.test';
  let finish; let count = 0;
  global.fetch = async url => {
    if (url.endsWith('/dev/diagnostic')) return new Response(JSON.stringify({ scenario: 'NEW' }));
    if (++count === 1) await new Promise(resolve => { finish = resolve; });
    return new Response(JSON.stringify(fresh));
  };
  try {
    const previous = home.homeResource, oldRead = previous.refresh();
    await new Promise(resolve => setImmediate(resolve));
    await tools.prepareDiagnosticScenario('NEW'); const current = home.homeResource;
    finish(); await oldRead; assert.notEqual(previous, current); assert.deepEqual(current.snapshot().data, fresh);
  } finally { global.fetch = oldFetch; global.__DEV__ = oldDev; diagnosticIdentity.select(false); if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = oldUrl; }
});
