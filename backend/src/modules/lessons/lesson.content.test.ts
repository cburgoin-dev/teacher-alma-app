import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicContent, activityPresentation } from './lesson.content.js';
import { publicActivity, checkAnswer } from './lesson.activity.js';
import type { Activity, Prisma } from '../../generated/prisma/client.js';

const audioUrl = 'https://media.example.test/hello.mp3';
const secret = { correctOptionId: 'SECRET', acceptedAnswers: ['SECRET'], pairs: [{ wordId: 'SECRET', imageId: 'SECRET' }], privateKey: 'SECRET' };
function activity(type: string, config: Prisma.JsonObject): Activity {
  return { id: 'a', type, prompt: 'Choose', status: 'ACTIVE', config, explanation: 'SECRET', createdAt: new Date(), updatedAt: new Date() };
}
test('v1 text, generic example and summary preserve exact fallbacks without inferred rich fields', () => {
  for (const [type, content] of [['TEXT', { title: 'Concept', body: 'Hello' }], ['EXAMPLE', { primaryText: 'Hello', secondaryText: 'Hola', note: 'Translation' }], ['SUMMARY', { points: ['Hello'] }]] as const) {
    assert.deepEqual(publicContent(type, { ...content, ...secret }), content);
  }
});
test('rich text, dialogue and summary recursively allowlist only configured public content', () => {
  const segments = [{ text: 'Hello', emphasis: 'KEY', ...secret }, { text: ' there' }];
  assert.deepEqual(publicContent('TEXT', { body: 'Hello there', segments, ...secret }), { body: 'Hello there', segments: [{ text: 'Hello', emphasis: 'KEY' }, { text: ' there' }] });
  const example = publicContent('EXAMPLE', { primaryText: 'Hello', variant: 'DIALOGUE', turns: [{ text: 'Hello', speakerLabel: 'A', translation: 'Hola', audioUrl, audioAlt: 'Greeting', ...secret }, { text: 'Hi', audioUrl: null }], ...secret });
  assert.deepEqual(example.turns, [{ text: 'Hello', speakerLabel: 'A', translation: 'Hola', audioUrl, audioAlt: 'Greeting' }, { text: 'Hi' }]);
  const summary = publicContent('SUMMARY', { points: ['Hello there'], subtitle: 'Well done', takeaways: [{ text: 'Hello there', segments, ...secret }], keyPhrases: [{ text: 'Hello', translation: 'Hola', audioUrl, audioAlt: 'Greeting', ...secret }], ...secret });
  assert.equal(summary.subtitle, 'Well done');
  assert.ok(!JSON.stringify([example, summary]).includes('SECRET'));
  assert.ok(JSON.stringify(summary).includes(audioUrl));
});
test('malformed v2 fields fail closed; absent/null additions remain optional', () => {
  for (const segments of [[], {}, [{ text: 1 }], [{ text: 'x', emphasis: 'BOLD' }]]) assert.throws(() => publicContent('TEXT', { body: 'x', segments }));
  for (const turns of [undefined, [], [{ speakerLabel: 'A' }]]) assert.throws(() => publicContent('EXAMPLE', { variant: 'DIALOGUE', turns }));
  assert.throws(() => publicContent('EXAMPLE', { variant: 'OTHER', turns: [{ text: 'x' }] }));
  assert.throws(() => publicContent('SUMMARY', { takeaways: [{ text: 3 }] }));
  assert.throws(() => publicContent('SUMMARY', { keyPhrases: [{ translation: 'Hola' }] }));
  assert.deepEqual(publicContent('TEXT', { body: 'Hello', segments: null }), { body: 'Hello' });
  assert.deepEqual(publicContent('TEXT', { body: ' ', segments: [{ text: ' ' }] }).segments, [{ text: ' ' }]);
  assert.deepEqual(activityPresentation({ context: null, instruction: null }), {});
  for (const url of ['javascript:alert(1)', 'data:audio/wav;base64,abc', 'file:///tmp/x', 'https://user:pass@example.test/a', '/relative.mp3']) {
    assert.throws(() => activityPresentation({ context: { type: 'TEXT', text: 'Hello', audioUrl: url } }));
  }
  for (const context of [{ type: 'OTHER', text: 'Hello' }, { type: 'IMAGE', url: 'https://example.test/a.png' }, { type: 'DIALOGUE' }]) assert.throws(() => activityPresentation({ context }));
});
test('all activity families expose safe presentation without answer config or changed validation', () => {
  const cases = [
    ['MULTIPLE_CHOICE', { options: [{ id: 'a', text: 'Hello', ...secret }], correctOptionId: 'a' }, { selectedOptionId: 'a' }],
    ['FILL_BLANK_OPTIONS', { options: [{ id: 'a', text: 'Hello' }], correctOptionId: 'a' }, { selectedOptionId: 'a' }],
    ['FILL_BLANK_TEXT', { acceptedAnswers: ['Hello'] }, { text: 'hello' }],
    ['MATCH_WORD_IMAGE', { words: [{ id: 'w', text: 'Book', ...secret }], images: [{ id: 'i', url: '/book.png', alt: 'Book', ...secret }], pairs: [{ wordId: 'w', imageId: 'i' }] }, { pairs: [{ wordId: 'w', imageId: 'i' }] }],
  ] as const;
  for (const [type, config, answer] of cases) {
    const a = activity(type, { ...config, privateKey: 'SECRET', instruction: 'Listen', hint: 'A greeting', context: { type: 'DIALOGUE', text: 'Hello', speakerLabel: 'D', audioUrl, audioAlt: 'Greeting', ...secret } } as unknown as Prisma.JsonObject);
    const dto = publicActivity(a);
    assert.deepEqual(dto.context, { type: 'DIALOGUE', text: 'Hello', speakerLabel: 'D', audioUrl, audioAlt: 'Greeting' });
    assert.equal(dto.instruction, 'Listen');
    for (const key of ['SECRET', 'correctOptionId', 'acceptedAnswers', '"pairs"', 'explanation']) assert.ok(!JSON.stringify(dto).includes(key));
    assert.equal(checkAnswer(a, answer).isCorrect, true);
  }
  assert.deepEqual(activityPresentation({ context: { type: 'TEXT', text: 'Read', audioUrl, ...secret } }).context, { type: 'TEXT', text: 'Read', audioUrl });
  assert.deepEqual(activityPresentation({ context: { type: 'IMAGE', url: 'https://example.test/a.png', alt: 'People', caption: 'Greeting', ...secret } }).context, { type: 'IMAGE', url: 'https://example.test/a.png', alt: 'People', caption: 'Greeting' });
});
