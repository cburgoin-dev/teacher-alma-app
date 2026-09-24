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

test('first published feedback is ready for one Continue; pending attempts cannot advance or double submit', async () => {
  let release;
  let submissions = 0;
  const { flow } = fixture({ attempt: () => { submissions++; return new Promise(resolve => release = resolve); } });
  await flow.load(); await flow.continueContent();
  const observed = [];
  const unsubscribe = flow.subscribe(() => {
    const state = flow.snapshot();
    if (!state.feedback) return;
    observed.push({ busy: state.busy, stepId: state.stepId });
    // Simulate a tap as soon as the external store publishes the feedback.
    if (observed.length === 1) flow.continueFeedback();
  });
  const pending = flow.submit({ text: 'am' });
  flow.continueFeedback();
  await flow.submit({ text: 'am' });
  assert.equal(flow.snapshot().stepId, '1');
  assert.equal(flow.snapshot().feedback, null);
  assert.equal(flow.snapshot().busy, true);
  assert.equal(submissions, 1);
  release(feedback);
  await pending;
  unsubscribe();
  assert.deepEqual(observed, [{ busy: false, stepId: '1' }]);
  assert.equal(flow.snapshot().stepId, '2');
  assert.equal(flow.snapshot().feedback, null);
  flow.continueFeedback();
  assert.equal(flow.snapshot().stepId, '2', 'a repeated Continue does not skip the next step');
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
  const { feedbackTitle, pairFeedback, connectionPath } = require('../src/features/lessons/activityPresentation.ts');
  assert.equal(feedbackTitle({ ...feedback, attempt: { isCorrect: true, attemptNumber: 2 } }), '¡Ahora sí!');
  assert.equal(feedbackTitle({ ...feedback, attempt: { isCorrect: true, attemptNumber: 1 }, review: { pending: false } }), '¡Correcto!');
  const pair = { wordId: 'book', imageId: 'cup' };
  assert.equal(pairFeedback(pair, null), null);
  assert.equal(pairFeedback(pair, { ...feedback, feedback: { correctAnswer: [{ wordId: 'book', imageId: 'book' }] } }), false);
  assert.equal(pairFeedback(pair, { ...feedback, feedback: { correctAnswer: [pair] } }), true);
  for (const y of [0, 160, -160]) assert.equal(connectionPath(120, 60, 180, 60 + y), `M 120 60 C 150 60, 150 ${60 + y}, 180 ${60 + y}`);
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

test('v2 emphasis and Summary use explicit fields; v1 fallback never infers key phrases', () => {
  const { textRuns, summaryTakeaways } = require('../src/features/lessons/contentPresentation.ts');
  const segments = [{ text: 'Use ' }, { text: 'Hello', emphasis: 'KEY' }];
  assert.deepEqual(textRuns('legacy text', segments), segments);
  assert.deepEqual(textRuns('Hello Hello'), [{ text: 'Hello Hello' }]);
  assert.deepEqual(textRuns(), []);
  assert.deepEqual(summaryTakeaways({ points: ['legacy'] }), [{ text: 'legacy' }]);
  assert.deepEqual(summaryTakeaways({ points: ['legacy'], takeaways: [{ text: 'Use Hello', segments }] }), [{ text: 'Use Hello', segments }]);
  assert.deepEqual(summaryTakeaways({}), []);
});

test('dialogue MC context replaces legacy situation without parsing; other prompts and instructions survive', () => {
  const { activityPresentation, mediaUrl } = require('../src/features/lessons/contentPresentation.ts');
  const base = { type: 'MULTIPLE_CHOICE', prompt: 'An arbitrary speaker and situation', instruction: 'Configured instruction' };
  assert.equal(activityPresentation(base).showPrompt, true);
  assert.equal(activityPresentation({ ...base, context: { type: 'DIALOGUE', text: 'Any dialogue' } }).showPrompt, false);
  assert.equal(activityPresentation({ ...base, context: { type: 'TEXT', text: 'Background' } }).showPrompt, true);
  assert.equal(activityPresentation({ ...base, type: 'FILL_BLANK_TEXT', context: { type: 'DIALOGUE', text: 'Background' } }).showPrompt, true);
  assert.equal(activityPresentation(base).instruction, 'Configured instruction');
  for (const value of [undefined, '', 'javascript:alert(1)', 'file:///audio.mp3', 'https://user:pass@example.org/a.mp3']) assert.equal(mediaUrl(value), undefined);
  assert.equal(mediaUrl('https://example.org/a.mp3'), 'https://example.org/a.mp3');
});

test('fresh activity count is optional metadata: slow GET cannot delay feedback or one-tap Continue', async () => {
  let release;
  let reads = 0;
  const { flow } = fixture({ read: async () => ++reads === 1 ? { ...data, activityProgress: { completed: 0, total: 2 } } : new Promise(resolve => release = resolve) });
  await flow.load(); await flow.continueContent(); await flow.submit({ text: 'am' });
  assert.equal(flow.snapshot().busy, false);
  assert.ok(flow.snapshot().feedback);
  assert.equal(flow.snapshot().data.activityProgress, undefined, 'never display the stale initial count');
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2');
  release({ ...data, activityProgress: { completed: 1, total: 2 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 1, total: 2 });
  assert.equal(flow.snapshot().stepId, '2', 'metadata cannot move the pointer');
});

test('older activity count cannot overwrite a retry read; failed metadata read does not fail the attempt', async () => {
  let reads = 0;
  let releaseOld;
  const { flow } = fixture({ read: async () => {
    reads++;
    if (reads === 1) return data;
    if (reads === 2) return new Promise(resolve => releaseOld = resolve);
    return { ...data, activityProgress: { completed: 1, total: 3 } };
  } });
  await flow.load(); await flow.continueContent(); await flow.submit({ text: 'wrong' });
  flow.retryAnswer(); await flow.submit({ text: 'correct' });
  await new Promise(resolve => setImmediate(resolve));
  releaseOld({ ...data, activityProgress: { completed: 0, total: 3 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 1, total: 3 }, 'retry does not fabricate a second completed activity');
  const failed = fixture({ read: async () => { if (++reads > 4) throw new Error('offline metadata'); return data; } });
  await failed.flow.load(); await failed.flow.continueContent(); await failed.flow.submit({ text: 'answer' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(failed.flow.snapshot().error, null);
  assert.ok(failed.flow.snapshot().feedback);
  failed.flow.continueFeedback(); assert.equal(failed.flow.snapshot().stepId, '2');
});

test('resume preserves server activity traversal count including pending optional blocks; disposed reads cannot publish', async () => {
  const resumed = fixture({ read: async () => ({ ...data, activityProgress: { completed: 1, total: 3 } }), start: async () => ({ status: 'IN_PROGRESS', currentStepId: '2', progress }) });
  await resumed.flow.load();
  assert.deepEqual(resumed.flow.snapshot().data.activityProgress, { completed: 1, total: 3 });
  assert.equal(resumed.flow.snapshot().stepId, '2');
  let reads = 0, release;
  const { flow } = fixture({ read: async () => ++reads === 1 ? data : new Promise(resolve => release = resolve) });
  await flow.load(); await flow.continueContent(); await flow.submit({ text: 'answer' });
  flow.dispose(); const snapshot = flow.snapshot();
  release({ ...data, activityProgress: { completed: 1, total: 1 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(flow.snapshot(), snapshot);
});

test('Matching retry clears pairs and pending word, removes feedback and submits a new attempt', async () => {
  const { matchingDraft } = require('../src/features/lessons/matchingDraft.ts');
  const { pairFeedback } = require('../src/features/lessons/activityPresentation.ts');
  let draft = { pairs: [], word: null };
  draft = matchingDraft(draft, { type: 'select', word: 'book' });
  draft = matchingDraft(draft, { type: 'connect', image: 'cup' });
  draft = matchingDraft(draft, { type: 'select', word: 'ball' });
  const { flow, calls } = fixture();
  await flow.load(); await flow.continueContent(); await flow.submit({ pairs: draft.pairs });
  draft = matchingDraft(draft, { type: 'retry' }); flow.retryAnswer();
  assert.deepEqual(draft, { pairs: [], word: null });
  assert.equal(flow.snapshot().feedback, null);
  assert.equal(pairFeedback(undefined, flow.snapshot().feedback), null);
  assert.equal(matchingDraft(draft, { type: 'connect', image: 'book' }), draft, 'cannot connect using the old selected word');
  draft = matchingDraft(draft, { type: 'select', word: 'book' });
  draft = matchingDraft(draft, { type: 'connect', image: 'book' });
  await flow.submit({ pairs: draft.pairs });
  assert.equal(calls.filter(c => c === 'attempt').length, 2);
  assert.deepEqual(flow.snapshot().answer, { pairs: [{ wordId: 'book', imageId: 'book' }] });
});

test('Result accuracy uses first-attempt totals and course label has no duplicate level', () => {
  const { accuracy, courseLabel } = require('../src/features/lessons/contentPresentation.ts');
  assert.equal(accuracy(1, 2), 50); assert.equal(accuracy(2, 2), 100);
  assert.equal(accuracy(0, 0), 0); assert.equal(accuracy(2, 3), 67);
  assert.equal(courseLabel({ title: 'Inglés A2', level: 'A2' }), 'Inglés A2');
  assert.equal(courseLabel({ title: 'Conversation', level: null }), 'Conversation');
  assert.equal(courseLabel(undefined), undefined);
});
