import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicContent, scoreAnswer, totalItems, validateChallenge, validateContent, validatePublishedTopics } from './unit-challenge.content.js';

export const conversation = { title: 'Meet Emma', participants: [{ id: 'emma', name: 'Emma' }],
  steps: [{ id: 'm1', kind: 'MESSAGE', speakerId: 'emma', text: 'Hello' },
    { id: 'q1', kind: 'CHOICE', options: [{ id: 'a', text: 'Hi' }, { id: 'b', text: 'Bye' }], correctOptionId: 'a' },
    { id: 'q2', kind: 'CHOICE', options: [{ id: 'a', text: 'Alex' }, { id: 'b', text: 'No' }], correctOptionId: 'a' }] };
export const crossword = { width: 5, height: 2, entries: [
  { id: 'e1', clue: 'Greeting', answer: 'HELLO', direction: 'ACROSS', row: 0, column: 0 },
  { id: 'e2', clue: 'He', answer: 'HE', direction: 'DOWN', row: 0, column: 0 }] };

test('private content validation and nested public allowlists', () => {
  const phase = validateContent('CONVERSATION', { ...conversation, secret: 'private',
    participants: conversation.participants.map(p => ({ ...p, secret: 'private' })),
    steps: conversation.steps.map(s => ({ ...s, privateValidation: 'private' })) });
  assert.equal(totalItems(phase), 2);
  const publicJson = JSON.stringify(publicContent(phase));
  for (const privateField of ['correctOptionId', 'private', 'answer']) assert.ok(!publicJson.includes(privateField));
  const puzzle = publicContent(validateContent('CROSSWORD', crossword));
  assert.deepEqual(puzzle, { width: 5, height: 2, entries: crossword.entries.map(({ answer, ...e }) => ({ ...e, length: answer.length })) });
  assert.ok(!JSON.stringify(puzzle).includes('HELLO'));
});
test('Conversation rejects missing Choices, duplicate ids, broken speakers/options/correct option', () => {
  const configs = [
    { ...conversation, steps: [conversation.steps[0]] },
    { ...conversation, participants: [...conversation.participants, ...conversation.participants] },
    { ...conversation, steps: [...conversation.steps, conversation.steps[1]] },
    { ...conversation, steps: [{ ...conversation.steps[0], speakerId: 'unknown' }, conversation.steps[1]] },
    { ...conversation, steps: [{ ...conversation.steps[1], options: [{ id: 'a', text: 'Hi' }, { id: 'a', text: 'Bye' }] }] },
    { ...conversation, steps: [{ ...conversation.steps[1], correctOptionId: 'missing' }] },
    { ...conversation, steps: [{ ...conversation.steps[1], correctOptionId: ['a', 'b'] }] },
    { ...conversation, steps: [{ ...conversation.steps[1], options: [] }] },
  ];
  for (const config of configs) assert.throws(() => validateContent('CONVERSATION', config));
});
test('Crossword rejects invalid grid, ids, answers, bounds, directions and crossings', () => {
  for (const config of [
    { ...crossword, width: 0 }, { ...crossword, height: 1.5 }, { ...crossword, entries: [] },
    { ...crossword, entries: [...crossword.entries, crossword.entries[0]] },
    ...[{ answer: '  ' }, { direction: 'DIAGONAL' }, { row: -1 }, { column: 2 }, { row: 5 }, { answer: 'OTHER' }]
      .map(change => ({ ...crossword, entries: [{ ...crossword.entries[0], ...change }, crossword.entries[1]] })),
  ]) assert.throws(() => validateContent('CROSSWORD', config));
});
test('publication boundary enforces challenge presence, phase order and threshold', () => {
  assert.throws(() => validatePublishedTopics([{ lessons: [{ status: 'PUBLISHED' }], unitChallenge: null }]));
  assert.doesNotThrow(() => validatePublishedTopics([{ lessons: [{ status: 'DRAFT' }], unitChallenge: null }]));
  for (const position of [0, 2]) assert.throws(() => validateChallenge([{ type: 'CONVERSATION', position, config: conversation }], null));
  for (const threshold of [-1, 101, 0.5]) assert.throws(() => validateChallenge([{ type: 'CROSSWORD', position: 1, config: crossword }], threshold));
  assert.throws(() => validateChallenge([], null));
});
test('answers normalize deterministically; missing items score zero; invalid answer ids/shapes rejected', () => {
  const scene = validateContent('CONVERSATION', conversation), grid = validateContent('CROSSWORD', crossword);
  assert.equal(scoreAnswer(scene, { choices: [] }).correctItems, 0);
  assert.equal(scoreAnswer(grid, { entries: [] }).correctItems, 0);
  assert.equal(scoreAnswer(scene, { choices: [{ stepId: 'q1', optionId: 'a' }] }).correctItems, 1);
  const a = scoreAnswer(grid, { entries: [{ entryId: 'e1', text: ' hello ' }, { entryId: 'e2', text: 'he' }] });
  const b = scoreAnswer(grid, { entries: [{ entryId: 'e2', text: 'HE' }, { entryId: 'e1', text: 'HELLO' }] });
  assert.equal(a.correctItems, 2); assert.equal(a.hash, b.hash);
  assert.equal(scoreAnswer(grid, { entries: [] }).hash, scoreAnswer(grid, { entries: [{ entryId: 'e1', text: ' ' }] }).hash);
  for (const answer of [null, {}, [], { choices: 'a' }, { choices: [{ stepId: 'q1', optionId: 'bad' }] },
    { choices: [{ stepId: 'unknown', optionId: 'a' }] }, { choices: [{ stepId: 'q1', optionId: 'a' }, { stepId: 'q1', optionId: 'a' }] },
    { choices: [], correctItems: 2 }]) assert.throws(() => scoreAnswer(scene, answer), { code: 'INVALID_UNIT_CHALLENGE_ANSWER' });
  for (const answer of [{ entries: [{ entryId: 'e1', text: 3 }] }, { entries: [{ entryId: 'bad', text: '' }] },
    { entries: [{ entryId: 'e1', text: '' }, { entryId: 'e1', text: '' }] }]) assert.throws(() => scoreAnswer(grid, answer));
  const unicode = validateContent('CROSSWORD', { width: 4, height: 1, entries: [{ ...crossword.entries[0], answer: 'CAFÉ' }] });
  assert.equal(scoreAnswer(unicode, { entries: [{ entryId: 'e1', text: 'cafe\u0301' }] }).correctItems, 1);
  assert.equal(scoreAnswer(unicode, { entries: [{ entryId: 'e1', text: 'cafe' }] }).correctItems, 0);
});
