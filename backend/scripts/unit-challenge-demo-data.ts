import { demoId } from './courses-demo-data.js';
import { validateChallenge } from '../src/modules/unit-challenges/unit-challenge.content.js';

/** Acceptance-only demo, not final Alma pedagogical content. Shared with integration fixtures. */
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
          // Linear content: this transition must work after either option or no answer.
          { id: 'm2', kind: 'MESSAGE', speakerId: 'emma', text: "Before class, let's practise a greeting: nice to meet you!" },
          { id: 'q2', kind: 'CHOICE', prompt: 'Responde a Emma.',
            options: [{ id: 'a', text: 'Nice to meet you too!' }, { id: 'b', text: 'See you tomorrow!' }], correctOptionId: 'a' },
          { id: 'm3', kind: 'MESSAGE', speakerId: 'emma', text: "Let's practise talking about home. Where are you from?" },
          { id: 'q3', kind: 'CHOICE', prompt: 'Di de dónde eres.',
            options: [{ id: 'a', text: "I'm from Mexico." }, { id: 'b', text: 'Good morning!' }], correctOptionId: 'a' },
          { id: 'm4', kind: 'MESSAGE', speakerId: 'emma', text: "Our practice is ending. How do you say goodbye?" },
          { id: 'q4', kind: 'CHOICE', prompt: 'Despídete.',
            options: [{ id: 'a', text: 'See you tomorrow!' }, { id: 'b', text: "My name is Alex." }], correctOptionId: 'a' },
          { id: 'm5', kind: 'MESSAGE', speakerId: 'emma', text: 'That is the end of our practice. Bye!' },
        ] } },
    { id: demoId(60001 + topicNumber * 2), unitChallengeId: challenge.id, type: 'CROSSWORD', position: 2,
      config: { width: 7, height: 7, entries: [
        { id: 'e1', clue: 'Nombre', answer: 'NAME', direction: 'DOWN', row: 0, column: 3 },
        { id: 'e2', clue: 'Hola', answer: 'HELLO', direction: 'ACROSS', row: 3, column: 2 },
        { id: 'e3', clue: 'Casa', answer: 'HOME', direction: 'DOWN', row: 3, column: 2 },
        { id: 'e4', clue: 'Conocer: Nice to ___ you!', answer: 'MEET', direction: 'ACROSS', row: 5, column: 2 },
        { id: 'e5', clue: 'Adiós', answer: 'BYE', direction: 'ACROSS', row: 6, column: 0 },
      ] } },
  ];
  // Validate before a caller opens/imports database writes.
  validateChallenge(phases, challenge.passingScore);
  return { challenge, phases };
}
