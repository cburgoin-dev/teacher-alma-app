import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { demoId } from './courses-demo-data.js';
import { createApp } from '../src/shared/app.js';
import { developmentAuth } from '../src/shared/auth.js';
import { CourseService } from '../src/modules/courses/course.service.js';
import { PrismaCourseRepository } from '../src/modules/courses/course.repository.js';
import { ReviewService } from '../src/modules/review/review.service.js';
import { PrismaReviewRepository } from '../src/modules/review/review.repository.js';
import { ReviewBatchToken } from '../src/modules/review/review.token.js';

// Explicit opt-in: restores ONLY the configured user's named demo fixtures.
test('demo prepare -> HTTP Review attempt -> scoped reset -> prepare again', {
  skip: process.env.RUN_REVIEW_DEMO_RESET_TESTS !== '1',
}, async () => {
  const run = (...args: string[]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', ...args],
      { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
    assert.equal(result.status, 0, 'Guarded demo command failed: ' + args.join(' '));
  };
  run('scripts/seed-courses-demo.ts', '--check');
  const { prisma } = await import('../src/shared/prisma.js');
  const userId = process.env.DEV_AUTH_USER_ID!;
  const activityIds = [30001, 30002, 30003, 30004, 30005, 30006].map(demoId);
  const otherUser = randomUUID(), unrelatedActivity = randomUUID();
  const sentinelItems: string[] = [], sentinelAttempts: string[] = [];
  const service = new ReviewService(new PrismaReviewRepository(prisma), new ReviewBatchToken(randomBytes(32)));
  const server = createApp(new CourseService(new PrismaCourseRepository(prisma)),
    developmentAuth('development', userId), undefined, service).listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    run('scripts/seed-courses-demo.ts', '--reset', '--lessons');
    run('../mobile/scripts/prepare-review-demo.mjs', '--prepare');
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
    const request = async (path: string, body?: unknown) => {
      const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assert.equal(res.status, 200, path); return res.json();
    };
    assert.equal((await request('/review')).state, 'READY');
    const batch = await request('/review/batches', { preferredLessonId: demoId(1003) });
    assert.equal(batch.items.length, 5);
    const selected = batch.items.find((i: { activity: { type: string } }) => i.activity.type === 'MULTIPLE_CHOICE');
    assert.ok(selected);
    const body = { batchToken: batch.batchToken, requestKey: randomUUID(), answer: { selectedOptionId: 'bye' } };
    const submitted = await request('/review/items/' + selected.id + '/attempt', body);
    assert.equal(submitted.reviewItem.status, 'ACTIVE');
    assert.deepEqual(await request('/review/items/' + selected.id + '/attempt', body), submitted);
    const attempt = await prisma.activityAttempt.findUniqueOrThrow({ where: { id: submitted.attempt.id } });
    assert.equal(attempt.context, 'REVIEW'); assert.ok(attempt.reviewBatchId); assert.ok(attempt.reviewItemId);
    // A legacy/null lessonId must still be cleaned through its scoped ReviewItem.
    await prisma.activityAttempt.update({ where: { id: attempt.id }, data: { lessonId: null } });
    await prisma.user.create({ data: { id: otherUser, email: otherUser + '@reset-sentinel.invalid' } });
    await prisma.activity.create({ data: { id: unrelatedActivity, type: 'FILL_BLANK_TEXT', prompt: 'Reset scope sentinel',
      config: { acceptedAnswers: ['sentinel'] } } });
    for (const [owner, activityId] of [[otherUser, activityIds[0]!], [userId, unrelatedActivity]]) {
      const item = await prisma.reviewItem.create({ data: { userId: owner!, activityId: activityId!, sourceLessonId: demoId(1003) } });
      sentinelItems.push(item.id);
      const saved = await prisma.activityAttempt.create({ data: { userId: owner!, activityId: activityId!,
        lessonId: demoId(1003), reviewItemId: item.id, context: 'REVIEW', answerData: { text: 'sentinel' },
        isCorrect: false, reviewRequestKey: randomUUID(), reviewRequestHash: 'sentinel', reviewResult: {}, reviewBatchId: randomUUID() } });
      sentinelAttempts.push(saved.id);
    }
    const before = await prisma.activityAttempt.findMany({ where: { id: { in: sentinelAttempts } }, orderBy: { id: 'asc' } });
    run('scripts/seed-courses-demo.ts', '--reset', '--lessons');
    assert.equal(await prisma.activityAttempt.count({ where: { userId, activityId: { in: activityIds } } }), 0);
    assert.equal(await prisma.reviewItem.count({ where: { userId, activityId: { in: activityIds } } }), 0);
    assert.deepEqual(await prisma.activityAttempt.findMany({ where: { id: { in: sentinelAttempts } }, orderBy: { id: 'asc' } }), before);
    assert.equal(await prisma.reviewItem.count({ where: { id: { in: sentinelItems } } }), 2);
    run('../mobile/scripts/prepare-review-demo.mjs', '--prepare');
    assert.equal(await prisma.reviewItem.count({ where: { userId, activityId: { in: activityIds }, status: 'ACTIVE' } }), 6);
    assert.equal(await prisma.activityAttempt.count({ where: { userId, activityId: { in: activityIds }, context: 'REVIEW' } }), 0);
    assert.equal(await prisma.activityAttempt.count({ where: { userId, activityId: { in: activityIds }, context: 'LESSON', reviewItemId: null } }), 0);
    assert.equal(await prisma.activityAttempt.count({ where: { userId, context: 'REVIEW', reviewBatchId: { not: null }, reviewItemId: null } }), 0);
    run('../mobile/scripts/prepare-review-demo.mjs', '--prepare', '--baseline');
    const courses = new CourseService(new PrismaCourseRepository(prisma));
    const roadmap = await courses.roadmap(demoId(1), userId);
    assert.equal(roadmap.progress.completedLessons, 2);
    assert.equal(roadmap.progress.totalLessons, 8);
    const lessonStates = roadmap.topics.flatMap(t => t.lessons);
    assert.equal(lessonStates.find(l => l.id === demoId(1003))?.progression.isCurrent, true);
    for (const id of [1003, 1004].map(demoId)) assert.equal(lessonStates.find(l => l.id === id)?.progressStatus, 'NOT_STARTED');
    assert.equal((await courses.detail(demoId(2), userId)).progress, null);
    assert.equal(await prisma.lessonRun.count({ where: { userId, status: 'ACTIVE' } }), 0);
    assert.equal(await prisma.reviewItem.count({ where: { userId, activityId: { in: activityIds }, status: 'ACTIVE' } }), 6);
    console.log('PASS: scoped reset, HTTP Review, preserved sentinels, final baseline A1 2/8 + six ACTIVE Review items.');
  } finally {
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    await prisma.activityAttempt.deleteMany({ where: { id: { in: sentinelAttempts } } });
    await prisma.reviewItem.deleteMany({ where: { id: { in: sentinelItems } } });
    await prisma.activity.deleteMany({ where: { id: unrelatedActivity } });
    await prisma.user.deleteMany({ where: { id: otherUser } });
    await prisma.$disconnect();
  }
});
