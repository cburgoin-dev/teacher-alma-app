import type { CourseRecord } from '../src/modules/courses/course.types.js';

// Development content only; never imported by the application or production seeding.
export const demoId = (n: number) => `6ac0de00-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const demoUserId = demoId(9999);
export function demoCourses(accessBoundary = false): CourseRecord[] {
  const definitions = [
    { level: 'A1', description: 'Bases para comunicarte en situaciones reales.', free: 4,
      topics: [
        ['Presentaciones y datos personales', ['Saludos', 'Presentaciones', 'Nice to meet you!']],
        ['Familia y amigos', ['Verb to be', 'Mi familia']],
        ['Rutinas y vida diaria', ['Rutinas diarias']],
        ['Lugares y ciudad', ['Tiempo libre', 'Mi mundo']],
      ] },
    { level: 'A2', description: 'Comunícate con confianza en más situaciones.', free: 2,
      topics: [
        ['Presentaciones y datos personales', ['Conocer a alguien', 'Contar mi historia']],
        ['Familia y amigos', ['Describir a las personas', 'Planes con amigos']],
        ['Rutinas y vida diaria', ['Un día diferente', 'Hábitos y preferencias']],
        ['Lugares y ciudad', ['Pedir indicaciones', 'Explorar la ciudad']],
      ] },
    { level: 'B1', description: 'Lleva tus habilidades al siguiente nivel.', free: 0,
      topics: [
        ['Experiencias y recuerdos', ['Un viaje memorable', 'Historias del pasado']],
        ['Opiniones y decisiones', ['Expresar mi opinión', 'Comparar alternativas']],
        ['Trabajo y proyectos', ['Mis próximos pasos', 'Resolver un problema']],
      ] },
    { level: 'C1', description: 'Exprésate con fluidez en contextos avanzados.', free: 0, topics: [] },
  ] satisfies { level: string; description: string; free: number; topics: [string, string[]][] }[];
  return definitions.map((definition, courseIndex) => {
    let lessonIndex = 0;
    const completed = courseIndex === 0 ? (accessBoundary ? 4 : 3) : 0;
    return {
      id: demoId(courseIndex + 1), title: `Inglés ${definition.level}`,
      slug: `courses-demo-v3-${definition.level.toLowerCase()}`, level: definition.level,
      description: definition.description, coverUrl: null,
      status: definition.level === 'C1' ? 'COMING_SOON' : 'PUBLISHED', position: courseIndex + 1,
      courseProgress: courseIndex === 0 ? [{ status: 'IN_PROGRESS' }] : [],
      topics: definition.topics.map(([title, titles], topicIndex) => ({
        id: demoId((courseIndex + 1) * 100 + topicIndex + 1), title, position: topicIndex + 1,
        lessons: titles.map((lessonTitle, index) => {
          const globalIndex = lessonIndex++;
          return { id: demoId((courseIndex + 1) * 1000 + globalIndex + 1), title: lessonTitle,
            position: index + 1, status: 'PUBLISHED', isRequired: true,
            accessType: globalIndex < definition.free ? 'FREE' : 'PAID',
            lessonProgress: globalIndex < completed ? [{ status: 'COMPLETED' }] : [] };
        }),
      })),
    };
  });
}
