import { readCourseSelection } from '../courses/course.selection.repository.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import type { HomeFacts, HomeRepository } from './home.types.js';

export class PrismaHomeRepository implements HomeRepository {
  constructor(private readonly db: PrismaClient) {}
  read(userId: string): Promise<HomeFacts> {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const courses = new PrismaCourseRepository(tx);
      const [learner, catalog, grants, selection, diagnostic, reviewItems] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true } }),
        courses.findCourses(userId), courses.findEntitlements(userId),
        readCourseSelection(tx, userId),
        tx.diagnosticAttempt.findFirst({ where: { userId, status: 'COMPLETED' },
          orderBy: [{ completedAt: { sort: 'desc', nulls: 'last' } }, { startedAt: 'desc' }, { id: 'asc' }],
          select: { id: true, completedAt: true, recommendedLevel: true, recommendedCourseId: true } }),
        tx.reviewItem.findMany({ where: { userId, status: 'ACTIVE' }, select: {
          activity: { select: { status: true } }, sourceLesson: { select: { status: true, accessType: true,
            topic: { select: { courseId: true, course: { select: { status: true } } } } } },
        } }),
      ]);
      return { learner, courses: catalog, grants, ...selection, diagnostic, reviewItems };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
