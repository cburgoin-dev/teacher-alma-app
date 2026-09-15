import express from 'express';
import type { RequestHandler } from 'express';
import cors from 'cors';
import { courseRoutes } from '../modules/courses/course.routes.js';
import type { CourseService } from '../modules/courses/course.service.js';
import { errorHandler } from './http-error.js';

/** Composition boundary permits HTTP tests without loading secrets or a database. */
export function createApp(courses: CourseService, auth: RequestHandler) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_request, response) => { response.json({ status: 'ok' }); });
  app.use('/courses', auth, courseRoutes(courses));
  app.use(errorHandler);
  return app;
}
