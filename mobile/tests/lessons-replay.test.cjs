global.__DEV__ = false;
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
  assert.deepEqual(flow.snapshot().data.activityProgress, { completed: 0, total: 2 }); assert.equal(flow.back(), true); flow.cancelExit();
  await flow.continueContent(); assert.equal(flow.snapshot().progress.percentage, 25);
  await flow.continueContent(); assert.equal(flow.snapshot().stepId, '1');
  flow.rememberAnswer({ text: 'draft' }); flow.revisit('0'); await flow.continueContent();
  assert.deepEqual(flow.snapshot().answer, { text: 'draft' }); assert.equal(flow.snapshot().feedback, null);
  await flow.submit({ text: 'wrong' }); assert.equal(flow.snapshot().progress.percentage, 50); assert.equal(reinforcementOnCompletion(flow.snapshot().feedback), false);
  flow.retryAnswer(); await flow.submit({ text: 'correct' }); assert.equal(feedbackTitle(flow.snapshot().feedback), '¡Ahora sí!');
  flow.continueFeedback(); assert.equal(flow.snapshot().stepId, '2'); assert.equal(flow.snapshot().answer, null); assert.equal(flow.snapshot().feedback, null);
  flow.revisit('1'); assert.deepEqual(flow.snapshot().answer, { text: 'correct' }); assert.equal(flow.snapshot().feedback.isCorrect, true);
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
  flow.retryAnswer(); flow.revisit('0'); await flow.continueContent();
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
  const roadmap = { progress: { completedLessons: 4, totalLessons: 8 }, currentNode: { type: 'LESSON', id: '5' }, topics: [{ nodes: Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), progression: { isCurrent: i === 4 }, progress: { status: i < 4 ? 'COMPLETED' : 'NOT_STARTED' } })) }] };
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
    if (name.startsWith('lucide-react-native/icons/')) return { default: name };
    if (name === 'react') return { useEffect() {}, useRef: value => ({ current: value }), useState: initial => [initial, () => {}], useReducer: (_, initial) => [initial, () => {}] };
    if (name === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', TextInput: 'TextInput',
      StyleSheet: { create: value => value }, useWindowDimensions: () => overrides.dimensions ?? ({ width: 400, fontScale: 1 }), Keyboard: { dismiss() {} } };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (name === 'react-native-svg') return { default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' };
    if (name.endsWith('/ui')) return { Button: 'Button', styles: { button: { minHeight: 48 }, buttonText: {} } };
    if (name.endsWith('/theme')) return { colors: {} };
    if (name.endsWith('/lessonStyles')) return { lessonStyles: {} };
    if (name.endsWith('/LearningIcon')) return { LearningIcon: 'LearningIcon' };
    if (name.endsWith('/MatchingPairs')) return { MatchingPairs: 'MatchingPairs' };
    if (name.endsWith('/ActivityStep')) return { ActivityStep: 'ActivityStep' };
    if (name.endsWith('/ContentBlocks')) return { LessonImage: 'LessonImage' };
    if (name.endsWith('/AudioButton')) return { AudioButton: 'AudioButton', lessonAudio: { stop() {} } };
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

test('shared CTA owns the full painted touch surface; busy preserves its label layout and blocks repeat taps', () => {
  const { Button } = component('../src/features/courses/components/ui.tsx', {
    '../../../theme': { colors: { red: '#F52A46', blue: '#0062E9' }, radius: { pill: 999 }, type: {} },
    './CourseVisualIcon': { CourseVisualIcon: 'Icon' }, './CourseCover': { CourseCover: 'Cover' },
  });
  let taps = 0;
  const idle = Button({ title: 'Comenzar reto', onPress: () => taps++ });
  assert.equal(idle.type, 'Pressable'); idle.props.onPress(); assert.equal(taps, 1);
  assert.equal(idle.props.children.props.pointerEvents, 'none');
  const resting = idle.props.style({ pressed: false }).filter(Boolean);
  const pressed = idle.props.style({ pressed: true }).filter(Boolean);
  assert.ok(resting[0].minHeight >= 48);
  assert.equal(resting[0], pressed[0]); assert.ok(pressed.at(-1).opacity < resting.at(-1).opacity);
  const busy = Button({ title: 'Comenzar reto', onPress: () => taps++, busy: true });
  assert.equal(busy.props.disabled, true); assert.equal(busy.props.accessibilityState.busy, true);
  assert.ok(nodes(busy).includes('Comenzar reto'), 'Invisible label reserves identical layout during loading');
  assert.deepEqual(busy.props.children.props.style, idle.props.children.props.style);
});
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
    assert.deepEqual(buttons.map(n => n.props.title), ['Continuar en la ruta']); buttons[0].props.onPress();
    assert.deepEqual(navigationCalls, [['Roadmap', { courseId: 'c', completionTicket: undefined }]]);
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

test('V6 Matching images are tappable first, selected on either side, and locked only during submit/feedback', () => {
  const { MatchingPairs } = component('../src/features/lessons/components/MatchingPairs.tsx');
  const activity = { words: [{ id: 'book', text: 'Book' }], images: [{ id: 'book-image', alt: 'Libro', url: 'book.png' }] };
  const tapped = [];
  for (const selected of [{ word: 'book', image: null }, { word: null, image: 'book-image' }, { word: null, image: null }]) {
    const tree = nodes(MatchingPairs({ activity, pairs: [], ...selected, disabled: false, feedback: null,
      onSelect: id => tapped.push(id), onConnect: id => tapped.push(id) }));
    const buttons = tree.filter(n => n.type === 'Pressable');
    assert.ok(buttons.every(n => n.props.disabled === false));
    assert.deepEqual(buttons.map(n => n.props.accessibilityState.selected), [!!selected.word, !!selected.image]);
    buttons[1].props.onPress(); buttons[0].props.onPress();
    assert.ok(tree.some(n => n.props?.pointerEvents === 'none'), 'connectors cannot intercept taps');
  }
  assert.deepEqual(tapped, ['book-image', 'book', 'book-image', 'book', 'book-image', 'book']);
  const locked = nodes(MatchingPairs({ activity, pairs: [], word: null, image: null, disabled: true, feedback: null }));
  assert.ok(locked.filter(n => n.type === 'Pressable').every(n => n.props.disabled));
});

test('V6 normal Result names the course once and retains first-attempt score for perfect/non-perfect', () => {
  const { LessonResultScreen } = component('../src/features/lessons/screens/LessonResultScreen.tsx');
  for (const correctAnswers of [1, 2]) {
    const tree = nodes(LessonResultScreen({ route: { params: { courseId: 'c', result: {
      mode: 'NORMAL_RUN', lesson: { title: 'Nice to meet you!' }, course: { title: 'Inglés A1', level: 'A1' },
      result: { totalActivities: 2, correctAnswers, isPerfect: correctAnswers === 2, pendingReviewCount: correctAnswers === 1 ? 1 : 0 },
      courseProgress: { completedLessons: 3, totalLessons: 8, percentage: 37.5, status: 'IN_PROGRESS' }, nextNode: null,
    } } }, navigation: { popTo() {} } }));
    assert.equal(tree.filter(n => n === 'Inglés A1').length, 1);
    assert.ok(tree.includes(correctAnswers * 50));
    const copy = tree.filter(n => typeof n === 'string').join(' ');
    assert.match(copy, /primer intento/);
    assert.doesNotMatch(copy, /obligatorias/);
    assert.match(copy, correctAnswers === 2 ? /¡Excelente trabajo!/ : /¡Lección completada!/);
  }
});

test('Lesson Result has one red Roadmap CTA with accessible, locked or absent next node; Review is retained', () => {
  const { LessonResultScreen } = component('../src/features/lessons/screens/LessonResultScreen.tsx');
  for (const nextNode of [null, { type: 'UNIT_CHALLENGE', id: 'challenge', title: 'Challenge', accessible: true, lockReason: null }, { type: 'LESSON', id: 'next', title: 'Next', accessible: false, lockReason: 'ACCESS' }]) {
    const calls = [];
    const tree = nodes(LessonResultScreen({ route: { params: { courseId: 'c', result: {
      lesson: { id: 'l', title: 'Lesson' }, result: { totalActivities: 2, correctAnswers: 1, isPerfect: false, pendingReviewCount: 1 },
      courseProgress: { completedRequiredNodes: 3, totalRequiredNodes: 12, percentage: 25, status: 'IN_PROGRESS' }, nextNode,
    } } }, navigation: { popTo: (...args) => calls.push(args), navigate: (...args) => calls.push(args) } }));
    const buttons = tree.filter(n => n.type === 'Button');
    assert.equal(buttons.length, 1); assert.equal(buttons[0].props.title, 'Continuar en la ruta');
    assert.ok(!buttons[0].props.tone || buttons[0].props.tone === 'red');
    buttons[0].props.onPress(); assert.deepEqual(calls[0], ['Roadmap', { courseId: 'c', completionTicket: undefined }]);
    tree.find(n => n.type === 'Pressable').props.onPress();
    assert.deepEqual(calls[1], ['Review', { courseId: 'c', preferredLessonId: 'l' }]);
  }
});

test('Conversation closes for reading before the single final CTA submits, preserving blanks and rejecting double taps', () => {
  const values = []; let cursor = 0;
  const closing = { current: false };
  const hooks = { useRef: () => closing, useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; } };
  const { ConversationView } = component('../src/features/unit-challenges/phaseViews.tsx', { react: hooks, './ChatMotion': { ChatBubble: 'ChatBubble', TypingBubble: 'TypingBubble' }, './styles': { challengeStyles: {} }, './useConversationReveal': { useConversationReveal: (_, boundary) => ({ visible: boundary, reduced: true, pending: false }) } });
  const content = { participants: [{ id: 'emma', name: 'Emma' }], steps: [
    { id: 'm1', kind: 'MESSAGE', speakerId: 'emma', text: 'Hello' },
    { id: 'q1', kind: 'CHOICE', options: [{ id: 'a', text: 'Hi!' }, { id: 'b', text: 'Bye!' }] },
    { id: 'q2', kind: 'CHOICE', options: [{ id: 'c', text: 'Nice to meet you!' }, { id: 'd', text: 'Goodbye!' }] },
    { id: 'm2', kind: 'MESSAGE', speakerId: 'emma', text: 'See you!' },
  ] };
  const submissions = [];
  const render = (disabled = false) => { cursor = 0; return nodes(ConversationView({ content, disabled, submit: answer => submissions.push(answer) })); };
  const advance = tree => {
    const buttons = tree.filter(n => n.type === 'Button');
    assert.deepEqual(buttons.map(n => n.props.title), ['Continuar']);
    assert.doesNotMatch(tree.filter(n => typeof n === 'string').join(' '), /Sin pistas|corrección|enviar|fase|Revisar turno|Dejar sin/);
    buttons[0].props.onPress();
  };
  advance(render()); // No selection: the first choice must remain omitted.
  let tree = render(); tree.find(n => n.type === 'Pressable').props.onPress();
  tree = render(); assert.equal(tree.find(n => n.type === 'Pressable').props.accessibilityState.checked, true);
  advance(tree); assert.equal(submissions.length, 0);
  advance(tree); assert.equal(submissions.length, 0); // Closing the transcript never submits.
  tree = render(); assert.ok(tree.includes('Nice to meet you!')); assert.ok(tree.includes('See you!'));
  const final = tree.find(n => n.type === 'Button');
  assert.equal(final.props.title, 'Continuar al crucigrama');
  final.props.onPress(); final.props.onPress();
  assert.deepEqual(submissions, [{ choices: [{ stepId: 'q2', optionId: 'c' }] }]);
  assert.equal(render(true).find(n => n.type === 'Button').props.disabled, true);
});

