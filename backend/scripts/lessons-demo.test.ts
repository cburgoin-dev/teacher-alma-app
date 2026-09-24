import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonsDemoData } from './lessons-demo-data.js';
import { demoCourses, demoId } from './courses-demo-data.js';
import { deriveSteps } from '../src/modules/lessons/lesson.steps.js';
import { publicActivity } from '../src/modules/lessons/lesson.activity.js';
import type { Activity } from '../src/generated/prisma/client.js';

test('two existing free A1 lessons contain four safe activity types in short real steps', () => {
  const { blocks, activities } = lessonsDemoData();
  const courses = demoCourses();
  assert.ok(blocks.some(b => b.type === 'VIDEO' && b.required === false));
  assert.ok(!JSON.stringify(blocks).includes('Contenido demo'));
  assert.equal(blocks.length, 11);
  assert.equal(new Set(blocks.map(b => b.id)).size, 11);
  assert.equal(new Set(activities.map(a => a.type)).size, 4);
  for (const id of [demoId(1003), demoId(1004)]) {
    assert.equal(courses[0]!.topics.flatMap(t => t.lessons).find(l => l.id === id)?.accessType, 'FREE');
    const steps = deriveSteps(blocks.filter(b => b.lessonId === id).map(b => ({ ...b, id: b.id!, required: true })));
    assert.deepEqual(steps.map(s => s.type), ['CONTENT_STEP', 'ACTIVITY_STEP', 'ACTIVITY_STEP', 'SUMMARY_STEP']);
  }
  for (const activity of activities) {
    const dto = publicActivity({ ...activity, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } as Activity);
    assert.ok(!JSON.stringify(dto).includes('correctOptionId'));
    assert.ok(!JSON.stringify(dto).includes('acceptedAnswers'));
    if ('images' in dto) {
      assert.equal(dto.words.length, 3);
      assert.equal(dto.images.length, 3);
      assert.equal(new Set(dto.images.map(i => i.id)).size, 3);
      assert.ok(dto.images.every(i => i.url.startsWith('data:image/png;base64,')));
    }
  }
  assert.deepEqual(lessonsDemoData(), { blocks, activities });
});
