import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitChallengeDemo } from './unit-challenge-demo-data.js';

test('demo crossword has five connected words and four compatible perpendicular crossings in 7x7', () => {
  const demo = unitChallengeDemo('6ac0de00-0000-4000-8000-000000000101', 101);
  const content = demo.phases[1]!.config;
  const entries = content.entries!;
  assert.equal(content.width, 7); assert.equal(content.height, 7);
  assert.equal(entries.length, 5);
  const cells = new Map<string, { letter: string; entries: number[] }>();
  entries.forEach((e, index) => [...e.answer].forEach((letter, offset) => {
    const r = e.row + (e.direction === 'DOWN' ? offset : 0);
    const c = e.column + (e.direction === 'ACROSS' ? offset : 0);
    assert.ok(r >= 0 && r < content.height! && c >= 0 && c < content.width!);
    const key = `${r}:${c}`, prior = cells.get(key);
    if (prior) {
      assert.equal(prior.letter, letter);
      assert.notEqual(entries[prior.entries[0]!]!.direction, e.direction);
      prior.entries.push(index);
    } else cells.set(key, { letter, entries: [index] });
  }));
  const crossings = [...cells.values()].filter(c => c.entries.length > 1);
  assert.equal(crossings.length, 4);
  const reached = new Set([0]);
  for (let i = 0; i < entries.length; i++) for (const c of crossings) {
    if (c.entries.some(e => reached.has(e))) c.entries.forEach(e => reached.add(e));
  }
  assert.equal(reached.size, entries.length, 'No isolated word or disconnected cluster');
  assert.equal(demo.challenge.passingScore, 70);
});

test('acceptance Conversation has four decisions, neutral practice transitions and an authored closing', () => {
  const { phases } = unitChallengeDemo('6ac0de00-0000-4000-8000-000000000101', 101);
  const steps = phases[0]!.config.steps!;
  const choices = steps.filter(step => step.kind === 'CHOICE');
  assert.deepEqual(choices.map(step => step.id), ['q1', 'q2', 'q3', 'q4']);
  for (const choice of choices) assert.ok(choice.options!.some(option => option.id === choice.correctOptionId));
  assert.equal(steps.at(-1)!.kind, 'MESSAGE');
  assert.equal(steps.at(-1)!.text, 'That is the end of our practice. Bye!');
  assert.equal(new Set(steps.map(step => step.id)).size, steps.length);
});
