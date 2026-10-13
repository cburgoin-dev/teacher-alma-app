import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import type { DiagnosticDefinition } from './diagnostic.repository.js';

export const demoScoring = { recommendationRules: [
  { level: 'A2', minOverallScore: 70, requirements: [{ targetLevel: 'A1', minScore: 75 }] },
  { level: 'A1', minOverallScore: 0, requirements: [] },
] };
export function definition(): DiagnosticDefinition {
  const id = randomUUID(), now = new Date();
  return { id, title: 'Placement TEST', version: 1, status: 'PUBLISHED', estimatedMinutes: 5,
    scoringConfig: demoScoring, createdAt: now, updatedAt: now,
    diagnosticQuestions: [
      { type: 'MULTIPLE_CHOICE', config: { options: [{ id: 'a', text: 'Hello' }, { id: 'b', text: 'Bye' }], correctOptionId: 'a' } },
      { type: 'FILL_BLANK_OPTIONS', config: { options: [{ id: 'a', text: 'am' }, { id: 'b', text: 'is' }], correctOptionId: 'a' } },
      { type: 'FILL_BLANK_TEXT', config: { acceptedAnswers: ['am'], caseSensitive: false } },
      { type: 'MATCH_WORD_IMAGE', config: { words: [{ id: 'w1', text: 'Book' }, { id: 'w2', text: 'Hello' }],
        images: [{ id: 'i1', url: '/book.png', alt: 'Book' }, { id: 'i2', url: '/hello.png', alt: 'Hello' }],
        pairs: [{ wordId: 'w1', imageId: 'i1' }, { wordId: 'w2', imageId: 'i2' }] } },
    ].map((a, index) => {
      const activityId = randomUUID();
      return { id: randomUUID(), diagnosticId: id, activityId, position: index + 1, weight: new Prisma.Decimal(1),
        targetLevel: index < 2 ? 'A1' : 'A2', createdAt: now,
        activity: { id: activityId, type: a.type, config: a.config as Prisma.JsonObject, prompt: 'Test prompt',
          explanation: 'SECRET explanation', status: 'ACTIVE', createdAt: now, updatedAt: now } };
    }) };
}
export const correctAnswers = [{ selectedOptionId: 'a' }, { selectedOptionId: 'a' }, { text: ' AM ' },
  { pairs: [{ wordId: 'w1', imageId: 'i1' }, { wordId: 'w2', imageId: 'i2' }] }];
