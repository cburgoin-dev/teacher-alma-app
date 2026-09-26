import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Activity, Prisma } from '../../generated/prisma/client.js';
import { publicReviewActivity } from './review.service.js';
const variants: [string, Prisma.JsonObject][] = [
  ['MULTIPLE_CHOICE', { options: [{ id: 'a', text: 'A' }], correctOptionId: 'a' }],
  ['FILL_BLANK_OPTIONS', { options: [{ id: 'a', text: 'A' }], correctOptionId: 'a' }],
  ['FILL_BLANK_TEXT', { acceptedAnswers: ['private answer'] }],
  ['MATCH_WORD_IMAGE', { words: [{ id: 'w', text: 'Word' }], images: [{ id: 'i', url: '/image.png', alt: 'Image' }],
    pairs: [{ wordId: 'w', imageId: 'i' }] }],
];
for (const [type, config] of variants) test(type + ': Review preserves public media/context and always strips hint and private keys', () => {
  const activity: Activity = { id: '00000000-0000-4000-8000-000000000001', type, prompt: 'Prompt',
    explanation: 'private explanation', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
    config: { ...config, hint: 'private hint', answerKey: 'secret', instruction: 'Public instruction',
      context: { type: 'DIALOGUE', speakerLabel: 'Alma', text: 'Hello', audioUrl: 'https://example.test/audio.mp3' } } };
  const result = publicReviewActivity(activity), serialized = JSON.stringify(result);
  for (const key of ['hint', 'explanation', 'correctOptionId', 'acceptedAnswers', 'pairs', 'answerKey', 'private']) {
    assert.ok(!serialized.includes(key));
  }
  assert.equal(result.instruction, 'Public instruction');
  assert.ok(serialized.includes('Hello')); assert.ok(serialized.includes('https://example.test/audio.mp3'));
});
