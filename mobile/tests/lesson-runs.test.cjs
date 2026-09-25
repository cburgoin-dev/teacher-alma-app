const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { LessonFlow } = require('../src/features/lessons/flow.ts');
const { lessonsApi } = require('../src/features/lessons/api/lessons.ts');
const { matchingDraft } = require('../src/features/lessons/matchingDraft.ts');
const steps = ['CONTENT_STEP', 'ACTIVITY_STEP', 'SUMMARY_STEP'].map((type, i) => ({ id: String(i), type, required: true, blocks: [] }));
const data = { lesson: { id: 'l' }, state: { status: 'NOT_STARTED', currentStepId: 'old-stale-step' }, activityProgress: { completed: 10, total: 10 }, steps };
const progress = (n) => ({ completedSteps: n, totalSteps: 3, percentage: n / 3 * 100 });
function fixture(overrides = {}) {
  const calls = [];
  let number = 0;
  const api = {
    read: async () => data,
    start: async (id, key) => { calls.push(['start', id, key]); return { runId: 'run', status: 'ACTIVE', currentStepId: '0', firstStepId: '0', progress: progress(0), activityProgress: { completed: 0, total: 1 } }; },
    completeStep: async (...args) => { calls.push(['step', ...args]); return { currentStepId: args[2] === '2' ? null : '1', progress: progress(args[2] === '2' ? 3 : 1), activityProgress: { completed: args[2] === '2' ? 1 : 0, total: 1 } }; },
    attempt: async (...args) => { calls.push(['attempt', ...args]); return { runId: 'run', attempt: { isCorrect: ++number > 1, attemptNumber: number, countsForLessonScore: number === 1 }, feedback: {}, reinforcement: { onCompletion: true }, progress: { ...progress(2), currentStepId: '2' }, activityProgress: { completed: 1, total: 1 } }; },
    complete: async (...args) => { calls.push(['complete', ...args]); return { lesson: data.lesson, result: { correctAnswers: 0, totalActivities: 1 } }; },
    abandon: async (...args) => { calls.push(['abandon', ...args]); },
    replayCheck: async () => { throw new Error('Normal must not use Replay check'); }, ...overrides,
  };
  return { flow: new LessonFlow('l', api), calls };
}
test('NORMAL_RUN starts fresh at zero with run identity, ignoring historical pointer/count; all mutations carry runId', async () => {
  const { flow, calls } = fixture(); await flow.load();
  assert.equal(flow.snapshot().mode, 'NORMAL_RUN'); assert.equal(flow.snapshot().runId, 'run'); assert.equal(flow.snapshot().stepId, '0');
  assert.equal(flow.snapshot().progress.percentage, 0); assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 0, total: 1 });
  await flow.continueContent(); await flow.submit({ text: 'wrong' }); flow.retryAnswer(); await flow.submit({ text: 'right' }); flow.continueFeedback();
  assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 1, total: 1 });
  await flow.finish(); assert.equal(flow.snapshot().result.result.correctAnswers, 0);
  assert.ok(calls.filter(c => c[0] !== 'start').every(c => c[1] === 'l' && c[2] === 'run'));
  const before = calls.length; await flow.finish(); assert.equal(calls.length, before);
});
test('Back requests exit, cancel preserves the exact run/step/answer/feedback/progress; no previous navigation', async () => {
  const { flow, calls } = fixture(); await flow.load(); await flow.continueContent(); await flow.submit({ text: 'answer' });
  const before = flow.snapshot(); const callCount = calls.length;
  assert.equal(flow.back(), true); assert.equal(flow.snapshot().exitRequested, true); assert.equal(flow.snapshot().stepId, '1');
  flow.cancelExit(); assert.deepEqual(flow.snapshot(), before); assert.equal(calls.length, callCount);
  flow.revisit('0'); assert.equal(flow.snapshot().stepId, '1');
});
test('confirm exit dispatches abandon once and permits navigation even when the network hangs; reopening is fresh', async () => {
  let abandons = 0;
  const { flow, calls } = fixture({ abandon: () => { abandons++; return new Promise(() => {}); } });
  await flow.load(); await flow.continueContent(); flow.back(); flow.confirmExit(); flow.confirmExit();
  assert.equal(flow.snapshot().exited, true); assert.equal(abandons, 1);
  const count = calls.length; await flow.submit({ text: 'late' }); assert.equal(calls.length, count);
  const next = fixture(); await next.flow.load();
  assert.equal(next.flow.snapshot().progress.percentage, 0); assert.equal(next.flow.snapshot().answer, null);
  assert.notEqual(calls[0][2], next.calls[0][2], 'new mount creates a new start request key');
  const failed = fixture({ abandon: async () => { throw new Error('offline'); } }).flow;
  await failed.load(); failed.back(); failed.confirmExit(); await Promise.resolve(); assert.equal(failed.snapshot().exited, true);
});
test('duplicate start is gated, lost start response reuses the same key within this mounted flow', async () => {
  let release, keys = [];
  const { flow } = fixture({ start: (_, key) => { keys.push(key); return new Promise(resolve => release = resolve); } });
  const pending = flow.load(); await Promise.resolve(); await flow.load(); assert.equal(keys.length, 1);
  release({ runId: 'r', currentStepId: '0', progress: progress(0) }); await pending;
  let attempts = 0;
  const retry = fixture({ start: async (_, key) => { keys.push(key); if (!attempts++) throw new Error('lost reply'); return { runId: 'r', currentStepId: '0', progress: progress(0) }; } }).flow;
  await retry.load(); await retry.load(); assert.equal(keys[1], keys[2]); assert.equal(retry.snapshot().runId, 'r');
});
test('attempt gates double taps and publishes ready feedback atomically', async () => {
  let release, count = 0;
  const { flow } = fixture({ attempt: () => { count++; return new Promise(resolve => release = resolve); } });
  await flow.load(); await flow.continueContent(); const pending = flow.submit({ text: 'am' }); await flow.submit({ text: 'am' });
  flow.continueFeedback(); assert.equal(count, 1); assert.equal(flow.snapshot().stepId, '1');
  const seen = []; flow.subscribe(() => { if (flow.snapshot().feedback) { seen.push(flow.snapshot().busy); if (seen.length === 1) flow.continueFeedback(); } });
  release({ attempt: { isCorrect: true }, feedback: {}, reinforcement: { onCompletion: false }, progress: { ...progress(2), currentStepId: '2' }, activityProgress: { completed: 1, total: 1 } }); await pending;
  assert.deepEqual(seen, [false]); assert.equal(flow.snapshot().stepId, '2');

});
test('Matching retry remains neutral and does not alter first submission semantics', () => {
  const reset = matchingDraft({ pairs: [{ wordId: 'w', imageId: 'i' }], word: 'w', image: null }, { type: 'retry' });
  assert.deepEqual(reset, { pairs: [], word: null, image: null });
});

