import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { ProgressService } from './progress.service.js';
import { PrismaProgressRepository } from './progress.repository.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { ReviewService } from '../review/review.service.js';
import { PrismaReviewRepository } from '../review/review.repository.js';
import { ReviewBatchToken } from '../review/review.token.js';
import { createApp } from '../../shared/app.js';
import { dateValue } from '../gamification/gamification.rules.js';

test('Progress PostgreSQL: persisted selection, DATE history and read-only authenticated GETs', { skip: process.env.RUN_PROGRESS_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../shared/prisma.js');
  const userId = randomUUID(), otherId = randomUUID(), shopId = randomUUID();
  const ids = Array.from({ length: 3 }, () => randomUUID());
  const [a, b, hidden] = ids as [string, string, string];
  const topics = ids.map(() => randomUUID()), lessons = ids.map(() => randomUUID()), activities = Array.from({ length: 4 }, () => randomUUID());
  const challengeId = randomUUID();
  let now = new Date('2026-10-10T18:00:00Z');
  const service = new ProgressService(new PrismaProgressRepository(prisma), () => now);
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  const review = new ReviewService(new PrismaReviewRepository(prisma), new ReviewBatchToken(randomBytes(32)), () => now);
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  const snapshot = async () => {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'user_id' ORDER BY table_name`;
    const result: unknown[] = [await prisma.user.findUnique({ where: { id: userId } })];
    for (const { table_name } of tables) {
      assert.match(table_name, /^[a-z_]+$/);
      result.push(await prisma.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM "${table_name}" t WHERE user_id = $1::uuid ORDER BY to_jsonb(t)::text`, userId));
    }
    return result;
  };
  const read = async () => { const before = await snapshot(); const r = await service.read(userId); assert.deepEqual(await snapshot(), before); return r; };
  try {
    await prisma.user.createMany({ data: [userId, otherId].map(id => ({ id, email: id + '@progress.invalid', timezone: 'America/Mazatlan' })) });
    const max = await prisma.course.aggregate({ _max: { position: true } });
    for (const [i, id] of ids.entries()) {
      await prisma.course.create({ data: { id, slug: id, title: 'Progress ' + i, status: id === hidden ? 'DRAFT' : 'PUBLISHED', position: (max._max.position ?? 0) + 20 + i } });
      await prisma.topic.create({ data: { id: topics[i]!, courseId: id, title: 'Topic ' + i, position: 1 } });
      await prisma.lesson.create({ data: { id: lessons[i]!, topicId: topics[i]!, title: 'Lesson', position: 1, status: 'PUBLISHED', accessType: 'FREE' } });
    }
    await prisma.unitChallenge.create({ data: { id: challengeId, topicId: topics[1]!, title: 'Challenge', status: 'PUBLISHED', accessType: 'FREE' } });
    await t.test('no context, start fallback, durable Lesson/UC/replay recency and hidden preference', async () => {
      await prisma.courseProgress.create({ data: { userId: otherId, courseId: a, status: 'IN_PROGRESS' } });
      assert.equal((await read()).course, null);
      await prisma.courseProgress.create({ data: { userId, courseId: b, status: 'IN_PROGRESS', startedAt: dateValue('2026-09-01') } });
      assert.equal((await read()).course?.id, b);
      await prisma.courseProgress.createMany({ data: [a, hidden].map(courseId => ({ userId, courseId, status: 'IN_PROGRESS', startedAt: dateValue('2026-09-02') })) });
      assert.equal((await read()).course?.id, a);
      await prisma.lessonProgress.create({ data: { userId, lessonId: lessons[1]!, status: 'COMPLETED', completedAt: dateValue('2026-09-03') } });
      let r = await read(); assert.equal(r.course?.id, b); assert.equal(r.course?.progress.percentage, 50);
      const detail = await courses.detail(b, userId);
      for (const key of ['completedRequiredNodes', 'totalRequiredNodes', 'percentage', 'status'] as const) assert.equal(r.course!.progress[key], detail.progress![key]);
      await prisma.lessonProgress.create({ data: { userId, lessonId: lessons[0]!, status: 'COMPLETED', completedAt: dateValue('2026-09-04') } });
      assert.equal((await read()).course?.id, a);
      const run = await prisma.unitChallengeRun.create({ data: { userId, unitChallengeId: challengeId, requestKey: randomUUID(), status: 'COMPLETED', totalItems: 1, correctItems: 1, passed: true, completedAt: dateValue('2026-09-05') } });
      await prisma.unitChallengeProgress.create({ data: { userId, unitChallengeId: challengeId, passedRunId: run.id, completedAt: dateValue('2026-09-05') } });
      assert.equal((await read()).course?.id, b);
      await prisma.lessonRun.create({ data: { userId, lessonId: lessons[0]!, requestKey: randomUUID(), status: 'COMPLETED', correctAnswers: 0, totalActivities: 0, completedAt: dateValue('2026-09-06') } });
      assert.equal((await read()).course?.id, a);
      await prisma.lessonProgress.create({ data: { userId, lessonId: lessons[2]!, status: 'COMPLETED', completedAt: dateValue('2026-09-10') } });
      assert.equal((await read()).course?.id, a);
      await prisma.courseProgress.updateMany({ where: { userId, courseId: { in: [a, b] } }, data: { status: 'COMPLETED', completedAt: dateValue('2026-09-07') } });
      await prisma.courseProgress.update({ where: { userId_courseId: { userId, courseId: b } }, data: { completedAt: dateValue('2026-09-08') } });
      assert.equal((await read()).course?.id, b);
      await prisma.courseProgress.updateMany({ where: { userId }, data: { completedAt: null } });
      assert.equal((await read()).course?.id, a); assert.equal((await read()).course?.completedAt, null);
    });
    await t.test('Review count/order agrees with authoritative Review and filters hidden/paid sources', async () => {
      await prisma.activity.createMany({ data: activities.map(id => ({ id, type: 'MULTIPLE_CHOICE', prompt: 'Test', status: 'ACTIVE' })) });
      await prisma.reviewItem.createMany({ data: activities.map((activityId, i) => ({ userId, activityId, sourceLessonId: lessons[i % 3]!, createdAt: new Date(i * 1000) })) });
      const expected = await review.read(userId), actual = (await read()).review;
      assert.equal(actual.pendingCount, 3);
      assert.deepEqual(actual, { pendingCount: expected.pendingCount, groups: expected.groups.slice(0, 2).map(g => ({ topic: g.topic, pendingCount: g.count })) });
      await prisma.lesson.update({ where: { id: lessons[0]! }, data: { accessType: 'PAID' } });
      assert.equal((await read()).review.pendingCount, 1);
    });
    await t.test('bounded DATE facts, precedence, duplicate repair rows, local month and timezone changes', async () => {
      await prisma.shopItem.create({ data: { id: shopId, code: 'PROGRESS_TEST_' + shopId, name: 'Test protector', itemType: 'STREAK_PROTECTOR', coinCost: 50 } });
      await prisma.learningDay.createMany({ data: ['2026-09-30', '2026-10-05'].map(date => ({ userId, activityDate: dateValue(date) })) });
      await prisma.learningDay.create({ data: { userId: otherId, activityDate: dateValue('2026-10-09') } });
      await prisma.streakProtectionEvent.createMany({ data: [5, 6, 7].map(n => ({ userId, shopItemId: shopId, protectedDate: dateValue(`2026-10-0${n}`) })) });
      const repairCoins = [randomUUID(), randomUUID()];
      await prisma.coinTransaction.createMany({ data: repairCoins.map(id => ({ id, userId, amount: -120, type: 'DEBIT', reason: 'STREAK_REPAIR', idempotencyKey: id })) });
      await prisma.streakRepair.createMany({ data: [5, 6, 7, 8].map(n => ({ userId, brokenDate: dateValue(`2026-10-0${n}`), status: n < 7 ? 'USED' : 'INVALIDATED',
        previousStreakDays: 2, coinTransactionId: n < 7 ? repairCoins[n - 5]! : null, eligibleUntil: dateValue('2026-10-10'), repairedAt: n < 7 ? dateValue('2026-10-09') : null })) });
      await prisma.streakRepair.create({ data: { userId, brokenDate: dateValue('2026-10-06'), status: 'ELIGIBLE', previousStreakDays: 2, eligibleUntil: dateValue('2026-10-10') } });
      const days = [
        { date: '2026-10-05', state: 'LEARNED' }, { date: '2026-10-06', state: 'REPAIRED' },
        { date: '2026-10-07', state: 'PROTECTED' }, { date: '2026-10-08', state: 'BROKEN' },
      ];
      const month = await service.calendar(userId, '2026-10'); assert.deepEqual(month.days, days); assert.equal(month.learningDaysCount, 1);
      const week = (await read()).consistency;
      assert.deepEqual(week.days.slice(0, 4), days); assert.equal(week.days.length, 7); assert.equal(week.learningDaysThisWeek, 1);
      assert.deepEqual((await service.calendar(userId, '2020-02')).days, []);
      now = new Date('2026-11-01T01:00:00Z');
      await assert.rejects(service.calendar(userId, '2026-11'), { code: 'PROGRESS_MONTH_IN_FUTURE' });
      await prisma.user.update({ where: { id: userId }, data: { timezone: 'Asia/Tokyo' } });
      const changed = await service.calendar(userId, '2026-10'); assert.equal(changed.today, '2026-11-01'); assert.deepEqual(changed.days, days);
      await service.calendar(userId, '2026-11');
    });
    await t.test('Both GETs preserve every user-owned row, including stale streak and spendable inventory', async () => {
      await prisma.userStreak.create({ data: { userId, currentDays: 2, longestDays: 2, lastLearningDate: dateValue('2026-10-05'), continuityThrough: dateValue('2026-10-05'), lastEvaluatedDate: dateValue('2026-10-05') } });
      await prisma.userInventory.create({ data: { userId, shopItemId: shopId, quantity: 2 } });
      await prisma.gamificationSettings.create({ data: { userId } });
      await prisma.coinTransaction.create({ data: { userId, amount: 200, type: 'CREDIT', reason: 'TEST', idempotencyKey: randomUUID() } });
      await prisma.gamificationLearningEvent.create({ data: { userId, eventType: 'LESSON_COMPLETION', sourceType: 'LESSON_RUN', sourceId: randomUUID(), learningDate: dateValue('2026-10-05'), occurredAt: dateValue('2026-10-05') } });
      server = createApp(courses, (req, _res, next) => { if (req.headers['x-test-auth'] === 'yes') req.auth = { userId }; next(); },
        undefined, undefined, undefined, undefined, undefined, service).listen(0, '127.0.0.1');
      await new Promise<void>(resolve => server!.once('listening', resolve));
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me/progress`;
      const before = await snapshot();
      for (let i = 0; i < 2; i++) for (const path of ['', '/calendar?month=2026-10']) {
        assert.equal((await fetch(url + path)).status, 401);
        const response = await fetch(url + path, { headers: { 'x-test-auth': 'yes' } }); assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(Object.keys(body).sort(), path ? ['days', 'learningDaysCount', 'month', 'timezone', 'today'] : ['consistency', 'course', 'review']);
      }
      assert.deepEqual(await snapshot(), before);
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => { server!.close(e => e ? reject(e) : resolve()); server!.closeAllConnections(); });
    await prisma.streakRepair.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
    await prisma.activity.deleteMany({ where: { id: { in: activities } } });
    await prisma.unitChallenge.deleteMany({ where: { id: challengeId } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessons } } });
    await prisma.topic.deleteMany({ where: { id: { in: topics } } });
    await prisma.course.deleteMany({ where: { id: { in: ids } } });
    await prisma.shopItem.deleteMany({ where: { id: shopId } });
    await prisma.$disconnect();
  }
});
