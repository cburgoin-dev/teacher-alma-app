import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonsDemoData } from './lessons-demo-data.js';
import { demoCourses, demoId } from './courses-demo-data.js';
import { deriveSteps } from '../src/modules/lessons/lesson.steps.js';
import { publicActivity } from '../src/modules/lessons/lesson.activity.js';
import { publicContent } from '../src/modules/lessons/lesson.content.js';
import type { Activity } from '../src/generated/prisma/client.js';

test('two existing free A1 lessons contain four safe activity types in short real steps', () => {
  const { blocks, activities } = lessonsDemoData();
  const courses = demoCourses();
  assert.ok(blocks.some(b => b.type === 'VIDEO' && b.required === false));
  assert.ok(!JSON.stringify(blocks).includes('Contenido demo'));
  assert.equal(blocks.length, 11);
  assert.equal(new Set(blocks.map(b => b.id)).size, 11);
  assert.equal(new Set(activities.map(a => a.type)).size, 4);
  const text = publicContent('TEXT', blocks[0]!.content);
  assert.ok(text.body && JSON.stringify(text.segments).includes('KEY'));
  const example = publicContent('EXAMPLE', blocks[1]!.content);
  assert.equal(example.variant, 'DIALOGUE');
  assert.equal((example.turns as unknown[]).length, 2);
  assert.ok(example.primaryText && example.secondaryText);
  const summary = publicContent('SUMMARY', blocks[4]!.content);
  assert.ok(summary.points && summary.takeaways && summary.keyPhrases);
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

test('V6 Fill Blank IMAGE is safe public HTTP metadata, with v1 fallbacks retained', () => {
  const { activities, blocks } = lessonsDemoData();
  const fill = publicActivity({ ...activities[1], status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() } as Activity);
  assert.equal(fill.context?.type, 'IMAGE');
  if (fill.context?.type !== 'IMAGE') throw new Error('Expected IMAGE');
  assert.ok(['http:', 'https:'].includes(new URL(fill.context.url).protocol));
  assert.equal(new URL(fill.context.url).pathname, '/demo-media/greeting.png');
  assert.ok(fill.context.alt.length > 10);
  assert.ok(fill.instruction);
  const summary = publicContent('SUMMARY', blocks[4]!.content);
  assert.ok(summary.points && summary.takeaways && summary.subtitle);
  assert.ok(!('takeaways' in publicContent('SUMMARY', blocks[9]!.content)), 'lesson 4 still exercises v1 Summary');
});

test('V6 Summary has static playable audio metadata; missing audio stays absent', () => {
  const { blocks } = lessonsDemoData();
  const summary = publicContent('SUMMARY', blocks[4]!.content);
  const phrases = summary.keyPhrases as { audioUrl?: string; audioAlt?: string }[];
  assert.equal(new URL(phrases[0]!.audioUrl!).pathname, '/demo-media/nice-to-meet-you.wav');
  assert.equal(phrases[0]!.audioAlt, 'Nice to meet you!');
  assert.equal(phrases[1]!.audioUrl, undefined);
  const dialogue = publicContent('EXAMPLE', blocks[1]!.content);
  const turns = dialogue.turns as { audioUrl?: string }[];
  assert.equal(new URL(turns[0]!.audioUrl!).pathname, '/demo-media/sofia-greeting.wav');
  assert.equal(turns[1]!.audioUrl, undefined);
});
