import { readFileSync } from 'node:fs';
import type { Prisma } from '../src/generated/prisma/client.js';
import { demoId } from './courses-demo-data.js';

/** Development acceptance content ONLY. Alma owns production questions and thresholds.
 * Separate Activity rows keep published Diagnostic content independent of Lesson edits. */
export function diagnosticDemoData() {
  const diagnostic = { id: demoId(80000), title: 'Descubre tu nivel (demo)', version: 1, estimatedMinutes: 5,
    scoringConfig: { recommendationRules: [
      { level: 'A2', minOverallScore: 70, requirements: [{ targetLevel: 'A1', minScore: 75 }] },
      { level: 'A1', minOverallScore: 0, requirements: [] },
    ] } };
  const image = (name: string) => `data:image/png;base64,${readFileSync(new URL(`./assets/${name}.png`, import.meta.url)).toString('base64')}`;
  const activities: Prisma.ActivityCreateManyInput[] = [
    { id: demoId(80101), type: 'MULTIPLE_CHOICE', prompt: 'Elige un saludo.', status: 'ACTIVE',
      config: { instruction: 'Selecciona una opción.', options: [{ id: 'hello', text: 'Hello!' }, { id: 'bye', text: 'Goodbye!' }], correctOptionId: 'hello' } },
    { id: demoId(80102), type: 'FILL_BLANK_OPTIONS', prompt: 'She _____ a teacher.', status: 'ACTIVE',
      config: { options: [{ id: 'am', text: 'am' }, { id: 'is', text: 'is' }, { id: 'are', text: 'are' }], correctOptionId: 'is' } },
    { id: demoId(80103), type: 'FILL_BLANK_TEXT', prompt: 'Yesterday I _____ to school. (go)', status: 'ACTIVE',
      config: { acceptedAnswers: ['went'], caseSensitive: false } },
    { id: demoId(80104), type: 'MATCH_WORD_IMAGE', prompt: 'Relaciona las palabras con las imágenes.', status: 'ACTIVE',
      config: { interactionMode: 'TAP', words: [{ id: 'book', text: 'Book' }, { id: 'cup', text: 'Cup' }],
        images: [{ id: 'cup-image', url: image('cup'), alt: 'Una taza' }, { id: 'book-image', url: image('book'), alt: 'Un libro' }],
        pairs: [{ wordId: 'book', imageId: 'book-image' }, { wordId: 'cup', imageId: 'cup-image' }] } },
  ];
  const questions = activities.map((a, index) => ({ id: demoId(80201 + index), diagnosticId: diagnostic.id, activityId: a.id!,
    position: index + 1, weight: index === 2 ? '2.000' : '1.000', targetLevel: index < 2 ? 'A1' : index === 2 ? 'A2' : null }));
  return { diagnostic, activities, questions };
}
