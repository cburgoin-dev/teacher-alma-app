import type { Request, RequestHandler } from 'express';
import { authenticatedUserId, isUuid } from '../../shared/auth.js';
import { HttpError } from '../../shared/http-error.js';
import type { DiagnosticService } from './diagnostic.service.js';
function id(req: Request, key: 'attemptId' | 'questionId') {
  const value = req.params[key];
  if (!isUuid(value)) throw new HttpError(400, key === 'attemptId' ? 'INVALID_ATTEMPT_ID' : 'INVALID_DIAGNOSTIC_QUESTION_ID', 'Invalid identifier');
  return value;
}
export class DiagnosticController {
  constructor(private readonly service: DiagnosticService) {}
  metadata: RequestHandler = async (req, res) => { authenticatedUserId(req); res.json(await this.service.metadata()); };
  start: RequestHandler = async (req, res) => { res.json(await this.service.start(authenticatedUserId(req), req.body?.requestKey)); };
  submit: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req);
    res.json(await this.service.submit(userId, id(req, 'attemptId'), id(req, 'questionId'), req.body?.requestKey, req.body?.answer));
  };
  abandon: RequestHandler = async (req, res) => {
    const userId = authenticatedUserId(req); res.json(await this.service.abandon(userId, id(req, 'attemptId')));
  };
  result: RequestHandler = async (req, res) => { res.json(await this.service.result(authenticatedUserId(req))); };
}
