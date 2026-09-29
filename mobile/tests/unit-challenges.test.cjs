const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { ChallengeFlow } = require('../src/features/unit-challenges/flow.ts');
const { ApiError } = require('../src/services/api/client.ts');
const { cellsFor, writeEntry, readEntry, entryNumber } = require('../src/features/unit-challenges/crossword.ts');
const { roadmapTarget } = require('../src/features/courses/roadmapPosition.ts');
const { lessonState } = require('../src/features/courses/presentation.ts');
const metadata = { challenge: { phaseCount: 2 }, activeRun: null, progress: { passed: false }, access: { hasAccess: true }, progression: { unlocked: true } };
const active = (id = 'p1') => ({ run: { id: 'run', status: 'ACTIVE' }, phase: { id, type: id === 'p1' ? 'CONVERSATION' : 'CROSSWORD' } });
const completed = { run: { id: 'run', status: 'COMPLETED' }, result: { correctItems: 2, totalItems: 3, percentage: 66, passed: false, passingScore: 67 }, topic: { completed: false } };
const api = (overrides = {}) => ({ metadata: async () => metadata, start: async () => active(), run: async () => active('p2'), submit: async () => completed, abandon: async () => ({}), ...overrides });

test('metadata never starts a run; active run resumes its backend phase without start', async () => {
  let starts = 0, gets = 0;
  const flow = new ChallengeFlow('c', api({ metadata: async () => ({ ...metadata, activeRun: { id: 'run' } }), start: async () => { starts++; return active(); }, run: async (_, id) => { assert.equal(id, 'run'); gets++; return active('p2'); } }));
  await flow.load();
  assert.equal(starts, 0); assert.equal(gets, 1); assert.equal(flow.snapshot().response.phase.id, 'p2');
});
test('double start is serialized and network retry retains its request key', async () => {
  const keys = []; let release;
  const flow = new ChallengeFlow('c', api({ start: async (_, key) => { keys.push(key); if (keys.length === 1) await new Promise((_, reject) => { release = reject; }); return active(); } }));
  const first = flow.start(); await flow.start();
  assert.equal(keys.length, 1); release(new Error('offline')); await first;
  assert.equal(flow.snapshot().pending, true); await flow.start(); assert.equal(keys.length, 1);
  await flow.retry(); assert.equal(keys[0], keys[1]); assert.match(keys[0], /^[A-Za-z0-9_-]{16,100}$/);
  assert.equal(flow.snapshot().pending, false);
});
test('lost phase response retries frozen key and answer; no per-item correctness; final result is authoritative', async () => {
  const calls = [];
  const flow = new ChallengeFlow('c', api({ submit: async (...args) => { calls.push(args); if (calls.length === 1) throw new Error('lost response'); return args[2] === 'p1' ? active('p2') : completed; } }));
  await flow.load(); await flow.start();
  const answer = { choices: [{ stepId: 'q1', optionId: 'a' }] };
  await flow.submit(answer); answer.choices[0].optionId = 'b';
  await flow.submit({ choices: [] }); assert.equal(calls.length, 1);
  await flow.retry(); assert.deepEqual(calls[0], calls[1]); assert.equal(calls[1][4].choices[0].optionId, 'a');
  assert.equal(flow.snapshot().response.phase.id, 'p2'); assert.equal(flow.snapshot().response.result, undefined);
  await flow.submit({ entries: [] }); assert.deepEqual(flow.snapshot().response.result, completed.result);
  assert.equal(flow.snapshot().response.result.percentage, 66); assert.equal(flow.snapshot().response.result.passed, false);
});
test('empty answers complete phases and replay uses a new key without revoking consolidated progress', async () => {
  const keys = [], answers = [];
  const flow = new ChallengeFlow('c', api({ metadata: async () => ({ ...metadata, progress: { passed: true } }), start: async (_, key) => { keys.push(key); return active(); }, submit: async (_, __, ___, ____, answer) => { answers.push(answer); return { ...completed, topic: { completed: true } }; } }));
  await flow.load(); await flow.start(); await flow.submit({ choices: [] });
  assert.equal(flow.snapshot().metadata.progress.passed, true); assert.equal(flow.snapshot().response.result.passed, false);
  assert.equal(flow.snapshot().response.topic.completed, true);
  await flow.start(); assert.notEqual(keys[0], keys[1]); assert.deepEqual(answers, [{ choices: [] }]);
});
test('409 reads the current run instead of submitting to a different phase', async () => {
  const flow = new ChallengeFlow('c', api({ submit: async () => { throw new ApiError(409, 'PHASE_ALREADY_SUBMITTED', 'Already submitted'); } }));
  await flow.start(); await flow.submit({ choices: [] });
  assert.equal(flow.snapshot().response.phase.id, 'p2'); assert.equal(flow.snapshot().pending, false);
});
test('explicit abandon retries failed network call; disposal alone does not abandon', async () => {
  let calls = 0;
  const flow = new ChallengeFlow('c', api({ abandon: async () => { if (++calls === 1) throw new Error('offline'); } }));
  await flow.start(); await flow.abandon(); assert.equal(flow.snapshot().exited, false);
  await flow.retry(); assert.equal(flow.snapshot().exited, true); assert.equal(calls, 2);
  flow.dispose(); assert.equal(calls, 2);
});
test('definite start rejection leaves a way out; disposed flow ignores late response', async () => {
  const flow = new ChallengeFlow('c', api({ start: async () => { throw new ApiError(403, 'ACCESS_REQUIRED', 'Acceso requerido'); } }));
  await flow.start(); assert.equal(flow.snapshot().pending, false); assert.equal(flow.snapshot().busy, false);
  let release;
  const late = new ChallengeFlow('c', api({ start: () => new Promise(resolve => { release = resolve; }) }));
  const starting = late.start(); late.dispose(); release(active()); await starting;
  assert.equal(late.snapshot().response, undefined);
});
test('historical completed GET keeps backend percentage and passed even with prior consolidated progress', async () => {
  const flow = new ChallengeFlow('c', api({ metadata: async () => ({ ...metadata, activeRun: { id: 'run' }, progress: { passed: true } }), run: async () => completed }));
  await flow.load(); assert.deepEqual(flow.snapshot().response.result, completed.result); assert.equal(flow.snapshot().metadata.progress.passed, true);
});
test('crossword zero-based cells share crossings, numbering, edits and empty answers without checking correctness', () => {
  const across = { id: 'a', row: 0, column: 0, direction: 'ACROSS', length: 3 };
  const down = { id: 'd', row: 0, column: 0, direction: 'DOWN', length: 2 };
  assert.deepEqual(cellsFor(down), ['0:0', '1:0']);
  let cells = writeEntry({}, across, 'hey'); cells = writeEntry(cells, down, 'hi');
  assert.equal(readEntry(cells, across), 'HEY'); assert.equal(readEntry(cells, down), 'HI');
  cells = writeEntry(cells, down, ''); assert.equal(readEntry(cells, across), ' EY'); assert.equal(readEntry(cells, down), '');
  assert.equal(entryNumber([across, down], across), entryNumber([across, down], down));
});
test('current challenge remains frontier after all lessons complete, including commercial lock; completed course has no bus', () => {
  const challenge = { id: 'c', type: 'UNIT_CHALLENGE', progressStatus: 'NOT_STARTED', access: { hasAccess: false }, progression: { isCurrent: true, lockReason: 'ACCESS' } };
  const roadmap = { currentNode: { type: 'UNIT_CHALLENGE', id: 'c' }, progress: { completedLessons: 3, totalLessons: 3, completedRequiredNodes: 3, totalRequiredNodes: 4 }, topics: [{ nodes: [challenge] }] };
  assert.equal(roadmapTarget(roadmap), 'c'); assert.equal(lessonState(challenge), 'LOCKED_ACCESS');
  assert.equal(roadmapTarget({ ...roadmap, currentNode: null }), null);
});
test('API sends only phase answers to documented routes, with encoded identifiers', async () => {
  const { challengeApi } = require('../src/features/unit-challenges/api.ts');
  const previousFetch = global.fetch, previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const calls = []; process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  global.fetch = async (url, options) => { calls.push([url, options]); return { ok: true, status: 200, json: async () => active() }; };
  try {
    await challengeApi.metadata('c'); await challengeApi.start('c', 'stable-request-key'); await challengeApi.run('c', 'r');
    await challengeApi.submit('c', 'r', 'p', 'phase-request-key', { entries: [] }); await challengeApi.abandon('c', 'r');
    assert.deepEqual(calls.map(([url]) => url.replace('http://localhost:3000', '')), ['/unit-challenges/c', '/unit-challenges/c/runs', '/unit-challenges/c/runs/r', '/unit-challenges/c/runs/r/phases/p/submit', '/unit-challenges/c/runs/r/abandon']);
    assert.deepEqual(JSON.parse(calls[3][1].body), { requestKey: 'phase-request-key', answer: { entries: [] } });
  } finally { global.fetch = previousFetch; if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = previousUrl; }
});
