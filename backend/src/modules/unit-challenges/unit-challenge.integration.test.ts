import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { UnitChallengeService } from './unit-challenge.service.js';
import { PrismaUnitChallengeRepository, type UnitChallengeSession } from './unit-challenge.repository.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { LessonService } from '../lessons/lesson.service.js';
import { PrismaLessonRepository } from '../lessons/lesson.repository.js';
import { createApp } from '../../shared/app.js';

test('Unit Challenge HTTP + PostgreSQL lifecycle and progression', { skip: process.env.RUN_UNIT_CHALLENGE_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev', 'Requires the local development database');
  const { prisma } = await import('../../shared/prisma.js');
  const userId = randomUUID(), otherId = randomUUID(), courseId = randomUUID();
  const topics = [randomUUID(), randomUUID()], lessons = [randomUUID(), randomUUID()];
  const optional = randomUUID(), blocks = [randomUUID(), randomUUID()], challenges = [randomUUID(), randomUUID()];
  const [challengeId, lastChallengeId] = challenges as [string, string];
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  const lessonService = new LessonService(new PrismaLessonRepository(prisma));
  const repository = new PrismaUnitChallengeRepository(prisma), service = new UnitChallengeService(repository);
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  const scene = { title: 'Meet Emma', participants: [{ id: 'emma', name: 'Emma' }],
    steps: [{ id: 'm', kind: 'MESSAGE', speakerId: 'emma', text: 'Hello' },
      { id: 'q', kind: 'CHOICE', options: [{ id: 'a', text: 'Hi' }, { id: 'b', text: 'Bye' }], correctOptionId: 'a' }] };
  const puzzle = { width: 5, height: 1, entries: [
    { id: 'e', clue: 'A greeting', answer: 'HELLO', direction: 'ACROSS', row: 0, column: 0 }] };
  let runId = '', phaseId = '', phase2Id = '', startKey = '', firstKey = '', finalKey = '';
  let firstResponse: unknown, finalResponse: unknown, progressBefore: unknown;
  try {
    await prisma.user.createMany({ data: [userId, otherId].map(id => ({ id, email: id + '@challenge-test.invalid' })) });
    await prisma.course.create({ data: { id: courseId, title: 'Challenge test', slug: 'challenge-' + courseId, status: 'PUBLISHED', position: 9999 } });
    for (let i = 0; i < 2; i++) {
      await prisma.topic.create({ data: { id: topics[i]!, courseId, title: 'Topic ' + i, position: i + 1 } });
      await prisma.lesson.create({ data: { id: lessons[i]!, topicId: topics[i]!, title: 'Lesson', position: 1, status: 'PUBLISHED' } });
      await prisma.lessonBlock.create({ data: { id: blocks[i]!, lessonId: lessons[i]!, type: 'TEXT', position: 1, content: { body: 'Hi' } } });
      await prisma.unitChallenge.create({ data: { id: challenges[i]!, topicId: topics[i]!, title: 'Challenge',
        status: 'PUBLISHED', passingScore: i === 0 ? 70 : null, accessType: i === 0 ? 'PAID' : 'FREE',
        phases: { create: [{ type: 'CONVERSATION', position: 1, config: scene }, { type: 'CROSSWORD', position: 2, config: puzzle }] } } });
    }
    await prisma.lesson.create({ data: { id: optional, topicId: topics[0]!, title: 'Optional', position: 2, status: 'PUBLISHED', isRequired: false } });
    server = createApp(courses, (req, _res, next) => {
      if (req.headers['x-test-user'] !== 'none') req.auth = { userId: req.headers['x-test-user'] === 'other' ? otherId : userId };
      next();
    }, lessonService, undefined, service).listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); });
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
    const root = '/unit-challenges/' + challengeId;
    const request = async (path: string, method = 'GET', body?: unknown, user = 'self') => {
      const result = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-test-user': user },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: result.status, body: await result.json() };
    };
    const start = (key: string = randomUUID()) => request(root + '/runs', 'POST', { requestKey: key });
    const submit = (phase: string, answer: unknown, key: string = randomUUID()) =>
      request(root + '/runs/' + runId + '/phases/' + phase + '/submit', 'POST', { requestKey: key, answer });
    const finishLesson = async (i: number) => {
      const started = await lessonService.start(lessons[i]!, userId, randomUUID());
      return lessonService.completeStep(lessons[i]!, started.runId, blocks[i]!, userId);
    };
    const sideEffects = () => Promise.all([
      prisma.activityAttempt.count({ where: { userId } }), prisma.reviewItem.count({ where: { userId } }),
    ]);
    await t.test('auth, ids, visibility, read-only metadata, course and prerequisite gates', async () => {
      assert.equal((await request(root, 'GET', undefined, 'none')).status, 401);
      assert.equal((await request('/unit-challenges/invalid')).body.error.code, 'INVALID_UNIT_CHALLENGE_ID');
      assert.equal((await request('/unit-challenges/' + randomUUID())).status, 404);
      const meta = await request(root); assert.equal(meta.status, 200);
      assert.equal(meta.body.progress.passed, false); assert.equal(meta.body.progression.lockReason, 'PREREQUISITE');
      assert.equal((await start('bad')).body.error.code, 'INVALID_RUN_REQUEST_KEY');
      assert.equal((await start()).body.error.code, 'COURSE_NOT_STARTED');
      await courses.start(courseId, userId);
      assert.equal((await start()).body.error.code, 'UNIT_CHALLENGE_PREREQUISITE_REQUIRED');
      assert.equal(await prisma.unitChallengeRun.count({ where: { userId } }), 0);
      assert.deepEqual((await courses.roadmap(courseId, userId)).currentNode, { type: 'LESSON', id: lessons[0] });
    });
    await t.test('required Lessons unlock challenge; optional does not block; next Topic remains locked', async () => {
      const completed = await finishLesson(0);
      assert.equal(completed.completion?.nextNode?.type, 'UNIT_CHALLENGE');
      assert.equal(completed.completion?.courseProgress.percentage, 25);
      assert.equal(await prisma.lessonProgress.count({ where: { userId, lessonId: optional } }), 0);
      const roadmap = await courses.roadmap(courseId, userId);
      assert.deepEqual(roadmap.topics[0]!.nodes.map(n => n.type), ['LESSON', 'LESSON', 'UNIT_CHALLENGE']);
      assert.deepEqual(roadmap.currentNode, { type: 'UNIT_CHALLENGE', id: challengeId });
      assert.equal(roadmap.topics[1]!.nodes[0]!.progression.lockReason, 'PREREQUISITE');
      await assert.rejects(lessonService.start(lessons[1]!, userId, randomUUID()), { code: 'LESSON_PREREQUISITE_REQUIRED' });
      assert.equal((await start()).body.error.code, 'UNIT_CHALLENGE_ACCESS_REQUIRED');
      await assert.rejects(courses.start(courseId, userId), { code: 'COURSE_ACCESS_REQUIRED' });
    });
    await t.test('concurrent start/resume, single ACTIVE index, threshold and phase snapshots', async () => {
      await prisma.entitlement.create({ data: { userId, scope: 'COURSE', courseId, status: 'ACTIVE', startsAt: new Date(0) } });
      startKey = randomUUID();
      const results = await Promise.all([start(startKey), start(startKey), start(), start()]);
      assert.ok(results.every(r => r.status === 200));
      runId = results[0]!.body.run.id; phaseId = results[0]!.body.phase.id;
      assert.ok(results.every(r => r.body.run.id === runId));
      const saved = await prisma.unitChallengeRun.findUniqueOrThrow({ where: { id: runId }, include: { phases: { orderBy: { position: 'asc' } } } });
      phase2Id = saved.phases[1]!.id;
      assert.equal(saved.totalItems, 2); assert.equal(saved.passingScoreSnapshot, 70);
      assert.equal(await prisma.unitChallengeRun.count({ where: { userId, unitChallengeId: challengeId, status: 'ACTIVE' } }), 1);
      await assert.rejects(prisma.unitChallengeRun.create({ data: { userId, unitChallengeId: challengeId, requestKey: randomUUID(), totalItems: 2 } }), /Unique constraint/);
      await assert.rejects(prisma.unitChallengeRun.update({ where: { id: runId }, data: { status: 'COMPLETED' } }), /unit_challenge_runs_lifecycle/);
      await assert.rejects(prisma.unitChallengeRunPhase.update({ where: { id: phaseId }, data: { correctItems: 1 } }), /unit_challenge_run_phases_submission/);
      await prisma.unitChallenge.update({ where: { id: challengeId }, data: { passingScore: 0 } });
      await prisma.unitChallengePhase.update({ where: { id: saved.phases[1]!.sourcePhaseId }, data: { config: { ...puzzle, entries: [{ ...puzzle.entries[0], answer: 'OTHER' }] } } });
      const resumed = await request(root + '/runs/' + runId);
      assert.equal(resumed.body.phase.id, phaseId); assert.equal(resumed.body.run.currentPhasePosition, 1);
      assert.equal((await prisma.unitChallengeRun.findUniqueOrThrow({ where: { id: runId } })).passingScoreSnapshot, 70);
      assert.deepEqual(saved.phases[1]!.contentSnapshot, puzzle);
      for (const privateField of ['correctOptionId', 'contentSnapshot', 'correctItems', 'HELLO']) assert.ok(!JSON.stringify(resumed.body).includes(privateField));
    });
    await t.test('ownership, phase order, key and answer validation have no writes', async () => {
      assert.equal((await request(root + '/runs/' + runId, 'GET', undefined, 'other')).status, 404);
      assert.equal((await request('/unit-challenges/' + lastChallengeId + '/runs/' + runId)).status, 404);
      assert.equal((await submit(phase2Id, { entries: [] })).body.error.code, 'UNIT_CHALLENGE_PHASE_NOT_AVAILABLE');
      assert.equal((await submit(randomUUID(), { choices: [] })).body.error.code, 'UNIT_CHALLENGE_PHASE_NOT_FOUND');
      assert.equal((await submit(phaseId, { choices: [] }, 'bad')).body.error.code, 'INVALID_UNIT_CHALLENGE_REQUEST_KEY');
      assert.equal((await submit(phaseId, { choices: [{ stepId: 'q', optionId: 'bad' }] })).body.error.code, 'INVALID_UNIT_CHALLENGE_ANSWER');
      assert.equal(await prisma.unitChallengeRunPhase.count({ where: { runId, submittedAt: { not: null } } }), 0);
    });
    await t.test('ACTIVE authorization survives entitlement expiry across metadata, course and submit', async () => {
      await prisma.entitlement.updateMany({ where: { userId }, data: { expiresAt: new Date(1) } });
      assert.equal((await request(root)).body.access.hasAccess, true);
      assert.equal((await courses.roadmap(courseId, userId)).topics[0]!.nodes[2]!.progression.lockReason, null);
      assert.equal((await courses.start(courseId, userId)).nextNode?.id, challengeId);
      assert.equal((await start()).body.run.id, runId);
      firstKey = randomUUID();
      const submitted = await submit(phaseId, { choices: [] }, firstKey);
      assert.equal(submitted.status, 200); firstResponse = submitted.body;
      assert.equal(submitted.body.phase.id, phase2Id);
      for (const privateField of ['correctItems', 'correctOptionId', 'passed', 'HELLO', 'answerData']) assert.ok(!JSON.stringify(submitted.body).includes(privateField));
      assert.deepEqual((await submit(phaseId, { choices: [] }, firstKey)).body, firstResponse);
      assert.equal((await submit(phaseId, { choices: [{ stepId: 'q', optionId: 'a' }] }, firstKey)).body.error.code, 'UNIT_CHALLENGE_SUBMISSION_CONFLICT');
      assert.equal((await submit(phaseId, { choices: [] })).body.error.code, 'UNIT_CHALLENGE_PHASE_ALREADY_SUBMITTED');
      assert.equal((await submit(phase2Id, { entries: [] }, firstKey)).body.error.code, 'UNIT_CHALLENGE_SUBMISSION_CONFLICT');
      assert.equal((await request(root + '/runs/' + runId)).body.phase.id, phase2Id);
    });
    await t.test('failed completion uses frozen answer/threshold and does not advance; exact retries survive completion', async () => {
      finalKey = randomUUID();
      const responses = await Promise.all(Array.from({ length: 4 }, () => submit(phase2Id, { entries: [{ entryId: 'e', text: ' hello ' }] }, finalKey)));
      assert.ok(responses.every(r => r.status === 200)); finalResponse = responses[0]!.body;
      for (const response of responses) assert.deepEqual(response.body, finalResponse);
      const result = responses[0]!.body;
      assert.deepEqual(result.result, { correctItems: 1, totalItems: 2, percentage: 50, passed: false, passingScore: 70 });
      assert.equal(result.topic.completed, false); assert.equal(result.nextNode.id, challengeId);
      assert.equal(result.nextNode.lockReason, 'ACCESS'); assert.equal(result.courseProgress.percentage, 25);
      assert.equal(await prisma.unitChallengeProgress.count({ where: { userId } }), 0);
      assert.deepEqual((await submit(phaseId, { choices: [] }, firstKey)).body, firstResponse);
      assert.deepEqual((await submit(phase2Id, { entries: [{ entryId: 'e', text: 'HELLO' }] }, finalKey)).body, finalResponse);
      assert.equal((await start(startKey)).body.run.id, runId);
      assert.equal((await start()).body.error.code, 'UNIT_CHALLENGE_ACCESS_REQUIRED');
      assert.equal((await request(root + '/runs/' + runId + '/abandon', 'POST')).body.error.code, 'UNIT_CHALLENGE_RUN_NOT_ACTIVE');
      assert.deepEqual(await sideEffects(), [0, 0]);
      assert.equal(await prisma.gamificationLearningEvent.count({ where: { userId, sourceType: 'UNIT_CHALLENGE_RUN' } }),
        await prisma.unitChallengeRun.count({ where: { userId, status: 'COMPLETED' } }));
    });
    await t.test('later successful replay establishes progress; worse replay never revokes or moves frontier back', async () => {
      await prisma.entitlement.updateMany({ where: { userId }, data: { expiresAt: null } });
      await prisma.unitChallenge.update({ where: { id: challengeId }, data: { passingScore: 70 } });
      const authored = await prisma.unitChallengePhase.findFirstOrThrow({ where: { unitChallengeId: challengeId, position: 2 } });
      await prisma.unitChallengePhase.update({ where: { id: authored.id }, data: { config: puzzle } });
      for (const good of [true, false]) {
        const started = await start(); runId = started.body.run.id; phaseId = started.body.phase.id;
        const mid = await submit(phaseId, { choices: good ? [{ stepId: 'q', optionId: 'a' }] : [] });
        const end = await submit(mid.body.phase.id, { entries: good ? [{ entryId: 'e', text: 'HELLO' }] : [] });
        assert.equal(end.body.result.passed, good); assert.equal(end.body.topic.completed, true);
        assert.equal(end.body.nextNode.id, lessons[1]); assert.equal(end.body.courseProgress.percentage, 50);
        const saved = await prisma.unitChallengeProgress.findMany({ where: { userId } });
        if (good) progressBefore = saved; else assert.deepEqual(saved, progressBefore);
      }
      const read = await request(root); assert.equal(read.body.progress.passed, true); assert.equal(read.body.progress.bestScore, 100);
      assert.equal((await courses.roadmap(courseId, userId)).topics[1]!.nodes[0]!.progression.unlocked, true);
    });
    await t.test('explicit abandon is idempotent; history survives publication/access revocation', async () => {
      const key = randomUUID(), opened = await start(key); const activeId = opened.body.run.id;
      await prisma.unitChallenge.update({ where: { id: challengeId }, data: { status: 'ARCHIVED' } });
      assert.equal((await request(root)).status, 404);
      assert.equal((await request(root + '/runs/' + activeId)).status, 200);
      const path = root + '/runs/' + activeId + '/abandon';
      const first = await request(path, 'POST'); assert.equal(first.status, 200);
      assert.deepEqual((await request(path, 'POST')).body, first.body);
      const history = await request(root + '/runs/' + activeId); assert.equal(history.body.phase, null);
      await prisma.unitChallenge.update({ where: { id: challengeId }, data: { status: 'PUBLISHED' } });
      assert.equal((await start(key)).body.error.code, 'UNIT_CHALLENGE_RUN_NOT_ACTIVE');
      const fresh = await start(); assert.notEqual(fresh.body.run.id, activeId);
      await request(root + '/runs/' + fresh.body.run.id + '/abandon', 'POST');
      assert.deepEqual(await prisma.unitChallengeProgress.findMany({ where: { userId } }), progressBefore);
    });
    await t.test('null threshold passes empty answers; final course completion rollback is atomic', async () => {
      const completed = await finishLesson(1);
      assert.equal(completed.completion?.nextNode?.id, lastChallengeId);
      assert.equal(completed.completion?.courseProgress.percentage, 75);
      const started = await service.start(lastChallengeId, userId, randomUUID());
      const lastRunId = started.run.id;
      const mid = await request('/unit-challenges/' + lastChallengeId + '/runs/' + lastRunId + '/phases/' + started.phase!.id + '/submit',
        'POST', { requestKey: randomUUID(), answer: { choices: [] } });
      const lastPhase = mid.body.phase.id, key = randomUUID();
      const original = repository.write.bind(repository);
      repository.write = <T>(uid: string, work: (s: UnitChallengeSession) => Promise<T>) => original(uid, async session => {
        const complete = session.completeCourse.bind(session);
        session.completeCourse = async (...args) => { await complete(...args); throw new Error('injected rollback'); };
        return work(session);
      });
      await assert.rejects(service.submit(lastChallengeId, lastRunId, lastPhase, userId, key, { entries: [] }), /injected rollback/);
      repository.write = original;
      assert.equal((await prisma.unitChallengeRunPhase.findUniqueOrThrow({ where: { id: lastPhase } })).submittedAt, null);
      assert.equal((await prisma.unitChallengeRun.findUniqueOrThrow({ where: { id: lastRunId } })).status, 'ACTIVE');
      assert.equal(await prisma.unitChallengeProgress.count({ where: { userId, unitChallengeId: lastChallengeId } }), 0);
      assert.equal((await prisma.courseProgress.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } })).status, 'IN_PROGRESS');
      const end = await request('/unit-challenges/' + lastChallengeId + '/runs/' + lastRunId + '/phases/' + lastPhase + '/submit',
        'POST', { requestKey: key, answer: { entries: [] } });
      assert.equal(end.status, 200); assert.equal(end.body.result.passed, true); assert.equal(end.body.result.correctItems, 0);
      assert.equal(end.body.courseProgress.percentage, 100); assert.equal(end.body.courseProgress.totalRequiredNodes, 4);
      assert.equal(end.body.courseProgress.status, 'COMPLETED'); assert.equal(end.body.nextNode, null);
      assert.equal((await courses.roadmap(courseId, userId)).currentNode, null);
      assert.equal((await prisma.courseProgress.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } })).status, 'COMPLETED');
      assert.deepEqual(await sideEffects(), [0, 0]);
      assert.equal(await prisma.gamificationLearningEvent.count({ where: { userId, sourceType: 'UNIT_CHALLENGE_RUN' } }),
        await prisma.unitChallengeRun.count({ where: { userId, status: 'COMPLETED' } }));
    });
    await t.test('2/3 displays 66 in Result, historical GET and bestScore; exact thresholds 67 fail and 66 pass', async () => {
      const authored = await prisma.unitChallengePhase.findFirstOrThrow({ where: { unitChallengeId: lastChallengeId, position: 1 } });
      await prisma.unitChallengePhase.update({ where: { id: authored.id }, data: { config: {
        ...scene, steps: [...scene.steps, { ...scene.steps[1]!, id: 'q2' }],
      } } });
      const history: { runId: string; passingScore: number; passed: boolean }[] = [];
      for (const [passingScore, passed] of [[67, false], [66, true]] as const) {
        await prisma.unitChallenge.update({ where: { id: lastChallengeId }, data: { passingScore } });
        const root = '/unit-challenges/' + lastChallengeId;
        const started = await request(root + '/runs', 'POST', { requestKey: randomUUID() });
        assert.equal(started.status, 200);
        const runRoot = root + '/runs/' + started.body.run.id;
        const mid = await request(runRoot + '/phases/' + started.body.phase.id + '/submit', 'POST', {
          requestKey: randomUUID(), answer: { choices: [{ stepId: 'q', optionId: 'a' }, { stepId: 'q2', optionId: 'a' }] },
        });
        assert.equal(mid.status, 200);
        const submission = { requestKey: randomUUID(), answer: { entries: [] } };
        const path = runRoot + '/phases/' + mid.body.phase.id + '/submit';
        const end = await request(path, 'POST', submission);
        assert.equal(end.status, 200);
        assert.deepEqual(end.body.result, { correctItems: 2, totalItems: 3, percentage: 66, passingScore, passed });
        assert.deepEqual((await request(path, 'POST', submission)).body, end.body);
        assert.equal((await request(root)).body.progress.bestScore, 66);
        history.push({ runId: started.body.run.id, passingScore, passed });
      }
      // Read both historical runs after the authored threshold changed.
      for (const { runId, passingScore, passed } of history) {
        const historical = await request('/unit-challenges/' + lastChallengeId + '/runs/' + runId);
        assert.equal(historical.status, 200);
        assert.deepEqual(historical.body.result, { correctItems: 2, totalItems: 3, percentage: 66, passingScore, passed });
      }
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => { server!.close(e => e ? reject(e) : resolve()); server!.closeAllConnections(); });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
    await prisma.unitChallengePhase.deleteMany({ where: { unitChallengeId: { in: challenges } } });
    await prisma.unitChallenge.deleteMany({ where: { id: { in: challenges } } });
    await prisma.lessonBlock.deleteMany({ where: { lessonId: { in: lessons } } });
    await prisma.lesson.deleteMany({ where: { topicId: { in: topics } } });
    await prisma.topic.deleteMany({ where: { id: { in: topics } } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.$disconnect();
  }
});
