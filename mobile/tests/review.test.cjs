const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { ReviewFlow } = require('../src/features/review/flow.ts');
const { reviewResult } = require('../src/features/review/presentation.ts');
const { reviewApi } = require('../src/features/review/api/review.ts');
const { ApiError } = require('../src/services/api/client.ts');
const { feedbackTitle, reinforcementOnCompletion } = require('../src/features/lessons/activityPresentation.ts');
const items = [0, 1, 2].map(n => ({ id: 'item-' + n, activity: { id: 'a-' + n, type: 'FILL_BLANK_TEXT', prompt: 'Answer' },
  source: { lesson: { id: 'lesson' }, topic: { id: n < 2 ? 't1' : 't2', title: n < 2 ? 'Greetings' : 'People' }, course: { id: 'course' } } }));
const summary = { state: 'READY', pendingCount: 8, groups: [{ topic: items[0].source.topic, count: 8 }] };
const batch = { batchToken: 'opaque', items, totalEligiblePending: 8 };
const response = (id, correct) => ({ reviewItem: { id, status: correct ? 'RESOLVED' : 'ACTIVE' },
  attempt: { id: 'attempt-' + id, attemptNumber: 7, isCorrect: correct }, feedback: { correctAnswer: 'right' }, pendingReviewCount: 7 });
function fixture(overrides = {}) {
  const calls = [];
  const api = { read: async () => summary, batch: async id => { calls.push(['batch', id]); return batch; },
    attempt: async (id, body) => { calls.push(['attempt', id, body]); return response(id, body.answer.text === 'right'); }, ...overrides };
  return { flow: new ReviewFlow('lesson', api), calls };
}
async function open(f) { await f.flow.load(); await f.flow.start(); return f; }

