import { Router } from 'express';
import { LessonController } from './lesson.controller.js';
import type { LessonService } from './lesson.service.js';

export function lessonRoutes(service: LessonService) {
  const router = Router();
  const controller = new LessonController(service);
  router.get('/:lessonId', controller.read);
  router.post('/:lessonId/runs', controller.start);
  router.post('/:lessonId/runs/:runId/steps/:stepId/complete', controller.completeStep);
  router.post('/:lessonId/runs/:runId/steps/:stepId/attempt', controller.attempt);
  router.post('/:lessonId/replay/steps/:stepId/check', controller.replayCheck);
  router.post('/:lessonId/runs/:runId/complete', controller.complete);
  router.post('/:lessonId/runs/:runId/abandon', controller.abandon);
  return router;
}
