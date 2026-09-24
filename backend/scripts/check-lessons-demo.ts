import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { demoId } from './courses-demo-data.js';
import { createApp } from '../src/shared/app.js';
import { developmentAuth } from '../src/shared/auth.js';
import { CourseService } from '../src/modules/courses/course.service.js';
import { PrismaCourseRepository } from '../src/modules/courses/course.repository.js';
import { LessonService } from '../src/modules/lessons/lesson.service.js';
import { PrismaLessonRepository } from '../src/modules/lessons/lesson.repository.js';

// Explicit development reset-and-check command; seed owns all environment guards.
function seed(...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-courses-demo.ts', ...args],
    { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Guarded demo seed failed; inspect local configuration.');
}
async function main() {
  if (!process.argv.includes('--run')) throw new Error('Use --run: resets only the configured user’s demo learning data.');
  seed('--reset', '--lessons');
  const { prisma } = await import('../src/shared/prisma.js');
  const userId = process.env.DEV_AUTH_USER_ID!;
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  const lessons = new LessonService(new PrismaLessonRepository(prisma));
  const server = createApp(courses, developmentAuth(process.env.NODE_ENV, userId), lessons).listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    async function request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      assert.equal(response.status, 200, path);
      return response.json() as Promise<T>;
    }
    seed('--apply'); seed('--apply');
    assert.equal((await courses.roadmap(demoId(1), userId)).progress.completedLessons, 2, 'apply preserves scenario progress');
    assert.equal(await prisma.lessonBlock.count({ where: { lessonId: { in: [demoId(1003), demoId(1004)] } } }), 11);
    for (const n of [1003, 1004]) {
      const root = `/lessons/${demoId(n)}`;
      const data = await request<Awaited<ReturnType<LessonService['read']>>>(root, undefined, 'GET');
      assert.equal(data.steps.length, 4);
      if (n === 1003) assert.ok(data.steps[0]!.blocks.some(b => b.type === 'VIDEO'));
      await request(root + '/start');
      await request(`${root}/steps/${data.steps[0]!.id}/complete`);
      const answers = n === 1003 ? [{ selectedOptionId: 'bye' }, { selectedOptionId: 'hello' }]
        : [{ text: ' AM ' }, { pairs: [{ wordId: 'book', imageId: 'book-image' }, { wordId: 'cup', imageId: 'cup-image' }, { wordId: 'ball', imageId: 'ball-image' }] }];
      for (let i = 0; i < answers.length; i++) {
        const result = await request<Awaited<ReturnType<LessonService['attempt']>>>(`${root}/steps/${data.steps[i + 1]!.id}/attempt`, answers[i]);
        assert.equal(result.attempt.isCorrect, !(n === 1003 && i === 0));
      }
      if (n === 1003) {
        const retry = await request<Awaited<ReturnType<LessonService['attempt']>>>(`${root}/steps/${data.steps[1]!.id}/attempt`, { selectedOptionId: 'hello' });
        assert.equal(retry.attempt.countsForLessonScore, false); assert.equal(retry.review.pending, true);
      }
      await request(`${root}/steps/${data.steps[3]!.id}/complete`);
      const result = await request<Awaited<ReturnType<LessonService['complete']>>>(root + '/complete');
      assert.equal(result.result.correctAnswers, n === 1003 ? 1 : 2);
      assert.equal(result.result.pendingReviewCount, n === 1003 ? 1 : 0);
      assert.equal(result.result.isPerfect, n === 1004);
      if (n === 1004) { assert.equal(result.nextLesson?.lockReason, 'ACCESS'); assert.equal(result.nextLesson?.accessible, false); }
    }
    const path = await courses.roadmap(demoId(1), userId);
    assert.equal(path.progress.completedLessons, 4);
    assert.equal(path.topics.flatMap(t => t.lessons)[4]!.progression.lockReason, 'ACCESS');
    seed('--reset'); assert.equal((await courses.roadmap(demoId(1), userId)).progress.completedLessons, 3);
    seed('--reset', '--lessons'); seed('--reset', '--lessons');
    assert.equal((await courses.roadmap(demoId(1), userId)).progress.completedLessons, 2);
    assert.equal(await prisma.activityAttempt.count({ where: { userId, activityId: { in: [30001, 30002, 30003, 30004].map(demoId) } } }), 0);
    assert.equal(await prisma.reviewItem.count({ where: { userId, activityId: { in: [30001, 30002, 30003, 30004].map(demoId) } } }), 0);
    console.log('PASS: real HTTP flow, 4 activities, incorrect/retry, PERFECT, Review, ACCESS, idempotent apply/reset. Ready: A1 2/8, A2 unstarted.');
  } finally {
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    await prisma.$disconnect();
    seed('--reset', '--lessons');
  }
}
main().catch(() => { console.error('Demo integration failed. Connection details withheld.'); process.exitCode = 1; });
