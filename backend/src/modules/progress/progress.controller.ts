import type { RequestHandler } from 'express';
import { authenticatedUserId } from '../../shared/auth.js';
import type { ProgressService } from './progress.service.js';

export class ProgressController {
  constructor(private readonly service: ProgressService) {}
  read: RequestHandler = async (request, response) => {
    response.json(await this.service.read(authenticatedUserId(request)));
  };
  calendar: RequestHandler = async (request, response) => {
    response.json(await this.service.calendar(authenticatedUserId(request), request.query.month));
  };
}
