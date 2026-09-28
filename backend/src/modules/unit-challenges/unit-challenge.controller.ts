import type { Request, RequestHandler } from 'express';
import { authenticatedUserId, isUuid } from '../../shared/auth.js';
import { HttpError } from '../../shared/http-error.js';
import type { UnitChallengeService } from './unit-challenge.service.js';
function id(request: Request, key: 'unitChallengeId' | 'runId' | 'runPhaseId') {
  const value = request.params[key];
  if (!isUuid(value)) throw new HttpError(400, key === 'unitChallengeId' ? 'INVALID_UNIT_CHALLENGE_ID'
    : key === 'runId' ? 'INVALID_RUN_ID' : 'INVALID_RUN_PHASE_ID', 'Invalid identifier');
  return value;
}
export class UnitChallengeController {
  constructor(private readonly service: UnitChallengeService) {}
  read: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req);
    res.json(await this.service.read(id(req, 'unitChallengeId'), userId));
  };
  start: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req);
    res.json(await this.service.start(id(req, 'unitChallengeId'), userId, req.body?.requestKey));
  };
  resume: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req);
    res.json(await this.service.resume(id(req, 'unitChallengeId'), id(req, 'runId'), userId));
  };
  submit: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req);
    res.json(await this.service.submit(id(req, 'unitChallengeId'), id(req, 'runId'), id(req, 'runPhaseId'),
      userId, req.body?.requestKey, req.body?.answer));
  };
  abandon: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req);
    res.json(await this.service.abandon(id(req, 'unitChallengeId'), id(req, 'runId'), userId));
  };
}
