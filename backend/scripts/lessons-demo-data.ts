import { readFileSync } from 'node:fs';
import type { Prisma } from '../src/generated/prisma/client.js';
import { demoId } from './courses-demo-data.js';

// Stable development-only content on existing A1 lessons 3 and 4.
const image = (name: string) => `data:image/png;base64,${readFileSync(new URL(`./assets/${name}.png`, import.meta.url)).toString('base64')}`;
// Base URL is the same LAN origin as the API; media needs no separate process.
const media = (name: string) => new URL('/demo-media/' + name, process.env.LESSONS_DEMO_ASSET_BASE_URL ?? 'http://localhost:3000').href;
export function lessonsDemoData() {
  const activities: Prisma.ActivityCreateManyInput[] = [
    { id: demoId(30001), type: 'MULTIPLE_CHOICE', prompt: 'Alguien dice: “Hi, I’m Daniel.” ¿Qué responderías?', explanation: 'Nice to meet you expresa que te alegra conocer a alguien.',
      config: { instruction: 'Elige la mejor opción para continuar la conversación.', options: [{ id: 'hello', text: 'Nice to meet you!' }, { id: 'bye', text: 'Goodbye!' }, { id: 'night', text: 'Good night!' }], correctOptionId: 'hello', context: { type: 'DIALOGUE', speakerLabel: 'D', text: 'Hi, I’m Daniel.', translation: 'Hola, soy Daniel.' } } },
    { id: demoId(30002), type: 'FILL_BLANK_OPTIONS', prompt: '_____, I’m Sofía.', explanation: 'Hello es un saludo para iniciar una conversación.',
      config: { instruction: 'Observa la escena y elige el saludo para presentarte.', context: { type: 'IMAGE', url: media('greeting.png'), alt: 'Sofía saluda con la mano a otra persona antes de presentarse.' }, options: [{ id: 'please', text: 'Please' }, { id: 'hello', text: 'Hello' }, { id: 'bye', text: 'Goodbye' }], correctOptionId: 'hello', hint: 'Empieza con un saludo.' } },
    { id: demoId(30003), type: 'FILL_BLANK_TEXT', prompt: 'I _____ a student.', explanation: 'Con I usamos am: I am a student.',
      config: { instruction: 'Escribe la palabra que falta.', context: { type: 'TEXT', text: 'Preséntate como estudiante.' }, acceptedAnswers: ['am'], caseSensitive: false, hint: 'Usa la forma de to be que acompaña a I.' } },
    { id: demoId(30004), type: 'MATCH_WORD_IMAGE', prompt: 'Relaciona cada palabra con su imagen.', explanation: 'Book significa libro, cup significa taza y ball significa pelota.',
      config: { interactionMode: 'TAP', words: [{ id: 'book', text: 'Book' }, { id: 'cup', text: 'Cup' }, { id: 'ball', text: 'Ball' }],
        images: [{ id: 'cup-image', url: image('cup'), alt: 'Una taza' }, { id: 'book-image', url: image('book'), alt: 'Un libro' }, { id: 'ball-image', url: image('ball'), alt: 'Una pelota' }],
        pairs: [{ wordId: 'book', imageId: 'book-image' }, { wordId: 'cup', imageId: 'cup-image' }, { wordId: 'ball', imageId: 'ball-image' }] } },
  ];
  const blocks: Prisma.LessonBlockCreateManyInput[] = [
    { id: demoId(31001), lessonId: demoId(1003), position: 1, type: 'TEXT', content: { title: 'En resumen', body: 'Usa “Nice to meet you!” cuando conoces a alguien. Puedes responder “Nice to meet you too!”.' } },
    { id: demoId(31002), lessonId: demoId(1003), position: 2, type: 'EXAMPLE', content: { title: 'Una conversación sencilla', primaryText: 'Hi, I’m Sofía. Nice to meet you!', secondaryText: 'Hello, I’m Daniel. Nice to meet you too!', note: 'Mucho gusto. / El gusto es mío.' } },
    { id: demoId(31003), lessonId: demoId(1003), position: 4, type: 'ACTIVITY', activityId: demoId(30001) },
    { id: demoId(31004), lessonId: demoId(1003), position: 5, type: 'ACTIVITY', activityId: demoId(30002) },
    { id: demoId(31005), lessonId: demoId(1003), position: 6, type: 'SUMMARY', content: { title: 'Resumen de la lección', points: ['Hello inicia una conversación.', 'I’m + tu nombre sirve para presentarte.', 'Nice to meet you expresa mucho gusto.'] } },
    { id: demoId(31006), lessonId: demoId(1004), position: 1, type: 'TEXT', content: { title: 'En resumen', body: 'Con I usamos am. To be nos ayuda a decir quiénes somos: I am a student. También podemos nombrar objetos: It is a book.' } },
    { id: demoId(31007), lessonId: demoId(1004), position: 2, type: 'EXAMPLE', content: { title: 'Ejemplos', primaryText: 'I am a student.', secondaryText: 'It is a book. It is a cup.', note: 'Soy estudiante. Es un libro. Es una taza.' } },
    { id: demoId(31008), lessonId: demoId(1004), position: 3, type: 'ACTIVITY', activityId: demoId(30003) },
    { id: demoId(31009), lessonId: demoId(1004), position: 4, type: 'ACTIVITY', activityId: demoId(30004) },
    { id: demoId(31010), lessonId: demoId(1004), position: 5, type: 'SUMMARY', content: { title: 'Resumen de la lección', points: ['I am: yo soy / estoy.', 'Book: libro. Cup: taza.', 'It is introduce un objeto.'] } },
  ];
  blocks.push({ id: demoId(31011), lessonId: demoId(1003), position: 3, type: 'VIDEO', required: false, content: { title: 'Presentarte en inglés', caption: 'Una explicación para practicar cómo presentarte.' } });
  // Explicit v2 semantics, with v1 text retained for existing mobile clients.
  Object.assign(blocks[0]!.content as Prisma.JsonObject, { segments: [
    { text: 'Usa “' }, { text: 'Nice to meet you!', emphasis: 'KEY' },
    { text: '” cuando conoces a alguien. Puedes responder “' }, { text: 'Nice to meet you too!', emphasis: 'KEY' }, { text: '”.' },
  ] });
  Object.assign(blocks[1]!.content as Prisma.JsonObject, { variant: 'DIALOGUE', turns: [
    { speakerLabel: 'A', text: 'Hi, I’m Sofía. Nice to meet you!', translation: 'Hola, soy Sofía. Mucho gusto.', audioUrl: media('sofia-greeting.wav'), audioAlt: 'Hi, I’m Sofía. Nice to meet you!' },
    { speakerLabel: 'B', text: 'Hello, I’m Daniel. Nice to meet you too!', translation: 'Hola, soy Daniel. El gusto es mío.' },
  ] });
  Object.assign(blocks[4]!.content as Prisma.JsonObject, {
    subtitle: '¡Muy bien! Aquí tienes lo más importante de esta lección.',
    takeaways: [
      { text: 'Hello es un saludo para iniciar una conversación de forma amable.', segments: [{ text: 'Hello', emphasis: 'KEY' }, { text: ' es un saludo para iniciar una conversación de forma amable.' }] },
      { text: 'Usa I’m seguido de tu nombre para decir quién eres.', segments: [{ text: 'Usa ' }, { text: 'I’m', emphasis: 'KEY' }, { text: ' seguido de tu nombre para decir quién eres.' }] },
      { text: 'Nice to meet you expresa que te alegra conocer a alguien por primera vez.', segments: [{ text: 'Nice to meet you', emphasis: 'KEY' }, { text: ' expresa que te alegra conocer a alguien por primera vez.' }] },
    ],
    keyPhrases: [{ text: 'Nice to meet you!', translation: 'Mucho gusto.', audioUrl: media('nice-to-meet-you.wav'), audioAlt: 'Nice to meet you!' }, { text: 'Nice to meet you too!', translation: 'El gusto es mío.' }],
  });
  return { activities, blocks };
}
