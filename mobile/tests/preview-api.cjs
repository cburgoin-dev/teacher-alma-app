// Opt-in HTTP fixture for manual Android verification, never imported by the app.
// No database, credentials, real purchases or persisted progress. Restart to reset.
// Run: node tests/preview-api.cjs, then set EXPO_PUBLIC_API_URL for the Expo process.
const http = require('node:http');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const courses = [
  { title: 'Inglés A1', level: 'A1', description: 'Bases para comunicarte en situaciones reales.', started: true, completed: 1 },
  { title: 'Inglés A2', level: 'A2', description: 'Comunícate con confianza en más situaciones.', started: false, completed: 0 },
  { title: 'Inglés B1', level: 'B1', description: 'Lleva tus habilidades al siguiente nivel.', started: false, completed: 0, paid: true },
  { title: 'Inglés C1', level: 'C1', description: 'Exprésate con fluidez en contextos avanzados.', started: false, completed: 0, soon: true },
].map((course, index) => ({ ...course, id: uuid(index + 1), position: index + 1 }));
const titles = ['Saludos', 'Presentaciones', 'Nice to meet you!', 'Rutinas diarias'];
// Optional visual stress case. Only affects this in-memory test server.
if (process.argv.includes('--long-titles')) {
  courses[0].title = 'DEV TEST - PUBLISHED - Curso de inglés para conversaciones y situaciones cotidianas';
  courses[1].title = 'Inglés A2: conversaciones, presentaciones y nuevas experiencias';
  titles[1] = 'Presentaciones y conversaciones con personas que acabas de conocer';
}
function counts(course) { return { completedLessons: course.completed, totalLessons: course.soon ? 0 : 4, percentage: course.completed * 25 }; }
function identity(course) { return { id: course.id, title: course.title, level: course.level }; }
function describe(course) {
  return { ...identity(course), slug: 'fixture-' + course.level.toLowerCase(), description: course.description, coverUrl: null,
    status: course.soon ? 'COMING_SOON' : 'PUBLISHED', position: course.position,
    progress: course.started ? { status: 'IN_PROGRESS', ...counts(course) } : null,
    access: { hasFullAccess: false, hasFreeContent: !course.paid && !course.soon, source: 'NONE' } };
}
function roadmap(course) {
  return { course: identity(course), progress: counts(course), topics: course.soon ? [] : [{ id: uuid(10 + course.position), title: 'Primeras conversaciones', position: 1,
    lessons: titles.map((title, index) => {
      const hasAccess = !course.paid && index < 2;
      const unlocked = index <= course.completed;
      return { id: uuid(100 * course.position + index), title, position: index + 1, progressStatus: index < course.completed ? 'COMPLETED' : 'NOT_STARTED',
        access: { type: hasAccess ? 'FREE' : 'PAID', hasAccess },
        progression: { unlocked, isCurrent: course.started && index === course.completed, lockReason: !unlocked ? 'PREREQUISITE' : !hasAccess ? 'ACCESS' : null } };
    }) }] };
}
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  const error = (status, code) => send(status, { error: { code, message: 'Preview fixture' } });
  console.log(req.method, req.url);
  if (req.url === '/courses' && req.method === 'GET') return send(200, { courses: courses.map(describe) });
  const match = req.url.match(/^\/courses\/([^/]+)(?:\/(roadmap|start))?$/);
  const course = match && courses.find(item => item.id === match[1]);
  if (!course) return error(404, 'COURSE_NOT_FOUND');
  if (match[2] === 'start' && req.method === 'POST') {
    if (course.soon) return error(409, 'COURSE_NOT_AVAILABLE');
    if (course.paid) return error(403, 'COURSE_ACCESS_REQUIRED');
    course.started = true;
    return send(200, { course: identity(course), progress: describe(course).progress, nextLesson: { id: uuid(course.position * 100 + course.completed), title: titles[course.completed] } });
  }
  if (req.method !== 'GET') return error(405, 'METHOD_NOT_ALLOWED');
  if (match[2] === 'roadmap') return send(200, roadmap(course));
  if (!match[2]) return send(200, { ...describe(course), content: { topicCount: course.soon ? 0 : 1, lessonCount: course.soon ? 0 : 4, freeLessonCount: course.soon || course.paid ? 0 : 2 } });
  error(404, 'COURSE_NOT_FOUND');
}).listen(3101, '127.0.0.1', () => console.log('Courses preview fixtures listening on 127.0.0.1:3101 (test data only)'));
