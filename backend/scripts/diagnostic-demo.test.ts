import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Prisma } from '../src/generated/prisma/client.js';
import { diagnosticDemoData } from './diagnostic-demo-data.js';
import { scoreDiagnostic, reachableLevels } from '../src/modules/diagnostics/diagnostic.scoring.js';
import { checkAnswer, publicActivity } from '../src/modules/activities/activity.engine.js';
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

test('acceptance content has four options, authored context and three complete matching pairs', () => {
  const data = diagnosticDemoData();
  const activities = data.activities.map(a => ({ ...a, id: a.id!, explanation: null, status: 'ACTIVE', config: a.config as Prisma.JsonObject, createdAt: new Date(), updatedAt: new Date() }));
  const mc = publicActivity(activities[0]!);
  assert.ok('options' in mc && mc.options.length === 4);
  assert.equal(mc.context?.type, 'IMAGE');
  assert.equal(mc.prompt, 'Tu respuesta:');
  assert.equal(data.diagnostic.version, 4);
  assert.equal(data.diagnostic.estimatedMinutes, 5);
  const matching = publicActivity(activities[3]!);
  assert.ok('words' in matching && matching.words.length === 3 && matching.images.length === 3);
  const answers = [{ selectedOptionId: 'coffee' }, { selectedOptionId: 'at' }, { text: 'visited' },
    { pairs: [{ wordId: 'backpack', imageId: 'backpack-image' }, { wordId: 'umbrella', imageId: 'umbrella-image' }, { wordId: 'key', imageId: 'key-image' }] }];
  const questions = data.questions.map(q => ({ ...q, weight: new Prisma.Decimal(q.weight) }));
  const correct = new Set(questions.filter((_, i) => checkAnswer(activities[i]!, answers[i]).isCorrect).map(q => q.id));
  assert.equal(correct.size, 4);
  assert.equal(scoreDiagnostic(data.diagnostic.scoringConfig, questions, correct).recommendedLevel, 'A2');
  assert.equal(checkAnswer(activities[0]!, { selectedOptionId: 'name' }).isCorrect, false);
  correct.delete(questions[0]!.id);
  assert.equal(scoreDiagnostic(data.diagnostic.scoringConfig, questions, correct).recommendedLevel, 'A1');
});

test('all six authored images reach public payloads as local PNGs with consistent dimensions and alt text', () => {
  const data = diagnosticDemoData();
  const urls = new Set<string>();
  for (const [index, a] of data.activities.entries()) {
    const activity = publicActivity({ ...a, id: a.id!, explanation: null, status: 'ACTIVE', config: a.config as Prisma.JsonObject, createdAt: new Date(), updatedAt: new Date() });
    const images = 'images' in activity ? activity.images : activity.context?.type === 'IMAGE' ? [activity.context] : [];
    assert.equal(images.length, index === 3 ? 3 : 1);
    for (const image of images) {
      assert.ok(image.alt.length > 10);
      const bytes = index === 3 ? Buffer.from(image.url.split(',')[1]!, 'base64')
        : readFileSync(new URL('./assets/' + new URL(image.url).pathname.split('/').at(-1), import.meta.url));
      if (index === 3) assert.match(image.url, /^data:image\/png;base64,/);
      else assert.match(new URL(image.url).pathname, /^\/demo-media\/diagnostic-/);
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], index === 3 ? [480, 360] : [800, 450]);
      urls.add(image.url);
    }
  }
  assert.equal(urls.size, 6);
});
