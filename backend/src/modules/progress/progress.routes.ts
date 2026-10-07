import { Router } from 'express';
import { ProgressController } from './progress.controller.js';
import type { ProgressService } from './progress.service.js';

export function progressRoutes(service: ProgressService) {
  const router = Router(), controller = new ProgressController(service);
  router.get('/', controller.read);
  router.get('/calendar', controller.calendar);
  return router;
}
