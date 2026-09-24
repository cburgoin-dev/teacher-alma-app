import 'dotenv/config';
import { demoCourses, demoId } from './courses-demo-data.js';
import { isUuid } from '../src/shared/auth.js';
import { lessonsDemoData } from './lessons-demo-data.js';

class DemoGuard extends Error {}
async function main() {
  const action = process.argv[2];
  if (!['--check', '--apply', '--reset'].includes(action ?? '')) {
    throw new DemoGuard('Use --check, --apply or --reset; optional --access-boundary with --reset.');
  }
  if (process.argv.includes('--access-boundary') && action !== '--reset') throw new DemoGuard('Use --reset --access-boundary to select the alternate scenario.');
  const lessonScenario = process.argv.includes('--lessons');
  const resumeScenario = process.argv.includes('--resume');
  if (resumeScenario && (action !== '--reset' || lessonScenario || process.argv.includes('--access-boundary'))) throw new DemoGuard('Use --reset --resume without other scenario flags.');
  if (lessonScenario && (action !== '--reset' || process.argv.includes('--access-boundary'))) throw new DemoGuard('Use --reset --lessons without --access-boundary.');
  if (process.env.NODE_ENV !== 'development') throw new DemoGuard('NODE_ENV must be development.');
  let target: URL;
  try { target = new URL(process.env.DATABASE_URL ?? ''); }
  catch { throw new DemoGuard('A valid local DATABASE_URL is required.'); }
  if (!['postgresql:', 'postgres:'].includes(target.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || target.port !== '5433' || target.pathname !== '/teacher_alma_dev') {
    throw new DemoGuard('This tool only supports local teacher_alma_dev on port 5433.');
  }
  const userId = process.env.DEV_AUTH_USER_ID;
  if (!isUuid(userId)) throw new DemoGuard('Configure DEV_AUTH_USER_ID locally with an existing development user.');
  const { prisma } = await import('../src/shared/prisma.js');
  try {
    if (!await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new DemoGuard('The configured development user does not exist.');
    const courses = demoCourses(process.argv.includes('--access-boundary'));
    const ids = courses.map(c => c.id);
    const content = lessonsDemoData();
    const blockIds = content.blocks.map(b => b.id!);
    const activityIds = content.activities.map(a => a.id!);
    if (action === '--check') {
      console.log(JSON.stringify({ connected: true, configuredUserExists: true,
        demoCounts: { blocks: await prisma.lessonBlock.count({ where: { id: { in: blockIds } } }),
          activities: await prisma.activity.count({ where: { id: { in: activityIds } } }),
          attempts: await prisma.activityAttempt.count({ where: { userId, activityId: { in: activityIds } } }),
          reviews: await prisma.reviewItem.count({ where: { userId, activityId: { in: activityIds } } }),
          courses: await prisma.course.count({ where: { id: { in: ids } } }),
          topics: await prisma.topic.count({ where: { courseId: { in: ids } } }),
          lessons: await prisma.lesson.count({ where: { topic: { courseId: { in: ids } } } }),
          courseProgress: await prisma.courseProgress.count({ where: { userId, courseId: { in: ids } } }),
          lessonProgress: await prisma.lessonProgress.count({ where: { userId, lesson: { topic: { courseId: { in: ids } } } } }) },
        courses: await prisma.course.findMany({ select: { id: true, title: true, slug: true, status: true }, orderBy: { position: 'asc' } }) }, null, 2));
      return;
    }
    await prisma.$transaction(async tx => {
      // Never remove or revoke an entitlement to manufacture a commercial lock.
      const grants = await tx.entitlement.count({ where: { userId, status: 'ACTIVE', startsAt: { lte: new Date() },
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          { OR: [{ scope: 'ALL_COURSES' }, { courseId: { in: ids } }] }] } });
      if (grants) throw new DemoGuard('Active entitlements affect this demo user. No data changed; use a development user without these grants.');
      // Exact legacy integration fixtures identified locally; preserve all rows/progress.
      await tx.course.updateMany({ where: { OR: [
        { id: '9a689826-6ab9-43b2-a552-eab4360b36c7', slug: 'dev-test-courses-v1-published', title: 'DEV TEST - PUBLISHED - Courses v1' },
        { id: '494001ac-52dc-40c4-9db9-311c531ee792', slug: 'dev-test-courses-v1-coming-soon', title: 'DEV TEST - COMING_SOON - Courses v1' },
      ] }, data: { status: 'DRAFT' } });
      for (const course of courses) {
        const existing = await tx.course.findFirst({ where: { OR: [{ id: course.id }, { slug: course.slug }] }, select: { id: true, slug: true } });
        if (existing && (existing.id !== course.id || existing.slug !== course.slug)) throw new DemoGuard('Demo identifier collision. No data changed.');
        const data = { title: course.title, slug: course.slug, level: course.level, description: course.description,
          status: course.status, position: course.position };
        await tx.course.upsert({ where: { id: course.id }, create: { id: course.id, ...data }, update: data });
        // Keep a manually configured coverUrl; null on creation selects the distinct bundled fallback.
        for (const topic of course.topics) {
          const existingTopic = await tx.topic.findUnique({ where: { id: topic.id }, select: { courseId: true } });
          if (existingTopic && existingTopic.courseId !== course.id) throw new DemoGuard('Demo topic identifier collision.');
          const topicData = { courseId: course.id, title: topic.title, position: topic.position };
          await tx.topic.upsert({ where: { id: topic.id }, create: { id: topic.id, ...topicData }, update: topicData });
          for (const lesson of topic.lessons) {
            const existingLesson = await tx.lesson.findUnique({ where: { id: lesson.id }, select: { topicId: true } });
            if (existingLesson && existingLesson.topicId !== topic.id) throw new DemoGuard('Demo lesson identifier collision.');
            const lessonData = { topicId: topic.id, title: lesson.title, position: lesson.position,
              ...(lesson.id === demoId(1003) ? { description: 'Aprende a presentarte y responder cuando conoces a alguien.' }
                : lesson.id === demoId(1004) ? { description: 'Practica cómo presentarte y nombrar objetos con el verbo to be.' } : {}),
              status: lesson.status, accessType: lesson.accessType, isRequired: lesson.isRequired };
            await tx.lesson.upsert({ where: { id: lesson.id }, create: { id: lesson.id, ...lessonData }, update: lessonData });
          }
        }
      }
      for (const activity of content.activities) {
        const existing = await tx.activity.findUnique({ where: { id: activity.id! } });
        if (existing && (existing.type !== activity.type || existing.prompt !== activity.prompt)) throw new DemoGuard('Demo activity identifier collision.');
        await tx.activity.upsert({ where: { id: activity.id! }, create: activity, update: activity });
      }
      // Descending positions let existing demo blocks move one slot right for the VIDEO preview.
      // Collision guards still reject any row outside the exact fixture identities.
      for (const block of [...content.blocks].sort((a, b) => b.position - a.position)) {
        const existing = await tx.lessonBlock.findFirst({ where: { OR: [{ id: block.id! }, { lessonId: block.lessonId, position: block.position }] } });
        if (existing && (existing.id !== block.id || existing.lessonId !== block.lessonId)) throw new DemoGuard('Demo block identifier collision.');
        await tx.lessonBlock.upsert({ where: { id: block.id! }, create: block, update: block });
      }
      const lessonIds = courses.flatMap(c => c.topics.flatMap(t => t.lessons.map(l => l.id)));
      if (action === '--reset') {
        // Only the named demo courses and configured user's learning state; never whole tables.
        await tx.activityAttempt.deleteMany({ where: { userId, activityId: { in: activityIds }, lessonId: { in: lessonIds } } });
        await tx.reviewItem.deleteMany({ where: { userId, activityId: { in: activityIds }, sourceLessonId: { in: lessonIds } } });
        await tx.lessonBlockProgress.deleteMany({ where: { userId, lessonBlockId: { in: blockIds } } });
        await tx.lessonProgress.deleteMany({ where: { userId, lessonId: { in: lessonIds } } });
        await tx.courseProgress.deleteMany({ where: { userId, courseId: { in: ids } } });
      }
      const a1 = courses[0]!;
      const initializeProgress = !await tx.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId: a1.id } } });
      await tx.courseProgress.createMany({ data: [{ userId, courseId: a1.id, status: 'IN_PROGRESS' }], skipDuplicates: true });
      for (const lesson of (initializeProgress ? a1.topics.flatMap(t => t.lessons).filter(l => l.lessonProgress.length).slice(0, lessonScenario || resumeScenario ? 2 : undefined) : [])) {
        await tx.lessonProgress.createMany({ data: [{ userId, lessonId: lesson.id, status: 'COMPLETED', completedAt: new Date() }], skipDuplicates: true });
      }
      if (resumeScenario) {
        // Deterministic Resume at the first activity, after the grouped Content/Example/Video step.
        await tx.lessonProgress.create({ data: { userId, lessonId: demoId(1003), status: 'IN_PROGRESS', currentBlockId: demoId(31003) } });
        await tx.lessonBlockProgress.createMany({ data: content.blocks.filter(b => b.lessonId === demoId(1003) && b.position < 4)
          .map(b => ({ userId, lessonBlockId: b.id!, status: 'COMPLETED', completedAt: new Date() })) });
      }
    }, { timeout: 30000 });
    console.log(JSON.stringify({ action, courses: courses.map(c => ({ id: c.id, title: c.title, topics: c.topics.length,
      lessons: c.topics.reduce((n, t) => n + t.lessons.length, 0) })), resetUserProgress: action === '--reset' }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => {
  // Never print driver errors, connection strings or environment values.
  console.error(error instanceof DemoGuard ? error.message : 'Demo operation failed. No credentials are logged; check local PostgreSQL/configuration.');
  process.exitCode = 1;
});
