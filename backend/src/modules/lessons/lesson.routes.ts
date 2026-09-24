import { Router } from 'express';
import { LessonController } from './lesson.controller.js';
import type { LessonService } from './lesson.service.js';

export function lessonRoutes(service: LessonService) {
  const router = Router();
  const controller = new LessonController(service);
  router.get('/:lessonId', controller.read);
  router.post('/:lessonId/start', controller.start);
  router.post('/:lessonId/steps/:stepId/complete', controller.completeStep);
  router.post('/:lessonId/steps/:stepId/attempt', controller.attempt);
  router.post('/:lessonId/replay/steps/:stepId/check', controller.replayCheck);
  router.post('/:lessonId/complete', controller.complete);
  return router;
}
