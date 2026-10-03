import { Router } from 'express';
import { HomeController } from './home.controller.js';
import type { HomeService } from './home.service.js';

export function homeRoutes(service: HomeService) {
  const router = Router();
  router.get('/', new HomeController(service).read);
  return router;
}
