import { createApp } from '../src/shared/app.js';
import { developmentAuth } from '../src/shared/auth.js';
import { CourseService } from '../src/modules/courses/course.service.js';
import { MemoryCourses } from '../src/modules/courses/course.test-fixtures.js';
import { demoCourses, demoUserId } from './courses-demo-data.js';

const courses = demoCourses(process.argv.includes('--access-boundary'));
if (process.argv.includes('--long-titles')) {
  courses[0]!.title = 'Inglés A1: conversaciones y situaciones cotidianas para comenzar a comunicarte';
  courses[1]!.title = 'Inglés A2: conversaciones, presentaciones y nuevas experiencias';
}
// Same routes/controller/service as PostgreSQL; only persistence is in memory.
const app = createApp(new CourseService(new MemoryCourses(courses)), developmentAuth('development', demoUserId));
app.listen(3101, '127.0.0.1', () => console.log('Courses demo on 127.0.0.1:3101 (in-memory development data; restart to reset)'));