test('V7 Fill choice appears in sentence immediately; retry clears selection and typed answer is the single inline input', () => {
  const values = []; let cursor = 0, retried = 0;
  const hooks = { useEffect() {}, useRef: value => ({ current: value }), useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], v => { values[i] = v; }]; }, useReducer: (_, initial) => [initial, () => {}] };
  const { ActivityStep } = component('../src/features/lessons/components/ActivityStep.tsx', { react: hooks });
  const activity = { type: 'FILL_BLANK_OPTIONS', prompt: '_____, I’m Sofía.', options: [{ id: 'hello', text: 'Hello' }], hint: 'Saluda' };
  const props = { activity, feedback: null, busy: false, onSubmit() {}, onContinue() {}, onRetry() { retried++; }, onAnswerChange() {} };
  const render = extra => { cursor = 0; return nodes(ActivityStep({ ...props, ...extra })); };
  let tree = render(); assert.ok(tree.includes(' '));
  tree.find(n => n.type === 'Pressable' && n.props.accessibilityRole === 'radio').props.onPress();
  tree = render(); assert.ok(!tree.includes(' ')); assert.ok(tree.includes('Hello')); assert.ok(tree.includes(', I’m Sofía.'));
  tree = render({ feedback: { attempt: { isCorrect: false }, feedback: {} } });
  tree.find(n => n.type === 'Pressable' && nodes(n).includes('Intentar de nuevo')).props.onPress();
  assert.equal(retried, 1); tree = render(); assert.ok(tree.includes(' '));
  assert.equal(tree.find(n => n.type === 'Button').props.disabled, true);
  values.length = 0;
  tree = render({ activity: { type: 'FILL_BLANK_TEXT', prompt: 'I _____ a student.' } });
  assert.equal(tree.filter(n => n.type === 'TextInput').length, 1);
  tree.find(n => n.type === 'TextInput').props.onChangeText('am');
  tree = render({ activity: { type: 'FILL_BLANK_TEXT', prompt: 'I _____ a student.' } });
  assert.equal(tree.find(n => n.type === 'TextInput').props.value, 'am');
  assert.ok(tree.includes('I ')); assert.ok(tree.includes(' a student.'));
});

