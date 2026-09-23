import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Activity, Prisma } from '../../generated/prisma/client.js';
import { checkAnswer, publicActivity } from './lesson.activity.js';

export function activity(type: string, config: Prisma.JsonObject): Activity {
  return { id: '00000000-0000-4000-8000-000000000001', type, prompt: 'Practice', config,
    explanation: 'Private explanation', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() };
}
const options = { options: [{ id: 'a', text: 'Hello', correct: true }, { id: 'b', text: 'Goodbye' }], correctOptionId: 'a', privateKey: 'hidden' };
for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK_OPTIONS']) test(type + ': validation and safe public projection', () => {
  const a = activity(type, options);
  assert.equal(checkAnswer(a, { selectedOptionId: 'a' }).isCorrect, true);
  assert.equal(checkAnswer(a, { selectedOptionId: 'b' }).isCorrect, false);
  assert.deepEqual(publicActivity(a), { id: a.id, type, prompt: a.prompt, options: [{ id: 'a', text: 'Hello' }, { id: 'b', text: 'Goodbye' }] });
  for (const answer of [null, [], {}, { selectedOptionId: 'c' }, { selectedOptionId: 'a', isCorrect: true }, { text: 'Hello' }]) assert.throws(() => checkAnswer(a, answer), { code: 'INVALID_ANSWER' });
});
test('text trims whitespace, supports accepted alternatives and configurable case without extra normalization', () => {
  const a = activity('FILL_BLANK_TEXT', { acceptedAnswers: ['am', "I'm"], caseSensitive: false });
  assert.equal(checkAnswer(a, { text: ' AM  ' }).isCorrect, true);
  assert.equal(checkAnswer(a, { text: "I'm" }).isCorrect, true);
  assert.equal(checkAnswer(a, { text: 'a m' }).isCorrect, false);
  assert.equal(checkAnswer(activity(a.type, { acceptedAnswers: ['am'], caseSensitive: true }), { text: 'AM' }).isCorrect, false);
  for (const answer of [{ text: '' }, { text: '   ' }, { text: 1 }, { text: 'am', extra: true }]) assert.throws(() => checkAnswer(a, answer), { code: 'INVALID_ANSWER' });
  assert.ok(!JSON.stringify(publicActivity(a)).includes('acceptedAnswers'));
});
for (const interactionMode of ['TAP', 'DRAG']) test('matching ' + interactionMode + ' validates pairs independently of gesture', () => {
  const a = activity('MATCH_WORD_IMAGE', { interactionMode,
    words: [{ id: 'w1', text: 'Hello' }, { id: 'w2', text: 'Book' }],
    images: [{ id: 'i1', url: '/hello.png', alt: 'Hello' }, { id: 'i2', url: '/book.png', alt: 'Book' }],
    pairs: [{ wordId: 'w1', imageId: 'i1' }, { wordId: 'w2', imageId: 'i2' }] });
  assert.equal(checkAnswer(a, { pairs: [{ wordId: 'w2', imageId: 'i2' }, { wordId: 'w1', imageId: 'i1' }] }).isCorrect, true);
  assert.equal(checkAnswer(a, { pairs: [{ wordId: 'w1', imageId: 'i2' }, { wordId: 'w2', imageId: 'i1' }] }).isCorrect, false);
  for (const pairs of [[], [{ wordId: 'w1', imageId: 'i1' }], [{ wordId: 'w1', imageId: 'i1' }, { wordId: 'w2', imageId: 'i1' }], [{ wordId: 'w1', imageId: 'i1' }, { wordId: 'unknown', imageId: 'i2' }]]) assert.throws(() => checkAnswer(a, { pairs }), { code: 'INVALID_ANSWER' });
  assert.ok(!JSON.stringify(publicActivity(a)).includes('pairs'));
});
test('invalid stored configuration fails closed rather than leaking private JSON', () => {
  for (const a of [activity('UNKNOWN', options), activity('MULTIPLE_CHOICE', { ...options, correctOptionId: 'missing' }), activity('FILL_BLANK_TEXT', { acceptedAnswers: [] })]) assert.throws(() => publicActivity(a));
});
