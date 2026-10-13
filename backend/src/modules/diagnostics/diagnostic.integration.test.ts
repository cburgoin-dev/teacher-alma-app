import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../generated/prisma/client.js';
import { DiagnosticService } from './diagnostic.service.js';
import { DiagnosticSession, PrismaDiagnosticRepository } from './diagnostic.repository.js';
import { definition, correctAnswers } from './diagnostic.test-fixtures.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { HomeService } from '../home/home.service.js';
import { PrismaHomeRepository } from '../home/home.repository.js';
import { createApp } from '../../shared/app.js';

test('Diagnostic HTTP, PostgreSQL constraints, atomicity and concurrency', { skip: process.env.RUN_DIAGNOSTIC_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev', 'Requires local development database');
  // A private schema exercises every migration without touching existing demo/history.
  const schema = `diagnostic_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ connectionString: target.toString() }); await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  target.searchParams.set('options', `-c search_path=${schema}`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }, { schema }) });
  const repository = new PrismaDiagnosticRepository(prisma), service = new DiagnosticService(repository);
  const home = new HomeService(new PrismaHomeRepository(prisma));
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  const userId = randomUUID(), otherId = randomUUID(), a1 = randomUUID(), a2 = randomUUID(), alternate = randomUUID();
  const d = definition();
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await admin.query(`SET search_path TO "${schema}"`);
    const root = new URL('../../../prisma/migrations/', import.meta.url);
    for (const name of (await readdir(root)).filter(n => /^\d/.test(n)).sort()) {
      await admin.query(await readFile(new URL(`${name}/migration.sql`, root), 'utf8'));
    }
    await prisma.user.createMany({ data: [userId, otherId].map(id => ({ id, email: `${id}@test.invalid` })) });
    await prisma.course.createMany({ data: [
      { id: a1, title: 'A1', slug: randomUUID(), status: 'PUBLISHED', position: 1, level: 'A1' },
      { id: a2, title: 'A2 Premium', slug: randomUUID(), status: 'PUBLISHED', position: 2, level: 'A2' },
      { id: alternate, title: 'Alternate A2', slug: randomUUID(), status: 'DRAFT', position: 3, level: 'A2' },
    ] });
    const topic = await prisma.topic.create({ data: { courseId: a2, title: 'Premium topic', position: 1 } });
    const lesson = await prisma.lesson.create({ data: { topicId: topic.id, title: 'Premium', position: 1, status: 'PUBLISHED', accessType: 'PAID' } });
    async function publish(content: ReturnType<typeof definition>) {
      await prisma.diagnostic.create({ data: { id: content.id, title: content.title, version: content.version,
        estimatedMinutes: content.estimatedMinutes, scoringConfig: content.scoringConfig as Prisma.InputJsonObject } });
      for (const q of content.diagnosticQuestions) {
        await prisma.activity.create({ data: { ...q.activity, config: q.activity.config as Prisma.InputJsonObject } });
        const { activity: _activity, ...data } = q;
        await prisma.diagnosticQuestion.create({ data });
      }
      await prisma.diagnostic.update({ where: { id: content.id }, data: { status: 'PUBLISHED' } });
    }
    await t.test('unavailable without publication; no-result and Home NEW false', async () => {
      assert.deepEqual(await service.metadata(), { available: false, diagnostic: null });
      await assert.rejects(service.result(userId), { code: 'DIAGNOSTIC_RESULT_NOT_FOUND' });
      assert.equal((await home.read(userId)).hero.type, 'NEW');
      const h = (await home.read(userId)).hero; assert.ok(h.type === 'NEW' && !h.diagnosticAvailable);
      await assert.rejects(service.start(userId, randomUUID()), { code: 'DIAGNOSTIC_UNAVAILABLE' });
    });
    await publish(d);
    server = createApp(courses, (req, _res, next) => {
      if (req.headers['x-test-auth']) req.auth = { userId: req.headers['x-test-auth'] === 'other' ? otherId : userId }; next();
    }, undefined, undefined, undefined, undefined, home, undefined, service).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    async function http(path: string, body?: unknown, auth = 'yes') {
      const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', ...(auth ? { 'x-test-auth': auth } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    }
    const start = () => service.start(userId, randomUUID());
    const submit = (id: string, index: number, key: string = randomUUID(), answer: unknown = correctAnswers[index], content = d) =>
      service.submit(userId, id, content.diagnosticQuestions[index]!.id, key, answer);
    async function finish(id: string, content = d) {
      let response: unknown;
      for (let i = 0; i < content.diagnosticQuestions.length; i++) response = await submit(id, i, randomUUID(), correctAnswers[i], content);
      return response;
    }
    const boundaries = async () => ({
      review: await prisma.reviewItem.count(), activity: await prisma.activityAttempt.count(), days: await prisma.learningDay.count(),
      course: await prisma.courseProgress.count(), lesson: await prisma.lessonProgress.count(), challenge: await prisma.unitChallengeProgress.count(),
      events: await prisma.gamificationLearningEvent.count(), coins: await prisma.coinTransaction.count(),
      settings: await prisma.gamificationSettings.count(),
      streak: await prisma.userStreak.count(), inventory: await prisma.userInventory.count(),
      protection: await prisma.streakProtectionEvent.count(), repairs: await prisma.streakRepair.count(),
    });
    const before = await boundaries();
    await t.test('empty PUBLISHED A1 plus usable Premium A2 is unavailable until A1 has a published node', async () => {
      assert.equal((await service.metadata()).available, false);
      assert.equal((await http('/me/home')).body.hero.diagnosticAvailable, false);
      await assert.rejects(service.start(userId, randomUUID()), { code: 'DIAGNOSTIC_UNAVAILABLE' });
      await assert.rejects(courses.start(a1, userId), { code: 'COURSE_HAS_NO_CONTENT' });
      const a1Topic = await prisma.topic.create({ data: { courseId: a1, title: 'A1 topic', position: 1 } });
      const a1Lesson = await prisma.lesson.create({ data: { topicId: a1Topic.id, title: 'A1 lesson', position: 1, status: 'DRAFT' } });
      assert.equal((await service.metadata()).available, false);
      await prisma.lesson.update({ where: { id: a1Lesson.id }, data: { status: 'PUBLISHED' } });
      assert.equal((await service.metadata()).available, true);
      assert.equal((await http('/me/home')).body.hero.diagnosticAvailable, true);
      // Academic validity does not require commercial access to the PAID A2 node.
      await assert.rejects(courses.start(a2, userId), { code: 'COURSE_ACCESS_REQUIRED' });
    });
    await t.test('availability: Premium counts, missing/COMING_SOON/DRAFT destinations do not; Home shares truth', async () => {
      assert.equal((await http('/diagnostic')).body.available, true);
      assert.equal((await http('/me/home')).body.hero.diagnosticAvailable, true);
      for (const status of ['COMING_SOON', 'DRAFT']) {
        await prisma.course.update({ where: { id: a2 }, data: { status } });
        assert.equal((await service.metadata()).available, false);
        assert.equal((await http('/me/home')).body.hero.diagnosticAvailable, false);
      }
      await prisma.course.update({ where: { id: a2 }, data: { status: 'PUBLISHED' } });
    });
    await t.test('HTTP auth, UUID/key validation and unavailable endpoints', async () => {
      for (const path of ['/diagnostic', '/diagnostic/result']) assert.equal((await http(path, undefined, '')).status, 401);
      assert.equal((await http('/diagnostic/attempts', {}, '')).status, 401);
      assert.equal((await http('/diagnostic/attempts', { requestKey: 'bad' })).body.error.code, 'INVALID_DIAGNOSTIC_REQUEST_KEY');
      assert.equal((await http('/diagnostic/attempts/bad/abandon', {})).body.error.code, 'INVALID_ATTEMPT_ID');
      assert.equal((await fetch(base + '/diagnostic/attempts/' + randomUUID(), { headers: { 'x-test-auth': 'yes' } })).status, 404);
    });
    await t.test('start exact retry, stale replacement, ownership/order/answers and immutable receipt', async () => {
      const key = randomUUID(), first = await service.start(userId, key);
      assert.deepEqual(await service.start(userId, key), first);
      assert.equal((await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: first.attempt.id } })).diagnosticId, d.id);
      const id = first.attempt.id, q = d.diagnosticQuestions[0]!.id;
      await assert.rejects(service.submit(otherId, id, q, randomUUID(), correctAnswers[0]), { code: 'DIAGNOSTIC_ATTEMPT_NOT_FOUND' });
      await assert.rejects(service.submit(userId, id, randomUUID(), randomUUID(), {}), { code: 'DIAGNOSTIC_QUESTION_NOT_FOUND' });
      await assert.rejects(submit(id, 1), { code: 'DIAGNOSTIC_QUESTION_NOT_AVAILABLE' });
      assert.throws(() => submit(id, 0, 'bad'), { code: 'INVALID_DIAGNOSTIC_SUBMISSION_REQUEST_KEY' });
      for (const answer of [{ skip: true }, {}, { selectedOptionId: 'z' }]) await assert.rejects(submit(id, 0, randomUUID(), answer), { code: 'INVALID_ANSWER' });
      const submissionKey = randomUUID(), response = await submit(id, 0, submissionKey);
      assert.deepEqual(await submit(id, 0, submissionKey), response);
      assert.deepEqual(await service.start(userId, key), first);
      await assert.rejects(submit(id, 0, submissionKey, { selectedOptionId: 'b' }), { code: 'DIAGNOSTIC_SUBMISSION_CONFLICT' });
      await assert.rejects(submit(id, 1, submissionKey), { code: 'DIAGNOSTIC_SUBMISSION_CONFLICT' });
      await assert.rejects(submit(id, 0), { code: 'DIAGNOSTIC_QUESTION_ALREADY_SUBMITTED' });
      for (const privateField of ['isCorrect', 'correctOptionId', 'acceptedAnswers', 'explanation', 'weight', 'targetLevel', 'scoringConfig']) {
        assert.ok(!JSON.stringify([first, response]).includes(privateField));
      }
      const fresh = await start(); assert.notEqual(fresh.attempt.id, id);
      assert.equal((await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id } })).status, 'ABANDONED');
      await assert.rejects(submit(id, 1), { code: 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE' });
      await assert.rejects(service.start(userId, key), { code: 'DIAGNOSTIC_START_REQUEST_CONFLICT' });
      assert.deepEqual(await service.abandon(userId, id), await service.abandon(userId, id));
    });
    await t.test('all four types, final receipt, canonical matching, latest completed and retakes', async () => {
      const run = await start(), id = run.attempt.id;
      for (let i = 0; i < 3; i++) {
        const response = await http(`/diagnostic/attempts/${id}/questions/${d.diagnosticQuestions[i]!.id}/submit`, { requestKey: randomUUID(), answer: correctAnswers[i] });
        assert.equal(response.status, 200); assert.equal(response.body.question.position, i + 2);
      }
      const finalKey = randomUUID(), response = await submit(id, 3, finalKey);
      assert.deepEqual(await submit(id, 3, finalKey, { pairs: [...correctAnswers[3]!.pairs!].reverse() }), response);
      const saved = await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id } });
      assert.equal(saved.status, 'COMPLETED'); assert.equal(saved.internalScore?.toString(), '100'); assert.equal(saved.recommendedCourseId, a2);
      const result = (await service.result(userId)).result;
      assert.equal(result.recommendedCourse?.progress, null); assert.equal(result.recommendedCourse?.access.hasFullAccess, false);
      await assert.rejects(service.abandon(userId, id), { code: 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE' });
      const retake = await start(); assert.equal((await service.result(userId)).result.attemptId, id);
      assert.equal((await home.read(userId)).state, 'ASSESSED');
      await service.abandon(userId, retake.attempt.id); assert.equal((await service.result(userId)).result.attemptId, id);
      const next = await start(); await finish(next.attempt.id);
      assert.equal((await service.result(userId)).result.attemptId, next.attempt.id);
      assert.deepEqual(await boundaries(), before);
    });
    await t.test('current course progress/access and historical hidden course, deterministic resolution', async () => {
      await prisma.course.update({ where: { id: alternate }, data: { status: 'PUBLISHED' } });
      let result = (await service.result(userId)).result; assert.equal(result.recommendedCourse?.id, a2);
      await prisma.courseProgress.create({ data: { userId, courseId: a2, status: 'IN_PROGRESS' } });
      result = (await service.result(userId)).result; assert.equal(result.recommendedCourse?.progress?.status, 'IN_PROGRESS');
      const run = await start(); await finish(run.attempt.id); assert.equal((await home.read(userId)).state, 'ACTIVE');
      await prisma.lessonProgress.create({ data: { userId, lessonId: lesson.id, status: 'COMPLETED', completedAt: new Date() } });
      await prisma.courseProgress.updateMany({ where: { userId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      result = (await service.result(userId)).result; assert.equal(result.recommendedCourse?.progress?.status, 'COMPLETED');
      const retake = await start(); await finish(retake.attempt.id); assert.equal((await home.read(userId)).state, 'COURSE_COMPLETED');
      await assert.rejects(prisma.course.delete({ where: { id: a2 } }), /Foreign key/);
      await prisma.course.update({ where: { id: a2 }, data: { status: 'DRAFT' } });
      result = (await service.result(userId)).result; assert.equal(result.recommendedLevel, 'A2'); assert.equal(result.recommendedCourse, null);
      await prisma.course.update({ where: { id: a2 }, data: { status: 'PUBLISHED' } });
    });
    await t.test('row/index/check and published-content invariants', async () => {
      const run = await start();
      await assert.rejects(prisma.diagnosticAttempt.create({ data: { userId, diagnosticId: d.id, requestKey: randomUUID(), status: 'ACTIVE' } }), /Unique constraint/);
      await assert.rejects(prisma.diagnosticAttempt.update({ where: { id: run.attempt.id }, data: { status: 'COMPLETED' } }), /diagnostic_attempts_lifecycle/);
      await assert.rejects(prisma.diagnostic.create({ data: { title: 'Invalid', version: 90, status: 'PUBLISHED' } }), /Unique constraint/);
      await assert.rejects(prisma.diagnostic.update({ where: { id: d.id }, data: { scoringConfig: {} } }), /diagnostic_published_content_immutable/);
      await assert.rejects(prisma.diagnosticQuestion.update({ where: { id: d.diagnosticQuestions[0]!.id }, data: { weight: 2 } }), /diagnostic_published_content_immutable/);
      await assert.rejects(prisma.activity.update({ where: { id: d.diagnosticQuestions[0]!.activityId }, data: { config: {} } }), /diagnostic_published_activity_immutable/);
    });
    await t.test('concurrent same-question/final submissions and exact retry after commit', async () => {
      const run = await start(), id = run.attempt.id, key = randomUUID();
      const responses = await Promise.all([submit(id, 0, key), submit(id, 0, key)]); assert.deepEqual(responses[0], responses[1]);
      const different = await Promise.allSettled([submit(id, 1), submit(id, 1)]);
      assert.equal(different.filter(r => r.status === 'fulfilled').length, 1);
      await submit(id, 2);
      const finalKey = randomUUID(), results = await Promise.all([submit(id, 3, finalKey), submit(id, 3, finalKey)]);
      assert.deepEqual(results[0], results[1]); assert.deepEqual(await submit(id, 3, finalKey), results[0]);
      assert.equal(await prisma.diagnosticAnswer.count({ where: { diagnosticAttemptId: id } }), 4);
      const another = await start(); for (let i = 0; i < 3; i++) await submit(another.attempt.id, i);
      const finals = await Promise.allSettled([submit(another.attempt.id, 3), submit(another.attempt.id, 3)]);
      assert.equal(finals.filter(r => r.status === 'fulfilled').length, 1);
    });
    await t.test('concurrent starts serialize duplicate and genuinely new intentions', async () => {
      const key = randomUUID();
      const duplicate = await Promise.all([service.start(userId, key), service.start(userId, key)]);
      assert.deepEqual(duplicate[0], duplicate[1]);
      const fresh = await Promise.all([start(), start()]); assert.notEqual(fresh[0].attempt.id, fresh[1].attempt.id);
      assert.equal(await prisma.diagnosticAttempt.count({ where: { userId, status: 'ACTIVE' } }), 1);
    });
    await t.test('foreign attempt locks do not wait on the owner row lock', async () => {
      const run = await start();
      await admin.query('BEGIN');
      try {
        await admin.query('SELECT id FROM diagnostic_attempts WHERE id = $1 FOR UPDATE', [run.attempt.id]);
        const ownershipRepository = new DiagnosticService({ read: work => repository.read(work), write: (_user, work) => prisma.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL lock_timeout = '100ms'`;
          return work(new DiagnosticSession(tx));
        }) });
        await assert.rejects(ownershipRepository.submit(otherId, run.attempt.id, d.diagnosticQuestions[0]!.id, randomUUID(), correctAnswers[0]), { code: 'DIAGNOSTIC_ATTEMPT_NOT_FOUND' });
        await assert.rejects(ownershipRepository.abandon(otherId, run.attempt.id), { code: 'DIAGNOSTIC_ATTEMPT_NOT_FOUND' });
      } finally { await admin.query('ROLLBACK'); }
    });
    await t.test('new start versus delayed submit; submit versus abandon; no resurrection', async () => {
      for (let i = 0; i < 4; i++) {
        const old = await start();
        await Promise.allSettled([start(), submit(old.attempt.id, 0)]);
        assert.equal((await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: old.attempt.id } })).status, 'ABANDONED');
        await assert.rejects(submit(old.attempt.id, 1), { code: 'DIAGNOSTIC_ATTEMPT_NOT_ACTIVE' });
        const next = await start();
        await Promise.allSettled([service.abandon(userId, next.attempt.id), submit(next.attempt.id, 0)]);
        assert.equal((await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: next.attempt.id } })).status, 'ABANDONED');
      }
      const final = await start(); for (let i = 0; i < 3; i++) await submit(final.attempt.id, i);
      await Promise.allSettled([submit(final.attempt.id, 3), service.abandon(userId, final.attempt.id)]);
      const saved = await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: final.attempt.id }, include: { diagnosticAnswers: true } });
      assert.ok(['COMPLETED', 'ABANDONED'].includes(saved.status));
      assert.equal(saved.diagnosticAnswers.length, saved.status === 'COMPLETED' ? 4 : 3);
    });
    await t.test('injected receipt failure rolls back final completion and final answer together', async () => {
      const run = await start(); for (let i = 0; i < 3; i++) await submit(run.attempt.id, i);
      const failing = new DiagnosticService({ read: work => repository.read(work), write: (user, work) => repository.write(user, async session => {
        session.answer = () => { throw new Error('Injected storage failure'); }; return work(session);
      }) });
      await assert.rejects(failing.submit(userId, run.attempt.id, d.diagnosticQuestions[3]!.id, randomUUID(), correctAnswers[3]), /Injected storage failure/);
      const saved = await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: run.attempt.id }, include: { diagnosticAnswers: true } });
      assert.equal(saved.status, 'ACTIVE'); assert.equal(saved.internalScore, null); assert.equal(saved.diagnosticAnswers.length, 3);
      await submit(run.attempt.id, 3);
    });
    await t.test('completion skips empty earlier destinations and preserves level with null course if content is retired', async () => {
      await prisma.course.update({ where: { id: alternate }, data: { status: 'PUBLISHED', position: 0 } });
      const first = await start(); await finish(first.attempt.id);
      assert.equal((await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: first.attempt.id } })).recommendedCourseId, a2);
      const second = await start();
      await prisma.lesson.update({ where: { id: lesson.id }, data: { status: 'DRAFT' } });
      assert.equal((await service.metadata()).available, false);
      await finish(second.attempt.id);
      const saved = await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: second.attempt.id } });
      assert.equal(saved.status, 'COMPLETED'); assert.equal(saved.recommendedLevel, 'A2'); assert.equal(saved.recommendedCourseId, null);
      await prisma.lesson.update({ where: { id: lesson.id }, data: { status: 'PUBLISHED' } });
      await prisma.course.update({ where: { id: alternate }, data: { position: 3 } });
    });
    await t.test('archived in-flight version completes, new starts bind v2, missing destination preserves level', async () => {
      const old = await start();
      await prisma.diagnostic.update({ where: { id: d.id }, data: { status: 'ARCHIVED' } });
      const v2 = definition(); v2.version = 2; await publish(v2);
      await finish(old.attempt.id);
      const next = await start();
      assert.equal((await prisma.diagnosticAttempt.findUniqueOrThrow({ where: { id: next.attempt.id } })).diagnosticId, v2.id);
      await prisma.course.updateMany({ where: { id: { in: [a2, alternate] } }, data: { status: 'DRAFT' } });
      assert.equal((await service.metadata()).available, false);
      await finish(next.attempt.id, v2);
      const result = (await service.result(userId)).result; assert.equal(result.recommendedLevel, 'A2'); assert.equal(result.recommendedCourse, null);
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => { server!.close(e => e ? reject(e) : resolve()); server!.closeAllConnections(); });
    await prisma.$disconnect();
    await admin.query('SET search_path TO public');
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.end();
  }
});
