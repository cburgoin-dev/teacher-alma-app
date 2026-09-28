import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { demoCourses, demoId } from './courses-demo-data.js';
import { unitChallengeDemo } from './unit-challenge-demo-data.js';
import { validatePublishedTopics } from '../src/modules/unit-challenges/unit-challenge.content.js';

test('every published demo Topic has a valid deterministic Conversation/Crossword', () => {
  for (const course of demoCourses()) {
    const topics = course.topics.map(topic => {
      const demo = unitChallengeDemo(topic.id, Number(topic.id.slice(-12)), topic.unitChallenge!.accessType);
      assert.equal(demo.challenge.id, topic.unitChallenge!.id);
      assert.deepEqual(demo.phases.map(p => p.type), ['CONVERSATION', 'CROSSWORD']);
      return { lessons: topic.lessons, unitChallenge: { ...demo.challenge, phases: demo.phases } };
    });
    validatePublishedTopics(topics);
  }
});

test('demo seed/check and real Lessons -> Challenge -> next Topic HTTP acceptance with isolated learner', {
  skip: process.env.RUN_UNIT_CHALLENGE_DEMO_TESTS !== '1',
}, async () => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../src/shared/prisma.js');
  const userId = randomUUID();
  const run = (...args: string[]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', ...args],
      { cwd: fileURLToPath(new URL('..', import.meta.url)), env: { ...process.env, DEV_AUTH_USER_ID: userId }, encoding: 'utf8' });
    assert.equal(result.status, 0, 'Demo acceptance command failed: ' + args.join(' '));
  };
  try {
    await prisma.user.create({ data: { id: userId, email: userId + '@challenge-demo-test.invalid' } });
    run('scripts/check-lessons-demo.ts', '--run');
    run('scripts/seed-courses-demo.ts', '--reset', '--access-boundary');
    const progress = await prisma.unitChallengeProgress.findUniqueOrThrow({
      where: { userId_unitChallengeId: { userId, unitChallengeId: demoId(50101) } } });
    const before = await prisma.unitChallengeRun.findUniqueOrThrow({ where: { id: progress.passedRunId }, include: { phases: true } });
    assert.equal(before.status, 'COMPLETED'); assert.equal(before.passed, true);
    run('scripts/seed-courses-demo.ts', '--apply');
    run('scripts/seed-courses-demo.ts', '--check');
    assert.deepEqual(await prisma.unitChallengeRun.findUniqueOrThrow({ where: { id: before.id }, include: { phases: true } }), before);
    run('scripts/seed-courses-demo.ts', '--reset', '--lessons');
    assert.equal(await prisma.unitChallengeRun.count({ where: { userId } }), 0);
    assert.equal(await prisma.unitChallengeProgress.count({ where: { userId } }), 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
