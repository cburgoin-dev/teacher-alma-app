import { GamificationSession } from '../gamification/gamification.repository.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

const include = { activity: true, sourceLesson: { include: { topic: { include: { course: true } } } } } as const;
export class ReviewSession {
  constructor(private readonly db: Prisma.TransactionClient) {}
  gamification() { return new GamificationSession(this.db); }
  completedBatchItems(userId: string, reviewBatchId: string) {
    return this.db.activityAttempt.findMany({ where: { userId, reviewBatchId, context: 'REVIEW' }, select: { reviewItemId: true } });
  }
  saveResult(id: string, reviewResult: Prisma.InputJsonValue) { return this.db.activityAttempt.update({ where: { id }, data: { reviewResult } }); }
  findActive(userId: string) { return this.db.reviewItem.findMany({ where: { userId, status: 'ACTIVE' }, include }); }
  findItem(id: string, userId: string) { return this.db.reviewItem.findFirst({ where: { id, userId }, include }); }
  findEntitlements(userId: string) { return this.db.entitlement.findMany({ where: { userId } }); }
  findRequest(userId: string, reviewRequestKey: string) {
    return this.db.activityAttempt.findUnique({ where: { userId_reviewRequestKey: { userId, reviewRequestKey } } });
  }
  lastAttempt(reviewItemId: string) {
    return this.db.activityAttempt.findFirst({ where: { reviewItemId, context: 'REVIEW' }, orderBy: { attemptNumber: 'desc' } });
  }
  findBatchAttempt(reviewItemId: string, reviewBatchId: string) {
    return this.db.activityAttempt.findUnique({ where: { reviewItemId_reviewBatchId: { reviewItemId, reviewBatchId } } });
  }
  async createAttempt(data: Prisma.ActivityAttemptUncheckedCreateInput) { return this.db.activityAttempt.create({ data }); }
  updateItem(id: string, data: Prisma.ReviewItemUpdateInput) { return this.db.reviewItem.update({ where: { id }, data }); }
}
export type ReviewRecord = Awaited<ReturnType<ReviewSession['findActive']>>[number];
export class PrismaReviewRepository {
  constructor(private readonly db: PrismaClient) {}
  read<T>(work: (session: ReviewSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return work(new ReviewSession(tx));
    }, { isolationLevel: 'RepeatableRead' });
  }
  write<T>(userId: string, work: (session: ReviewSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      return work(new ReviewSession(tx));
    }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
  }
}
