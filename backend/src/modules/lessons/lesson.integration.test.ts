import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { PrismaLessonRepository, type LessonSession } from './lesson.repository.js';
import { LessonService } from './lesson.service.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';
import { createApp } from '../../shared/app.js';

// Explicit opt-in. Fixtures have fresh UUIDs; cleanup targets only this run's records.
test('Lessons HTTP + Prisma/PostgreSQL integration', { skip: process.env.RUN_LESSONS_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev', 'Integration tests require the local development database');
  const { prisma } = await import('../../shared/prisma.js');
  try { await prisma.$queryRaw`SELECT 1`; } catch { throw new Error('Local PostgreSQL unavailable (connection details withheld)'); }
  const userId = randomUUID(), otherId = randomUUID(), courseId = randomUUID(), topicId = randomUUID();
  const lessonIds = Array.from({ length: 6 }, () => randomUUID());
  const [lessonId, optionalId, paidId, draftId, emptyId, archivedId] = lessonIds as [string, string, string, string, string, string];
  const blocks = Array.from({ length: 7 }, () => randomUUID());
  const [contentId, videoId, mcId, optionsId, textId, matchId, summaryId] = blocks as [string, string, string, string, string, string, string];
  const activityIds = Array.from({ length: 4 }, () => randomUUID());
  const paidSummaryId = randomUUID(), optionalSummaryId = randomUUID(), optionalActivityId = randomUUID();
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  const repo = new PrismaLessonRepository(prisma);
  const service = new LessonService(repo);
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await prisma.user.createMany({ data: [userId, otherId].map(id => ({ id, email: `lessons-test-${id}@example.invalid`, displayName: 'LESSONS INTEGRATION TEST' })) });
    await prisma.course.create({ data: { id: courseId, title: 'LESSONS INTEGRATION TEST', slug: `lessons-test-${courseId}`, status: 'PUBLISHED', position: 9999 } });
    await prisma.topic.create({ data: { id: topicId, courseId, title: 'Test topic', position: 1 } });
    await prisma.lesson.createMany({ data: lessonIds.map((id, i) => ({ id, topicId, title: `Test lesson ${i + 1}`, position: i + 1,
      status: i === 3 ? 'DRAFT' : i === 5 ? 'ARCHIVED' : 'PUBLISHED', accessType: i === 2 ? 'PAID' : 'FREE', isRequired: i === 0 || i === 2 })) });
    await prisma.activity.createMany({ data: [
      { id: activityIds[0]!, type: 'MULTIPLE_CHOICE', prompt: 'Choose hello', explanation: 'Hello is a greeting', config: { instruction: 'Choose a greeting', context: { type: 'DIALOGUE', speakerLabel: 'D', text: 'Hi', audioUrl: 'https://media.example.test/hi.mp3', privateKey: 'must-not-leak' }, options: [{ id: 'a', text: 'Hello' }, { id: 'b', text: 'Bye' }], correctOptionId: 'a' } },
      { id: activityIds[1]!, type: 'FILL_BLANK_OPTIONS', prompt: '___ there', config: { options: [{ id: 'a', text: 'Hello' }], correctOptionId: 'a' } },
      { id: activityIds[2]!, type: 'FILL_BLANK_TEXT', prompt: 'I ___', config: { acceptedAnswers: ['am', "I'm"], caseSensitive: false } },
      { id: activityIds[3]!, type: 'MATCH_WORD_IMAGE', prompt: 'Match', config: { interactionMode: 'DRAG', words: [{ id: 'w', text: 'Hello' }], images: [{ id: 'i', url: '/hello.png', alt: 'Hello' }], pairs: [{ wordId: 'w', imageId: 'i' }] } },
    ] });
    await prisma.lessonBlock.createMany({ data: [
      { id: contentId, lessonId, type: 'TEXT', position: 1, content: { body: 'Test content', segments: [{ text: 'Test', emphasis: 'KEY', privateKey: 'must-not-leak' }, { text: ' content' }], secret: 'must-not-leak' } },
      { id: videoId, lessonId, type: 'VIDEO', position: 2, content: { url: '/test.mp4' } },
      ...[mcId, optionsId, textId, matchId].map((id, i) => ({ id, lessonId, type: 'ACTIVITY', position: i + 3, activityId: activityIds[i]! })),
      { id: summaryId, lessonId, type: 'SUMMARY', position: 7, content: { points: ['Test summary'], subtitle: 'Well done', takeaways: [{ text: 'Test summary' }], keyPhrases: [{ text: 'Hi', translation: 'Hola', audioUrl: 'https://media.example.test/hi.mp3', privateKey: 'must-not-leak' }] } },
      { id: randomUUID(), lessonId: paidId, type: 'SUMMARY', position: 1, content: { points: ['Presentation only'] } },
      { id: paidSummaryId, lessonId: paidId, type: 'TEXT', position: 2, content: { body: 'Final required lesson' } },
      { id: optionalSummaryId, lessonId: optionalId, type: 'TEXT', position: 1, content: { points: ['Optional practice'] } },
      { id: optionalActivityId, lessonId: optionalId, type: 'ACTIVITY', position: 2, required: false, activityId: activityIds[0]! },
    ] });
    server = createApp(courses, (request, _response, next) => {
      // Test-only trusted context; production application never trusts this header.
      if (request.headers['x-test-auth'] !== 'none') request.auth = { userId: request.headers['x-test-auth'] === 'other' ? otherId : userId };
      next();
    }, service).listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server!.once('listening', resolve); server!.once('error', reject); });
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const request = async (path: string, method = 'GET', body?: unknown, auth = 'user') => {
      const response = await fetch(url + path, { method, headers: { 'content-type': 'application/json', 'x-test-auth': auth },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json().catch(() => null) };
    };
    let runId = '';
    const start = (key = randomUUID()) => request('/lessons/' + lessonId + '/runs', 'POST', { requestKey: key });
    const post = (suffix: string, body?: unknown) => request('/lessons/' + lessonId + '/runs/' + runId + suffix, 'POST', body);
    const durable = () => Promise.all([
      prisma.lessonProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.lessonBlockProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.reviewItem.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.courseProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.coinTransaction.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.learningDay.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    ]);
    const check = (step: string, answer: unknown) => request('/lessons/' + lessonId + '/replay/steps/' + step + '/check', 'POST', answer);
    await t.test('GET remains read-only/sanitized; old implicit endpoints are removed; publication/auth/access gates', async () => {
      const before = await durable(); const read = await request('/lessons/' + lessonId);
      assert.equal(read.status, 200); assert.equal(read.body.state.status, 'NOT_STARTED'); assert.equal(read.body.state.currentStepId, null);
      assert.equal(read.body.steps.length, 6); assert.equal(read.body.steps[0].blocks.length, 2);
      for (const key of ['correctOptionId', 'acceptedAnswers', 'must-not-leak', 'Hello is a greeting', '"pairs"']) assert.ok(!JSON.stringify(read.body).includes(key));
      assert.equal((await request('/lessons/' + lessonId + '/start', 'POST')).status, 404);
      assert.equal((await request('/lessons/' + lessonId + '/complete', 'POST')).status, 404);
      assert.equal((await request('/lessons/' + lessonId + '/runs', 'POST', { requestKey: randomUUID() }, 'none')).status, 401);
      assert.equal((await start()).body.error.code, 'COURSE_NOT_STARTED');
      assert.equal((await request('/lessons/' + lessonId + '/runs', 'POST', {})).body.error.code, 'INVALID_RUN_REQUEST_KEY');
      for (const id of [draftId, archivedId, randomUUID()]) assert.equal((await request('/lessons/' + id)).status, 404);
      assert.equal((await check(mcId, { selectedOptionId: 'a' })).body.error.code, 'LESSON_REPLAY_REQUIRES_COMPLETION');
      await assert.rejects(repo.read(session => session.createRun(userId, lessonId, randomUUID(), contentId)), /read-only transaction/i);
      assert.deepEqual(await durable(), before);
      await courses.start(courseId, userId);
      assert.equal((await request('/lessons/' + paidId + '/runs', 'POST', { requestKey: randomUUID() })).body.error.code, 'LESSON_PREREQUISITE_REQUIRED');
    });
    await t.test('same start key is idempotent, only one ACTIVE, fresh 0%, no durable LessonProgress', async () => {
      const before = await durable(); const requestKey = randomUUID();
      const starts = await Promise.all(Array.from({ length: 5 }, () => start(requestKey)));
      assert.ok(starts.every(r => r.status === 200)); runId = starts[0]!.body.runId;
      assert.ok(starts.every(r => r.body.runId === runId && r.body.firstStepId === contentId && r.body.progress.percentage === 0));
      assert.equal(await prisma.lessonRun.count({ where: { userId, lessonId, status: 'ACTIVE' } }), 1);
      await assert.rejects(prisma.lessonRun.create({ data: { userId, lessonId, requestKey: randomUUID() } }), /Unique constraint/);
      await assert.rejects(prisma.lessonRun.update({ where: { id: runId }, data: { status: 'COMPLETED' } }), /lesson_runs_lifecycle/);
      assert.deepEqual(await durable(), before);
    });
    await t.test('run ownership, membership, required order and ACTIVE-only mutations', async () => {
      assert.equal((await request('/lessons/' + lessonId + '/runs/' + runId + '/abandon', 'POST', undefined, 'other')).status, 404);
      assert.equal((await request('/lessons/' + optionalId + '/runs/' + runId + '/abandon', 'POST')).status, 404);
      assert.equal((await post('/steps/' + summaryId + '/complete')).body.error.code, 'STEP_NOT_AVAILABLE');
      assert.equal((await post('/steps/' + mcId + '/complete')).body.error.code, 'ACTIVITY_REQUIRES_ATTEMPT');
      assert.equal((await post('/steps/' + contentId + '/attempt', { text: 'a' })).body.error.code, 'STEP_IS_NOT_ACTIVITY');
      assert.equal((await post('/steps/' + paidSummaryId + '/complete')).body.error.code, 'STEP_NOT_FOUND');
      assert.equal((await post('/complete')).body.error.code, 'LESSON_REQUIREMENTS_INCOMPLETE');
    });
    const startSameRunProgress = async () => { const r = await prisma.lessonRun.findUniqueOrThrow({ where: { id: runId } }); return (await service.start(lessonId, userId, r.requestKey)).progress; };
    let abandonedRunId = '';
    await t.test('ACTIVE wrong/retry stores run attempts only; stale start abandons it with zero durable effects', async () => {
      const before = await durable();
      const traversal = await post('/steps/' + contentId + '/complete'); assert.equal(traversal.body.currentStepId, mcId);
      await post('/steps/' + contentId + '/complete');
      assert.equal(await prisma.lessonRunBlockProgress.count({ where: { runId } }), 2);
      const wrong = await post('/steps/' + mcId + '/attempt', { selectedOptionId: 'b' });
      assert.equal(wrong.body.attempt.attemptNumber, 1); assert.equal(wrong.body.attempt.isCorrect, false);
      assert.deepEqual(wrong.body.reinforcement, { onCompletion: true }); assert.equal(wrong.body.review, undefined);
      const retry = await post('/steps/' + mcId + '/attempt', { selectedOptionId: 'a' });
      assert.equal(retry.body.attempt.attemptNumber, 2); assert.equal(retry.body.attempt.countsForLessonScore, false);
      assert.equal((await request('/lessons/' + lessonId)).body.state.currentStepId, null);
      assert.deepEqual(await durable(), before);
      abandonedRunId = runId;
      const fresh = await start(); runId = fresh.body.runId;
      assert.notEqual(runId, abandonedRunId); assert.equal(fresh.body.progress.percentage, 0); assert.equal(fresh.body.currentStepId, contentId);
      assert.equal((await prisma.lessonRun.findUniqueOrThrow({ where: { id: abandonedRunId } })).status, 'ABANDONED');
      for (const suffix of ['/complete', '/steps/' + mcId + '/attempt', '/steps/' + contentId + '/complete']) {
        assert.equal((await request('/lessons/' + lessonId + '/runs/' + abandonedRunId + suffix, 'POST', { selectedOptionId: 'a' })).body.error.code, 'LESSON_RUN_NOT_ACTIVE');
      }
      assert.deepEqual(await durable(), before);
    });
    await t.test('abandon is idempotent; concurrent fresh starts leave exactly one ACTIVE', async () => {
      const before = await durable(); const current = runId;
      const abandoned = await Promise.all([post('/abandon'), post('/abandon')]);
      assert.ok(abandoned.every(r => r.status === 200 && r.body.status === 'ABANDONED'));
      const stored = await prisma.lessonRun.findUniqueOrThrow({ where: { id: current } });
      await post('/abandon'); assert.deepEqual(await prisma.lessonRun.findUniqueOrThrow({ where: { id: current } }), stored);
      const fresh = await Promise.all([start(), start()]); assert.ok(fresh.every(r => r.status === 200));
      const active = await prisma.lessonRun.findMany({ where: { userId, lessonId, status: 'ACTIVE' } });
      assert.equal(active.length, 1); runId = active[0]!.id;
      assert.deepEqual(await durable(), before);
    });
    await t.test('numbering restarts per run; invalid answers have no effects; concurrent retries serialize', async () => {
      const before = await durable(); await post('/steps/' + contentId + '/complete');
      assert.equal((await post('/steps/' + mcId + '/attempt', { selectedOptionId: 'missing' })).body.error.code, 'INVALID_ANSWER');
      assert.equal(await prisma.activityAttempt.count({ where: { runId } }), 0);
      const first = await post('/steps/' + mcId + '/attempt', { selectedOptionId: 'b' }); assert.equal(first.body.attempt.attemptNumber, 1);
      const replies = await Promise.all([post('/steps/' + mcId + '/attempt', { selectedOptionId: 'a' }), post('/steps/' + mcId + '/attempt', { selectedOptionId: 'b' })]);
      assert.deepEqual(replies.map(r => r.body.attempt.attemptNumber).sort(), [2, 3]);
      assert.equal(await prisma.reviewItem.count({ where: { userId } }), 0);
      const original = await prisma.activityAttempt.findFirstOrThrow({ where: { runId } });
      const { id: ignored, ...duplicate } = original;
      await assert.rejects(prisma.activityAttempt.create({ data: { ...duplicate, answerData: { selectedOptionId: 'a' } } }), /Unique constraint/);
      assert.deepEqual(await durable(), before);
      for (const [step, answer] of [[optionsId, { selectedOptionId: 'a' }], [textId, { text: ' AM ' }]] as const) {
        const response = await post('/steps/' + step + '/attempt', answer); assert.equal(response.status, 200); assert.equal(response.body.attempt.isCorrect, true);
      }
      assert.equal((await post('/complete')).body.error.code, 'LESSON_REQUIREMENTS_INCOMPLETE');
      assert.deepEqual(await durable(), before);
      assert.ok((await startSameRunProgress()).percentage < 100);
    });
    await t.test('failed consolidation rolls back run status, durable completion and Review together', async () => {
      class FailingRepository extends PrismaLessonRepository {
        override write<T>(user: string, work: (session: LessonSession) => Promise<T>): Promise<T> {
          return super.write(user, session => { session.completeBlocks = async () => { throw new Error('Injected failure'); }; return work(session); });
        }
      }
      const before = await durable();
      await assert.rejects(new LessonService(new FailingRepository(prisma)).attempt(lessonId, runId, matchId, userId, { pairs: [{ wordId: 'w', imageId: 'i' }] }), /Injected failure/);
      assert.equal((await prisma.lessonRun.findUniqueOrThrow({ where: { id: runId } })).status, 'ACTIVE');
      assert.equal(await prisma.activityAttempt.count({ where: { runId, activityId: activityIds[3]! } }), 0);
      assert.equal(await prisma.lessonRunBlockProgress.count({ where: { runId, lessonBlockId: matchId } }), 0);
      assert.deepEqual(await durable(), before);
    });
    await t.test('complete consolidates first score, traversal, Review and course progression exactly once', async () => {
      const last = await post('/steps/' + matchId + '/attempt', { pairs: [{ wordId: 'w', imageId: 'i' }] });
      assert.equal(last.status, 200); assert.equal(last.body.status, 'COMPLETED'); assert.equal(last.body.progress.percentage, 100);
      assert.equal(last.body.completion.result.correctAnswers, 3);
      assert.equal((await request('/lessons/' + lessonId)).body.state.status, 'COMPLETED', 'crash before Summary/Result preserves completion');
      const responses = await Promise.all([post('/complete'), post('/complete')]);
      assert.equal(responses[0]!.status, 200); assert.deepEqual(responses[0], responses[1]);
      assert.deepEqual(responses[0]!.body.result, { correctAnswers: 3, totalActivities: 4, isPerfect: false, pendingReviewCount: 1 });
      assert.equal(responses[0]!.body.courseProgress.completedLessons, 1); assert.equal(responses[0]!.body.nextLesson.id, paidId);
      const reviews = await prisma.reviewItem.findMany({ where: { userId } }); assert.equal(reviews[0]!.incorrectAttempts, 2);
      const durableLesson = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } });
      assert.equal(durableLesson.status, 'COMPLETED'); assert.equal(durableLesson.completedRunId, runId);
      assert.equal(await prisma.lessonBlockProgress.count({ where: { userId } }), 6);
      const before = await durable(); await post('/complete'); assert.deepEqual(await durable(), before);
      for (const suffix of ['/abandon', '/steps/' + mcId + '/attempt', '/steps/' + contentId + '/complete']) assert.equal((await post(suffix, { selectedOptionId: 'a' })).status, 409);
      assert.equal((await start()).body.error.code, 'LESSON_ALREADY_COMPLETED');
    });
    await t.test('Replay still checks all types read-only, including history and no-run guarantee', async () => {
      const before = await durable(); const runs = await prisma.lessonRun.findMany({ where: { userId }, orderBy: { id: 'asc' } });
      const attempts = await prisma.activityAttempt.findMany({ where: { userId }, orderBy: { id: 'asc' } });
      for (const selectedOptionId of ['a', 'b', 'b']) {
        const response = await check(mcId, { selectedOptionId }); assert.equal(response.status, 200);
        assert.deepEqual(response.body, { isCorrect: selectedOptionId === 'a', feedback: { message: selectedOptionId === 'a' ? 'Correct answer' : 'Incorrect answer', correctAnswer: 'a', explanation: 'Hello is a greeting' } });
      }
      for (const [step, answer] of [[optionsId, { selectedOptionId: 'a' }], [textId, { text: 'am' }], [matchId, { pairs: [{ wordId: 'w', imageId: 'i' }] }]] as const) assert.equal((await check(step, answer)).body.isCorrect, true);
      assert.equal((await check(contentId, { text: 'a' })).body.error.code, 'STEP_IS_NOT_ACTIVITY');
      assert.equal((await check(paidSummaryId, { text: 'a' })).body.error.code, 'STEP_NOT_FOUND');
      assert.equal((await check(mcId, { selectedOptionId: 'missing' })).body.error.code, 'INVALID_ANSWER');
      assert.deepEqual(await durable(), before); assert.deepEqual(await prisma.lessonRun.findMany({ where: { userId }, orderBy: { id: 'asc' } }), runs);
      assert.deepEqual(await prisma.activityAttempt.findMany({ where: { userId }, orderBy: { id: 'asc' } }), attempts);
    });
    await t.test('abandoned wrong answers cannot contaminate a later perfect run or Review', async () => {
      await courses.start(courseId, otherId);
      const abandoned = await service.start(lessonId, otherId, randomUUID());
      await service.completeStep(lessonId, abandoned.runId, contentId, otherId);
      await service.attempt(lessonId, abandoned.runId, mcId, otherId, { selectedOptionId: 'b' });
      await service.abandon(lessonId, abandoned.runId, otherId);
      const fresh = await service.start(lessonId, otherId, randomUUID());
      await service.completeStep(lessonId, fresh.runId, contentId, otherId);
      for (const [step, answer] of [[mcId, { selectedOptionId: 'a' }], [optionsId, { selectedOptionId: 'a' }], [textId, { text: 'am' }], [matchId, { pairs: [{ wordId: 'w', imageId: 'i' }] }]] as const) {
        const submitted = await service.attempt(lessonId, fresh.runId, step, otherId, answer);
        assert.equal(submitted.attempt.attemptNumber, 1);
      }
      const completed = await service.complete(lessonId, fresh.runId, otherId);
      assert.deepEqual(completed.result, { correctAnswers: 4, totalActivities: 4, isPerfect: true, pendingReviewCount: 0 });
      assert.equal(await prisma.reviewItem.count({ where: { userId: otherId } }), 0);
      assert.equal(await prisma.activityAttempt.count({ where: { runId: abandoned.runId, isCorrect: false } }), 1);
    });
    await t.test('optional activity is not required; completed optional run cannot accept later writes', async () => {
      const root = '/lessons/' + optionalId; const response = await request(root + '/runs', 'POST', { requestKey: randomUUID() });
      const path = root + '/runs/' + response.body.runId;
      assert.equal((await request(path + '/steps/' + optionalSummaryId + '/complete', 'POST')).status, 200);
      assert.equal((await request(path + '/complete', 'POST')).status, 200);
      assert.equal((await request(path + '/steps/' + optionalActivityId + '/attempt', 'POST', { selectedOptionId: 'a' })).status, 409);
      const before = await durable();
      assert.equal((await request(root + '/replay/steps/' + optionalActivityId + '/check', 'POST', { selectedOptionId: 'a' })).body.isCorrect, true);
      assert.deepEqual(await durable(), before);
    });
    await t.test('current access is checked at start/attempt/complete; abandon works after access expires; course completes only at run completion', async () => {
      const root = '/lessons/' + paidId;
      assert.equal((await request(root + '/runs', 'POST', { requestKey: randomUUID() })).body.error.code, 'LESSON_ACCESS_REQUIRED');
      const grant = await prisma.entitlement.create({ data: { userId, scope: 'COURSE', courseId, status: 'ACTIVE', startsAt: new Date(0) } });
      const opened = await request(root + '/runs', 'POST', { requestKey: randomUUID() }); const path = root + '/runs/' + opened.body.runId;
      assert.equal(opened.body.firstStepId, paidSummaryId, 'Summary cannot gate a later pedagogical requirement');
      await prisma.entitlement.update({ where: { id: grant.id }, data: { status: 'REVOKED' } });
      assert.equal((await request(path + '/complete', 'POST')).status, 403);
      assert.equal((await request(path + '/steps/' + paidSummaryId + '/attempt', 'POST', { text: 'a' })).status, 403);
      assert.equal((await request(path + '/abandon', 'POST')).status, 200);
      await prisma.entitlement.update({ where: { id: grant.id }, data: { status: 'ACTIVE' } });
      const second = await request(root + '/runs', 'POST', { requestKey: randomUUID() }); const secondPath = root + '/runs/' + second.body.runId;
      await request(secondPath + '/steps/' + paidSummaryId + '/complete', 'POST');
      const result = await request(secondPath + '/complete', 'POST'); assert.equal(result.body.courseProgress.status, 'COMPLETED');
      await prisma.entitlement.delete({ where: { id: grant.id } });
      assert.equal((await request(root + '/replay/steps/' + paidSummaryId + '/check', 'POST', { text: 'a' })).status, 403);
      assert.equal(await prisma.coinTransaction.count({ where: { userId } }), 0); assert.equal(await prisma.learningDay.count({ where: { userId } }), 0);
    });
    await t.test('nonempty Summary-only lesson consolidates on entry without requiring presentation interaction', async () => {
      await prisma.lessonBlock.create({ data: { lessonId: emptyId, type: 'SUMMARY', position: 1, content: { points: ['Presentation'] } } });
      const opened = await service.start(emptyId, userId, randomUUID());
      assert.equal(opened.status, 'COMPLETED'); assert.equal(opened.progress.percentage, 100);
      assert.ok(opened.completion); assert.equal(opened.completion.result.totalActivities, 0);
      assert.equal((await service.read(emptyId, userId)).state.status, 'COMPLETED');
      assert.equal(await prisma.lessonRunBlockProgress.count({ where: { runId: opened.runId } }), 0);
      await assert.rejects(service.abandon(emptyId, opened.runId, userId), /Completed runs/);
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => { server!.close(e => e ? reject(e) : resolve()); server!.closeAllConnections(); });
    // User cascades remove only our temporary progress/attempts/reviews/entitlements.
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherId] } } });
    await prisma.lessonBlock.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await prisma.lesson.deleteMany({ where: { id: { in: lessonIds } } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.activity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.$disconnect();
  }
});
