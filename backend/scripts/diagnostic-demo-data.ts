import { readFileSync } from 'node:fs';
import type { Prisma } from '../src/generated/prisma/client.js';
import { demoId } from './courses-demo-data.js';

/** Development acceptance content ONLY. Alma owns production questions and thresholds.
 * Separate Activity rows keep published Diagnostic content independent of Lesson edits. */
export function diagnosticDemoData() {
  const diagnostic = { id: demoId(81000), title: 'Diagnóstico de nivel', version: 2, estimatedMinutes: 5,
    scoringConfig: { recommendationRules: [
      { level: 'A2', minOverallScore: 70, requirements: [{ targetLevel: 'A1', minScore: 75 }] },
      { level: 'A1', minOverallScore: 0, requirements: [] },
    ] } };
  const image = (name: string) => `data:image/png;base64,${readFileSync(new URL(`./assets/${name}.png`, import.meta.url)).toString('base64')}`;
  const activities: Prisma.ActivityCreateManyInput[] = [
    { id: demoId(81101), type: 'MULTIPLE_CHOICE', prompt: 'Estás en una cafetería. ¿Qué responderías?', status: 'ACTIVE',
      config: { instruction: 'Elige la respuesta que continúa la conversación.',
        context: { type: 'DIALOGUE', speakerLabel: 'Barista', text: 'Good morning! What would you like to drink?' },
        options: [{ id: 'coffee', text: 'A coffee, please.' }, { id: 'name', text: 'My name is Alex.' },
          { id: 'time', text: 'It is nine o’clock.' }, { id: 'place', text: 'I live near the station.' }], correctOptionId: 'coffee' } },
    { id: demoId(81102), type: 'FILL_BLANK_OPTIONS', prompt: 'The train leaves _____ half past eight.', status: 'ACTIVE',
      config: { instruction: 'Elige la palabra que completa el horario.', options: [{ id: 'on', text: 'on' }, { id: 'at', text: 'at' }, { id: 'in', text: 'in' }], correctOptionId: 'at' } },
    { id: demoId(81103), type: 'FILL_BLANK_TEXT', prompt: 'Last weekend we _____ a new café. (visit)', status: 'ACTIVE',
      config: { instruction: 'Completa la frase en pasado.', acceptedAnswers: ['visited'], caseSensitive: false } },
    { id: demoId(81104), type: 'MATCH_WORD_IMAGE', prompt: 'Relaciona cada expresión con el objeto adecuado.', status: 'ACTIVE',
      config: { instruction: 'Toca una expresión y después su imagen.', interactionMode: 'TAP',
        words: [{ id: 'read', text: 'Something to read' }, { id: 'play', text: 'Something to play with' }, { id: 'drink', text: 'Something to drink from' }],
        images: [{ id: 'cup-image', url: image('cup'), alt: 'Una taza' }, { id: 'book-image', url: image('book'), alt: 'Un libro' }, { id: 'ball-image', url: image('ball'), alt: 'Una pelota' }],
        pairs: [{ wordId: 'read', imageId: 'book-image' }, { wordId: 'play', imageId: 'ball-image' }, { wordId: 'drink', imageId: 'cup-image' }] } },
  ];
  const questions = activities.map((a, index) => ({ id: demoId(81201 + index), diagnosticId: diagnostic.id, activityId: a.id!,
    position: index + 1, weight: index === 2 ? '2.000' : '1.000', targetLevel: index < 2 ? 'A1' : index === 2 ? 'A2' : null }));
  return { diagnostic, activities, questions };
}
