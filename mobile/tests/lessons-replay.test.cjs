const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { LessonFlow } = require('../src/features/lessons/flow.ts');
const { lessonsApi } = require('../src/features/lessons/api/lessons.ts');
const { reinforcementOnCompletion, feedbackTitle } = require('../src/features/lessons/activityPresentation.ts');
const lesson = { id: 'l3', title: 'Nice to meet you!', course: { id: 'c', title: 'Inglés A1', level: 'A1' } };
const steps = ['CONTENT_STEP', 'ACTIVITY_STEP', 'ACTIVITY_STEP', 'SUMMARY_STEP'].map((type, i) => ({ id: String(i), type, required: i !== 2, blocks: [] }));
const historical = { lesson, steps, state: { status: 'COMPLETED', currentStepId: '3' }, activityProgress: { completed: 99, total: 99 } };
function replay(overrides = {}) {
  const calls = [];
  const forbidden = async () => { calls.push('FORBIDDEN'); throw new Error('Replay called a persistent endpoint'); };
  const api = { read: async () => { calls.push('read'); return historical; }, start: forbidden, attempt: forbidden, completeStep: forbidden, complete: forbidden,
    replayCheck: async (_, step, answer) => { calls.push('check:' + step); return { isCorrect: answer.text === 'correct', feedback: { message: 'checked', explanation: 'Explanation', correctAnswer: 'correct' } }; }, ...overrides };
  return { flow: new LessonFlow('l3', api), calls };
}
test('Replay is fresh, retains local answers and high-water, includes optional activity and scores first submissions at 50%', async () => {
  const { flow, calls } = replay(); await flow.load();
  assert.equal(flow.snapshot().mode, 'REPLAY'); assert.equal(flow.snapshot().stepId, '0'); assert.equal(flow.snapshot().progress.percentage, 0);
  assert.equal(flow.snapshot().feedback, null); assert.equal(flow.snapshot().answer, null);
  assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 0, total: 2 }); assert.equal(flow.back(), false);
  await flow.continueContent(); assert.equal(flow.snapshot().progress.percentage, 25);
  await flow.continueContent(); assert.equal(flow.snapshot().stepId, '1');
  flow.rememberAnswer({ text: 'draft' }); flow.back(); await flow.continueContent();
  assert.deepEqual(flow.snapshot().answer, { text: 'draft' }); assert.equal(flow.snapshot().feedback, null);
  await flow.submit({ text: 'wrong' }); assert.equal(flow.snapshot().progress.percentage, 50); assert.equal(reinforcementOnCompletion(flow.snapshot().feedback), false);
  flow.retryAnswer(); await flow.submit({ text: 'correct' }); assert.equal(feedbackTitle(flow.snapshot().feedback), '¡Ahora sí!');
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2'); assert.equal(flow.snapshot().answer, null); assert.equal(flow.snapshot().feedback, null);
  flow.back(); assert.deepEqual(flow.snapshot().answer, { text: 'correct' }); assert.equal(flow.snapshot().feedback.isCorrect, true);
  assert.equal(flow.snapshot().progress.percentage, 50); flow.continueFeedback();
  await flow.submit({ text: 'correct' }); flow.continueFeedback();
  assert.equal(flow.snapshot().stepId, '3'); assert.equal(flow.snapshot().progress.percentage, 75);
  assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 2, total: 2 });
  await flow.finish(); assert.equal(flow.snapshot().progress.percentage, 100);
  assert.deepEqual(flow.snapshot().result, { mode: 'REPLAY', lesson: { id: 'l3', title: lesson.title }, course: lesson.course,
    result: { correctAnswers: 1, totalActivities: 2, isPerfect: false } });
  assert.deepEqual(calls, ['read', 'check:1', 'check:1', 'check:2']); await flow.finish(); assert.equal(calls.length, 4);
  flow.dispose(); const reopened = replay().flow; await reopened.load(); assert.equal(reopened.snapshot().progress.percentage, 0);
  await reopened.continueContent(); assert.equal(reopened.snapshot().answer, null); assert.equal(reopened.snapshot().feedback, null);
  assert.equal(historical.activityProgress.completed, 99);
});
test('Replay 100% result traverses optional content and intermediate Summary', async () => {
  const list = [...steps.slice(0, 2), { id: 'summary-middle', type: 'SUMMARY_STEP', required: false, blocks: [] },
    { id: 'content-optional', type: 'CONTENT_STEP', required: false, blocks: [] }, ...steps.slice(2)];
  const { flow, calls } = replay({ read: async () => ({ ...historical, steps: list }) });
  await flow.load(); await flow.continueContent(); await flow.submit({ text: 'correct' }); flow.continueFeedback();
  assert.equal(flow.snapshot().stepId, 'summary-middle'); await flow.finish(); assert.equal(flow.snapshot().result, null);
  assert.equal(flow.snapshot().stepId, 'content-optional'); await flow.continueContent();
  await flow.submit({ text: 'correct' }); flow.continueFeedback(); await flow.finish();
  assert.deepEqual(flow.snapshot().result.result, { correctAnswers: 2, totalActivities: 2, isPerfect: true });
  assert.equal(flow.snapshot().progress.percentage, 100); assert.deepEqual(calls, ['check:1', 'check:2']);
});
test('Replay cannot finish or skip an unanswered activity', async () => {
  const { flow } = replay(); await flow.load(); await flow.finish(); assert.equal(flow.snapshot().result, null); assert.equal(flow.snapshot().stepId, '0');
  await flow.continueContent(); await flow.finish(); assert.equal(flow.snapshot().stepId, '1'); assert.equal(flow.snapshot().result, null);
});
test('Replay gates concurrent taps and publishes ready feedback atomically; errors do not advance', async () => {
  let release, count = 0;
  const { flow } = replay({ replayCheck: () => { count++; return new Promise(resolve => release = resolve); } });
  await flow.load(); await flow.continueContent(); const pending = flow.submit({ text: 'correct' });
  await flow.submit({ text: 'correct' }); flow.continueFeedback(); assert.equal(count, 1); assert.equal(flow.snapshot().stepId, '1');
  const seen = [];
  flow.subscribe(() => { if (flow.snapshot().feedback) { seen.push(flow.snapshot().busy); if (seen.length === 1) flow.continueFeedback(); } });
  release({ isCorrect: true, feedback: { message: 'Correct' } }); await pending;
  assert.deepEqual(seen, [false]); assert.equal(flow.snapshot().stepId, '2');
  const failed = replay({ replayCheck: async () => { throw new Error('offline'); } }).flow;
  await failed.load(); await failed.continueContent(); await failed.submit({ text: 'wrong' }); failed.continueFeedback();
  assert.equal(failed.snapshot().feedback, null); assert.equal(failed.snapshot().progress.percentage, 25); assert.equal(failed.snapshot().stepId, '1');
});
test('Matching retry clears cached pairs and feedback even after back', async () => {
  const { flow } = replay(); await flow.load(); await flow.continueContent(); await flow.submit({ pairs: [{ wordId: 'book', imageId: 'cup' }] });
  flow.retryAnswer(); flow.back(); await flow.continueContent();
  assert.deepEqual(flow.snapshot().answer, { pairs: [] }); assert.equal(flow.snapshot().feedback, null);
});
test('Replay API uses a dedicated encoded route and unchanged Answer', async () => {
  const original = global.fetch, url = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'http://local.test'; let received;
  global.fetch = async (path, options) => { received = { path, options }; return { ok: true, status: 200, json: async () => ({ isCorrect: false, feedback: { message: 'Incorrect' } }) }; };
  try { const checked = await lessonsApi.replayCheck('lesson id', 'step id', { pairs: [] });
    assert.equal(received.path, 'http://local.test/lessons/lesson%20id/replay/steps/step%20id/check');
    assert.equal(received.options.method, 'POST'); assert.deepEqual(JSON.parse(received.options.body), { pairs: [] });
    assert.deepEqual(checked, { isCorrect: false, feedback: { message: 'Incorrect' } });
  } finally { global.fetch = original; if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = url; }
});
test('incomplete starts NORMAL_RUN; completion racing with start switches to fresh Replay', async () => {
  const normal = replay({ read: async () => ({ ...historical, state: { status: 'NOT_STARTED' } }), start: async () => ({ runId: 'r', status: 'ACTIVE', currentStepId: '0', progress: { percentage: 0 } }) }).flow;
  await normal.load(); assert.equal(normal.snapshot().mode, 'NORMAL_RUN');
  let reads = 0;
  const { ApiError } = require('../src/services/api/client.ts');
  const raced = replay({ read: async () => ++reads === 1 ? { ...historical, state: { status: 'NOT_STARTED' } } : historical,
    start: async () => { throw new ApiError(409, 'LESSON_ALREADY_COMPLETED', 'Completed'); } }).flow;
  await raced.load(); assert.equal(raced.snapshot().mode, 'REPLAY'); assert.equal(raced.snapshot().progress.percentage, 0);
});
test('Roadmap targets current lesson 5 after replay of completed lesson 3', () => {
  const { roadmapTarget, initialRoadmapOffset } = require('../src/features/courses/roadmapPosition.ts');
  const roadmap = { progress: { completedLessons: 4, totalLessons: 8 }, topics: [{ lessons: Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), progression: { isCurrent: i === 4 }, progress: { status: i < 4 ? 'COMPLETED' : 'NOT_STARTED' } })) }] };
  assert.equal(roadmapTarget(structuredClone(roadmap)), '5'); assert.equal(initialRoadmapOffset(1000, 100, 600, 2000), 884);
});

