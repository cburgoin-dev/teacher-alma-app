import { diagnosticRoutes } from '../modules/diagnostics/diagnostic.routes.js';
import type { DiagnosticService } from '../modules/diagnostics/diagnostic.service.js';
import { progressRoutes } from '../modules/progress/progress.routes.js';
import type { ProgressService } from '../modules/progress/progress.service.js';
import { homeRoutes } from '../modules/home/home.routes.js';
import type { HomeService } from '../modules/home/home.service.js';
import { gamificationRoutes } from '../modules/gamification/gamification.routes.js';
import type { GamificationService } from '../modules/gamification/gamification.service.js';
import express from 'express';
import { unitChallengeRoutes } from '../modules/unit-challenges/unit-challenge.routes.js';
import type { UnitChallengeService } from '../modules/unit-challenges/unit-challenge.service.js';
import type { RequestHandler } from 'express';
import cors from 'cors';
import { demoMedia } from './demo-media.js';
import { courseRoutes } from '../modules/courses/course.routes.js';
import type { CourseService } from '../modules/courses/course.service.js';
import { errorHandler } from './http-error.js';
import { lessonRoutes } from '../modules/lessons/lesson.routes.js';
import type { LessonService } from '../modules/lessons/lesson.service.js';
import { reviewRoutes } from '../modules/review/review.routes.js';
import type { ReviewService } from '../modules/review/review.service.js';

/** Composition boundary permits HTTP tests without loading secrets or a database. */
export function createApp(courses: CourseService, auth: RequestHandler, lessons?: LessonService, review?: ReviewService, challenges?: UnitChallengeService, gamification?: GamificationService, home?: HomeService, progress?: ProgressService, diagnostic?: DiagnosticService, devTools?: { router: express.Router; selectIdentity: RequestHandler }) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/demo-media', demoMedia(process.env.NODE_ENV));
  app.get('/health', (_request, response) => { response.json({ status: 'ok' }); });
  if (devTools) app.use('/dev/diagnostic', devTools.router);
  const learnerAuth: RequestHandler[] = devTools ? [auth, devTools.selectIdentity] : [auth];
  app.use('/courses', learnerAuth, courseRoutes(courses));
  if (lessons) app.use('/lessons', learnerAuth, lessonRoutes(lessons));
  if (review) app.use('/review', learnerAuth, reviewRoutes(review));
  if (challenges) app.use('/unit-challenges', learnerAuth, unitChallengeRoutes(challenges));
  if (gamification) app.use('/me/gamification', learnerAuth, gamificationRoutes(gamification));
  if (home) app.use('/me/home', learnerAuth, homeRoutes(home));
  if (progress) app.use('/me/progress', learnerAuth, progressRoutes(progress));
  if (diagnostic) app.use('/diagnostic', learnerAuth, diagnosticRoutes(diagnostic));
  app.use(errorHandler);
  return app;
}
