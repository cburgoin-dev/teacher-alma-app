import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { readCourseSelection } from '../courses/course.selection.repository.js';
import { dateValue } from '../gamification/gamification.rules.js';
import type { ProgressReadSession, ProgressRepository } from './progress.types.js';

class PrismaProgressReadSession implements ProgressReadSession {
  constructor(private readonly db: Prisma.TransactionClient) {}
  async timezone(userId: string) {
    return (await this.db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })).timezone;
  }
  async dashboard(userId: string) {
    const repository = new PrismaCourseRepository(this.db);
    const [courses, grants, selection, reviewItems] = await Promise.all([
      repository.findCourses(userId), repository.findEntitlements(userId), readCourseSelection(this.db, userId),
      this.db.reviewItem.findMany({ where: { userId, status: 'ACTIVE' }, select: {
        id: true, createdAt: true, lastReviewedAt: true, activity: { select: { status: true } },
        sourceLesson: { select: { status: true, accessType: true, topic: { select: {
          id: true, title: true, courseId: true, course: { select: { status: true } },
        } } } },
      } }),
    ]);
    return { courses, grants, ...selection, reviewItems };
  }
  async history(userId: string, start: string, end: string) {
    const range = { gte: dateValue(start), lte: dateValue(end) };
    const [days, protections, repairs] = await Promise.all([
      this.db.learningDay.findMany({ where: { userId, activityDate: range }, select: { activityDate: true } }),
      this.db.streakProtectionEvent.findMany({ where: { userId, protectedDate: range }, select: { protectedDate: true } }),
      this.db.streakRepair.findMany({ where: { userId, brokenDate: range }, select: { brokenDate: true, status: true } }),
    ]);
    return { days, protections, repairs };
  }
}
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private readonly db: PrismaClient) {}
  read<T>(work: (session: ProgressReadSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return work(new PrismaProgressReadSession(tx));
    }, { isolationLevel: 'RepeatableRead' });
  }
}