// Exercise the component output with native primitives/hook initialization stubbed.
// This verifies conditional controls/copy, not Android layout or touch delivery.
function component(relative, overrides = {}) {
  const filename = require('node:path').resolve(__dirname, relative);
  const localRequire = require('node:module').createRequire(filename);
  const output = { exports: {} };
  const load = name => {
    if (name in overrides) return overrides[name];
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useState: initial => [initial, () => {}], useReducer: (_, initial) => [initial, () => {}] };
    if (name === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TextInput: 'TextInput',
      StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 400, fontScale: 1 }), Keyboard: { dismiss() {} } };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (name === 'react-native-svg') return { default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' };
    if (name.endsWith('/ui')) return { Button: 'Button' };
    if (name.endsWith('/theme')) return { colors: {} };
    if (name.endsWith('/lessonStyles')) return { lessonStyles: {} };
    if (name.endsWith('/LearningIcon')) return { LearningIcon: 'LearningIcon' };
    if (name.endsWith('/MatchingPairs')) return { MatchingPairs: 'MatchingPairs' };
    if (name.endsWith('/ActivityStep')) return { ActivityStep: 'ActivityStep' };
    if (name.endsWith('/ContentBlocks')) return { LessonImage: 'LessonImage' };
    if (name.endsWith('/RichContent')) return { AudioButton: 'AudioButton', DialogueRow: 'DialogueRow' };
    if (name.endsWith('/accessInfo')) return { showAccessInfo() {} };
    if (name.endsWith('/ContextualHeader')) return { ContextualHeader: 'ContextualHeader' };
    return localRequire(name);
  };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function('require', 'module', 'exports', code)(load, output, output.exports);
  return output.exports;
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node === 'boolean') return [];
  return typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [node];
}
test('Replay Result renders 50%/100%, no historical Review/course progress/Next, and one route CTA', () => {
  const { LessonResultScreen } = component('../src/features/lessons/screens/LessonResultScreen.tsx');
  for (const correctAnswers of [1, 2]) {
    const navigationCalls = [];
    const tree = nodes(LessonResultScreen({ route: { params: { courseId: 'c', result: {
      mode: 'REPLAY', lesson, course: lesson.course, result: { correctAnswers, totalActivities: 2, isPerfect: correctAnswers === 2 },
    } } }, navigation: { popTo: (...args) => navigationCalls.push(args) } }));
    const copy = tree.filter(n => typeof n !== 'object').join(' ');
    assert.match(copy, /¡Repaso completado!/); assert.match(copy, /primer intento de esta repetición/);
    assert.ok(tree.some(n => n === correctAnswers * 50));
    assert.doesNotMatch(copy, /SIGUIENTE LECCIÓN|Progreso del curso|Guardado|reforzar/);
    const buttons = tree.filter(n => n.type === 'Button');
    assert.deepEqual(buttons.map(n => n.props.title), ['Continuar mi ruta']); buttons[0].props.onPress();
    assert.deepEqual(navigationCalls, [['Roadmap', { courseId: 'c' }]]);
  }
});
test('Replay Activity starts neutral without visited action; feedback never promises Review persistence', () => {
  const { ActivityStep } = component('../src/features/lessons/components/ActivityStep.tsx');
  const activity = { id: 'a', type: 'MATCH_WORD_IMAGE', prompt: 'Match', words: [{ id: 'book', text: 'Book' }], images: [{ id: 'book', alt: 'Libro', url: 'book.png' }] };
  const props = { activity, busy: false, feedback: null, initialAnswer: null, onSubmit() {}, onRetry() {}, onContinue() {} };
  const fresh = nodes(ActivityStep(props));
  const pairs = fresh.find(n => n.type === 'MatchingPairs').props;
  assert.deepEqual(pairs.pairs, []); assert.equal(pairs.word, null); assert.equal(pairs.feedback, null);
  assert.equal(fresh.find(n => n.type === 'Button').props.disabled, true);
  assert.ok(!fresh.includes('Responder de nuevo'));
  for (const isCorrect of [false, true]) {
    const rendered = nodes(ActivityStep({ ...props, feedback: { mode: 'REPLAY', submissionNumber: 2, isCorrect, feedback: { message: 'checked', explanation: 'Explanation' } } }));
    assert.doesNotMatch(rendered.filter(n => typeof n === 'string').join(' '), /Guardamos|Conservamos|reforzarlo|Responder de nuevo/);
    assert.equal(rendered.includes('Intentar de nuevo'), !isCorrect);
  }
  assert.ok(!nodes(ActivityStep(props)).includes('Responder de nuevo'), 'No historical visited action remains');
  const normal = nodes(ActivityStep({ ...props, feedback: { runId: 'r', attempt: { isCorrect: false, attemptNumber: 1 }, reinforcement: { onCompletion: true }, feedback: {} } }));
  assert.ok(normal.includes('Al terminar la lección guardaremos este ejercicio para reforzarlo.'));
  assert.ok(!normal.includes('Guardamos este ejercicio para reforzarlo más adelante.'));
});

