import type { RequestHandler } from 'express';
import { authenticatedUserId } from '../../shared/auth.js';
import type { HomeService } from './home.service.js';

export class HomeController {
  constructor(private readonly service: HomeService) {}
  read: RequestHandler = async (request, response) => {
    response.json(await this.service.read(authenticatedUserId(request)));
  };
}
