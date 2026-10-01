import { Router } from 'express';
import { GamificationController } from './gamification.controller.js';
import type { GamificationService } from './gamification.service.js';
export function gamificationRoutes(service: GamificationService) {
  const router = Router(), controller = new GamificationController(service);
  router.get('/', controller.read);
  router.patch('/timezone', controller.timezone);
  router.patch('/daily-goal', controller.goal);
  router.post('/protectors/purchase', controller.purchase);
  router.post('/streak/repair', controller.repair);
  return router;
}