test('LessonScreen wires chevron and hardware Back to the same cancellable exit modal', async () => {
  let hardwareBack, modal, abandoned = 0;
  const { flow } = replay({ read: async () => ({ ...historical, lesson: { ...lesson, topic: { title: 'Topic' }, position: { lesson: 3, totalLessons: 8 } }, state: { status: 'NOT_STARTED' } }),
    start: async () => ({ runId: 'r', currentStepId: '1', progress: { percentage: 25 } }), abandon: async () => { abandoned++; } });
  await flow.load();
  const overrides = {
    '../flow': { LessonFlow: function () { return flow; } },
    react: { useCallback: fn => fn, useMemo: fn => fn(), useRef: () => ({ current: null }), useSyncExternalStore: (_, snapshot) => snapshot(),
      useEffect: (fn, deps) => { if (deps.length === 2 && deps[1] === flow) fn(); } },
    'react-native': { StyleSheet: { create: s => s }, Platform: { OS: 'android' }, Alert: { alert: (...args) => { modal = args; } },
      BackHandler: { addEventListener: (_, fn) => { hardwareBack = fn; return { remove() {} }; } } },
    '@react-navigation/native': { useFocusEffect: fn => fn(), usePreventRemove() {} },
  };
  const { LessonScreen } = component('../src/features/lessons/screens/LessonScreen.tsx', overrides);
  const props = { route: { params: { lessonId: 'l3', courseId: 'c' } }, navigation: { popTo() {}, replace() {} } };
  const before = flow.snapshot();
  nodes(LessonScreen(props)).find(n => n.type === 'ContextualHeader').props.onBack();
  LessonScreen(props); assert.equal(modal[0], '¿Salir de la lección?');
  assert.deepEqual(modal[2].map(b => b.text), ['Seguir aprendiendo', 'Salir']);
  modal[2][0].onPress(); assert.deepEqual(flow.snapshot(), before);
  assert.equal(hardwareBack(), true); LessonScreen(props); modal[2][1].onPress();
  assert.equal(abandoned, 1); assert.equal(flow.snapshot().exited, true);
});
