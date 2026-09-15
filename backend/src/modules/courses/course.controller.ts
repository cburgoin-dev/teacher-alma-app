import type { Request, RequestHandler } from 'express';
import { authenticatedUserId, isUuid } from '../../shared/auth.js';
import { HttpError } from '../../shared/http-error.js';
import type { CourseService } from './course.service.js';

function courseId(request: Request): string {
  const id = request.params.courseId;
  if (!isUuid(id)) throw new HttpError(400, 'INVALID_COURSE_ID', 'Invalid course id');
  return id;
}

export class CourseController {
  constructor(private readonly service: CourseService) {}

  list: RequestHandler = async (request, response) => {
    response.json(await this.service.list(authenticatedUserId(request)));
  };

  detail: RequestHandler = async (request, response) => {
    const id = courseId(request);
    response.json(await this.service.detail(id, authenticatedUserId(request)));
  };

  roadmap: RequestHandler = async (request, response) => {
    const id = courseId(request);
    response.json(await this.service.roadmap(id, authenticatedUserId(request)));
  };

  start: RequestHandler = async (request, response) => {
    const id = courseId(request);
    response.json(await this.service.start(id, authenticatedUserId(request)));
  };
}