test('Multiple choice shows correct and incorrect options after feedback, then restores blue selection on retry', () => {
  const values = []; let cursor = 0, retried = 0;
  const hooks = { useEffect() {}, useRef: value => ({ current: value }), useReducer: (_, value) => [value, () => {}],
    useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value; }]; } };
  const { ActivityStep } = component('../src/features/lessons/components/ActivityStep.tsx', { react: hooks });
  const options = [{ id: 'a', text: 'Hello' }, { id: 'b', text: 'Goodbye' }, { id: 'c', text: 'Thanks' }];
  const props = { activity: { type: 'MULTIPLE_CHOICE', prompt: 'Choose', options }, initialAnswer: { selectedOptionId: 'b' },
    busy: false, onSubmit() {}, onContinue() {}, onRetry() { retried++; } };
  const render = feedback => { cursor = 0; return nodes(ActivityStep({ ...props, feedback })); };
  const choices = tree => tree.filter(n => n.type === 'Pressable' && n.props.accessibilityRole === 'radio');
  const style = choice => Object.assign({}, ...choice.props.style.filter(Boolean));

  let tree = render(null), [hello, goodbye, thanks] = choices(tree);
  assert.equal(style(goodbye).backgroundColor, '#E8F2FF');
  assert.equal(style(hello).backgroundColor, undefined);
  assert.equal(goodbye.props.accessibilityLabel, undefined);

  tree = render({ attempt: { isCorrect: true, attemptNumber: 1 }, feedback: { correctAnswer: 'b' }, reinforcement: { onCompletion: false } });
  [hello, goodbye, thanks] = choices(tree);
  assert.equal(style(goodbye).backgroundColor, '#EDF9F2');
  assert.equal(style(goodbye).borderColor, '#13874C');
  assert.match(goodbye.props.accessibilityLabel, /Respuesta correcta/);
  assert.equal(style(hello).backgroundColor, undefined);
  assert.equal(style(thanks).backgroundColor, undefined);

  tree = render({ mode: 'REPLAY', submissionNumber: 1, isCorrect: false, feedback: { correctAnswer: 'a' } });
  [hello, goodbye, thanks] = choices(tree);
  assert.equal(style(goodbye).backgroundColor, '#FFF3F1');
  assert.equal(style(goodbye).borderColor, '#A33C25');
  assert.match(goodbye.props.accessibilityLabel, /Respuesta incorrecta/);
  assert.equal(style(hello).backgroundColor, '#EDF9F2');
  assert.match(hello.props.accessibilityLabel, /Respuesta correcta/);
  assert.equal(style(thanks).backgroundColor, undefined);

  tree.find(n => n.type === 'Pressable' && nodes(n).includes('Intentar de nuevo')).props.onPress();
  assert.equal(retried, 1);
  [hello, goodbye, thanks] = choices(render(null));
  assert.equal(style(goodbye).backgroundColor, '#E8F2FF');
  assert.equal(goodbye.props.accessibilityLabel, undefined);
  assert.equal(style(hello).backgroundColor, undefined);
  assert.equal(hello.props.accessibilityLabel, undefined);

  values.length = 0;
  [hello, goodbye] = choices(render({ attempt: { isCorrect: false, attemptNumber: 1 }, feedback: { correctAnswer: 'a' }, reinforcement: { onCompletion: false } }));
  assert.equal(style(goodbye).backgroundColor, '#FFF3F1');
  assert.equal(style(hello).backgroundColor, '#EDF9F2');

  values.length = 0;
  props.activity = { type: 'FILL_BLANK_OPTIONS', prompt: '_____, I’m Sofía.', options };
  [hello, goodbye] = choices(render({ attempt: { isCorrect: false, attemptNumber: 1 }, feedback: { correctAnswer: 'a' }, reinforcement: { onCompletion: false } }));
  assert.equal(style(goodbye).backgroundColor, '#E8F2FF');
  assert.equal(style(hello).backgroundColor, undefined);
  assert.equal(goodbye.props.accessibilityLabel, undefined);
});

