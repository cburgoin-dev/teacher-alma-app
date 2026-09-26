import type { RequestHandler } from 'express';
import { authenticatedUserId } from '../../shared/auth.js';
import type { ReviewService } from './review.service.js';
export class ReviewController {
  constructor(private readonly service: ReviewService) {}
  read: RequestHandler = async (req, res) => { res.json(await this.service.read(authenticatedUserId(req))); };
  batch: RequestHandler = async (req, res) => { res.json(await this.service.batch(authenticatedUserId(req), req.body?.preferredLessonId)); };
  attempt: RequestHandler = async (req, res) => { res.json(await this.service.attempt(authenticatedUserId(req), req.params.reviewItemId, req.body)); };
}