test('READY uses global summary, freezes preferred batch and traverses independent of correctness', async () => {
  const { flow, calls } = await open(fixture());
  assert.equal(flow.snapshot().summary.pendingCount, 8); assert.equal(flow.snapshot().batch.items.length, 3);
  assert.deepEqual(calls, [['batch', 'lesson']]);
  flow.continue(); assert.equal(flow.snapshot().index, 0);
  await flow.submit({ text: 'wrong' }); assert.equal(flow.snapshot().index, 0);
  assert.equal(flow.snapshot().feedback.reviewItem.status, 'ACTIVE');
  await flow.submit({ text: 'right' }); assert.equal(calls.length, 2, 'no immediate retry even when incorrect');
  flow.continue(); flow.continue(); assert.equal(flow.snapshot().index, 1);
  await flow.submit({ text: 'right' }); flow.continue();
  await flow.submit({ text: 'wrong' }); flow.continue();
  assert.equal(flow.snapshot().phase, 'RESULT'); assert.equal(flow.snapshot().index, 3);
  const result = reviewResult(flow.snapshot().outcomes);
  assert.equal(result.resolved, 1); assert.equal(result.pending, 2); assert.equal(result.skipped, 0);
  assert.deepEqual(result.topics.map(t => [t.id, t.answered, t.resolved]), [['t1', 2, 1], ['t2', 1, 0]]);
  await flow.start(); await flow.submit({ text: 'right' }); assert.equal(calls.length, 4);
});
test('EMPTY on read or empty batch does not manufacture a session', async () => {
  const one = fixture({ read: async () => ({ state: 'EMPTY', pendingCount: 0, groups: [] }) });
  await one.flow.load(); await one.flow.start(); assert.equal(one.calls.length, 0);
  const two = await open(fixture({ batch: async () => ({ batchToken: null, items: [], totalEligiblePending: 0 }) }));
  assert.equal(two.flow.snapshot().phase, 'READY'); assert.equal(two.flow.snapshot().summary.state, 'EMPTY');
});
test('double start and double submit are single-flight; lost reply reuses exact key and answer', async () => {
  let resolveBatch, resolveAttempt; const sent = [];
  const f = fixture({ batch: () => new Promise(resolve => { resolveBatch = resolve; }),
    attempt: (id, body) => { sent.push(JSON.parse(JSON.stringify(body))); return new Promise(resolve => { resolveAttempt = resolve; }); } });
  await f.flow.load(); const start = f.flow.start(); await f.flow.start(); resolveBatch(batch); await start;
  const answer = { text: 'wrong' }; const submit = f.flow.submit(answer);
  answer.text = 'changed'; await f.flow.submit({ text: 'right' }); assert.equal(sent.length, 1);
  resolveAttempt(response(items[0].id, false)); await submit;
  assert.equal(sent[0].answer.text, 'wrong');

  let count = 0; const retries = [];
  const second = await open(fixture({ attempt: async (id, body) => {
    retries.push(JSON.parse(JSON.stringify(body)));
    if (++count === 1) throw new TypeError('Network lost after server commit');
    return response(id, false);
  } }));
  await second.flow.submit({ pairs: [{ wordId: 'w', imageId: 'i' }] });
  assert.ok(second.flow.snapshot().pending); assert.equal(second.flow.snapshot().outcomes.length, 0);
  await second.flow.submit({ text: 'different' });
  assert.deepEqual(retries[0], retries[1]); assert.match(retries[0].requestKey, /^[A-Za-z0-9_-]{16,100}$/);
  assert.equal(second.flow.snapshot().outcomes.length, 1);
  second.flow.continue(); await second.flow.submit({ text: 'right' });
  assert.notEqual(retries[2].requestKey, retries[1].requestKey);
});
test('conflicts skip without claiming resolution; expiry summarizes only confirmed outcomes', async () => {
  for (const code of ['REVIEW_ITEM_NOT_ACTIVE', 'REVIEW_ITEM_NOT_FOUND']) {
    const { flow } = await open(fixture({ attempt: async () => { throw new ApiError(409, code, 'private'); } }));
    await flow.submit({ text: 'right' }); assert.equal(flow.snapshot().unavailable, true);
    assert.deepEqual(reviewResult(flow.snapshot().outcomes), { resolved: 0, pending: 0, skipped: 1, topics: [] });
    flow.continue(); assert.equal(flow.snapshot().index, 1);
  }
  let n = 0;
  const { flow } = await open(fixture({ attempt: async id => { if (++n > 1) throw new ApiError(403, 'REVIEW_BATCH_INVALID', 'private'); return response(id, true); } }));
  await flow.submit({ text: 'right' }); flow.continue(); await flow.submit({ text: 'right' });
  assert.equal(flow.snapshot().expired, true); await flow.submit({ text: 'right' }); assert.equal(n, 2);
  flow.finishExpired(); assert.equal(flow.snapshot().phase, 'RESULT');
  assert.equal(reviewResult(flow.snapshot().outcomes).resolved, 1);
});
test('invalid answer permits correction without blocking transport retries or disclosing server errors', async () => {
  let n = 0;
  const { flow } = await open(fixture({ attempt: async id => { if (++n === 1) throw new ApiError(400, 'INVALID_ANSWER', 'secret'); return response(id, true); } }));
  await flow.submit({ text: '' }); assert.equal(flow.snapshot().pending, null);
  await flow.submit({ text: 'right' }); assert.equal(flow.snapshot().feedback.attempt.isCorrect, true);
  const { reviewError } = require('../src/features/review/presentation.ts');
  assert.ok(!reviewError(new ApiError(500, 'SERVER', 'secret')).includes('secret'));
});
test('Back confirms only active batches; cancellation preserves state; exit/dispose ignore late responses', async () => {
  const ready = fixture(); await ready.flow.load(); ready.flow.requestExit(); assert.equal(ready.flow.snapshot().exited, true);
  let resolve; const { flow } = await open(fixture({ attempt: () => new Promise(r => { resolve = r; }) }));
  const before = flow.snapshot(); flow.requestExit(); assert.equal(flow.snapshot().exitRequested, true);
  flow.cancelExit(); assert.deepEqual(flow.snapshot(), before);
  const pending = flow.submit({ text: 'wrong' }); flow.requestExit(); flow.confirmExit();
  resolve(response(items[0].id, false)); await pending;
  assert.equal(flow.snapshot().exited, true); assert.equal(flow.snapshot().outcomes.length, 0);
  const disposed = fixture(); disposed.flow.dispose(); await disposed.flow.load(); await disposed.flow.start(); assert.equal(disposed.calls.length, 0);
  const finished = await open(fixture({ batch: async () => ({ ...batch, items: [items[0]] }) }));
  await finished.flow.submit({ text: 'right' }); finished.flow.continue(); finished.flow.requestExit();
  assert.equal(finished.flow.snapshot().exited, true); assert.equal(finished.flow.snapshot().exitRequested, false);
});
test('Review API uses exact routes, preserves payload and optional preference without a Lesson mutation', async () => {
  const original = global.fetch, oldUrl = process.env.EXPO_PUBLIC_API_URL; const calls = [];
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:1234';
  global.fetch = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(summary), { status: 200 }); };
  try {
    await reviewApi.read(); await reviewApi.batch('lesson'); await reviewApi.batch();
    const body = { batchToken: 'opaque', requestKey: 'review_stable_key', answer: { text: 'word' } };
    await reviewApi.attempt('id/with space', body);
    const timezone = calls.splice(3, 1)[0];
    assert.equal(timezone.url, 'http://localhost:1234/me/gamification/timezone');
    assert.equal(timezone.init.method, 'PATCH');
    assert.deepEqual(calls.map(c => c.url), ['http://localhost:1234/review', 'http://localhost:1234/review/batches', 'http://localhost:1234/review/batches', 'http://localhost:1234/review/items/id%2Fwith%20space/attempt']);
    assert.deepEqual(JSON.parse(calls[1].init.body), { preferredLessonId: 'lesson' });
    assert.deepEqual(JSON.parse(calls[2].init.body), { preferredLessonId: null });
    assert.deepEqual(JSON.parse(calls[3].init.body), body);
  } finally { global.fetch = original; if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = oldUrl; }
});
test('Review feedback shares answer rendering without Lesson reinforcement or retry scoring', () => {
  for (const isCorrect of [true, false]) {
    const feedback = { mode: 'REVIEW', isCorrect, feedback: { correctAnswer: 'a' } };
    assert.equal(reinforcementOnCompletion(feedback), false);
    assert.equal(feedbackTitle(feedback), isCorrect ? '¡Correcto!' : 'Vamos a repasarlo');
  }
});
test('perfect batch has zero pending locally even when READY has more global items', async () => {
  const { flow } = await open(fixture());
  for (const item of items) { await flow.submit({ text: 'right' }); flow.continue(); }
  assert.equal(flow.snapshot().phase, 'RESULT');
  assert.equal(flow.snapshot().summary.pendingCount, 8);
  const result = reviewResult(flow.snapshot().outcomes);
  assert.equal(result.pending, 0);
  assert.equal(result.resolved, items.length);
  assert.ok(result.topics.every(t => t.resolved === t.answered));
});