test('V7 Audio hides missing URLs, renders native control and cleans up on source unmount/background', async () => {
  const cleanups = []; let background, played = 0, removed = 0, status;
  const { AudioButton } = component('../src/features/lessons/components/AudioButton.tsx', {
    react: { useState: () => ['idle', s => { status = s; }], useRef: value => ({ current: value }), useEffect: fn => cleanups.push(fn()) },
    'expo-audio': { setAudioModeAsync: async mode => { assert.equal(mode.shouldPlayInBackground, false); assert.equal(mode.allowsRecording, false); },
      createAudioPlayer: () => ({ play() { played++; }, pause() {}, remove() { removed++; }, addListener: () => ({ remove() {} }) }) },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'Loading', StyleSheet: { create: s => s },
      AppState: { addEventListener: (_, fn) => { background = fn; return { remove() {} }; } } },
    'lucide-react-native/icons/volume-2': { default: 'Volume' }, 'lucide-react-native/icons/square': { __esModule: true, default: 'Stop' }, 'lucide-react-native/icons/rotate-ccw': { default: 'Replay' },
  });
  for (const audioUrl of [undefined, '', 'file:///clip.wav', 'https://user:pass@example.org/a.wav']) assert.equal(AudioButton({ audioUrl }), null);
  const child = AudioButton({ audioUrl: 'https://example.org/a.wav', audioAlt: 'Hello' });
  assert.equal(child.key, 'https://example.org/a.wav');
  const tree = nodes(child.type(child.props)); const button = tree.find(n => n.type === 'Pressable');
  assert.equal(button.props.accessibilityRole, 'button'); assert.match(button.props.accessibilityLabel, /Escuchar esta frase: Hello/);
  button.props.onPress(); await Promise.resolve(); await Promise.resolve(); assert.equal(played, 1);
  background('background'); assert.equal(removed, 1); assert.equal(status, 'idle');
  button.props.onPress(); await Promise.resolve(); await Promise.resolve(); cleanups.forEach(fn => fn()); assert.equal(removed, 2);
});

test('V7 Summary phrases stay below heading hierarchy and audio is driven by metadata', () => {
  const { SummaryContent } = component('../src/features/lessons/components/ContentBlocks.tsx', {
    './lessonStyles': { lessonStyles: { heading: { fontSize: 20, fontWeight: '700' }, caption: { fontSize: 14 } } },
    './RichContent': { AudioButton: 'AudioButton', RichText: 'RichText', DialogueRow: 'DialogueRow' },
  });
  const tree = nodes(SummaryContent({ block: { type: 'SUMMARY', points: ['Legacy point'], keyPhrases: [
    { text: 'Nice to meet you!', translation: '¡Mucho gusto!', audioUrl: 'https://example.org/a.wav' },
    { text: 'Optional audio' },
  ] } }));
  const heading = tree.find(n => n.type === 'Text' && n.props.children === 'Frases clave de la lección');
  const phrase = tree.find(n => n.type === 'Text' && n.props.children === 'Nice to meet you!');
  assert.ok(phrase.props.style.fontSize < heading.props.style.fontSize);
  assert.ok(Number(phrase.props.style.fontWeight) < Number(heading.props.style.fontWeight));
  assert.equal(tree.filter(n => n.type === 'AudioButton')[0].props.audioUrl, 'https://example.org/a.wav');
  assert.equal(tree.filter(n => n.type === 'AudioButton')[1].props.audioUrl, undefined);
});


test('V8 Activity footer remains outside scroll through answer, feedback and retry; tall content is retained', () => {
  const { ActivityStep } = component('../src/features/lessons/components/ActivityStep.tsx');
  const activity = { type: 'MULTIPLE_CHOICE', prompt: 'Choose', context: { type: 'IMAGE', url: 'https://example.org/a.png', alt: 'Scene' }, options: Array.from({ length: 6 }, (_, i) => ({ id: String(i), text: 'Long option '.repeat(20) + i })) };
  const props = { activity, busy: false, feedback: null, onSubmit() {}, onRetry() {}, onContinue() {}, bottomInset: 24 };
  for (const extra of [{}, { initialAnswer: { selectedOptionId: '5' } }, { feedback: { attempt: { isCorrect: true }, feedback: { explanation: 'Correct explanation' } } }, { feedback: { attempt: { isCorrect: false }, feedback: { explanation: 'Wrong explanation' } } }]) {
    const root = ActivityStep({ ...props, ...extra });
    const body = nodes(root).find(n => n.type === 'ScrollView');
    const bodyNodes = nodes(body), all = nodes(root);
    assert.equal(bodyNodes.filter(n => n.props?.accessibilityRole === 'radio').length, 6);
    assert.equal(bodyNodes.filter(n => n.type === 'Button').length, 0);
    const button = all.find(n => n.type === 'Button');
    assert.equal(button.props.title, extra.feedback ? 'Continuar' : 'Comprobar');
    if (!extra.feedback) assert.equal(button.props.disabled, !extra.initialAnswer);
    else assert.ok(bodyNodes.includes(extra.feedback.feedback.explanation));
    if (extra.feedback?.attempt.isCorrect === false) assert.ok(bodyNodes.includes('Intentar de nuevo'));
    assert.equal(all.filter(n => n.type === 'Button').length, 1);
  }
});

