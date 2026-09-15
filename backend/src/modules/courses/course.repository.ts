import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { CourseRepository } from './course.types.js';

function courseSelect(userId: string) {
  return {
    id: true,
    title: true,
    slug: true,
    level: true,
    description: true,
    coverUrl: true,
    status: true,
    position: true,
    courseProgress: { where: { userId }, select: { status: true } },
    topics: {
      select: {
        id: true,
        title: true,
        position: true,
        lessons: {
          select: {
            id: true,
            title: true,
            position: true,
            status: true,
            isRequired: true,
            accessType: true,
            lessonProgress: { where: { userId }, select: { status: true } },
          },
        },
      },
    },
  } satisfies Prisma.CourseSelect;
}

/** Only persistence: visibility, ordering and access decisions belong to the service. */
export class PrismaCourseRepository implements CourseRepository {
  constructor(private readonly db: Pick<PrismaClient, 'course' | 'courseProgress' | 'entitlement'>) {}

  findCourses(userId: string) {
    return this.db.course.findMany({ select: courseSelect(userId) });
  }

  findCourse(courseId: string, userId: string) {
    return this.db.course.findUnique({ where: { id: courseId }, select: courseSelect(userId) });
  }

  findEntitlements(userId: string) {
    return this.db.entitlement.findMany({
      where: { userId },
      select: { scope: true, courseId: true, status: true, startsAt: true, expiresAt: true },
    });
  }

  async createProgressOnce(courseId: string, userId: string) {
    // PostgreSQL ON CONFLICT DO NOTHING uses the existing user/course unique key.
    // Unlike an update/upsert, a retry never rewrites status or timestamps.
    await this.db.courseProgress.createMany({
      data: [{ courseId, userId, status: 'IN_PROGRESS' }],
      skipDuplicates: true,
    });
    return this.db.courseProgress.findUniqueOrThrow({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true },
    });
  }
}
