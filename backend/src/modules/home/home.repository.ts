import type { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import type { HomeFacts, HomeRepository } from './home.types.js';

export class PrismaHomeRepository implements HomeRepository {
  constructor(private readonly db: PrismaClient) {}
  read(userId: string): Promise<HomeFacts> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const courses = new PrismaCourseRepository(tx);
      const [learner, catalog, grants, progress, diagnostic, lessons, runs, challenges, reviewItems] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true } }),
        courses.findCourses(userId), courses.findEntitlements(userId),
        tx.courseProgress.findMany({ where: { userId }, select: { courseId: true, status: true, startedAt: true, completedAt: true } }),
        tx.diagnosticAttempt.findFirst({ where: { userId, status: 'COMPLETED' },
          orderBy: [{ completedAt: { sort: 'desc', nulls: 'last' } }, { startedAt: 'desc' }, { id: 'asc' }],
          select: { id: true, completedAt: true, recommendedLevel: true, recommendedCourseId: true } }),
        tx.lessonProgress.findMany({ where: { userId, status: 'COMPLETED', completedAt: { not: null } },
          select: { completedAt: true, lesson: { select: { topic: { select: { courseId: true } } } } } }),
        tx.lessonRun.findMany({ where: { userId, status: 'COMPLETED', completedAt: { not: null } },
          select: { completedAt: true, lesson: { select: { topic: { select: { courseId: true } } } } } }),
        tx.unitChallengeProgress.findMany({ where: { userId },
          select: { completedAt: true, challenge: { select: { topic: { select: { courseId: true } } } } } }),
        tx.reviewItem.findMany({ where: { userId, status: 'ACTIVE' }, select: {
          activity: { select: { status: true } }, sourceLesson: { select: { status: true, accessType: true,
            topic: { select: { courseId: true, course: { select: { status: true } } } } } },
        } }),
      ]);
      return { learner, courses: catalog, grants, progress, diagnostic, reviewItems,
        completions: [
          ...[...lessons, ...runs].map(l => ({ courseId: l.lesson.topic.courseId, completedAt: l.completedAt! })),
          ...challenges.map(c => ({ courseId: c.challenge.topic.courseId, completedAt: c.completedAt })),
        ] };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
