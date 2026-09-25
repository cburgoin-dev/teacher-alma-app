const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { pairSelection, expectedAnswer, resultVariant } = require('../src/features/lessons/presentation.ts');
const progress = { completedSteps: 1, totalSteps: 3, percentage: 100 / 3 };
const feedback = { attempt: { isCorrect: false }, feedback: { correctAnswer: 'a' }, reinforcement: { onCompletion: true }, progress: { ...progress, currentStepId: '2' } };
test('matching corrects duplicate image/word selections; presentation uses server feedback/results', () => {
  assert.deepEqual(pairSelection([{ wordId: 'w1', imageId: 'i1' }, { wordId: 'w2', imageId: 'i2' }], 'w1', 'i2'), [{ wordId: 'w1', imageId: 'i2' }]);
  assert.equal(expectedAnswer({ type: 'MULTIPLE_CHOICE', options: [{ id: 'a', text: 'Hello' }] }, 'a'), 'Hello');
  assert.equal(resultVariant({ isPerfect: true, pendingReviewCount: 0 }), 'PERFECT');
  assert.equal(resultVariant({ isPerfect: false, pendingReviewCount: 2 }), 'REVIEW_PENDING');
  assert.equal(resultVariant({ isPerfect: false, pendingReviewCount: 0 }), 'NORMAL');
});

test('feedback and matching use only returned feedback, including successful retry with prospective reinforcement', () => {
  const { feedbackTitle, pairFeedback, connectionPath } = require('../src/features/lessons/activityPresentation.ts');
  assert.equal(feedbackTitle({ ...feedback, attempt: { isCorrect: true, attemptNumber: 2 } }), '¡Ahora sí!');
  assert.equal(feedbackTitle({ ...feedback, attempt: { isCorrect: true, attemptNumber: 1 }, reinforcement: { onCompletion: false } }), '¡Correcto!');
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


test('Result accuracy uses first-attempt totals and course label has no duplicate level', () => {
  const { accuracy, courseLabel } = require('../src/features/lessons/contentPresentation.ts');
  assert.equal(accuracy(1, 2), 50); assert.equal(accuracy(2, 2), 100);
  assert.equal(accuracy(0, 0), 0); assert.equal(accuracy(2, 3), 67);
  assert.equal(courseLabel({ title: 'Inglés A2', level: 'A2' }), 'Inglés A2');
  assert.equal(courseLabel({ title: 'Conversation', level: null }), 'Conversation');
  assert.equal(courseLabel(undefined), undefined);
});
