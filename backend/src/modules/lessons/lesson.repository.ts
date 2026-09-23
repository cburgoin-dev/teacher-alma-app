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
  findAttempts(userId: string, lessonId: string) {
    return this.db.activityAttempt.findMany({ where: { userId, lessonId, context: 'LESSON' },
      orderBy: [{ attemptNumber: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  }
  findReview(userId: string, activityId: string) {
    return this.db.reviewItem.findFirst({ where: { userId, activityId, status: 'ACTIVE' } });
  }
  countReviews(userId: string, lessonId: string) {
    return this.db.reviewItem.count({ where: { userId, sourceLessonId: lessonId, status: 'ACTIVE' } });
  }
  createProgress(userId: string, lessonId: string, currentBlockId: string | null) {
    return this.db.lessonProgress.create({ data: { userId, lessonId, currentBlockId, status: 'IN_PROGRESS' } });
  }
  updateProgress(userId: string, lessonId: string, data: Prisma.LessonProgressUpdateInput) {
    return this.db.lessonProgress.update({ where: { userId_lessonId: { userId, lessonId } }, data });
  }
  async completeBlocks(userId: string, ids: string[], now: Date) {
    for (const lessonBlockId of ids) {
      await this.db.lessonBlockProgress.upsert({ where: { userId_lessonBlockId: { userId, lessonBlockId } },
        create: { userId, lessonBlockId, status: 'COMPLETED', completedAt: now },
        update: { status: 'COMPLETED', completedAt: now } });
    }
  }
  createAttempt(data: Prisma.ActivityAttemptUncheckedCreateInput) { return this.db.activityAttempt.create({ data }); }
  createReview(userId: string, activityId: string, sourceLessonId: string) {
    return this.db.reviewItem.create({ data: { userId, activityId, sourceLessonId, status: 'ACTIVE' } });
  }
  incrementReview(id: string) {
    return this.db.reviewItem.update({ where: { id }, data: { incorrectAttempts: { increment: 1 } } });
  }
  completeCourse(userId: string, courseId: string, now: Date) {
    return this.db.courseProgress.updateMany({ where: { userId, courseId, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', completedAt: now } });
  }
}

export type LessonRecord = NonNullable<Awaited<ReturnType<LessonSession['findLesson']>>>;
export type LessonBlockRecord = LessonRecord['lessonBlocks'][number];

export class PrismaLessonRepository {
  constructor(private readonly db: PrismaClient) {}

  read<T>(work: (session: LessonSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(tx => work(new LessonSession(tx)), { isolationLevel: 'RepeatableRead' });
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
