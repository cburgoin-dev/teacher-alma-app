import { Router } from 'express';
import { ReviewController } from './review.controller.js';
import type { ReviewService } from './review.service.js';
export function reviewRoutes(service: ReviewService) {
  const router = Router(), controller = new ReviewController(service);
  router.get('/', controller.read);
  router.post('/batches', controller.batch);
  router.post('/items/:reviewItemId/attempt', controller.attempt);
  return router;
}
