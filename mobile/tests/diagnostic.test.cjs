const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { DiagnosticFlow } = require('../src/features/diagnostic/flow.ts');
const { diagnosticApi } = require('../src/features/diagnostic/api.ts');
const { questionProgress, resultCourseAction } = require('../src/features/diagnostic/presentation.ts');
const { ApiError } = require('../src/services/api/client.ts');
const metadata = { available: true, diagnostic: { id: 'd', title: 'Diagnostic', version: 1, questionCount: 4, estimatedMinutes: 5 } };
const active = position => ({ attempt: { id: 'attempt', status: 'ACTIVE', answeredQuestions: position - 1, totalQuestions: 4 },
  question: { id: `q${position}`, position, totalQuestions: 4, activity: { id: `a${position}`, type: 'MULTIPLE_CHOICE', prompt: 'Hello', options: [{ id: 'a', text: 'Hi' }] } } });
const result = { attemptId: 'attempt', completedAt: '2026-10-13T12:00:00Z', recommendedLevel: 'A2', recommendedCourse: null, strengths: null, reinforcementAreas: null };
const completed = { attempt: { id: 'attempt', status: 'COMPLETED', answeredQuestions: 4, totalQuestions: 4, completedAt: result.completedAt }, result };
function fixture(overrides = {}, view = 'intro') {
  const calls = []; let sequence = 0;
  const api = { metadata: async () => metadata, start: async () => active(1), submit: async () => completed, abandon: async () => {}, result: async () => ({ result }), ...overrides };
  for (const name of Object.keys(api)) { const fn = api[name]; api[name] = async (...args) => { calls.push([name, ...args]); return fn(...args); }; }
  return { flow: new DiagnosticFlow(view, api, () => `request_key_${++sequence}`), calls };
}
test('intro reads real metadata without creating an attempt; unavailable cannot start', async () => {
  const { flow, calls } = fixture(); await flow.load();
  assert.deepEqual(flow.snapshot().metadata, metadata); assert.equal(flow.back(), false); assert.deepEqual(calls.map(c => c[0]), ['metadata']);
  const unavailable = fixture({ metadata: async () => ({ available: false, diagnostic: null }) });
  await unavailable.flow.load(); await unavailable.flow.start(); assert.equal(unavailable.calls.length, 1);
});
test('start double tap is coalesced and uncertain transport retry retains the intention key', async () => {
  let reject; let count = 0;
  const { flow, calls } = fixture({ start: () => ++count === 1 ? new Promise((_, r) => { reject = r; }) : Promise.resolve(active(1)) });
  await flow.load(); const first = flow.start(); await flow.start(); assert.equal(count, 1);
  reject(Error('lost response')); await first; const key = flow.snapshot().startKey;
  await flow.start(); assert.equal(calls.filter(c => c[0] === 'start')[1][1], key); assert.equal(flow.snapshot().phase, 'questions');
});
test('submit retains exact payload/key across uncertainty, rejects concurrent sends and advances once', async () => {
  let reject; let count = 0;
  const { flow, calls } = fixture({ submit: () => ++count === 1 ? new Promise((_, r) => { reject = r; }) : Promise.resolve(active(2)) });
  await flow.load(); await flow.start();
  const answer = { pairs: [{ wordId: 'w', imageId: 'i' }] };
  const first = flow.submit(answer); answer.pairs[0].imageId = 'edited';
  await flow.submit({ text: 'double tap' }); assert.equal(count, 1);
  reject(Error('offline')); await first; assert.ok(flow.snapshot().pending); assert.equal(flow.snapshot().active.question.id, 'q1');
  await flow.submit({ text: 'different draft' });
  const submissions = calls.filter(c => c[0] === 'submit'); assert.deepEqual(submissions[0], submissions[1]);
  assert.equal(submissions[0][4].pairs[0].imageId, 'i'); assert.equal(flow.snapshot().active.question.id, 'q2'); assert.equal(flow.snapshot().pending, null);
});
test('final receipt becomes Result without a result fetch; retake gets new start and submission keys', async () => {
  const { flow, calls } = fixture(); await flow.load(); await flow.start(); await flow.submit({ selectedOptionId: 'a' });
  assert.equal(flow.snapshot().phase, 'result'); assert.equal(flow.snapshot().result, result); assert.equal(flow.snapshot().active, null);
  assert.equal(flow.back(), false); assert.equal(calls.some(c => c[0] === 'result'), false);
  await flow.retake(); await flow.start(); await flow.submit({ text: 'new attempt' });
  const starts = calls.filter(c => c[0] === 'start'); assert.notEqual(starts[0][1], starts[1][1]);
  const submissions = calls.filter(c => c[0] === 'submit'); assert.notEqual(submissions[0][3], submissions[1][3]);
});
test('active exit can cancel; failed abandon stays active, confirmed retry exits only after success', async () => {
  let fail = true; const { flow } = fixture({ abandon: async () => { if (fail) throw Error('offline'); } });
  await flow.load(); await flow.start(); assert.equal(flow.back(), true); assert.equal(flow.snapshot().exitRequested, true);
  flow.cancelExit(); assert.equal(flow.snapshot().exitRequested, false); assert.ok(flow.snapshot().active);
  flow.back(); await flow.confirmExit(); assert.equal(flow.snapshot().exited, false); assert.ok(flow.snapshot().error); assert.ok(flow.snapshot().active);
  fail = false; flow.back(); await flow.confirmExit(); assert.equal(flow.snapshot().exited, true); assert.equal(flow.snapshot().active, null);
});
test('uncertain start is resolved with original key before abandon, never restored on a new screen', async () => {
  let n = 0; const { flow, calls } = fixture({ start: async () => { if (++n === 1) throw Error('lost'); return active(1); } });
  await flow.load(); await flow.start(); flow.back(); await flow.confirmExit();
  const starts = calls.filter(c => c[0] === 'start'); assert.equal(starts[0][1], starts[1][1]); assert.equal(calls.at(-1)[0], 'abandon');
  const fresh = fixture(); await fresh.flow.load(); assert.equal(fresh.flow.snapshot().active, null); assert.equal(fresh.flow.snapshot().startKey, null);
});
test('lost final receipt retried returns same completed outcome; completion racing abandon shows result', async () => {
  let n = 0; const { flow } = fixture({ submit: async () => { if (++n === 1) throw Error('lost final'); return completed; } });
  await flow.load(); await flow.start(); await flow.submit({ text: 'answer' }); await flow.submit({ text: 'answer' });
  assert.equal(flow.snapshot().result, result);
  const other = fixture({ submit: async () => { throw Error('lost'); }, abandon: async () => { throw new ApiError(409, 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE', 'completed'); } });
  await other.flow.load(); await other.flow.start(); await other.flow.submit({ text: 'answer' }); other.flow.back(); await other.flow.confirmExit();
  assert.equal(other.flow.snapshot().result, result); assert.equal(other.flow.snapshot().exited, false);
});
test('invalid answers unlock the draft; active conflicts require abandon, terminal attempts allow a fresh intention', async () => {
  for (const [code, status] of [['INVALID_ANSWER', 400], ['DIAGNOSTIC_QUESTION_ALREADY_SUBMITTED', 409], ['DIAGNOSTIC_ATTEMPT_NOT_ACTIVE', 409]]) {
    const { flow } = fixture({ submit: async () => { throw new ApiError(status, code, code); } });
    await flow.load(); await flow.start(); await flow.submit({ text: 'answer' }); assert.equal(flow.snapshot().pending, null);
    assert.equal(flow.snapshot().phase, status === 400 ? 'questions' : 'terminal');
    assert.equal(!!flow.snapshot().active, code !== 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE');
  }
});
test('later result lookup reads current result and visual progress is not an academic score', async () => {
  const { flow, calls } = fixture({}, 'result'); await flow.load(); assert.deepEqual(calls, [['result']]); assert.equal(flow.snapshot().result, result);
  assert.equal(questionProgress(active(1).question), 25); assert.equal(questionProgress(active(4).question), 100);
});
test('result course actions reuse Courses truth, including nullable course and paid courses', () => {
  assert.equal(resultCourseAction(result), null);
  for (const [status, screen, title] of [[null, 'CourseDetail', 'Ver curso recomendado'], ['NOT_STARTED', 'CourseDetail', 'Ver curso recomendado'], ['IN_PROGRESS', 'Roadmap', 'Continuar curso'], ['COMPLETED', 'Roadmap', 'Repasar curso']]) {
    assert.deepEqual(resultCourseAction({ ...result, recommendedCourse: { id: 'paid', status: 'PUBLISHED', progress: status && { status }, access: { hasFullAccess: false, hasFreeContent: false } } }), { screen, params: { courseId: 'paid' }, title });
  }
});
test('API uses only the five contracted routes and forwards exact keys/answers without learning headers', async () => {
  const oldFetch = global.fetch, oldUrl = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'http://diagnostic.test';
  const calls = [];
  global.fetch = async (url, options) => { calls.push([url, options]); return new Response(JSON.stringify(metadata)); };
  try {
    await diagnosticApi.metadata(); await diagnosticApi.start('key'); await diagnosticApi.submit('attempt', 'q1', 'submit_key', { text: 'went' }); await diagnosticApi.abandon('attempt'); await diagnosticApi.result();
    assert.deepEqual(calls.map(([url]) => url.replace('http://diagnostic.test', '')), ['/diagnostic', '/diagnostic/attempts', '/diagnostic/attempts/attempt/questions/q1/submit', '/diagnostic/attempts/attempt/abandon', '/diagnostic/result']);
    assert.deepEqual(JSON.parse(calls[2][1].body), { requestKey: 'submit_key', answer: { text: 'went' } });
    assert.deepEqual(calls.map(c => c[1].method), [undefined, 'POST', 'POST', 'POST', undefined]);
    assert.ok(calls.every(c => !JSON.stringify(c[1].headers).includes('Timezone')));
  } finally { global.fetch = oldFetch; if (oldUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = oldUrl; }
});
test('root stack replaces Diagnostic with course destination; Back cannot reopen questions', async () => {
  const { StackRouter, StackActions, CommonActions } = await import('@react-navigation/routers');
  const config = { routeNames: ['MainTabs', 'Diagnostic', 'CourseDetail', 'Roadmap'], routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: 'MainTabs' });
  const base = router.getInitialState(config);
  const diagnostic = router.getStateForAction(base, CommonActions.navigate('Diagnostic', { view: 'intro' }), config);
  for (const target of ['CourseDetail', 'Roadmap']) {
    const routed = router.getStateForAction(diagnostic, StackActions.replace(target, { courseId: 'c' }), config);
    assert.deepEqual(routed.routes.map(r => r.name), ['MainTabs', target]);
    assert.deepEqual(router.getStateForAction(routed, CommonActions.goBack(), config).routes.map(r => r.name), ['MainTabs']);
  }
  const catalog = router.getStateForAction(diagnostic, StackActions.popTo('MainTabs', { screen: 'CoursesTab' }), config);
  assert.equal(catalog.routes.length, 1); assert.equal(catalog.routes[0].params.screen, 'CoursesTab');
});


test('Diagnostic counter and bar both describe the current question position', () => {
  assert.deepEqual([1,2,3,4].map(position => questionProgress(active(position).question)), [25,50,75,100]);
});

test('optional Course Detail enrichment uses real counts, tolerates failure and ignores stale responses', async () => {
  const { loadCourseMetadata } = require('../src/features/diagnostic/courseMetadata.ts');
  const labels = [], publish = label => labels.push(label);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  loadCourseMetadata('c', publish, { detail: async id => ({ id, content: { lessonCount: 8, topicCount: 4 } }) });
  await tick(); assert.deepEqual(labels, ['8 lecciones · 4 temas']);
  loadCourseMetadata('c', publish, { detail: async () => { throw Error('offline'); } });
  loadCourseMetadata('c', publish, { detail: async () => ({ id: 'other', content: { lessonCount: 99, topicCount: 99 } }) });
  let resolve, signal;
  const cancel = loadCourseMetadata('old', publish, { detail: (_, s) => { signal = s; return new Promise(r => resolve = r); } });
  cancel(); assert.equal(signal.aborted, true);
  resolve({ id: 'old', content: { lessonCount: 99, topicCount: 99 } });
  await tick(); assert.deepEqual(labels, ['8 lecciones · 4 temas']);
  loadCourseMetadata('c', publish, { detail: async id => ({ id, content: { lessonCount: 1, topicCount: 1 } }) });
  await tick(); assert.equal(labels.at(-1), '1 lección · 1 tema');
});
