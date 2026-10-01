import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { LessonService } from '../lessons/lesson.service.js';
import { PrismaLessonRepository, type LessonSession } from '../lessons/lesson.repository.js';
import { ReviewService } from '../review/review.service.js';
import { PrismaReviewRepository } from '../review/review.repository.js';
import { ReviewBatchToken } from '../review/review.token.js';
import { UnitChallengeService } from '../unit-challenges/unit-challenge.service.js';
import { PrismaUnitChallengeRepository } from '../unit-challenges/unit-challenge.repository.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';

test('Gamification integrates actual Lesson / Review batch / Unit Challenge / Course completions atomically', {
  skip: process.env.RUN_GAMIFICATION_DB_TESTS !== '1',
}, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../shared/prisma.js');
  const now = new Date('2026-10-01T12:00:00Z'), clock = () => now;
  const user = randomUUID(), perfectUser = randomUUID(), rollbackUser = randomUUID(), courseId = randomUUID(), topicId = randomUUID();
  const lessonId = randomUUID(), challengeId = randomUUID(), activities = [randomUUID(), randomUUID()], blocks = [randomUUID(), randomUUID()];
  const lessons = new LessonService(new PrismaLessonRepository(prisma), clock);
  const challenges = new UnitChallengeService(new PrismaUnitChallengeRepository(prisma), clock);
  const review = new ReviewService(new PrismaReviewRepository(prisma), new ReviewBatchToken(randomBytes(32)), clock);
  const courses = new CourseService(new PrismaCourseRepository(prisma));
  try {
    await prisma.user.createMany({ data: [user, perfectUser, rollbackUser].map(id => ({ id, email: id + '@gamification-learning.invalid' })) });
    await prisma.course.create({ data: { id: courseId, title: 'Gamification test', slug: courseId, status: 'PUBLISHED', position: 9999 } });
    await prisma.topic.create({ data: { id: topicId, courseId, title: 'Topic', position: 1 } });
    await prisma.lesson.create({ data: { id: lessonId, topicId, title: 'Lesson', position: 1, status: 'PUBLISHED' } });
    for (let i = 0; i < 2; i++) {
      await prisma.activity.create({ data: { id: activities[i]!, type: 'MULTIPLE_CHOICE', prompt: 'Choose',
        config: { options: [{ id: 'a', text: 'Yes' }, { id: 'b', text: 'No' }], correctOptionId: 'a' } } });
      await prisma.lessonBlock.create({ data: { id: blocks[i]!, lessonId, type: 'ACTIVITY', activityId: activities[i]!, position: i + 1 } });
    }
    await prisma.unitChallenge.create({ data: { id: challengeId, topicId, title: 'Challenge', status: 'PUBLISHED', passingScore: 100,
      phases: { create: { type: 'CONVERSATION', position: 1, config: { title: 'Conversation', participants: [{ id: 'a', name: 'A' }],
        steps: [{ id: 'choice', kind: 'CHOICE', options: [{ id: 'yes', text: 'Yes' }, { id: 'no', text: 'No' }], correctOptionId: 'yes' }] } } } } });
    const finishLesson = async (id: string, answer: string) => {
      await courses.start(courseId, id);
      const run = await lessons.start(lessonId, id, randomUUID());
      await lessons.attempt(lessonId, run.runId, blocks[0]!, id, { selectedOptionId: answer });
      const result = await lessons.attempt(lessonId, run.runId, blocks[1]!, id, { selectedOptionId: answer });
      return { run, result };
    };
    // ReturnType is a JSON response, so inspect it through the same JSON shape clients receive.
    const finishChallenge = async (id: string, answer: string) => {
      const start = await challenges.start(challengeId, id, randomUUID());
      const phaseId = start.phase!.id, requestKey = randomUUID();
      const payload = { choices: [{ stepId: 'choice', optionId: answer }] };
      const response = await challenges.submit(challengeId, start.run.id, phaseId, id, requestKey, payload);
      return { response: JSON.parse(JSON.stringify(response)), retry: () => challenges.submit(challengeId, start.run.id, phaseId, id, requestKey, payload) };
    };
    await t.test('first Lesson reward and score, retries, Replay remains fully read-only', async () => {
      const { run, result } = await finishLesson(user, 'b');
      assert.equal(result.completion!.gamification.coinsEarned, 3);
      assert.deepEqual(result.completion!.gamification.coinRewards, [{ reason: 'LESSON_FIRST_COMPLETION', amount: 3 }]);
      const retries = await Promise.all([lessons.complete(lessonId, run.runId, user), lessons.complete(lessonId, run.runId, user)]);
      assert.equal(retries[0]!.gamification.coinsEarned, 0);
      const before = await prisma.gamificationLearningEvent.count({ where: { userId: user } });
      const ledgerBefore = await prisma.coinTransaction.findMany({ where: { userId: user } });
      for (const block of blocks) await lessons.replayCheck(lessonId, block!, user, { selectedOptionId: 'a' });
      assert.equal(await prisma.gamificationLearningEvent.count({ where: { userId: user } }), before);
      assert.deepEqual(await prisma.coinTransaction.findMany({ where: { userId: user } }), ledgerBefore);
      assert.equal((await prisma.lessonRun.findUniqueOrThrow({ where: { id: run.runId } })).correctAnswers, 0);
      assert.equal(await prisma.reviewItem.count({ where: { userId: user, status: 'ACTIVE' } }), 2);
    });
    await t.test('failed UC counts habit; later first pass rewards once; later perfect gives no perfect bonus; Course rewards once', async () => {
      const failed = await finishChallenge(user, 'no');
      assert.equal(failed.response.result.passed, false);
      assert.deepEqual(failed.response.gamification.coinRewards, [{ reason: 'DAILY_GOAL', amount: 10 }]);
      assert.deepEqual(await failed.retry(), failed.response);
      const pass = await finishChallenge(user, 'yes');
      assert.equal(pass.response.gamification.coinsEarned, 28);
      assert.deepEqual(pass.response.gamification.coinRewards.map((r: { reason: string }) => r.reason), ['UNIT_CHALLENGE_FIRST_PASS', 'COURSE_COMPLETION']);
      assert.deepEqual(await pass.retry(), pass.response);
      assert.equal((await finishChallenge(user, 'yes')).response.gamification.coinsEarned, 0);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: user, reason: 'COURSE_COMPLETION' } }), 1);
      assert.equal(await prisma.reviewItem.count({ where: { userId: user } }), 2);
    });
    await t.test('two-item Review batch counts only at completion, including wrong submissions; retries do not count again', async () => {
      const batch = await review.batch(user, undefined); assert.equal(batch.items.length, 2);
      const first = { batchToken: batch.batchToken, requestKey: randomUUID(), answer: { selectedOptionId: 'b' } };
      const second = { batchToken: batch.batchToken, requestKey: randomUUID(), answer: { selectedOptionId: 'a' } };
      await review.attempt(user, batch.items[0]!.id, first);
      assert.equal(await prisma.gamificationLearningEvent.count({ where: { userId: user, sourceType: 'REVIEW_BATCH' } }), 0);
      const [completed, concurrent] = await Promise.all([review.attempt(user, batch.items[1]!.id, second), review.attempt(user, batch.items[1]!.id, second)]);
      assert.deepEqual(concurrent, completed);
      assert.equal(await prisma.gamificationLearningEvent.count({ where: { userId: user, sourceType: 'REVIEW_BATCH' } }), 1);
      assert.deepEqual(await review.attempt(user, batch.items[1]!.id, second), completed);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: user, reason: { contains: 'REVIEW' } } }), 0);
    });
    await t.test('perfect first Lesson +2 and perfect first completed UC +3, independent of retries', async () => {
      const completed = await finishLesson(perfectUser, 'a'); assert.equal(completed.result.completion!.gamification.coinsEarned, 5);
      const challenge = await finishChallenge(perfectUser, 'yes');
      assert.equal(challenge.response.gamification.coinsEarned, 41); // 8 pass + 3 perfect + 20 course + 10 daily
      assert.deepEqual(await challenge.retry(), challenge.response);
      assert.equal((await finishChallenge(perfectUser, 'yes')).response.gamification.coinsEarned, 0);
    });
    await t.test('Gamification failure rolls back the source run, progression, Review, learning and coins', async () => {
      class FailingRepository extends PrismaLessonRepository {
        override write<T>(id: string, work: (session: LessonSession) => Promise<T>): Promise<T> {
          return super.write(id, session => work(new Proxy(session, { get(target, property) {
            if (property === 'gamification') return () => new Proxy(target.gamification(), { get(g, p) {
              if (p === 'createEvent') return () => { throw new Error('injected gamification failure'); };
              const value = Reflect.get(g, p); return typeof value === 'function' ? value.bind(g) : value;
            } });
            const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
          } })));
        }
      }
      const broken = new LessonService(new FailingRepository(prisma), clock);
      await courses.start(courseId, rollbackUser);
      const run = await broken.start(lessonId, rollbackUser, randomUUID());
      await broken.attempt(lessonId, run.runId, blocks[0]!, rollbackUser, { selectedOptionId: 'b' });
      await assert.rejects(broken.attempt(lessonId, run.runId, blocks[1]!, rollbackUser, { selectedOptionId: 'b' }), /injected gamification failure/);
      assert.equal((await prisma.lessonRun.findUniqueOrThrow({ where: { id: run.runId } })).status, 'ACTIVE');
      assert.equal(await prisma.lessonProgress.count({ where: { userId: rollbackUser } }), 0);
      assert.equal(await prisma.reviewItem.count({ where: { userId: rollbackUser } }), 0);
      assert.equal(await prisma.gamificationLearningEvent.count({ where: { userId: rollbackUser } }), 0);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: rollbackUser } }), 0);
    });
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [user, perfectUser, rollbackUser] } } });
    await prisma.unitChallengePhase.deleteMany({ where: { unitChallengeId: challengeId } });
    await prisma.unitChallenge.deleteMany({ where: { id: challengeId } });
    await prisma.lessonBlock.deleteMany({ where: { lessonId } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.activity.deleteMany({ where: { id: { in: activities } } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.$disconnect();
  }
});
