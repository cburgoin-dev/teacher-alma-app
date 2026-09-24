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
      { id: paidSummaryId, lessonId: paidId, type: 'SUMMARY', position: 1, content: { points: ['Final required lesson'] } },
      { id: optionalSummaryId, lessonId: optionalId, type: 'SUMMARY', position: 1, content: { points: ['Optional practice'] } },
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
      return { status: response.status, body: await response.json() };
    };
    const post = (suffix: string, body?: unknown) => request(`/lessons/${lessonId}${suffix}`, 'POST', body);
    const counts = async () => Promise.all([
      prisma.lessonProgress.count({ where: { userId } }), prisma.lessonBlockProgress.count({ where: { userId } }),
      prisma.activityAttempt.count({ where: { userId } }), prisma.reviewItem.count({ where: { userId } }),
      prisma.courseProgress.count({ where: { userId } }),
    ]);
    const persisted = () => Promise.all([
      prisma.activityAttempt.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.reviewItem.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.lessonProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.lessonBlockProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.courseProgress.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.learningDay.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.coinTransaction.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.streakChallenge.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    await t.test('Replay rejects NOT_STARTED, with database-enforced read-only transactions', async () => {
      const before = await persisted();
      assert.equal((await post('/replay/steps/' + mcId + '/check', { selectedOptionId: 'a' })).body.error.code, 'LESSON_REPLAY_REQUIRES_COMPLETION');
      await assert.rejects(repo.read(session => session.createProgress(userId, lessonId, contentId)), /read-only transaction/i);
      assert.deepEqual(await persisted(), before);
    });
    await t.test('GET is read-only, grouped, sanitized and user-scoped; UUID/auth/visibility boundaries', async () => {
      const before = await counts(); const read = await request(`/lessons/${lessonId}`);
      assert.equal(read.status, 200); assert.equal(read.body.state.status, 'NOT_STARTED'); assert.equal(read.body.steps.length, 6);
      assert.equal(read.body.steps[0].blocks.length, 2);
      assert.deepEqual(read.body.activityProgress, { completed: 0, total: 4 });
      assert.deepEqual(read.body.steps[0].blocks[0].segments, [{ text: 'Test', emphasis: 'KEY' }, { text: ' content' }]);
      assert.equal(read.body.steps[1].blocks[0].activity.context.audioUrl, 'https://media.example.test/hi.mp3');
      assert.equal(read.body.steps[5].blocks[0].keyPhrases[0].translation, 'Hola');
      for (const key of ['correctOptionId', 'acceptedAnswers', 'must-not-leak', 'Hello is a greeting', '"pairs"']) assert.ok(!JSON.stringify(read.body).includes(key));
      assert.deepEqual(await counts(), before);
      assert.equal((await request('/lessons/bad')).body.error.code, 'INVALID_LESSON_ID');
      assert.equal((await request(`/lessons/${lessonId}`, 'GET', undefined, 'none')).status, 401);
      for (const id of [draftId, archivedId, randomUUID()]) assert.equal((await request(`/lessons/${id}`)).status, 404);
      assert.equal((await post('/steps/bad/complete')).body.error.code, 'INVALID_STEP_ID');
    });
    await t.test('start rejects unstarted course and prerequisites without implicit course progress', async () => {
      assert.equal((await post('/start')).body.error.code, 'COURSE_NOT_STARTED');
      assert.equal(await prisma.courseProgress.count({ where: { userId } }), 0);
      await courses.start(courseId, userId);
      assert.equal((await request(`/lessons/${paidId}/start`, 'POST')).body.error.code, 'LESSON_PREREQUISITE_REQUIRED');
    });
    await t.test('concurrent start is idempotent and does not create block progress', async () => {
      const starts = await Promise.all(Array.from({ length: 5 }, () => post('/start')));
      assert.ok(starts.every(r => r.status === 200 && r.body.currentStepId === contentId));
      assert.equal(await prisma.lessonProgress.count({ where: { userId } }), 1);
      assert.equal(await prisma.lessonBlockProgress.count({ where: { userId } }), 0);
      assert.equal((await request(`/lessons/${lessonId}`, 'GET', undefined, 'other')).body.state.status, 'NOT_STARTED');
    });
    await t.test('Replay cannot check an IN_PROGRESS lesson', async () => {
      const before = await persisted();
      assert.equal((await post('/replay/steps/' + mcId + '/check', { selectedOptionId: 'a' })).body.error.code, 'LESSON_REPLAY_REQUIRES_COMPLETION');
      assert.deepEqual(await persisted(), before);
    });
    await t.test('no skipping, no activity via complete, membership and incomplete lesson failures', async () => {
      assert.equal((await post(`/steps/${summaryId}/complete`)).body.error.code, 'STEP_NOT_AVAILABLE');
      assert.equal((await post(`/steps/${mcId}/attempt`, { selectedOptionId: 'a' })).body.error.code, 'STEP_NOT_AVAILABLE');
      assert.equal((await post(`/steps/${mcId}/complete`)).body.error.code, 'ACTIVITY_REQUIRES_ATTEMPT');
      assert.equal((await post(`/steps/${contentId}/attempt`, { text: 'a' })).body.error.code, 'STEP_IS_NOT_ACTIVITY');
      assert.equal((await post(`/steps/${paidSummaryId}/complete`)).body.error.code, 'STEP_NOT_FOUND');
      assert.equal((await post('/complete')).body.error.code, 'LESSON_REQUIREMENTS_INCOMPLETE');
    });
    await t.test('content/video traversal is idempotent and resume points to next activity', async () => {
      assert.equal((await post(`/steps/${contentId}/complete`)).body.currentStepId, mcId);
      const rows = await prisma.lessonBlockProgress.findMany({ where: { userId }, orderBy: { lessonBlockId: 'asc' } });
      await post(`/steps/${contentId}/complete`);
      assert.deepEqual(await prisma.lessonBlockProgress.findMany({ where: { userId }, orderBy: { lessonBlockId: 'asc' } }), rows);
      assert.equal((await post('/start')).body.currentStepId, mcId);
    });
    await t.test('invalid answer has zero effects; an incorrect answer traverses activity and creates review', async () => {
      const before = await counts(); assert.equal((await post(`/steps/${mcId}/attempt`, { selectedOptionId: 'unknown' })).body.error.code, 'INVALID_ANSWER');
      assert.deepEqual(await counts(), before);
      const result = await post(`/steps/${mcId}/attempt`, { selectedOptionId: 'b' });
      assert.equal(result.status, 200); assert.equal(result.body.attempt.isCorrect, false); assert.equal(result.body.attempt.attemptNumber, 1);
      assert.equal(result.body.attempt.countsForLessonScore, true); assert.equal(result.body.review.pending, true);
      assert.equal(result.body.progress.currentStepId, optionsId);
      assert.deepEqual((await request(`/lessons/${lessonId}`)).body.activityProgress, { completed: 1, total: 4 });
      assert.deepEqual((await request(`/lessons/${lessonId}`, 'GET', undefined, 'other')).body.activityProgress, { completed: 0, total: 4 });
      assert.equal((await prisma.lessonBlockProgress.findUniqueOrThrow({ where: { userId_lessonBlockId: { userId, lessonBlockId: mcId } } })).status, 'COMPLETED');
    });
    await t.test('concurrent retries have distinct numbers and correct retry never resolves Review', async () => {
      const retries = await Promise.all([post(`/steps/${mcId}/attempt`, { selectedOptionId: 'a' }), post(`/steps/${mcId}/attempt`, { selectedOptionId: 'b' })]);
      assert.deepEqual(retries.map(r => r.body.attempt.attemptNumber).sort(), [2, 3]);
      assert.ok(retries.every(r => r.body.attempt.countsForLessonScore === false && r.body.review.pending));
      assert.deepEqual((await request(`/lessons/${lessonId}`)).body.activityProgress, { completed: 1, total: 4 });
      const reviews = await prisma.reviewItem.findMany({ where: { userId } });
      assert.equal(reviews.length, 1); assert.equal(reviews[0]!.incorrectAttempts, 2); assert.equal(reviews[0]!.resolvedAt, null);
    });
    await t.test('dependent writes roll back on an injected persistence failure', async () => {
      class FailingRepository extends PrismaLessonRepository {
        override write<T>(user: string, work: (session: LessonSession) => Promise<T>): Promise<T> {
          return super.write(user, session => {
            session.completeBlocks = async () => { throw new Error('Injected rollback'); };
            return work(session);
          });
        }
      }
      const before = await counts();
      await assert.rejects(new LessonService(new FailingRepository(prisma)).attempt(lessonId, optionsId, userId, { selectedOptionId: 'a' }), /Injected rollback/);
      assert.deepEqual(await counts(), before);
    });
    await t.test('remaining activity types submit correctly and Summary traversal is distinct from completion', async () => {
      for (const [stepId, answer] of [[optionsId, { selectedOptionId: 'a' }], [textId, { text: ' AM ' }], [matchId, { pairs: [{ wordId: 'w', imageId: 'i' }] }]] as const) {
        const response = await post(`/steps/${stepId}/attempt`, answer);
        assert.equal(response.status, 200); assert.equal(response.body.attempt.isCorrect, true);
      }
      assert.equal((await post('/complete')).status, 409);
      await post(`/steps/${summaryId}/complete`);
      assert.equal((await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } })).status, 'IN_PROGRESS');
    });
    await t.test('completion preserves first score, reports review and paid next, is concurrently idempotent', async () => {
      const results = await Promise.all([post('/complete'), post('/complete')]);
      assert.deepEqual(results[0]!.body.course, { id: courseId, title: 'LESSONS INTEGRATION TEST', level: null }); assert.equal(results[0]!.status, 200); assert.deepEqual(results[0], results[1]);
      assert.deepEqual(results[0]!.body.result, { correctAnswers: 3, totalActivities: 4, isPerfect: false, pendingReviewCount: 1 });
      assert.deepEqual(results[0]!.body.courseProgress, { completedLessons: 1, totalLessons: 2, percentage: 50, status: 'IN_PROGRESS' });
      assert.deepEqual(results[0]!.body.nextLesson, { id: paidId, title: 'Test lesson 3', accessible: false, lockReason: 'ACCESS' });
      const stored = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } });
      assert.equal((await post('/start')).body.status, 'COMPLETED'); await post('/complete');
      assert.deepEqual(await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId, lessonId } } }), stored);
    });
    await t.test('Replay checks correct/wrong answers without changing any learning state or original score', async () => {
      const before = await persisted();
      const check = (step: string, answer: unknown) => post('/replay/steps/' + step + '/check', answer);
      for (const selectedOptionId of ['b', 'a', 'b']) {
        const response = await check(mcId, { selectedOptionId });
        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { isCorrect: selectedOptionId === 'a', feedback: {
          message: selectedOptionId === 'a' ? 'Correct answer' : 'Incorrect answer', correctAnswer: 'a', explanation: 'Hello is a greeting' } });
      }
      for (const [step, answer] of [[optionsId, { selectedOptionId: 'a' }], [textId, { text: ' AM ' }], [matchId, { pairs: [{ wordId: 'w', imageId: 'i' }] }]] as const) {
        assert.equal((await check(step, answer)).body.isCorrect, true);
      }
      // Wrong answer on an activity with no ReviewItem must not create one either.
      assert.equal((await check(textId, { text: 'is' })).body.isCorrect, false);
      assert.equal((await check(mcId, { selectedOptionId: 'unknown' })).body.error.code, 'INVALID_ANSWER');
      assert.equal((await check(contentId, { text: 'a' })).body.error.code, 'STEP_IS_NOT_ACTIVITY');
      assert.equal((await check(paidSummaryId, { text: 'a' })).body.error.code, 'STEP_NOT_FOUND');
      assert.equal((await request('/lessons/' + lessonId + '/replay/steps/' + mcId + '/check', 'POST', { selectedOptionId: 'a' }, 'other')).body.error.code, 'LESSON_REPLAY_REQUIRES_COMPLETION');
      assert.equal((await request('/lessons/' + lessonId + '/replay/steps/' + mcId + '/check', 'POST', { selectedOptionId: 'a' }, 'none')).status, 401);
      assert.equal((await request('/lessons/' + paidId + '/replay/steps/' + paidSummaryId + '/check', 'POST', { text: 'a' })).status, 403);
      await prisma.course.update({ where: { id: courseId }, data: { status: 'DRAFT' } });
      try { assert.equal((await check(mcId, { selectedOptionId: 'a' })).status, 404); }
      finally { await prisma.course.update({ where: { id: courseId }, data: { status: 'PUBLISHED' } }); }
      await prisma.lesson.update({ where: { id: lessonId }, data: { status: 'DRAFT' } });
      try { assert.equal((await check(mcId, { selectedOptionId: 'a' })).status, 404); }
      finally { await prisma.lesson.update({ where: { id: lessonId }, data: { status: 'PUBLISHED' } }); }
      assert.deepEqual(await persisted(), before, 'compare full rows, including Review increments and progress timestamps');
    });
    await t.test('optional pending stays visible and does not block required course completion; entitlement enforced', async () => {
      assert.equal((await request(`/lessons/${paidId}/start`, 'POST')).body.error.code, 'LESSON_ACCESS_REQUIRED');
      assert.equal((await request(`/lessons/${paidId}`)).body.error.code, 'LESSON_ACCESS_REQUIRED');
      assert.equal((await request(`/lessons/${emptyId}/start`, 'POST')).body.error.code, 'LESSON_PREREQUISITE_REQUIRED');
      await prisma.entitlement.create({ data: { userId, scope: 'COURSE', courseId, status: 'ACTIVE', startsAt: new Date(0) } });
      assert.equal((await request(`/lessons/${paidId}/start`, 'POST')).status, 200);
      await request(`/lessons/${paidId}/steps/${paidSummaryId}/complete`, 'POST');
      const result = await request(`/lessons/${paidId}/complete`, 'POST');
      assert.equal(result.body.courseProgress.status, 'COMPLETED'); assert.equal(result.body.courseProgress.percentage, 100); assert.equal(result.body.nextLesson, null);
      assert.equal((await prisma.courseProgress.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } })).status, 'COMPLETED');
      assert.ok((await courses.roadmap(courseId, userId)).topics[0]!.lessons.some(l => l.id === optionalId));
      assert.equal((await request(`/lessons/${emptyId}/start`, 'POST')).body.error.code, 'LESSON_HAS_NO_CONTENT');
      assert.equal((await request(`/lessons/${optionalId}/complete`, 'POST')).body.error.code, 'LESSON_NOT_STARTED');
      assert.equal(await prisma.coinTransaction.count({ where: { userId } }), 0);
      assert.equal(await prisma.learningDay.count({ where: { userId } }), 0);
      assert.equal(await prisma.purchase.count({ where: { userId } }), 0);
    });
    await t.test('optional lesson remains readable and completable without changing mandatory progress or course completion', async () => {
      const stored = await prisma.courseProgress.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } });
      assert.equal((await request(`/lessons/${optionalId}`)).status, 200);
      assert.equal((await request(`/lessons/${optionalId}/start`, 'POST')).status, 200);
      assert.equal((await request(`/lessons/${optionalId}/steps/${optionalSummaryId}/complete`, 'POST')).status, 200);
      const result = await request(`/lessons/${optionalId}/complete`, 'POST');
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.courseProgress, { completedLessons: 2, totalLessons: 2, percentage: 100, status: 'COMPLETED' });
      assert.equal(result.body.nextLesson, null);
      assert.deepEqual(await prisma.courseProgress.findUniqueOrThrow({ where: { userId_courseId: { userId, courseId } } }), stored);
      assert.equal((await courses.detail(courseId, userId)).content.lessonCount, 4);
    });
    await t.test('Replay includes previously unvisited optional activities without traversal writes', async () => {
      const before = await persisted();
      const response = await request('/lessons/' + optionalId + '/replay/steps/' + optionalActivityId + '/check', 'POST', { selectedOptionId: 'a' });
      assert.equal(response.status, 200); assert.equal(response.body.isCorrect, true);
      assert.deepEqual(await persisted(), before);
      assert.deepEqual((await request('/lessons/' + optionalId)).body.activityProgress, { completed: 0, total: 1 });
    });
    await t.test('optional activity traversal survives resume and completion without inflating on retry', async () => {
      const root = `/lessons/${optionalId}`;
      assert.deepEqual((await request(root)).body.activityProgress, { completed: 0, total: 1 });
      assert.equal((await request(root + '/start', 'POST')).body.status, 'COMPLETED');
      await request(`${root}/steps/${optionalActivityId}/attempt`, 'POST', { selectedOptionId: 'b' });
      assert.deepEqual((await request(root)).body.activityProgress, { completed: 1, total: 1 });
      await request(`${root}/steps/${optionalActivityId}/attempt`, 'POST', { selectedOptionId: 'a' });
      assert.deepEqual((await request(root)).body.activityProgress, { completed: 1, total: 1 });
      assert.deepEqual((await request(root, 'GET', undefined, 'other')).body.activityProgress, undefined); // prerequisite access remains enforced
    });
    await t.test('Completed paid lessons still enforce access during Replay', async () => {
      await prisma.entitlement.deleteMany({ where: { userId, courseId } });
      const before = await persisted();
      assert.equal((await request('/lessons/' + paidId + '/replay/steps/' + paidSummaryId + '/check', 'POST', { text: 'a' })).body.error.code, 'LESSON_ACCESS_REQUIRED');
      assert.deepEqual(await persisted(), before);
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
