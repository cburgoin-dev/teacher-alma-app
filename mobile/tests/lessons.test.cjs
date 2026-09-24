const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { LessonFlow } = require('../src/features/lessons/flow.ts');
const { lessonsApi } = require('../src/features/lessons/api/lessons.ts');
const { pairSelection, expectedAnswer, resultVariant } = require('../src/features/lessons/presentation.ts');
const { ApiError } = require('../src/services/api/client.ts');
const steps = ['CONTENT_STEP', 'ACTIVITY_STEP', 'SUMMARY_STEP'].map((type, i) => ({ id: String(i), type, required: true, blocks: [] }));
const progress = { completedSteps: 1, totalSteps: 3, percentage: 100 / 3 };
const data = { lesson: { id: 'lesson' }, state: { status: 'NOT_STARTED', currentStepId: null }, steps };
const feedback = { attempt: { isCorrect: false }, feedback: { correctAnswer: 'a' }, review: { pending: true }, progress: { ...progress, currentStepId: '2' } };
const result = { lesson: { id: 'lesson' }, result: { correctAnswers: 0, totalActivities: 1, isPerfect: false, pendingReviewCount: 1 }, nextLesson: null };
function fixture(overrides = {}) {
  const calls = [];
  const api = {
    read: async () => { calls.push('read'); return data; },
    start: async () => { calls.push('start'); return { status: 'IN_PROGRESS', currentStepId: '0', progress }; },
    completeStep: async (_, id) => { calls.push('step:' + id); return { currentStepId: id === '2' ? null : '1', progress }; },
    attempt: async () => { calls.push('attempt'); return feedback; },
    complete: async () => { calls.push('complete'); return result; }, ...overrides,
  };
  return { flow: new LessonFlow('lesson', api), calls };
}
test('load/start, server progression, feedback pause, retry and ordered Summary completion', async () => {
  const { flow, calls } = fixture();
  await flow.load(); assert.equal(flow.snapshot().stepId, '0');
  await flow.continueContent(); assert.equal(flow.snapshot().stepId, '1');
  await flow.submit({ selectedOptionId: 'b' }); assert.equal(flow.snapshot().stepId, '1');
  assert.equal(flow.snapshot().feedback.review.pending, true);
  await flow.submit({ selectedOptionId: 'b' }); assert.equal(calls.filter(c => c === 'attempt').length, 1);
  flow.retryAnswer(); await flow.submit({ selectedOptionId: 'a' });
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2');
  await flow.finish(); assert.deepEqual(calls.slice(-2), ['step:2', 'complete']);
  await flow.finish(); assert.equal(calls.filter(c => c === 'complete').length, 1);
  assert.equal(flow.snapshot().result, result);
});
test('double taps are gated before rendering updates; failed submit is never auto retried', async () => {
  let release;
  let submissions = 0;
  const { flow } = fixture({ attempt: () => { submissions++; return new Promise(resolve => release = resolve); } });
  await flow.load(); await flow.continueContent();
  const pending = flow.submit({ text: 'am' }); await flow.submit({ text: 'am' });
  assert.equal(submissions, 1); release(feedback); await pending;
  const failed = fixture({ attempt: async () => { throw new Error('offline'); } });
  await failed.flow.load(); await failed.flow.submit({ text: 'am' });
  assert.ok(failed.flow.snapshot().error); assert.equal(failed.flow.snapshot().feedback, null);
});
test('resume uses backend pointer; completed opens for reading without start/reset', async () => {
  const resumed = fixture({ start: async () => ({ status: 'IN_PROGRESS', currentStepId: '2', progress }) });
  await resumed.flow.load(); assert.equal(resumed.flow.snapshot().stepId, '2');
  const completed = fixture({ read: async () => ({ ...data, state: { status: 'COMPLETED' } }) });
  await completed.flow.load(); assert.equal(completed.flow.snapshot().review, true);
  await completed.flow.continueContent(); assert.equal(completed.flow.snapshot().stepId, '1');
  assert.deepEqual(completed.calls, []);
});
test('Summary failure prevents completion; completion failure can retry idempotently', async () => {
  const broken = fixture({ start: async () => ({ status: 'IN_PROGRESS', currentStepId: '2', progress }), completeStep: async () => { throw new Error('offline'); } });
  await broken.flow.load(); await broken.flow.finish(); assert.ok(!broken.calls.includes('complete'));
  let tries = 0;
  const retry = fixture({ start: async () => ({ status: 'IN_PROGRESS', currentStepId: '2', progress }), complete: async () => { if (!tries++) throw new Error('lost response'); return result; } });
  await retry.flow.load(); await retry.flow.finish(); assert.ok(retry.flow.snapshot().error);
  await retry.flow.finish(); assert.equal(retry.flow.snapshot().result, result);
});
test('ACCESS cannot load content or trigger start; disposed reads cannot start lessons', async () => {
  const locked = fixture({ read: async () => { throw new ApiError(403, 'LESSON_ACCESS_REQUIRED', 'Access'); } });
  await locked.flow.load(); assert.equal(locked.flow.snapshot().data, null); assert.deepEqual(locked.calls, []);
  let release;
  const late = fixture({ read: () => new Promise(resolve => release = resolve) });
  const pending = late.flow.load(); late.flow.dispose(); release(data); await pending;
  assert.deepEqual(late.calls, []);
});
test('matching corrects duplicate image/word selections; presentation uses server feedback/results', () => {
  assert.deepEqual(pairSelection([{ wordId: 'w1', imageId: 'i1' }, { wordId: 'w2', imageId: 'i2' }], 'w1', 'i2'), [{ wordId: 'w1', imageId: 'i2' }]);
  assert.equal(expectedAnswer({ type: 'MULTIPLE_CHOICE', options: [{ id: 'a', text: 'Hello' }] }, 'a'), 'Hello');
  assert.equal(resultVariant({ isPerfect: true, pendingReviewCount: 0 }), 'PERFECT');
  assert.equal(resultVariant({ isPerfect: false, pendingReviewCount: 2 }), 'REVIEW_PENDING');
  assert.equal(resultVariant({ isPerfect: false, pendingReviewCount: 0 }), 'NORMAL');
});
test('five API contracts use real paths, POST bodies and propagate errors', async () => {
  const saved = global.fetch; const url = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://local.test';
  const requests = [];
  global.fetch = async (path, options) => { requests.push([path, options]); return { ok: true, status: 200, json: async () => ({}) }; };
  try {
    await lessonsApi.read('l'); await lessonsApi.start('l'); await lessonsApi.completeStep('l', 's');
    await lessonsApi.attempt('l', 's', { text: ' am ' }); await lessonsApi.complete('l');
    assert.deepEqual(requests.map(r => r[0]), ['/lessons/l', '/lessons/l/start', '/lessons/l/steps/s/complete', '/lessons/l/steps/s/attempt', '/lessons/l/complete'].map(p => 'http://local.test' + p));
    assert.ok(requests.slice(1).every(r => r[1].method === 'POST'));
    assert.deepEqual(JSON.parse(requests[3][1].body), { text: ' am ' });
  } finally { global.fetch = saved; if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = url; }
});

