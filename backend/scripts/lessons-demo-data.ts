import { readFileSync } from 'node:fs';
import type { Prisma } from '../src/generated/prisma/client.js';
import { demoId } from './courses-demo-data.js';

// Stable development-only content on existing A1 lessons 3 and 4.
const image = (name: string) => `data:image/png;base64,${readFileSync(new URL(`./assets/${name}.png`, import.meta.url)).toString('base64')}`;
export function lessonsDemoData() {
  const activities: Prisma.ActivityCreateManyInput[] = [
    { id: demoId(30001), type: 'MULTIPLE_CHOICE', prompt: 'Alguien dice: “Hi, I’m Daniel.” ¿Qué responderías?', explanation: 'Nice to meet you expresa que te alegra conocer a alguien.',
      config: { options: [{ id: 'hello', text: 'Nice to meet you!' }, { id: 'bye', text: 'Goodbye!' }, { id: 'night', text: 'Good night!' }], correctOptionId: 'hello' } },
    { id: demoId(30002), type: 'FILL_BLANK_OPTIONS', prompt: '_____, I’m Sofía.', explanation: 'Hello es un saludo para iniciar una conversación.',
      config: { options: [{ id: 'please', text: 'Please' }, { id: 'hello', text: 'Hello' }, { id: 'bye', text: 'Goodbye' }], correctOptionId: 'hello', hint: 'Empieza con un saludo.' } },
    { id: demoId(30003), type: 'FILL_BLANK_TEXT', prompt: 'I _____ a student.', explanation: 'Con I usamos am: I am a student.',
      config: { acceptedAnswers: ['am'], caseSensitive: false, hint: 'Usa la forma de to be que acompaña a I.' } },
    { id: demoId(30004), type: 'MATCH_WORD_IMAGE', prompt: 'Relaciona cada palabra con su imagen.', explanation: 'Book significa libro y cup significa taza.',
      config: { interactionMode: 'TAP', words: [{ id: 'book', text: 'Book' }, { id: 'cup', text: 'Cup' }],
        images: [{ id: 'cup-image', url: image('cup'), alt: 'Una taza' }, { id: 'book-image', url: image('book'), alt: 'Un libro' }],
        pairs: [{ wordId: 'book', imageId: 'book-image' }, { wordId: 'cup', imageId: 'cup-image' }] } },
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
  blocks.push({ id: demoId(31011), lessonId: demoId(1003), position: 3, type: 'VIDEO', required: false, content: { title: 'Presentarte en inglés', caption: 'Espacio de prueba para una explicación en video. El contenido audiovisual se añadirá más adelante.' } });
  return { activities, blocks };
}
