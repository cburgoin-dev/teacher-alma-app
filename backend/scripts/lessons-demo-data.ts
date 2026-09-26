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
      config: { instruction: 'Elige la mejor opción para continuar la conversación.', options: [{ id: 'hello', text: 'Nice to meet you!' }, { id: 'bye', text: 'Goodbye!' }, { id: 'night', text: 'Good night!' }], correctOptionId: 'hello', context: { type: 'DIALOGUE', speakerLabel: 'D', text: 'Hi, I’m Daniel.', translation: 'Hola, soy Daniel.', audioUrl: media('daniel-intro.wav'), audioAlt: 'Hi, I’m Daniel.' } } },
    { id: demoId(30002), type: 'FILL_BLANK_OPTIONS', prompt: '_____, I’m Sofía.', explanation: 'Hello es un saludo para iniciar una conversación.',
      config: { instruction: 'Observa la escena y elige el saludo para presentarte.', context: { type: 'IMAGE', url: media('greeting-hello-v9.png'), alt: 'Sofía saluda con la mano a otra persona antes de presentarse.' }, options: [{ id: 'please', text: 'Please' }, { id: 'hello', text: 'Hello' }, { id: 'bye', text: 'Goodbye' }], correctOptionId: 'hello', hint: 'Empieza con un saludo.' } },
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
    { id: demoId(31005), lessonId: demoId(1003), position: 7, type: 'SUMMARY', content: { title: 'Resumen de la lección', points: ['Hello inicia una conversación.', 'I’m + tu nombre sirve para presentarte.', 'Nice to meet you expresa mucho gusto.'] } },
    { id: demoId(31006), lessonId: demoId(1004), position: 1, type: 'TEXT', content: { title: 'En resumen', body: 'Con I usamos am. To be nos ayuda a decir quiénes somos: I am a student. También podemos nombrar objetos: It is a book.' } },
    { id: demoId(31007), lessonId: demoId(1004), position: 2, type: 'EXAMPLE', content: { title: 'Ejemplos', primaryText: 'I am a student.', secondaryText: 'It is a book. It is a cup.', note: 'Soy estudiante. Es un libro. Es una taza.' } },
    { id: demoId(31008), lessonId: demoId(1004), position: 3, type: 'ACTIVITY', activityId: demoId(30003) },
    { id: demoId(31009), lessonId: demoId(1004), position: 4, type: 'ACTIVITY', activityId: demoId(30004) },
    { id: demoId(31010), lessonId: demoId(1004), position: 6, type: 'SUMMARY', content: { title: 'Resumen de la lección', points: ['I am: yo soy / estoy.', 'Book: libro. Cup: taza.', 'It is introduce un objeto.'] } },
  ];
  blocks.push({ id: demoId(31011), lessonId: demoId(1003), position: 3, type: 'VIDEO', required: false, content: { title: 'Presentarte en inglés', posterUrl: media('greeting-hello-v9.png'), caption: 'Una explicación para practicar cómo presentarte.' } });
  // Explicit v2 semantics, with v1 text retained for existing mobile clients.
  Object.assign(blocks[0]!.content as Prisma.JsonObject, { segments: [
    { text: 'Usa “' }, { text: 'Nice to meet you!', emphasis: 'KEY' },
    { text: '” cuando conoces a alguien. Puedes responder “' }, { text: 'Nice to meet you too!', emphasis: 'KEY' }, { text: '”.' },
  ] });
  Object.assign(blocks[1]!.content as Prisma.JsonObject, { variant: 'DIALOGUE', turns: [
    { speakerLabel: 'A', text: 'Hi, I’m Sofía. Nice to meet you!', segments: [{ text: 'Hi, I’m Sofía.' }, { text: 'Nice to meet you!', emphasis: 'KEY' }], translation: 'Hola, soy Sofía. ¡Mucho gusto!', audioUrl: media('sofia-greeting.wav'), audioAlt: 'Hi, I’m Sofía. Nice to meet you!' },
    { speakerLabel: 'B', text: 'Hello, I’m Daniel. Nice to meet you too!', segments: [{ text: 'Hello, I’m Daniel.' }, { text: 'Nice to meet you too!', emphasis: 'KEY' }], translation: 'Hola, soy Daniel. ¡El gusto es mío!', audioUrl: media('daniel-greeting.wav'), audioAlt: 'Hello, I’m Daniel. Nice to meet you too!' },
  ] });
  Object.assign(blocks[4]!.content as Prisma.JsonObject, {
    subtitle: '¡Muy bien! Aquí tienes lo más importante de esta lección.',
    takeaways: [
      { text: 'Hello es un saludo para iniciar una conversación de forma amable.', segments: [{ text: 'Hello', emphasis: 'KEY' }, { text: ' es un saludo para iniciar una conversación de forma amable.' }] },
      { text: 'Usa I’m seguido de tu nombre para decir quién eres.', segments: [{ text: 'Usa ' }, { text: 'I’m', emphasis: 'KEY' }, { text: ' seguido de tu nombre para decir quién eres.' }] },
      { text: 'Nice to meet you expresa que te alegra conocer a alguien por primera vez.', segments: [{ text: 'Nice to meet you', emphasis: 'KEY' }, { text: ' expresa que te alegra conocer a alguien por primera vez.' }] },
    ],
    keyPhrases: [{ text: 'Nice to meet you!', translation: '¡Mucho gusto!', audioUrl: media('nice-to-meet-you.wav'), audioAlt: 'Nice to meet you!' }, { text: 'Nice to meet you too!', translation: '¡El gusto es mío!', audioUrl: media('nice-to-meet-you-too.wav'), audioAlt: 'Nice to meet you too!' }],
  });
  activities.push(
    { id: demoId(30005), type: 'FILL_BLANK_TEXT', prompt: 'Nice to meet you _____!', explanation: 'Añade too para responder que también te alegra conocer a la otra persona.',
      config: { instruction: 'Responde a alguien que te dice «Nice to meet you!».', context: { type: 'IMAGE', url: media('greeting-hello-v9.png'), alt: 'Dos personas se saludan y se presentan.' }, acceptedAnswers: ['too'], caseSensitive: false, hint: 'La palabra significa «también».' } },
    { id: demoId(30006), type: 'MULTIPLE_CHOICE', prompt: '¿Cómo nombras este objeto en inglés?', explanation: 'It is a ball significa «Es una pelota». Usamos It is para nombrar un objeto.',
      config: { instruction: 'Elige la oración que describe la imagen.', context: { type: 'IMAGE', url: media('ball.png'), alt: 'Una pelota de colores.' },
        options: [{ id: 'student', text: 'I am a student.' }, { id: 'ball', text: 'It is a ball.' }, { id: 'cup', text: 'It is a cup.' }], correctOptionId: 'ball' } },
  );
  blocks.push(
    { id: demoId(31012), lessonId: demoId(1003), position: 6, type: 'ACTIVITY', activityId: demoId(30005) },
    { id: demoId(31013), lessonId: demoId(1004), position: 5, type: 'ACTIVITY', activityId: demoId(30006) },
  );
  Object.assign(blocks[5]!.content as Prisma.JsonObject, {
    body: 'Usa I am para decir quién eres: I am a student. Usa It is para nombrar un objeto: It is a book.',
    segments: [{ text: 'Usa ' }, { text: 'I am', emphasis: 'KEY' }, { text: ' para decir quién eres: ' }, { text: 'I am a student.', emphasis: 'KEY' },
      { text: ' Usa ' }, { text: 'It is', emphasis: 'KEY' }, { text: ' para nombrar un objeto: ' }, { text: 'It is a book.', emphasis: 'KEY' }],
  });
  Object.assign(blocks[6]!.content as Prisma.JsonObject, { title: 'Personas y objetos', primaryText: 'I am a student. — Soy estudiante.',
    secondaryText: 'It is a book. — Es un libro.\nIt is a cup. — Es una taza.\nIt is a ball. — Es una pelota.', note: 'I am habla de ti; It is presenta un objeto.' });
  Object.assign(blocks[9]!.content as Prisma.JsonObject, {
    subtitle: 'Ya puedes presentarte y nombrar objetos en inglés.',
    points: ['I am a student significa «Soy estudiante».', 'It is a book significa «Es un libro».', 'Usa a antes de book, cup o ball para nombrar un objeto.'],
    takeaways: [
      { text: 'I am te permite decir quién eres: I am a student.', segments: [{ text: 'I am', emphasis: 'KEY' }, { text: ' te permite decir quién eres: I am a student.' }] },
      { text: 'It is presenta un objeto: It is a book.', segments: [{ text: 'It is', emphasis: 'KEY' }, { text: ' presenta un objeto: It is a book.' }] },
      { text: 'a book · a cup · a ball: un libro, una taza, una pelota.', segments: [{ text: 'a book · a cup · a ball', emphasis: 'KEY' }, { text: ': un libro, una taza, una pelota.' }] },
    ],
    keyPhrases: [
      { text: 'I am a student.', translation: 'Soy estudiante.', audioUrl: media('i-am-a-student.wav'), audioAlt: 'I am a student.' },
      { text: 'It is a book.', translation: 'Es un libro.', audioUrl: media('it-is-a-book.wav'), audioAlt: 'It is a book.' },
    ],
  });
  return { activities, blocks };
}
