import { Router } from 'express';
import { UnitChallengeController } from './unit-challenge.controller.js';
import type { UnitChallengeService } from './unit-challenge.service.js';
export function unitChallengeRoutes(service: UnitChallengeService) {
  const router = Router(), controller = new UnitChallengeController(service);
  router.get('/:unitChallengeId', controller.read);
  router.post('/:unitChallengeId/runs', controller.start);
  router.get('/:unitChallengeId/runs/:runId', controller.resume);
  router.post('/:unitChallengeId/runs/:runId/phases/:runPhaseId/submit', controller.submit);
  router.post('/:unitChallengeId/runs/:runId/abandon', controller.abandon);
  return router;
}
