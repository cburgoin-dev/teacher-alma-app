import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

/** Persistence only. The service determines eligibility, numbering and transitions. */
export class LessonSession {
  constructor(private readonly db: Prisma.TransactionClient) {}

  findLesson(lessonId: string, userId: string) {
    return this.db.lesson.findUnique({ where: { id: lessonId }, include: {
      lessonProgress: { where: { userId } },
      lessonBlocks: { orderBy: { position: 'asc' }, include: {
        activity: true, lessonBlockProgress: { where: { userId } },
      } },
      topic: { include: { course: { include: {
        courseProgress: { where: { userId } },
        topics: { orderBy: { position: 'asc' }, include: { lessons: {
          orderBy: { position: 'asc' }, include: { lessonProgress: { where: { userId } } },
        } } },
      } } } },
    } });
  }

  findEntitlements(userId: string) { return this.db.entitlement.findMany({ where: { userId } }); }
  findAttempts(runId: string) {
    return this.db.activityAttempt.findMany({ where: { runId, context: 'LESSON' },
      orderBy: [{ attemptNumber: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  }
  findReview(userId: string, activityId: string) {
    return this.db.reviewItem.findFirst({ where: { userId, activityId, status: 'ACTIVE' } });
  }
  countReviews(userId: string, lessonId: string) {
    return this.db.reviewItem.count({ where: { userId, sourceLessonId: lessonId, status: 'ACTIVE' } });
  }
  findRun(id: string, lessonId: string, userId: string) {
    return this.db.lessonRun.findFirst({ where: { id, lessonId, userId }, include: { blocks: true } });
  }
  findRunByKey(userId: string, lessonId: string, requestKey: string) {
    return this.db.lessonRun.findUnique({ where: { userId_lessonId_requestKey: { userId, lessonId, requestKey } }, include: { blocks: true } });
  }
  abandonActive(userId: string, lessonId: string, now: Date) {
    return this.db.lessonRun.updateMany({ where: { userId, lessonId, status: 'ACTIVE' }, data: { status: 'ABANDONED', abandonedAt: now, currentBlockId: null } });
  }
  createRun(userId: string, lessonId: string, requestKey: string, currentBlockId: string) {
    return this.db.lessonRun.create({ data: { userId, lessonId, requestKey, currentBlockId }, include: { blocks: true } });
  }
  updateRun(id: string, data: Prisma.LessonRunUncheckedUpdateInput) {
    return this.db.lessonRun.update({ where: { id }, data, include: { blocks: true } });
  }
  completeRunBlocks(runId: string, ids: string[], now: Date) {
    return this.db.lessonRunBlockProgress.createMany({ data: ids.map(lessonBlockId => ({ runId, lessonBlockId, completedAt: now })), skipDuplicates: true });
  }
  consolidateProgress(userId: string, lessonId: string, runId: string, startedAt: Date, now: Date) {
    return this.db.lessonProgress.create({ data: { userId, lessonId, status: 'COMPLETED', startedAt, completedAt: now, completedRunId: runId } });
  }
  linkReview(runId: string, activityId: string, reviewItemId: string) {
    return this.db.activityAttempt.updateMany({ where: { runId, activityId }, data: { reviewItemId } });
  }
  async completeBlocks(userId: string, ids: string[], now: Date) {
    for (const lessonBlockId of ids) {
      await this.db.lessonBlockProgress.upsert({ where: { userId_lessonBlockId: { userId, lessonBlockId } },
        create: { userId, lessonBlockId, status: 'COMPLETED', completedAt: now },
        update: { status: 'COMPLETED', completedAt: now } });
    }
  }
  createAttempt(data: Prisma.ActivityAttemptUncheckedCreateInput) { return this.db.activityAttempt.create({ data }); }
  createReview(userId: string, activityId: string, sourceLessonId: string, incorrectAttempts = 1) {
    return this.db.reviewItem.create({ data: { userId, activityId, sourceLessonId, incorrectAttempts, status: 'ACTIVE' } });
  }
  incrementReview(id: string, amount = 1) {
    return this.db.reviewItem.update({ where: { id }, data: { incorrectAttempts: { increment: amount } } });
  }
  completeCourse(userId: string, courseId: string, now: Date) {
    return this.db.courseProgress.updateMany({ where: { userId, courseId, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', completedAt: now } });
  }
}

export type RunRecord = NonNullable<Awaited<ReturnType<LessonSession['findRun']>>>;
export type LessonRecord = NonNullable<Awaited<ReturnType<LessonSession['findLesson']>>>;
export type LessonBlockRecord = LessonRecord['lessonBlocks'][number];

export class PrismaLessonRepository {
  constructor(private readonly db: PrismaClient) {}

  read<T>(work: (session: LessonSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      // Enforce the read boundary in PostgreSQL, including replay answer checks.
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return work(new LessonSession(tx));
    }, { isolationLevel: 'RepeatableRead' });
  }

  write<T>(userId: string, work: (session: LessonSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      // Serialize this user's lesson writes, including starts without progress rows,
      // attempts shared across lessons, Review deduplication and course completion.
      // Parameterized SQL; no schema change or advisory-lock hash collision.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      return work(new LessonSession(tx));
    }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
  }
}
