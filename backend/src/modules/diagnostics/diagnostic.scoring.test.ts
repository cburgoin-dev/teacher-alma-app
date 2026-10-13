import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '../../generated/prisma/client.js';
import { scoreDiagnostic, reachableLevels } from './diagnostic.scoring.js';
import { availableDiagnostic, validDefinition } from './diagnostic.availability.js';
import type { DiagnosticSession } from './diagnostic.repository.js';
import { definition } from './diagnostic.test-fixtures.js';
const destinations = [{ level: 'A1' }, { level: 'A2' }];
test('availability validates content, destinations, discrete reachability and shared Activity types', () => {
  const d = definition();
  assert.equal(validDefinition(d, destinations), true);
  assert.equal(validDefinition(d, [{ level: 'A1' }]), false);
  for (const change of [
    () => { d.diagnosticQuestions = []; },
    () => { d.diagnosticQuestions[0]!.weight = new Prisma.Decimal(0); },
    () => { d.diagnosticQuestions[0]!.activity.status = 'INACTIVE'; },
    () => { d.diagnosticQuestions[0]!.position = 0; },
    () => { d.diagnosticQuestions[1]!.position = 1; },
    () => { d.scoringConfig = { recommendationRules: [{ level: 'A1', minOverallScore: 0, requirements: [] }] }; },
  ]) {
    const original = definition(); Object.assign(d, original); change(); assert.equal(validDefinition(d, destinations), false);
  }
});
test('no current or multiple current definitions fail closed', async () => {
  for (const definitions of [[], [definition(), definition()]]) {
    const session = { published: async () => definitions, destinations: async () => destinations } as unknown as DiagnosticSession;
    assert.equal(await availableDiagnostic(session), null);
  }
});
test('weighted overall, per-level gates, nullable level, ordered rules and fallback', () => {
  const d = definition(), q = d.diagnosticQuestions;
  q[0]!.weight = new Prisma.Decimal(3); q[1]!.weight = new Prisma.Decimal(1);
  q[2]!.targetLevel = null; q[2]!.weight = new Prisma.Decimal(6); q[3]!.weight = new Prisma.Decimal(10);
  const correct = new Set([q[1]!.id, q[2]!.id, q[3]!.id]);
  const result = scoreDiagnostic(d.scoringConfig, q, correct);
  assert.equal(result.internalScore.toString(), '85'); assert.equal(result.recommendedLevel, 'A1');
  correct.delete(q[1]!.id); correct.add(q[0]!.id);
  assert.equal(scoreDiagnostic(d.scoringConfig, q, correct).recommendedLevel, 'A2');
  const rules = { recommendationRules: [
    { level: 'FIRST', minOverallScore: 70, requirements: [] },
    { level: 'SECOND', minOverallScore: 80, requirements: [] },
    { level: 'FALLBACK', minOverallScore: 0, requirements: [] },
  ] };
  assert.equal(scoreDiagnostic(rules, q, correct).recommendedLevel, 'FIRST');
  assert.equal(scoreDiagnostic(rules, q, new Set()).recommendedLevel, 'FALLBACK');
  assert.deepEqual([...reachableLevels(rules, q)].sort(), ['FALLBACK', 'FIRST']);
});
test('exact boundary before storage rounding and repeating decimal thresholds', () => {
  const q = definition().diagnosticQuestions.slice(0, 2);
  q[0]!.weight = new Prisma.Decimal('699.999'); q[1]!.weight = new Prisma.Decimal('300.001');
  const raw = { recommendationRules: [{ level: 'HIGH', minOverallScore: 70, requirements: [] }, { level: 'LOW', requirements: [] }] };
  let result = scoreDiagnostic(raw, q, new Set([q[0]!.id]));
  assert.equal(result.internalScore.toFixed(3), '70.000'); assert.equal(result.recommendedLevel, 'LOW');
  q[0]!.weight = new Prisma.Decimal(2); q[1]!.weight = new Prisma.Decimal(1);
  raw.recommendationRules[0]!.minOverallScore = 66.66666666666667;
  result = scoreDiagnostic(raw, q, new Set([q[0]!.id])); assert.equal(result.recommendedLevel, 'LOW');
});
test('invalid rules, unmeasured gates and missing fallback fail validation', () => {
  const d = definition();
  for (const rules of [[], [{ level: 'A2', minOverallScore: 70, requirements: [] }],
    [{ level: 'A2', minOverallScore: 101, requirements: [] }, { level: 'A1', requirements: [] }],
    [{ level: 'A2', requirements: [{ targetLevel: 'UNKNOWN', minScore: 50 }] }, { level: 'A1', requirements: [] }]]) {
    d.scoringConfig = { recommendationRules: rules }; assert.equal(validDefinition(d, destinations), false);
  }
});
test('one-option activities cannot falsely manufacture a second reachable outcome', () => {
  const d = definition(); d.diagnosticQuestions = d.diagnosticQuestions.slice(0, 1);
  d.diagnosticQuestions[0]!.activity.config = { options: [{ id: 'a', text: 'Only' }], correctOptionId: 'a' };
  assert.equal(validDefinition(d, destinations), false);
});

test('all reachable destinations must exist even when two other useful levels are present', () => {
  const d = definition();
  d.scoringConfig = { recommendationRules: [
    { level: 'B1', minOverallScore: 100, requirements: [] },
    { level: 'A2', minOverallScore: 50, requirements: [] },
    { level: 'A1', requirements: [] },
  ] };
  assert.equal(validDefinition(d, destinations), false);
  assert.equal(validDefinition(d, [...destinations, { level: 'B1' }]), true);
});

test('discrete question weights can make an otherwise non-shadowed rule unreachable', () => {
  const d = definition(); d.diagnosticQuestions = d.diagnosticQuestions.slice(0, 1);
  d.scoringConfig = { recommendationRules: [
    { level: 'A2', minOverallScore: 80, requirements: [] },
    { level: 'NO_DESTINATION', minOverallScore: 40, requirements: [] },
    { level: 'A1', requirements: [] },
  ] };
  assert.equal(validDefinition(d, destinations), true);
});