test('contextual back visits both activities without writing, restores answer/feedback, and returns to frontier', async () => {
  const list = ['CONTENT_STEP', 'ACTIVITY_STEP', 'ACTIVITY_STEP', 'SUMMARY_STEP'].map((type, i) => ({ id: String(i), type, required: true, blocks: [] }));
  const answers = [];
  const { flow, calls } = fixture({
    read: async () => ({ ...data, steps: list }),
    attempt: async (_, id, answer) => { answers.push(answer); return { ...feedback, progress: { ...progress, currentStepId: String(Number(id) + 1) } }; },
  });
  await flow.load(); assert.equal(flow.back(), false);
  await flow.continueContent();
  await flow.submit({ text: 'first' }); flow.continueFeedback();
  await flow.submit({ text: 'second' }); flow.continueFeedback();
  assert.equal(flow.snapshot().stepId, '3');
  const before = calls.length;
  flow.back(); assert.equal(flow.snapshot().stepId, '2'); assert.deepEqual(flow.snapshot().answer, { text: 'second' });
  flow.back(); assert.equal(flow.snapshot().stepId, '1'); assert.deepEqual(flow.snapshot().answer, { text: 'first' });
  flow.back(); assert.equal(flow.snapshot().stepId, '0');
  await flow.continueContent(); assert.equal(flow.snapshot().stepId, '1');
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2');
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '3');
  assert.equal(answers.length, 2); assert.equal(calls.length, before);
});

