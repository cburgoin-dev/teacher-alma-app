import type { Prisma } from '../../generated/prisma/client.js';

/** Completion sources shared by Home and Progress, including completed replay runs. */
export async function readCourseSelection(db: Prisma.TransactionClient, userId: string) {
  const [progress, lessons, runs, challenges] = await Promise.all([
    db.courseProgress.findMany({ where: { userId }, select: { courseId: true, status: true, startedAt: true, completedAt: true } }),
    db.lessonProgress.findMany({ where: { userId, status: 'COMPLETED', completedAt: { not: null } },
      select: { completedAt: true, lesson: { select: { topic: { select: { courseId: true } } } } } }),
    db.lessonRun.findMany({ where: { userId, status: 'COMPLETED', completedAt: { not: null } },
      select: { completedAt: true, lesson: { select: { topic: { select: { courseId: true } } } } } }),
    db.unitChallengeProgress.findMany({ where: { userId },
      select: { completedAt: true, challenge: { select: { topic: { select: { courseId: true } } } } } }),
  ]);
  return { progress, completions: [
    ...[...lessons, ...runs].map(l => ({ courseId: l.lesson.topic.courseId, completedAt: l.completedAt! })),
    ...challenges.map(c => ({ courseId: c.challenge.topic.courseId, completedAt: c.completedAt })),
  ] };
}
