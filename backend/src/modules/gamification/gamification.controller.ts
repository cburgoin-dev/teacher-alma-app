import type { RequestHandler } from 'express';
import { authenticatedUserId } from '../../shared/auth.js';
import type { GamificationService } from './gamification.service.js';
export class GamificationController {
  constructor(private readonly service: GamificationService) {}
  read: RequestHandler = async (req, res) => { res.json(await this.service.read(authenticatedUserId(req))); };
  goal: RequestHandler = async (req, res) => { res.json(await this.service.changeGoal(authenticatedUserId(req), req.body?.preset)); };
  purchase: RequestHandler = async (req, res) => { res.json(await this.service.purchase(authenticatedUserId(req), req.body?.requestKey)); };
  repair: RequestHandler = async (req, res) => { res.json(await this.service.repair(authenticatedUserId(req), req.body?.requestKey, req.body?.repairId)); };
}
