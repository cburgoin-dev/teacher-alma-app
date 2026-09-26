import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { PrismaReviewRepository, type ReviewSession } from './review.repository.js';
import { ReviewService } from './review.service.js';
import { ReviewBatchToken } from './review.token.js';
import { LessonService } from '../lessons/lesson.service.js';
import { PrismaLessonRepository } from '../lessons/lesson.repository.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { createApp } from '../../shared/app.js';

test('Review HTTP and PostgreSQL lifecycle, authorization, idempotency and atomicity', { skip: process.env.RUN_REVIEW_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../shared/prisma.js');
  const userId = randomUUID(), otherId = randomUUID(), courseId = randomUUID();
  const topics = [randomUUID(), randomUUID()], lessons = Array.from({ length: 4 }, () => randomUUID());
  const activities = Array.from({ length: 8 }, () => randomUUID());
  const repo = new PrismaReviewRepository(prisma), tokens = new ReviewBatchToken(randomBytes(32));
  let now = new Date('2026-09-26T12:00:00Z');
  const service = new ReviewService(repo, tokens, () => now);
  const lessonService = new LessonService(new PrismaLessonRepository(prisma));
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await prisma.user.createMany({ data: [userId, otherId].map(id => ({ id, email: id + '@review.invalid' })) });
    await prisma.course.create({ data: { id: courseId, slug: courseId, title: 'Review test', status: 'PUBLISHED', position: 9999 } });
    await prisma.topic.createMany({ data: topics.map((id, i) => ({ id, courseId, title: 'Topic ' + i, position: i + 1 })) });
    await prisma.lesson.createMany({ data: lessons.map((id, i) => ({ id, topicId: topics[i % 2]!, title: 'Lesson ' + i,
      position: i + 1, status: 'PUBLISHED', accessType: i === 3 ? 'PAID' : 'FREE', isRequired: false })) });
    await prisma.activity.createMany({ data: activities.map(id => ({ id, type: 'MULTIPLE_CHOICE', prompt: 'Choose',
      explanation: 'Private explanation', config: { hint: 'Private hint', instruction: 'Select one',
        context: { type: 'TEXT', text: 'Public context' },
        options: [{ id: 'a', text: 'Yes' }, { id: 'b', text: 'No' }], correctOptionId: 'a' } })) });
    await prisma.lessonBlock.createMany({ data: lessons.slice(0, 3).map(lessonId => ({
      lessonId, type: 'ACTIVITY', position: 1, activityId: activities[0]!,
    })) });
    server = createApp(courses, (req, _res, next) => {
      if (req.headers['x-test-auth'] !== 'none') req.auth = { userId: req.headers['x-test-auth'] === 'other' ? otherId : userId };
      next();
    }, lessonService, service).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
    const request = async (path: string, method = 'GET', body?: unknown, auth = 'user') => {
      const res = await fetch(url + path, { method, headers: { 'content-type': 'application/json', 'x-test-auth': auth },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: res.status, body: await res.json() };
    };
    const submit = (id: string, body: unknown, auth = 'user') => request('/review/items/' + id + '/attempt', 'POST', body, auth);
    const item = () => prisma.reviewItem.findUniqueOrThrow({ where: { userId_activityId: { userId, activityId: activities[0]! } } });
    const unaffected = () => Promise.all([
      prisma.lessonRun.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.lessonProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.lessonBlockProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.courseProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    ]);
    await t.test('EMPTY, auth and invalid identifiers', async () => {
      assert.deepEqual((await request('/review')).body, { state: 'EMPTY', pendingCount: 0, groups: [] });
      assert.deepEqual((await request('/review/batches', 'POST', {})).body, { batchToken: null, items: [], totalEligiblePending: 0 });
      for (const path of ['/review', '/review/batches', '/review/items/' + randomUUID() + '/attempt']) {
        assert.equal((await request(path, path === '/review' ? 'GET' : 'POST', undefined, 'none')).status, 401);
      }
      assert.equal((await request('/review/batches', 'POST', { preferredLessonId: 'bad' })).body.error.code, 'INVALID_LESSON_ID');
      assert.equal((await submit('bad', {})).body.error.code, 'INVALID_REVIEW_ITEM_ID');
      assert.equal((await submit(randomUUID(), {})).body.error.code, 'INVALID_REVIEW_REQUEST_KEY');
    });
    const finishWrong = async (lessonId: string) => {
      const run = await lessonService.start(lessonId, userId, randomUUID());
      const block = await prisma.lessonBlock.findFirstOrThrow({ where: { lessonId, type: 'ACTIVITY' } });
      await lessonService.attempt(lessonId, run.runId, block.id, userId, { selectedOptionId: 'b' });
      return run;
    };
    await t.test('Lessons creates, increments ACTIVE, reactivates same RESOLVED lifecycle and links attempts', async () => {
      await courses.start(courseId, userId);
      await finishWrong(lessons[0]!);
      const original = await item(); assert.equal(original.incorrectAttempts, 1);
      await finishWrong(lessons[1]!);
      assert.equal((await item()).incorrectAttempts, 2);
      await prisma.reviewItem.update({ where: { id: original.id }, data: { status: 'RESOLVED', resolvedAt: now } });
      const block = await prisma.lessonBlock.findFirstOrThrow({ where: { lessonId: lessons[2]! } });
      // A required tail keeps the incorrect submission ACTIVE until explicit completion.
      const tail = await prisma.lessonBlock.create({ data: { lessonId: lessons[2]!, type: 'TEXT', position: 2, content: { body: 'Finish' } } });
      const abandoned = await lessonService.start(lessons[2]!, userId, randomUUID());
      await lessonService.attempt(lessons[2]!, abandoned.runId, block.id, userId, { selectedOptionId: 'b' });
      await lessonService.abandon(lessons[2]!, abandoned.runId, userId);
      assert.equal((await item()).status, 'RESOLVED');
      const run = await finishWrong(lessons[2]!);
      assert.equal((await item()).status, 'RESOLVED');
      await lessonService.completeStep(lessons[2]!, run.runId, tail.id, userId);
      const current = await item();
      assert.equal(current.id, original.id); assert.equal(current.status, 'ACTIVE');
      assert.equal(current.resolvedAt, null); assert.equal(current.incorrectAttempts, 3);
      assert.equal(await prisma.reviewItem.count({ where: { userId } }), 1);
      assert.equal(await prisma.activityAttempt.count({ where: { userId, reviewItemId: current.id } }), 3);
      await assert.rejects(prisma.reviewItem.create({ data: { userId, activityId: activities[0]!, status: 'RESOLVED' } }), /Unique constraint/);
      const before = await item();
      await lessonService.replayCheck(lessons[2]!, block.id, userId, { selectedOptionId: 'b' });
      assert.deepEqual(await item(), before);
    });
    await t.test('READY groups, publication/access filtering, deterministic preferred queue, no writes', async () => {
      await prisma.reviewItem.createMany({ data: activities.slice(1).map((activityId, i) => ({
        userId, activityId, sourceLessonId: lessons[i === 6 ? 3 : i % 2]!, createdAt: new Date(1000 + i),
        lastReviewedAt: i < 2 ? new Date(5000 + i) : null,
      })) });
      const before = await prisma.reviewItem.findMany({ where: { userId } });
      const ready = await request('/review');
      assert.equal(ready.body.state, 'READY'); assert.equal(ready.body.pendingCount, 7);
      assert.equal(ready.body.groups.length, 2); assert.equal(ready.body.groups.reduce((n: number, g: { count: number }) => n + g.count, 0), 7);
      const batch = (await request('/review/batches', 'POST', {})).body;
      assert.equal(batch.items.length, 5); assert.equal(new Set(batch.items.map((i: { id: string }) => i.id)).size, 5);
      const expected = before.filter(i => i.sourceLessonId !== lessons[3]).sort((a, b) =>
        (a.lastReviewedAt?.getTime() ?? -Infinity) - (b.lastReviewedAt?.getTime() ?? -Infinity)
        || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
      assert.deepEqual(batch.items.map((i: { id: string }) => i.id), expected.slice(0, 5).map(i => i.id));
      const preferred = (await request('/review/batches', 'POST', { preferredLessonId: lessons[1] })).body;
      const prioritized = [...expected.filter(i => i.sourceLessonId === lessons[1]), ...expected.filter(i => i.sourceLessonId !== lessons[1])].slice(0, 5);
      assert.deepEqual(preferred.items.map((i: { id: string }) => i.id), prioritized.map(i => i.id));
      for (const secret of ['hint', 'correctOptionId', 'acceptedAnswers', 'explanation']) assert.ok(!JSON.stringify(batch.items).includes(secret));
      assert.equal(batch.items[0].activity.context.text, 'Public context');
      assert.deepEqual(await prisma.reviewItem.findMany({ where: { userId } }), before);
      await assert.rejects(repo.read(s => s.updateItem(before[0]!.id, { lastReviewedAt: now })), /read-only transaction/i);
      await prisma.lesson.update({ where: { id: lessons[1]! }, data: { status: 'DRAFT' } });
      assert.equal((await service.read(userId)).pendingCount, 4);
      await prisma.lesson.update({ where: { id: lessons[1]! }, data: { status: 'PUBLISHED' } });
    });
    await t.test('correct/incorrect attempts, durable retries, conflicts, concurrency, frozen entitlement and rollback', async () => {
      const grant = await prisma.entitlement.create({ data: { userId, scope: 'ALL_COURSES', status: 'ACTIVE',
        startsAt: new Date(0), expiresAt: new Date(now.getTime() + 1000) } });
      assert.equal((await service.read(userId)).pendingCount, 8);
      const batch = await service.batch(userId, lessons[3]);
      const paid = batch.items[0]!;
      const before = await unaffected(), count = await prisma.reviewItem.count({ where: { userId } });
      now = new Date(now.getTime() + 2000);
      assert.equal((await service.read(userId)).pendingCount, 7);
      const body = { batchToken: batch.batchToken, requestKey: randomUUID(), answer: { selectedOptionId: 'b' } };
      const initial = await prisma.reviewItem.findUniqueOrThrow({ where: { id: paid.id } });
      const results = await Promise.all(Array.from({ length: 4 }, () => submit(paid.id, body)));
      assert.ok(results.every(r => r.status === 200)); results.forEach(r => assert.deepEqual(r.body, results[0]!.body));
      const updated = await prisma.reviewItem.findUniqueOrThrow({ where: { id: paid.id } });
      assert.equal(updated.incorrectAttempts, initial.incorrectAttempts + 1);
      assert.equal(updated.status, 'ACTIVE'); assert.deepEqual(updated.lastReviewedAt, now);
      const saved = await prisma.activityAttempt.findMany({ where: { reviewItemId: paid.id, context: 'REVIEW' } });
      assert.equal(saved.length, 1); assert.equal(saved[0]!.runId, null); assert.equal(saved[0]!.lessonId, lessons[3]);
      assert.equal(saved[0]!.activityId, activities[7]); assert.deepEqual(saved[0]!.answerData, body.answer);
      assert.equal((await submit(paid.id, { ...body, answer: { selectedOptionId: 'a' } })).body.error.code, 'INVALID_REVIEW_REQUEST_KEY');
      assert.equal((await submit(batch.items[1]!.id, body)).body.error.code, 'INVALID_REVIEW_REQUEST_KEY');
      assert.equal((await submit(paid.id, { ...body, extra: true })).body.error.code, 'INVALID_REVIEW_REQUEST_KEY');
      const correct = { ...body, requestKey: randomUUID(), answer: { selectedOptionId: 'a' } };
      assert.equal((await submit(paid.id, correct)).body.error.code, 'REVIEW_BATCH_INVALID');
      assert.equal((await submit(paid.id, { ...body, requestKey: randomUUID() })).body.error.code, 'REVIEW_BATCH_INVALID');
      assert.deepEqual(await prisma.reviewItem.findUniqueOrThrow({ where: { id: paid.id } }), updated);
      assert.equal(await prisma.activityAttempt.count({ where: { reviewItemId: paid.id, context: 'REVIEW' } }), 1);
      assert.deepEqual((await submit(paid.id, body)).body, results[0]!.body);
      // A later batch rechecks access and permits another logical submission.
      await prisma.entitlement.update({ where: { id: grant.id }, data: { expiresAt: null } });
      const later = await service.batch(userId, lessons[3]);
      assert.equal(later.items[0]!.id, paid.id);
      const laterCorrect = { ...correct, batchToken: later.batchToken };
      const resolved = await submit(paid.id, laterCorrect);
      assert.equal(resolved.status, 200); assert.equal(resolved.body.attempt.attemptNumber, 2);
      assert.equal(resolved.body.reviewItem.status, 'RESOLVED');
      assert.deepEqual((await prisma.reviewItem.findUniqueOrThrow({ where: { id: paid.id } })).resolvedAt, now);
      assert.deepEqual((await submit(paid.id, laterCorrect)).body, resolved.body);
      assert.deepEqual((await submit(paid.id, body)).body, results[0]!.body, 'retry preserves original result after subsequent transitions');
      assert.equal((await submit(paid.id, { ...laterCorrect, requestKey: randomUUID() })).body.error.code, 'REVIEW_ITEM_NOT_ACTIVE');
      const next = batch.items[1]!;
      const double = await Promise.all([1, 2].map(() => submit(next.id, { ...correct, requestKey: randomUUID() })));
      assert.deepEqual(double.map(r => r.status).sort(), [200, 409]);
      const contested = batch.items[3]!;
      const beforeContested = await prisma.reviewItem.findUniqueOrThrow({ where: { id: contested.id } });
      const differentKeys = [1, 2].map(() => ({ ...body, requestKey: randomUUID() }));
      const wrongRace = await Promise.all(differentKeys.map(b => submit(contested.id, b)));
      assert.deepEqual(wrongRace.map(r => r.status).sort(), [200, 403]);
      assert.equal(wrongRace.find(r => r.status === 403)!.body.error.code, 'REVIEW_BATCH_INVALID');
      assert.equal(await prisma.activityAttempt.count({ where: { reviewItemId: contested.id, context: 'REVIEW' } }), 1);
      const afterContested = await prisma.reviewItem.findUniqueOrThrow({ where: { id: contested.id } });
      assert.equal(afterContested.status, 'ACTIVE');
      assert.equal(afterContested.incorrectAttempts, beforeContested.incorrectAttempts + 1);
      const winner = wrongRace.findIndex(r => r.status === 200);
      assert.deepEqual((await submit(contested.id, differentKeys[winner])).body, wrongRace[winner]!.body);
      // The database also rejects duplication independently of the service lock.
      const committed = await prisma.activityAttempt.findFirstOrThrow({ where: { reviewItemId: contested.id, context: 'REVIEW' } });
      await assert.rejects(prisma.activityAttempt.create({ data: { userId, activityId: committed.activityId,
        reviewItemId: contested.id, context: 'REVIEW', answerData: { selectedOptionId: 'b' }, isCorrect: false,
        attemptNumber: committed.attemptNumber + 1, reviewBatchId: committed.reviewBatchId,
        reviewRequestKey: randomUUID(), reviewRequestHash: 'test', reviewResult: {} } }), /Unique constraint/);
      const active = batch.items[2]!;
      assert.equal((await submit(active.id, { ...correct, requestKey: randomUUID(), answer: {} })).body.error.code, 'INVALID_ANSWER');
      for (const [id, token, auth] of [[active.id, 'bad', 'user'], [randomUUID(), batch.batchToken, 'user'], [active.id, batch.batchToken, 'other']] as const) {
        assert.equal((await submit(id, { ...correct, batchToken: token, requestKey: randomUUID() }, auth)).body.error.code, 'REVIEW_BATCH_INVALID');
      }
      const missingId = randomUUID();
      for (const id of [missingId, active.id]) {
        const owner = id === active.id ? otherId : userId;
        const token = tokens.issue(owner, [{ id, activityId: activities[0]!, sourceLessonId: lessons[0]! }], now);
        assert.equal((await submit(id, { ...correct, batchToken: token, requestKey: randomUUID() }, owner === otherId ? 'other' : 'user')).body.error.code, 'REVIEW_ITEM_NOT_FOUND');
      }
      const beforeFailure = await prisma.reviewItem.findUniqueOrThrow({ where: { id: active.id } });
      const failing = new ReviewService({ write: <T>(u: string, work: (s: ReviewSession) => Promise<T>) => repo.write(u, s => {
        s.createAttempt = async () => { throw new Error('Injected persistence failure'); }; return work(s);
      }) } as PrismaReviewRepository, tokens, () => now);
      await assert.rejects(failing.attempt(userId, active.id, { ...correct, requestKey: randomUUID() }), /Injected/);
      assert.deepEqual(await prisma.reviewItem.findUniqueOrThrow({ where: { id: active.id } }), beforeFailure);
      assert.deepEqual(await unaffected(), before); assert.equal(await prisma.reviewItem.count({ where: { userId } }), count);
      await prisma.entitlement.delete({ where: { id: grant.id } });
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => { server!.close(e => e ? reject(e) : resolve()); server!.closeAllConnections(); });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
    await prisma.lessonBlock.deleteMany({ where: { lessonId: { in: lessons } } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessons } } });
    await prisma.topic.deleteMany({ where: { id: { in: topics } } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.activity.deleteMany({ where: { id: { in: activities } } });
    await prisma.$disconnect();
  }
});