test('V8 manual Fill is bounded and single line with one constant underline, including large font/narrow width', () => {
  const values = []; let cursor = 0, draft;
  const hooks = { useEffect() {}, useRef: value => ({ current: value }), useReducer: (_, value) => [value, () => {}], useState: initial => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = value; }]; } };
  const { ActivityStep } = component('../src/features/lessons/components/ActivityStep.tsx', { react: hooks, dimensions: { width: 320, fontScale: 1.5 } });
  const props = { activity: { type: 'FILL_BLANK_TEXT', prompt: 'Nice to meet you _____!' }, feedback: null, busy: false, onAnswerChange: value => { draft = value; } };
  const render = feedback => { cursor = 0; return nodes(ActivityStep({ ...props, feedback: feedback ?? null })); };
  let tree = render(), input = tree.find(n => n.type === 'TextInput');
  assert.equal(input.props.multiline, false); assert.equal(input.props.maxLength, 40);
  assert.equal(input.props.underlineColorAndroid, 'transparent'); assert.equal(input.props.placeholder, undefined);
  input.props.onChangeText('x'.repeat(200)); tree = render(); input = tree.find(n => n.type === 'TextInput');
  assert.equal(input.props.value.length, 40); assert.equal(draft.text.length, 40);
  for (const isCorrect of [null, true, false]) {
    input = render(isCorrect === null ? null : { attempt: { isCorrect }, feedback: {} }).find(n => n.type === 'TextInput');
    assert.equal(Object.assign({}, ...input.props.style).borderBottomWidth, 2);
    assert.ok(Object.assign({}, ...input.props.style).width <= 198);
  }
});

test('V8 Dialogue uses authored segments and contextual badge is a sibling of the bubble', () => {
  const { DialogueRow } = component('../src/features/lessons/components/RichContent.tsx');
  const turn = { speakerLabel: 'A', text: 'Fallback', segments: [{ text: 'Hi, I’m Sofía.' }, { text: 'Nice to meet you!', emphasis: 'KEY' }], translation: 'Hola' };
  const root = DialogueRow({ turn, contextual: true }); const children = root.props.children;
  assert.ok(nodes(children[0]).includes('A')); assert.ok(!nodes(children[1]).includes('A'));
  const tree = nodes(root); assert.ok(tree.includes('Hi, I’m Sofía.')); assert.ok(tree.includes('Nice to meet you!')); assert.ok(!tree.includes('Fallback'));
  assert.equal(tree.find(n => n.type === 'Text' && n.props.children === 'Nice to meet you!').props.style[1].fontWeight, '700');
  assert.ok(nodes(DialogueRow({ turn: { text: 'Legacy' } })).includes('Legacy'));
});


test('V8 AudioButton completion restores speaker and the next tap starts a new player from the beginning', async () => {
  let state = 'idle', listener, created = 0, cleanup; const owner = {};
  const { AudioButton } = component('../src/features/lessons/components/AudioButton.tsx', {
    react: { useState: () => [state, value => { state = value; }], useRef: () => ({ current: owner }), useEffect: fn => { if (!cleanup) cleanup = fn(); } },
    'expo-audio': { setAudioModeAsync: async () => {}, createAudioPlayer: () => { created++; return { play() {}, pause() {}, remove() {}, addListener: (_, fn) => { listener = fn; return { remove() {} }; } }; } },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'Loading', StyleSheet: { create: x => x }, AppState: { addEventListener: () => ({ remove() {} }) } },
    'lucide-react-native/icons/volume-2': { __esModule: true, default: 'Speaker' }, 'lucide-react-native/icons/square': { __esModule: true, default: 'Stop' },
  });
  const child = AudioButton({ audioUrl: 'https://example.org/a.wav' });
  const render = () => nodes(child.type(child.props));
  render().find(n => n.type === 'Pressable').props.onPress(); await Promise.resolve(); await Promise.resolve();
  listener({ isLoaded: true, playing: true }); assert.equal(state, 'playing'); assert.ok(render().some(n => n.type === 'Stop'));
  listener({ didJustFinish: true }); assert.equal(state, 'idle'); assert.ok(render().some(n => n.type === 'Speaker'));
  const button = render().find(n => n.type === 'Pressable'); assert.equal(button.props.accessibilityLabel, 'Escuchar esta frase');
  button.props.onPress(); await Promise.resolve(); await Promise.resolve(); assert.equal(created, 2); cleanup();
});

test('V10 only video posters use cover; activity images keep contain and Play remains over the poster', () => {
  const { ContentBlocks, LessonImage } = component('../src/features/lessons/components/ContentBlocks.tsx');
  const tree = nodes(ContentBlocks({ blocks: [{ id: 'v', type: 'VIDEO', posterUrl: 'https://example.org/wave.png', title: 'Presentarte en inglés', caption: 'Una explicación para practicar cómo presentarte.' }] }));
  const poster = tree.find(n => n.type === LessonImage);
  assert.equal(poster.props.cover, true);
  assert.equal(LessonImage(poster.props).props.resizeMode, 'cover');
  assert.equal(LessonImage({ url: 'https://example.org/wave.png', alt: 'Saludo', wide: true }).props.resizeMode, 'contain');
  const preview = tree.find(n => n.type === 'View' && Array.isArray(n.props.style) && n.props.style[0]?.overflow === 'hidden');
  assert.ok(preview); assert.ok(nodes(preview).some(n => n.props?.pointerEvents === 'none'));
  assert.equal(tree.filter(n => n.type === 'Button').length, 0);
});

