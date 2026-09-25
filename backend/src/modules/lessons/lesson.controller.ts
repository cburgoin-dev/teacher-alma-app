import type { Request, RequestHandler } from 'express';
import { authenticatedUserId, isUuid } from '../../shared/auth.js';
import { HttpError } from '../../shared/http-error.js';
import type { LessonService } from './lesson.service.js';

function id(request: Request, key: 'lessonId' | 'stepId' | 'runId'): string {
  const value = request.params[key];
  if (!isUuid(value)) throw new HttpError(400, key === 'lessonId' ? 'INVALID_LESSON_ID' : key === 'runId' ? 'INVALID_RUN_ID' : 'INVALID_STEP_ID', 'Invalid identifier');
  return value;
}

export class LessonController {
  constructor(private readonly service: LessonService) {}
  read: RequestHandler = async (request, response) => {
    response.json(await this.service.read(id(request, 'lessonId'), authenticatedUserId(request)));
  };
  start: RequestHandler = async (request, response) => {
    response.json(await this.service.start(id(request, 'lessonId'), authenticatedUserId(request), request.body?.requestKey));
  };
  completeStep: RequestHandler = async (request, response) => {
    response.json(await this.service.completeStep(id(request, 'lessonId'), id(request, 'runId'), id(request, 'stepId'), authenticatedUserId(request)));
  };
  attempt: RequestHandler = async (request, response) => {
    response.json(await this.service.attempt(id(request, 'lessonId'), id(request, 'runId'), id(request, 'stepId'), authenticatedUserId(request), request.body));
  };
  replayCheck: RequestHandler = async (request, response) => {
    response.json(await this.service.replayCheck(id(request, 'lessonId'), id(request, 'stepId'), authenticatedUserId(request), request.body));
  };
  abandon: RequestHandler = async (request, response) => {
    response.json(await this.service.abandon(id(request, 'lessonId'), id(request, 'runId'), authenticatedUserId(request)));
  };
  complete: RequestHandler = async (request, response) => {
    response.json(await this.service.complete(id(request, 'lessonId'), id(request, 'runId'), authenticatedUserId(request)));
  };
}
