import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { HomeService } from './home.service.js';
import { PrismaHomeRepository } from './home.repository.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { createApp } from '../../shared/app.js';

test('Home PostgreSQL: real read model, authenticated HTTP, no side effects', { skip: process.env.RUN_HOME_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../shared/prisma.js');
  const userId = randomUUID(), otherId = randomUUID(), diagnosticId = randomUUID(), activityId = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const [a, b, soon, later] = ids as [string, string, string, string];
  const topicA = randomUUID(), topicB = randomUUID(), lessonA = randomUUID(), lessonB = randomUUID(), challengeId = randomUUID();
  const service = new HomeService(new PrismaHomeRepository(prisma));
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  const date = (day: number) => new Date(Date.UTC(2026, 0, day));
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  // Capture complete rows (including timestamps) across every user-owned table, not just counts.
  const snapshot = async () => {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id' ORDER BY table_name`;
    const result: unknown[] = [await prisma.user.findUnique({ where: { id: userId } })];
    for (const { table_name } of tables) {
      assert.match(table_name, /^[a-z_]+$/);
      result.push(await prisma.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM "${table_name}" t WHERE user_id = $1::uuid ORDER BY to_jsonb(t)::text`, userId));
    }
    return result;
  };
  const checkedRead = async () => {
    const before = await snapshot(); const result = await service.read(userId);
    assert.deepEqual(await snapshot(), before); return result;
  };
  try {
    await prisma.user.createMany({ data: [userId, otherId].map(id => ({ id, email: id + '@home-test.invalid', displayName: 'Home learner' })) });
    const max = await prisma.course.aggregate({ _max: { position: true } }); const position = (max._max.position ?? 0) + 10;
    for (const [i, id] of ids.entries()) await prisma.course.create({ data: { id, slug: 'home-' + id, title: 'Home course ' + i,
      level: 'A1', description: id === b ? 'Editorial Home description' : null, status: id === soon ? 'COMING_SOON' : 'PUBLISHED', position: position + i } });
    for (const [id, courseId, lessonId] of [[topicA, a, lessonA], [topicB, b, lessonB]] as const) {
      await prisma.topic.create({ data: { id, courseId, title: 'Home topic', position: 1 } });
      await prisma.lesson.create({ data: { id: lessonId, topicId: id, title: 'Home lesson', position: 1, status: 'PUBLISHED', accessType: 'PAID' } });
    }
    await prisma.unitChallenge.create({ data: { id: challengeId, topicId: topicB, title: 'Home challenge', status: 'PUBLISHED', accessType: 'PAID' } });
    await prisma.diagnostic.create({ data: { id: diagnosticId, title: 'Home diagnostic', version: 1000000000 + Math.floor(Math.random() * 100000000) } });
    await prisma.activity.create({ data: { id: activityId, type: 'MULTIPLE_CHOICE', prompt: 'Test', status: 'ACTIVE' } });
    await t.test('NEW and learner isolation', async () => {
      await prisma.courseProgress.create({ data: { userId: otherId, courseId: a, status: 'IN_PROGRESS' } });
      const r = await checkedRead(); assert.equal(r.state, 'NEW'); assert.equal(r.learner.displayName, 'Home learner');
      assert.deepEqual(r.review, { pendingCount: 0 });
    });
    await t.test('latest completed Diagnostic; ignore newer incomplete; nullable recommendation', async () => {
      await prisma.diagnosticAttempt.create({ data: { userId, diagnosticId, status: 'COMPLETED', completedAt: date(1), recommendedCourseId: a } });
      const latest = await prisma.diagnosticAttempt.create({ data: { userId, diagnosticId, status: 'COMPLETED', completedAt: date(2), recommendedCourseId: b, recommendedLevel: 'A2' } });
      await prisma.diagnosticAttempt.create({ data: { userId, diagnosticId, status: 'IN_PROGRESS', startedAt: date(3) } });
      let r = await checkedRead(); assert.ok(r.hero.type === 'ASSESSED'); assert.equal(r.hero.diagnostic.attemptId, latest.id);
      assert.equal(r.hero.recommendedCourse?.id, b); assert.equal(r.featuredCourses[0]?.id, b);
      assert.equal(r.hero.recommendedCourse?.description, 'Editorial Home description');
      assert.equal(r.featuredCourses[0]?.description, 'Editorial Home description');
      await prisma.diagnosticAttempt.update({ where: { id: latest.id }, data: { recommendedCourseId: null, recommendedLevel: null } });
      r = await checkedRead(); assert.ok(r.hero.type === 'ASSESSED'); assert.equal(r.hero.recommendedCourse, null);
    });
    await t.test('start fallback, Lesson completion versus Unit Challenge completion versus later Lesson run', async () => {
      await prisma.courseProgress.createMany({ data: [{ userId, courseId: a, status: 'IN_PROGRESS', startedAt: date(2) }, { userId, courseId: b, status: 'IN_PROGRESS', startedAt: date(1) }] });
      let r = await checkedRead(); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.course?.id, a);
      assert.deepEqual(r.hero.currentNode?.access, { hasAccess: false, lockReason: 'ACCESS' });
      await prisma.lessonProgress.create({ data: { userId, lessonId: lessonB, status: 'COMPLETED', completedAt: date(3) } });
      r = await checkedRead(); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.course?.id, b); assert.equal(r.hero.currentNode?.id, challengeId);
      assert.deepEqual((await courses.roadmap(b, userId)).currentNode, { type: r.hero.currentNode!.type, id: r.hero.currentNode!.id });
      await prisma.lessonProgress.create({ data: { userId, lessonId: lessonA, status: 'COMPLETED', completedAt: date(4) } });
      r = await checkedRead(); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.course?.id, a);
      const run = await prisma.unitChallengeRun.create({ data: { userId, unitChallengeId: challengeId, requestKey: randomUUID(), status: 'COMPLETED', totalItems: 1, correctItems: 1, passed: true, completedAt: date(5) } });
      await prisma.unitChallengeProgress.create({ data: { userId, unitChallengeId: challengeId, passedRunId: run.id, completedAt: date(5) } });
      r = await checkedRead(); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.course?.id, b);
      await prisma.lessonRun.create({ data: { userId, lessonId: lessonA, requestKey: randomUUID(), status: 'COMPLETED', completedAt: date(6), correctAnswers: 0, totalActivities: 0 } });
      r = await checkedRead(); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.course?.id, a);
    });
    await t.test('hidden active winner falls back to visible; hidden-only retains ACTIVE without content', async () => {
      await prisma.course.update({ where: { id: a }, data: { status: 'DRAFT' } });
      let r = await checkedRead(); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.course?.id, b);
      await prisma.course.update({ where: { id: b }, data: { status: 'DRAFT' } });
      r = await checkedRead(); assert.equal(r.state, 'ACTIVE');
      assert.deepEqual(r.hero, { type: 'ACTIVE', course: null, topic: null, currentNode: null });
      await prisma.course.updateMany({ where: { id: { in: [a, b] } }, data: { status: 'PUBLISHED' } });
    });
    await t.test('latest completed, next coming-soon, no next and Review eligibility', async () => {
      await prisma.courseProgress.updateMany({ where: { userId }, data: { status: 'COMPLETED', completedAt: date(7) } });
      await prisma.courseProgress.update({ where: { userId_courseId: { userId, courseId: b } }, data: { completedAt: date(8) } });
      let r = await checkedRead(); assert.ok(r.hero.type === 'COURSE_COMPLETED'); assert.equal(r.hero.completedCourse?.id, b);
      assert.equal(r.hero.recommendedCourse?.id, soon); assert.equal(r.hero.recommendedCourse?.status, 'COMING_SOON');
      await prisma.reviewItem.create({ data: { userId, activityId, sourceLessonId: lessonA } });
      assert.equal((await checkedRead()).review.pendingCount, 0);
      await prisma.entitlement.create({ data: { userId, scope: 'COURSE', courseId: a, status: 'ACTIVE', startsAt: date(1) } });
      assert.equal((await checkedRead()).review.pendingCount, 1);
      await prisma.courseProgress.create({ data: { userId, courseId: later, status: 'COMPLETED', completedAt: date(9) } });
      r = await checkedRead(); assert.ok(r.hero.type === 'COURSE_COMPLETED'); assert.equal(r.hero.recommendedCourse, null);
    });
    await t.test('hidden completed winner uses latest visible and its next course; hidden-only has no recommendation', async () => {
      await prisma.course.update({ where: { id: later }, data: { status: 'DRAFT' } });
      let r = await checkedRead(); assert.ok(r.hero.type === 'COURSE_COMPLETED');
      assert.equal(r.hero.completedCourse?.id, b); assert.equal(r.hero.recommendedCourse?.id, soon);
      assert.equal(r.hero.recommendedCourse?.status, 'COMING_SOON'); assert.equal(r.featuredCourses[0]?.id, soon);
      await prisma.course.updateMany({ where: { id: { in: [a, b] } }, data: { status: 'DRAFT' } });
      r = await checkedRead(); assert.equal(r.state, 'COURSE_COMPLETED');
      assert.deepEqual(r.hero, { type: 'COURSE_COMPLETED', completedCourse: null, recommendedCourse: null });
      await prisma.course.updateMany({ where: { id: { in: [a, b, later] } }, data: { status: 'PUBLISHED' } });
    });
    await t.test('HTTP auth and compact response; repeated GETs leave all rows unchanged', async () => {
      server = createApp(courses, (req, _res, next) => { if (req.headers['x-test-auth'] === 'yes') req.auth = { userId }; next(); },
        undefined, undefined, undefined, undefined, service).listen(0, '127.0.0.1');
      await new Promise<void>(resolve => server!.once('listening', resolve));
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me/home`;
      assert.equal((await fetch(url)).status, 401);
      const before = await snapshot();
      for (let i = 0; i < 2; i++) {
        const response = await fetch(url, { headers: { 'x-test-auth': 'yes' } }); assert.equal(response.status, 200);
        const body = await response.json(); assert.deepEqual(Object.keys(body).sort(), ['featuredCourses', 'hero', 'learner', 'review', 'state']);
        assert.ok(body.featuredCourses.length <= 2); assert.equal(new Set(body.featuredCourses.map((c: { id: string }) => c.id)).size, body.featuredCourses.length);
      }
      assert.deepEqual(await snapshot(), before);
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => { server!.close(e => e ? reject(e) : resolve()); server!.closeAllConnections(); });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
    await prisma.activity.deleteMany({ where: { id: activityId } });
    await prisma.diagnostic.deleteMany({ where: { id: diagnosticId } });
    await prisma.unitChallenge.deleteMany({ where: { id: challengeId } });
    await prisma.lesson.deleteMany({ where: { id: { in: [lessonA, lessonB] } } });
    await prisma.topic.deleteMany({ where: { id: { in: [topicA, topicB] } } });
    await prisma.course.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
