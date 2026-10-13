import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usefulDestinations, validDefinition } from './diagnostic.availability.js';
import { definition } from './diagnostic.test-fixtures.js';

type Candidate = Parameters<typeof usefulDestinations>[0][number];
function course(level: string): Candidate {
  return { id: level, level, position: 1, status: 'PUBLISHED', topics: [{ id: 'topic', title: 'Topic', position: 1,
    unitChallenge: null, lessons: [{ id: 'lesson', title: 'Lesson', position: 1, status: 'PUBLISHED', isRequired: true, accessType: 'FREE' }],
  }] };
}
test('availability requires usable content at every reachable level; Premium content counts', () => {
  const a1 = course('A1'), a2 = course('A2'); a2.topics[0]!.lessons[0]!.accessType = 'PAID';
  assert.equal(validDefinition(definition(), usefulDestinations([a1, a2])), true);
  a1.topics = [];
  assert.equal(validDefinition(definition(), usefulDestinations([a1, a2])), false);
  assert.deepEqual(usefulDestinations([a1, a2]).map(c => c.id), ['A2']);
});
test('publication and valid exact level required; draft curriculum cannot make a destination useful', () => {
  for (const status of ['DRAFT', 'COMING_SOON', 'ARCHIVED']) {
    const c = course('A1'); c.status = status; assert.deepEqual(usefulDestinations([c]), []);
  }
  for (const level of [null, '', ' ', ' A1 ']) {
    const c = course('A1'); c.level = level; assert.deepEqual(usefulDestinations([c]), []);
  }
  const c = course('A1'); c.topics[0]!.lessons[0]!.status = 'DRAFT';
  c.topics[0]!.unitChallenge = { id: 'challenge', title: 'Challenge', status: 'DRAFT', accessType: 'PAID' };
  assert.deepEqual(usefulDestinations([c]), []);
  c.topics[0]!.unitChallenge.status = 'PUBLISHED';
  assert.equal(usefulDestinations([c]).length, 1);
});
test('optional published lessons count as startable content, matching Courses start fallback', () => {
  const c = course('custom-level'); c.topics[0]!.lessons[0]!.isRequired = false;
  assert.equal(usefulDestinations([c]).length, 1);
});