test('100% carries durable completion before Summary; retry is read-only, exit cannot abandon and Result needs no network', async () => {
  const completion = { lesson: data.lesson, result: { correctAnswers: 0, totalActivities: 1 } };
  let checks = 0;
  const { flow, calls } = fixture({
    attempt: async () => ({ status: 'COMPLETED', completion, attempt: { isCorrect: false, attemptNumber: 1 }, feedback: {}, reinforcement: { onCompletion: true }, progress: { ...progress(3), currentStepId: null }, activityProgress: { completed: 1, total: 1 } }),
    replayCheck: async () => { checks++; return { isCorrect: true, feedback: {} }; },
    complete: async () => { throw new Error('Summary/Result must not require network'); },
  });
  await flow.load(); await flow.continueContent(); await flow.submit({ text: 'wrong' });
  assert.equal(flow.snapshot().progress.percentage, 100); assert.deepEqual(flow.snapshot().completion, completion);
  assert.equal(flow.snapshot().result, null, 'feedback remains visible');
  assert.equal(flow.back(), false, 'completed normal run exits without abandonment confirmation');
  assert.equal(flow.snapshot().exitRequested, false);
  flow.retryAnswer(); await flow.submit({ text: 'right' }); assert.equal(checks, 1);
  assert.equal(flow.snapshot().completion.result.correctAnswers, 0);
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2');
  const count = calls.length; await flow.finish(); assert.deepEqual(flow.snapshot().result, completion); assert.equal(calls.length, count);
  assert.ok(!calls.some(c => c[0] === 'abandon' || c[0] === 'complete'));
  const reopened = fixture({ read: async () => ({ ...data, state: { status: 'COMPLETED' } }) });
  await reopened.flow.load(); assert.equal(reopened.flow.snapshot().mode, 'REPLAY'); assert.equal(reopened.calls.length, 0);
});
test('all normal API routes carry explicit run identity and start key', async () => {
  const saved = global.fetch, env = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'http://local.test'; const requests = [];
  global.fetch = async (url, options) => { requests.push([url, options]); return { ok: true, status: 200, json: async () => ({}) }; };
  try {
    await lessonsApi.start('l', 'request-key'); await lessonsApi.completeStep('l', 'r', 's'); await lessonsApi.attempt('l', 'r', 's', { text: 'am' });
    await lessonsApi.abandon('l', 'r'); await lessonsApi.complete('l', 'r');
    assert.deepEqual(requests.map(([url]) => url.replace('http://local.test', '')), ['/lessons/l/runs', '/lessons/l/runs/r/steps/s/complete', '/lessons/l/runs/r/steps/s/attempt', '/lessons/l/runs/r/abandon', '/lessons/l/runs/r/complete']);
    assert.deepEqual(JSON.parse(requests[0][1].body), { requestKey: 'request-key' }); assert.deepEqual(JSON.parse(requests[2][1].body), { text: 'am' });
    assert.ok(requests.every(([, options]) => options.method === 'POST'));
  } finally { global.fetch = saved; if (env === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = env; }
});