test('Crossword selecting clues leaves input empty without mutating completed crossings', () => {
  const values=[]; let cursor=0,submitted;
  const hooks={useState: initial=>{const i=cursor++; if(!(i in values))values[i]=initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];}};
  const {CrosswordView}=component('../src/features/unit-challenges/phaseViews.tsx',{react:hooks,'./ChatMotion':{},'./useConversationReveal':{},'./styles':{challengeStyles:{}}});
  const content={entries:[{id:'a',row:0,column:0,length:3,direction:'ACROSS',clue:'Across'},{id:'b',row:0,column:1,length:3,direction:'DOWN',clue:'Down'}]};
  const render=()=>{cursor=0;return nodes(CrosswordView({content,disabled:false,submit:a=>submitted=a}));};
  const input=()=>render().find(n=>n.type==='TextInput');
  input().props.onChangeText('CAT');
  const select=()=>render().find(n=>n.type==='Pressable' && !n.props.accessibilityState.selected).props.onPress();
  select(); assert.equal(input().props.value,'');
  render().find(n=>n.type==='Button').props.onPress(); assert.equal(submitted.entries[0].text,'CAT');
  input().props.onChangeText('ANT'); select(); assert.equal(input().props.value,'');
  render().find(n=>n.type==='Button').props.onPress(); assert.deepEqual(submitted.entries.map(e=>e.text),['CAT','ANT']);
});

test('Challenge Intro/ACTIVE header, Más tarde and hardware exits confirm; no-op navigation can retry', () => {
  for (const active of [false,true]) for (const canBack of [false,true]) {
    const effects=[], navigations=[], completion=[], alerts=[], hookCache=[]; let hookIndex=0; const memo=(fn,deps)=>{const i=hookIndex++,old=hookCache[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))hookCache[i]={deps,value:fn()};return hookCache[i].value;}; let requested=false, prevent=true, hardware, guard, abandoned=0;
    const state={busy:false,pending:false,exited:false,response:active?{run:{status:'ACTIVE'}}:undefined,metadata:{challenge:{title:'Challenge',topic:{position:1},phaseTypes:[],passingScore:null},access:{hasAccess:true},progression:{unlocked:true},progress:{passed:false,bestScore:null}}};
    const flow={snapshot:()=>state,subscribe(){},load(){},dispose(){},start(){throw Error('Unexpected start');},abandon(){abandoned++;state.response={run:{status:'ABANDONED'}};state.exited=true;}};
    const {UnitChallengeScreen}=component('../src/features/unit-challenges/UnitChallengeScreen.tsx',{
      react:{useMemo:fn=>fn(),useSyncExternalStore:(_,snapshot)=>snapshot(),useState:()=>[requested,v=>requested=v],useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect:(fn,deps)=>memo(()=>effects.push(fn),deps)},
      'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',KeyboardAvoidingView:'KeyboardAvoidingView',Pressable:'Pressable',Platform:{OS:'android'},useWindowDimensions:()=>({fontScale:1}),Alert:{alert:(...args)=>alerts.push(args)},BackHandler:{addEventListener:(_,fn)=>{hardware=fn;return {remove(){}};}}},
      '@react-navigation/native':{useFocusEffect:fn=>fn(),usePreventRemove:(value,fn)=>{prevent=value;guard=fn;}},
      './flow':{ChallengeFlow:class{constructor(){return flow;}}}, './useConversationScroll':{useConversationScroll:()=>({})},
      './ChallengeArt':{ChallengeHero:'Hero',ChallengeBackdrop:'Backdrop',PhaseIcon:'PhaseIcon'}, './phaseViews':{ConversationView:'Conversation',CrosswordView:'Crossword'}, './styles':{challengeStyles:{}},
      '../courses/completionMotion':{finishCompletion:(...args)=>completion.push(args)},
    });
    const navigation={canGoBack:()=>canBack,goBack:()=>{assert.equal(prevent,false);navigations.push(['back']);},popTo:(...args)=>{assert.equal(prevent,false);navigations.push(args);}};
    const render=()=>{hookIndex=0;const tree=nodes(UnitChallengeScreen({route:{params:{courseId:'c',unitChallengeId:'u',completionTicket:42}},navigation}));effects.splice(0).forEach(fn=>fn());return tree;};
    let tree=render();
    assert.equal(prevent,active);
    const header=tree.find(n=>n.props?.title==='Reto de unidad'&&n.props.onBack);
    header.props.onBack();let buttons=alerts.at(-1)[2];assert.equal(buttons[0].style,'cancel');buttons[0].onPress?.();
    assert.equal(abandoned,0);assert.equal(navigations.length,0);assert.equal(requested,false);
    assert.equal(hardware(),true);assert.equal(alerts.length,2);
    guard();assert.equal(alerts.length,3);
    if(!active){const later=tree.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Más tarde');assert.equal(later.props.onPress,header.props.onBack);assert.equal(later.props.disabled,false);assert.equal(later.props.children.type,'Text');assert.equal(later.props.children.props.pointerEvents,'none');assert.ok(tree.findIndex(n=>n.type==='Button'&&n.props.title==='Comenzar reto')<tree.indexOf(later));later.props.onPress();}
    alerts.at(-1)[2][1].onPress();render();if(active)render();
    assert.equal(abandoned,active?1:0);assert.equal(navigations.length,1);
    assert.deepEqual(navigations[0],canBack?['back']:['Roadmap',{courseId:'c',completionTicket:undefined}]);assert.deepEqual(completion,[]);
    // Simulate popTo being a no-op: the mounted screen must accept another exit.
    tree=render();hardware();if(!active)alerts.at(-1)[2][1].onPress();render();
    assert.equal(navigations.length,2);assert.equal(abandoned,active?1:0);
  }
});

