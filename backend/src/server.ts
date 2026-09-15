import 'dotenv/config';
import { PrismaCourseRepository } from './modules/courses/course.repository.js';
import { CourseService } from './modules/courses/course.service.js';
import { createApp } from './shared/app.js';
import { developmentAuth } from './shared/auth.js';
import { prisma } from './shared/prisma.js';

const app = createApp(new CourseService(new PrismaCourseRepository(prisma)),
  developmentAuth(process.env.NODE_ENV, process.env.DEV_AUTH_USER_ID));

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
