import { demoId } from './courses-demo-data.js';
import { validateChallenge } from '../src/modules/unit-challenges/unit-challenge.content.js';

/** Small deterministic scene shared by demo import and integration fixtures. */
export function unitChallengeDemo(topicId: string, topicNumber: number, accessType = 'FREE') {
  const challenge = { id: demoId(50000 + topicNumber), topicId, title: 'Tu primera conversación',
    description: 'Saluda, preséntate y recuerda palabras de tu conversación.', passingScore: 70,
    status: 'PUBLISHED', accessType };
  const phases = [
    { id: demoId(60000 + topicNumber * 2), unitChallengeId: challenge.id, type: 'CONVERSATION', position: 1,
      config: { title: 'Conoce a Emma', scenario: 'Llegas a tu primera clase.',
        participants: [{ id: 'emma', name: 'Emma' }, { id: 'learner', name: 'Tú' }],
        steps: [
          { id: 'm1', kind: 'MESSAGE', speakerId: 'emma', text: "Hi! I'm Emma. What's your name?" },
          { id: 'q1', kind: 'CHOICE', prompt: 'Preséntate.',
            options: [{ id: 'a', text: "I'm Alex." }, { id: 'b', text: 'Good night!' }], correctOptionId: 'a' },
          { id: 'm2', kind: 'MESSAGE', speakerId: 'emma', text: 'Nice to meet you, Alex!' },
          { id: 'q2', kind: 'CHOICE', prompt: 'Responde a Emma.',
            options: [{ id: 'a', text: 'Nice to meet you too!' }, { id: 'b', text: 'See you tomorrow!' }], correctOptionId: 'a' },
        ] } },
    { id: demoId(60001 + topicNumber * 2), unitChallengeId: challenge.id, type: 'CROSSWORD', position: 2,
      config: { width: 9, height: 5, entries: [
        { id: 'e1', clue: 'Hola', answer: 'HELLO', direction: 'ACROSS', row: 0, column: 0 },
        { id: 'e2', clue: 'Él', answer: 'HE', direction: 'DOWN', row: 0, column: 0 },
        { id: 'e3', clue: 'Nombre', answer: 'NAME', direction: 'ACROSS', row: 2, column: 0 },
        { id: 'e4', clue: 'Yo', answer: 'I', direction: 'ACROSS', row: 4, column: 0 },
        { id: 'e5', clue: 'Tú', answer: 'YOU', direction: 'DOWN', row: 1, column: 8 },
      ] } },
  ];
  // Validate before a caller opens/imports database writes.
  validateChallenge(phases, challenge.passingScore);
  return { challenge, phases };
}
