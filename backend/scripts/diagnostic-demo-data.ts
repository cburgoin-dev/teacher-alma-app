import { readFileSync } from 'node:fs';
import type { Prisma } from '../src/generated/prisma/client.js';
import { demoId } from './courses-demo-data.js';

/** Development acceptance content ONLY. Alma owns production questions and thresholds.
 * Separate Activity rows keep published Diagnostic content independent of Lesson edits. */
export function diagnosticDemoData() {
  const diagnostic = { id: demoId(82000), title: 'Descubre tu nivel', version: 3, estimatedMinutes: 5,
    scoringConfig: { recommendationRules: [
      { level: 'A2', minOverallScore: 70, requirements: [{ targetLevel: 'A1', minScore: 75 }] },
      { level: 'A1', minOverallScore: 0, requirements: [] },
    ] } };
  const image = (name: string) => `data:image/png;base64,${readFileSync(new URL(`./assets/${name}.png`, import.meta.url)).toString('base64')}`;
  const media = (name: string) => new URL('/demo-media/' + name + '.png', process.env.LESSONS_DEMO_ASSET_BASE_URL ?? 'http://localhost:3000').href;
  const activities: Prisma.ActivityCreateManyInput[] = [
    { id: demoId(82101), type: 'MULTIPLE_CHOICE', prompt: 'Estás en una cafetería. ¿Qué responderías?', status: 'ACTIVE',
      config: { instruction: 'Elige la respuesta que continúa la conversación.',
        context: { type: 'IMAGE', url: media('diagnostic-barista'), alt: 'Un barista con delantal saluda desde el mostrador de una cafetería.', caption: '“Good morning! What would you like to drink?”' },
        options: [{ id: 'coffee', text: 'A coffee, please.' }, { id: 'name', text: 'My name is Alex.' },
          { id: 'time', text: 'It is nine o’clock.' }, { id: 'place', text: 'I live near the station.' }], correctOptionId: 'coffee' } },
    { id: demoId(82102), type: 'FILL_BLANK_OPTIONS', prompt: 'The train leaves _____ half past eight.', status: 'ACTIVE',
      config: { instruction: 'Elige la palabra que completa el horario.', context: { type: 'IMAGE', url: media('diagnostic-station'), alt: 'Un tren azul espera junto al reloj de una estación.' }, options: [{ id: 'on', text: 'on' }, { id: 'at', text: 'at' }, { id: 'in', text: 'in' }], correctOptionId: 'at' } },
    { id: demoId(82103), type: 'FILL_BLANK_TEXT', prompt: 'Last weekend we _____ a new café. (visit)', status: 'ACTIVE',
      config: { instruction: 'Completa la frase en pasado.', context: { type: 'IMAGE', url: media('diagnostic-cafe-visit'), alt: 'Una persona llega a una cafetería con toldo coral y puerta de cristal.' }, acceptedAnswers: ['visited'], caseSensitive: false } },
    { id: demoId(82104), type: 'MATCH_WORD_IMAGE', prompt: 'Relaciona cada palabra con el objeto adecuado.', status: 'ACTIVE',
      config: { instruction: 'Toca una palabra y después su imagen.', interactionMode: 'TAP',
        words: [{ id: 'backpack', text: 'Backpack' }, { id: 'umbrella', text: 'Umbrella' }, { id: 'key', text: 'Key' }],
        images: [{ id: 'key-image', url: image('diagnostic-key'), alt: 'Una llave dorada' }, { id: 'backpack-image', url: image('diagnostic-backpack'), alt: 'Una mochila azul con bolsillo coral' }, { id: 'umbrella-image', url: image('diagnostic-umbrella'), alt: 'Un paraguas coral abierto' }],
        pairs: [{ wordId: 'backpack', imageId: 'backpack-image' }, { wordId: 'umbrella', imageId: 'umbrella-image' }, { wordId: 'key', imageId: 'key-image' }] } },
  ];
  const questions = activities.map((a, index) => ({ id: demoId(82201 + index), diagnosticId: diagnostic.id, activityId: a.id!,
    position: index + 1, weight: index === 2 ? '2.000' : '1.000', targetLevel: index < 2 ? 'A1' : index === 2 ? 'A2' : null }));
  return { diagnostic, activities, questions };
}