test('resume back can continue prior required activities without fabricating an attempt; pending cannot be skipped', async () => {
  const { flow, calls } = fixture({ start: async () => ({ status: 'IN_PROGRESS', currentStepId: '2', progress }) });
  await flow.load(); flow.back(); assert.equal(flow.snapshot().stepId, '1');
  assert.equal(flow.canContinueActivity(), true);
  flow.continueVisited(); assert.equal(flow.snapshot().stepId, '2'); assert.ok(!calls.includes('attempt'));
  const pending = fixture(); await pending.flow.load(); await pending.flow.continueContent();
  assert.equal(pending.flow.canContinueActivity(), false);
  pending.flow.continueVisited(); assert.equal(pending.flow.snapshot().stepId, '1');
});

test('normal activity continue preserves next-required server pointer across optional steps', async () => {
  const list = [steps[0], steps[1], { id: 'optional', type: 'SUMMARY_STEP', required: false, blocks: [] }, steps[2]];
  const { flow } = fixture({ read: async () => ({ ...data, steps: list }) });
  await flow.load(); await flow.continueContent(); await flow.submit({ text: 'answer' });
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2');
  flow.back(); assert.equal(flow.snapshot().stepId, 'optional');
  assert.equal(flow.canContinueActivity(), false, 'an unvisited optional is not falsely marked traversed');
});

test('feedback and matching use only returned feedback, including successful retry with pending Review', () => {
  const { feedbackTitle, pairFeedback, connectionSegments } = require('../src/features/lessons/activityPresentation.ts');
  assert.equal(feedbackTitle({ ...feedback, attempt: { isCorrect: true, attemptNumber: 2 } }), '¡Ahora sí!');
  assert.equal(feedbackTitle({ ...feedback, attempt: { isCorrect: true, attemptNumber: 1 }, review: { pending: false } }), '¡Correcto!');
  const pair = { wordId: 'book', imageId: 'cup' };
  assert.equal(pairFeedback(pair, null), null);
  assert.equal(pairFeedback(pair, { ...feedback, feedback: { correctAnswer: [{ wordId: 'book', imageId: 'book' }] } }), false);
  assert.equal(pairFeedback(pair, { ...feedback, feedback: { correctAnswer: [pair] } }), true);
  for (const y of [0, 160, -160]) assert.ok(connectionSegments(120, 60, 180, 60 + y).every(s => Number.isFinite(s.angle) && s.length > 0));
});

test('roadmap targets current including ACCESS, completed last segment, and clamps layout-based positioning', () => {
  const { roadmapTarget, initialRoadmapOffset } = require('../src/features/courses/roadmapPosition.ts');
  const lessons = [{ id: 'a', progressStatus: 'COMPLETED', progression: { isCurrent: false } }, { id: 'b', progressStatus: 'NOT_STARTED', progression: { isCurrent: true, lockReason: 'ACCESS' } }];
  const roadmap = { progress: { totalLessons: 2, completedLessons: 1 }, topics: [{ lessons }] };
  assert.equal(roadmapTarget(roadmap), 'b');
  assert.equal(roadmapTarget({ ...roadmap, progress: { totalLessons: 1, completedLessons: 1 } }), 'a');
  assert.equal(roadmapTarget({ progress: { totalLessons: 0, completedLessons: 0 }, topics: [] }), null);
  assert.equal(initialRoadmapOffset(80, 100, 700, 300), 0);
  assert.equal(initialRoadmapOffset(1200, 100, 700, 2500), 1048);
  assert.equal(initialRoadmapOffset(2400, 100, 700, 2500), 1800);
});