test('Replay exit preserves current step and history; only explicit revisit goes backwards', async () => {
  const {flow,calls}=replay({abandon:async()=>{throw Error('Replay abandon');}});await flow.load();await flow.continueContent();
  assert.equal(flow.snapshot().stepId,'1');flow.back();assert.equal(flow.snapshot().stepId,'1');assert.equal(flow.snapshot().exitRequested,true);
  flow.cancelExit();assert.equal(flow.snapshot().exited,false);flow.back();flow.confirmExit();flow.confirmExit();
  assert.equal(flow.snapshot().exited,true);assert.equal(flow.back(),false);assert.deepEqual(calls,['read']);
});

test('Lesson normal and replay header/hardware both request exit and confirm before Roadmap', async () => {
  for(const mode of ['NORMAL_RUN','REPLAY']) {
    let abandons=0,hardware,guard;const alerts=[],effects=[],navigations=[];
    const {flow}=replay({read:async()=>mode==='REPLAY'?historical:{...historical,state:{status:'NOT_STARTED'}},start:async()=>({runId:'r',status:'ACTIVE',currentStepId:'0',progress:{percentage:0}}),abandon:async()=>{abandons++;}});
    await flow.load();await flow.continueContent(); // normal mock lacks completeStep: error retained, exit still valid
    const {LessonScreen}=component('../src/features/lessons/screens/LessonScreen.tsx',{
      react:{useMemo:()=>flow,useSyncExternalStore:(_,fn)=>fn(),useEffect:fn=>effects.push(fn),useCallback:fn=>fn,useRef:v=>({current:v})},
      '../flow':{LessonFlow:class{}},
      'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',KeyboardAvoidingView:'KeyboardAvoidingView',Pressable:'Pressable',Platform:{OS:'android'},StyleSheet:{create:v=>v},Alert:{alert:(...args)=>alerts.push(args)},BackHandler:{addEventListener:(_,fn)=>{hardware=fn;return{remove(){}};}}},
      '@react-navigation/native':{useFocusEffect:fn=>fn(),usePreventRemove:(value,fn)=>{guard=value;}}
    });
    // Avoid rerunning the load effect in this minimal hook harness.
    flow.load=()=>{};
    flow.snapshot().data.lesson={...lesson,topic:{title:'Topic'},position:{lesson:3,totalLessons:8}};
    const render=()=>{const tree=nodes(LessonScreen({route:{params:{courseId:'c',lessonId:'l3'}},navigation:{popTo:(...args)=>{assert.equal(guard,false);navigations.push(args);},replace(){}}}));effects.splice(0).forEach(fn=>fn());return tree;};
    const before=flow.snapshot().stepId;render().find(n=>n.props?.onBack).props.onBack();render();
    assert.equal(flow.snapshot().stepId,before);alerts.at(-1)[2][0].onPress();render();assert.equal(navigations.length,0);
    hardware();render();alerts.at(-1)[2][1].onPress();render();
    assert.equal(navigations.length,1);assert.equal(abandons,mode==='NORMAL_RUN'?1:0);
    hardware();assert.equal(navigations.length,2,'no-op navigation can retry');
  }
});

test('Conversation reports separate measured targets for learner, typing, authored message and final CTA', () => {
  const measured=[];let reveal={visible:2,reduced:false,pending:true,typing:'emma'};
  const {ConversationView}=component('../src/features/unit-challenges/phaseViews.tsx',{
    './useConversationReveal':{useConversationReveal:()=>reveal},
    './ChatMotion':{ChatBubble:'Bubble',TypingBubble:'Typing'},'./styles':{challengeStyles:{}},
  });
  const content={participants:[{id:'emma',name:'Emma'}],steps:[{id:'m1',kind:'MESSAGE',speakerId:'emma',text:'Hello'},{id:'q1',kind:'CHOICE',options:[]},{id:'m2',kind:'MESSAGE',speakerId:'emma',text:'Bye'}]};
  const layouts=()=>{const tree=nodes(ConversationView({content,disabled:false,submit(){},onTarget:t=>measured.push(t)}));tree.filter(n=>n.type==='View'&&n.props.onLayout).forEach(n=>n.props.onLayout({nativeEvent:{layout:{y:500,height:80}}}));};
  layouts();assert.deepEqual(measured.map(t=>t.order),[8,10]);
  measured.length=0;reveal={visible:3,reduced:true,pending:false,typing:null};layouts();
  assert.deepEqual(measured.map(t=>t.order),[12,15]);assert.ok(measured.every(t=>t.reduced));
});


