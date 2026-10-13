import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '../src/generated/prisma/client.js';
import { diagnosticDemoData } from './diagnostic-demo-data.js';
import { scoreDiagnostic, reachableLevels } from '../src/modules/diagnostics/diagnostic.scoring.js';
import { publicActivity } from '../src/modules/activities/activity.engine.js';
test('demo content is evaluable, sanitized, weighted, configurable and reaches A1/A2', () => {
  const data = diagnosticDemoData();
  for (const a of data.activities) {
    const publicData = publicActivity({ ...a, id: a.id!, explanation: null, status: 'ACTIVE', config: a.config as Prisma.JsonObject, createdAt: new Date(), updatedAt: new Date() });
    assert.ok(!JSON.stringify(publicData).includes('correctOptionId'));
  }
  const questions = data.questions.map(q => ({ ...q, weight: new Prisma.Decimal(q.weight) }));
  assert.deepEqual([...reachableLevels(data.diagnostic.scoringConfig, questions)].sort(), ['A1', 'A2']);
  assert.equal(scoreDiagnostic(data.diagnostic.scoringConfig, questions, new Set()).recommendedLevel, 'A1');
  assert.equal(scoreDiagnostic(data.diagnostic.scoringConfig, questions, new Set(questions.map(q => q.id))).recommendedLevel, 'A2');
});
