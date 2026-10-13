import { Router } from 'express';
import { DiagnosticController } from './diagnostic.controller.js';
import type { DiagnosticService } from './diagnostic.service.js';
export function diagnosticRoutes(service: DiagnosticService) {
  const router = Router(), c = new DiagnosticController(service);
  router.get('/', c.metadata);
  router.get('/result', c.result);
  router.post('/attempts', c.start);
  router.post('/attempts/:attemptId/questions/:questionId/submit', c.submit);
  router.post('/attempts/:attemptId/abandon', c.abandon);
  return router;
}