test('Roadmap completion layers reveal backend Lesson, Challenge and Premium states without fake unlocks', () => {
  class Value { constructor(value){this.value=value;} interpolate({inputRange,outputRange}){let i=1;while(i<inputRange.length-1&&this.value>inputRange[i])i++;const t=Math.max(0,Math.min(1,(this.value-inputRange[i-1])/(inputRange[i]-inputRange[i-1])));return typeof outputRange[i]==='number'?outputRange[i-1]+t*(outputRange[i]-outputRange[i-1]):outputRange[i];} }
  for(const sourceType of ['LESSON','UNIT_CHALLENGE']) for(const destinationType of ['LESSON','UNIT_CHALLENGE','PREMIUM']) for(const phase of ['completion','travel','reveal','done']) {
    const completed=phase==='completion'?0:1,revealed=phase==='done'?1:0;
    const {CoursePath}=component('../src/features/courses/components/CoursePath.tsx',{
      react:{useState:()=>[324,()=>{}],useMemo:fn=>fn(),useCallback:fn=>fn,useEffect(){}},
      'react-native':{View:'View',Text:'Text',Pressable:'Pressable',Animated:{View:'AnimatedView',multiply:(a,b)=>a.value*b,subtract:(a,b)=>a-b},StyleSheet:{create:v=>v,absoluteFill:{}},useWindowDimensions:()=>({fontScale:1})},
      './CompletionDrawing':{CompletionDrawing:'Drawing'},'./TravelBus':{TravelBus:'TravelBus'},'./PathScenery':{PathScenery:'Scenery'},
      './useProgressMotion':{useProgressMotion:()=>({progress:new Value(phase==='completion'?0:phase==='travel'?.5:1),completion:new Value(completed),reveal:new Value(revealed),orientation:new Value(completed),animate:true})},
      '../../unit-challenges/ChallengeArt':{Trophy:'Trophy',RouteBus:'RouteBus'},
      '../../../components/NavigationIcon':{NavigationIcon:'NavigationIcon'},'../../../theme':{colors:{red:'#FF2348',blue:'#0062E9'},shadows:{}}
    });
    const make=(id,type,done,paid)=>({id,type,title:id,progressStatus:done?'COMPLETED':'NOT_STARTED',access:{hasAccess:!paid},progression:{unlocked:true,isCurrent:!done,lockReason:paid?'ACCESS':null}});
    const topics=[{id:'t',title:'Topic',nodes:[make('from',sourceType,true,false),make('to',destinationType==='UNIT_CHALLENGE'?'UNIT_CHALLENGE':'LESSON',false,destinationType==='PREMIUM')]}];
    const original=JSON.stringify(topics),tree=nodes(CoursePath({topics,transition:{from:'from',to:'to',type:sourceType},onMotionEnd(){},onLessonPress(){}}));
    const faces=tree.filter(n=>typeof n.type==='function'&&n.type.name==='NodeFace');
    assert.equal(faces.length,4);assert.equal(faces[0].props.state,'COMPLETED');assert.equal(faces[1].props.state,'CURRENT');
    assert.equal(faces[2].props.state,destinationType==='PREMIUM'?'LOCKED_ACCESS':'CURRENT');assert.equal(faces[3].props.state,'LOCKED_PREREQUISITE');
    assert.equal(faces[0].props.iconOpacity.value,completed);assert.equal(faces[2].props.iconOpacity,revealed);
    const destination=nodes(faces[2].type(faces[2].props));
    assert.equal(destination.some(n=>n.type==='Trophy'),destinationType==='UNIT_CHALLENGE');
    if(destinationType==='PREMIUM'){assert.ok(tree.includes('ACCESO PREMIUM'));assert.equal(destination.some(n=>n.type==='NavigationIcon'),false);assert.equal(faces[2].props.fill,'#E9B64A');}
    assert.equal(JSON.stringify(topics),original);
  }
});


test('Completion SVG draws ring/check from the existing clock and removes its listener', () => {
  let callback,cleanup,removed=0;const refs=[];
  const {CompletionDrawing}=component('../src/features/courses/components/CompletionDrawing.tsx',{
    react:{useRef:()=>{const ref={current:{updates:[],setNativeProps(v){this.updates.push(v);}}};refs.push(ref);return ref;},useEffect:fn=>cleanup=fn()}
  });
  CompletionDrawing({progress:{addListener:fn=>{callback=fn;return 'drawing';},removeListener:id=>{assert.equal(id,'drawing');removed++;}},size:76,challenge:false});
  callback({value:.4});assert.ok(refs[0].current.updates.at(-1).strokeDashoffset<289);assert.equal(refs[1].current.updates.at(-1).strokeDashoffset,43);
  callback({value:1});assert.equal(refs[1].current.updates.at(-1).strokeDashoffset,0);cleanup();assert.equal(removed,1);
});

test('Preview and Roadmap Trophy share one shape with rectangular stem and pedestal', () => {
  const {Trophy,TrophyShape,ChallengeHero}=component('../src/features/unit-challenges/ChallengeArt.tsx',{'../../theme':{colors:{red:'#F00',white:'#FFF'},brandColors:{red:'#CA003D'}}});
  assert.ok(nodes(Trophy({size:44})).some(n=>n.type===TrophyShape));assert.ok(nodes(ChallengeHero()).some(n=>n.type===TrophyShape));
  const shapes=nodes(TrophyShape({color:'#FFF',accent:'#159653'}));
  const rectangles=shapes.filter(n=>n.type==='Rect');assert.equal(rectangles.length,2);assert.equal(Number(rectangles[0].props.width),10);assert.equal(Number(rectangles[1].props.width),40);assert.equal(Number(rectangles[1].props.height),9);
});


test('Scenery stays mounted across current-card changes, fades 400ms and resolves reduced motion directly', () => {
  let value,cleanup;const timings=[];let stops=0;
  const {PathScenery}=component('../src/features/courses/components/PathScenery.tsx',{
    react:{useRef:v=>({current:value??=v}),useEffect:fn=>{cleanup?.();cleanup=fn();}},
    'react-native':{View:'View',StyleSheet:{create:v=>v},Animated:{View:'AnimatedView',Value:class{constructor(v){this.value=v;}setValue(v){this.value=v;}},timing:(target,options)=>{timings.push({target,...options});return{start(){},stop(){stops++;}};}}}
  });
  const render=(visible,reducedMotion)=>PathScenery({variant:4,right:true,visible,reducedMotion});
  const hidden=render(false,false),shown=render(true,false);
  assert.equal(hidden.type,shown.type);assert.equal(hidden.props.children.length,shown.props.children.length);
  assert.equal(shown.props.pointerEvents,'none');assert.equal(shown.props.importantForAccessibility,'no-hide-descendants');
  assert.equal(timings.at(-1).target,value);assert.equal(timings.at(-1).toValue,1);assert.equal(timings.at(-1).duration,400);assert.equal(timings.at(-1).useNativeDriver,true);
  render(false,true);assert.equal(value.value,0);assert.equal(timings.length,2);assert.equal(stops,2);
  render(true,true);assert.equal(value.value,1);assert.equal(timings.length,2);
});
