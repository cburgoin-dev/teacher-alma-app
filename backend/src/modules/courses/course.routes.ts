import { Router } from 'express';
import { CourseController } from './course.controller.js';
import type { CourseService } from './course.service.js';

export function courseRoutes(service: CourseService) {
  const router = Router();
  const controller = new CourseController(service);
  router.get('/', controller.list);
  router.get('/:courseId', controller.detail);
  router.get('/:courseId/roadmap', controller.roadmap);
  router.post('/:courseId/start', controller.start);
  return router;
}
