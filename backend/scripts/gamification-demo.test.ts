import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyDemoGamification, assertSupported, demoCommand, demoTarget } from './gamification-demo.js';
import { GamificationService } from '../src/modules/gamification/gamification.service.js';
import { PrismaGamificationRepository } from '../src/modules/gamification/gamification.repository.js';

test('demo guards pin local database and configured demo user; strict commands/amounts', () => {
  const env = { NODE_ENV: 'development', DATABASE_URL: 'postgresql://localhost:5433/teacher_alma_dev', DEV_AUTH_USER_ID: randomUUID() };
  assert.equal(demoTarget(env), env.DEV_AUTH_USER_ID);
  for (const patch of [{ NODE_ENV: 'production' }, { DATABASE_URL: 'postgresql://remote:5433/teacher_alma_dev' }, { DATABASE_URL: 'postgresql://localhost:5433/production' }, { DATABASE_URL: env.DATABASE_URL + '?schema=public' }, { DEV_AUTH_USER_ID: '' }]) assert.throws(() => demoTarget({ ...env, ...patch }));
  for (const amount of [0, 49, 50, 119, 120]) assert.deepEqual(demoCommand(['set-coins', '--amount=' + amount]), { action: 'set-coins', amount });
  for (const args of [['set-coins'], ['set-coins', '--amount=-1'], ['set-coins', '--amount=1.2'], ['set-coins', '--amount=2147483648'], ['reset-streak', '--user=other'], ['reset-inventory', '--amount=2']]) assert.throws(() => demoCommand(args));
  for (const action of ['reset-streak', 'reset-inventory'] as const) assert.doesNotThrow(() => assertSupported(demoCommand([action]).action));
  for (const action of ['reset', 'reset-daily-goal'] as const) assert.throws(() => assertSupported(action), /idempotency.*No data changed/);
});

test('unsupported resets fail before touching any transaction delegate', async () => {
  const forbidden = new Proxy({}, { get() { throw Error('Unexpected DB access'); } });
  for (const action of ['reset', 'reset-daily-goal'] as const) await assert.rejects(applyDemoGamification(forbidden as never, randomUUID(), { action }), /blocked/);
});

test('PostgreSQL demo tooling: append-only ledger, granular state, preserved sources and other users', { skip: process.env.RUN_GAMIFICATION_DB_TESTS !== '1' }, async () => {
  await import('dotenv/config'); demoTarget(process.env);
  const { prisma } = await import('../src/shared/prisma.js');
  // Disposable test users only; never run a reset against DEV_AUTH_USER_ID.
  const userId = randomUUID(), other = randomUUID(), ids = [userId, other];
  const now = new Date('2026-10-01T12:00:00Z');
  const service = new GamificationService(new PrismaGamificationRepository(prisma), () => now);
  const run = (action: Parameters<typeof applyDemoGamification>[2]) => prisma.$transaction(tx => applyDemoGamification(tx, userId, action));
  const complete = (id: string, sourceId = randomUUID()) => service.recordLearningCompletion({ userId: id, sourceId, occurredAt: now, eventType: 'REVIEW_COMPLETION', sourceType: 'REVIEW_BATCH' });
  try {
    for (const id of ids) await prisma.user.create({ data: { id, email: id + '@gamification-demo-test.invalid', timezone: 'UTC' } });
    const lesson = await prisma.lesson.findFirstOrThrow({ include: { topic: true } });
    const challenge = await prisma.unitChallenge.findFirstOrThrow();
    for (const id of ids) {
      await prisma.courseProgress.create({ data: { userId: id, courseId: lesson.topic.courseId, status: 'IN_PROGRESS' } });
      await prisma.lessonProgress.create({ data: { userId: id, lessonId: lesson.id, status: 'COMPLETED', completedAt: now } });
      const completed = await prisma.unitChallengeRun.create({ data: { userId: id, unitChallengeId: challenge.id, requestKey: randomUUID(), status: 'COMPLETED', correctItems: 1, totalItems: 1, passed: true, completedAt: now } });
      await prisma.unitChallengeProgress.create({ data: { userId: id, unitChallengeId: challenge.id, passedRunId: completed.id } });
    }
    const progressSnapshot = async () => Promise.all([
      prisma.courseProgress.findMany({ where: { userId: { in: ids } }, orderBy: { id: 'asc' } }),
      prisma.lessonProgress.findMany({ where: { userId: { in: ids } }, orderBy: { id: 'asc' } }),
      prisma.unitChallengeProgress.findMany({ where: { userId: { in: ids } }, orderBy: { id: 'asc' } }),
      prisma.unitChallengeRun.findMany({ where: { userId: { in: ids } }, orderBy: { id: 'asc' } }),
    ]);
    const originalProgress = await progressSnapshot();
    await complete(other); const untouched = await service.read(other);
    const sourceId = randomUUID(); await complete(userId, sourceId); await complete(userId);
    const rewardRows = await prisma.coinTransaction.findMany({ where: { userId }, orderBy: { id: 'asc' } });
    assert.equal(rewardRows.length, 1);
    for (const amount of [0, 49, 50, 119, 120, 0]) {
      await run({ action: 'set-coins', amount });
      const count = await prisma.coinTransaction.count({ where: { userId } });
      await run({ action: 'set-coins', amount });
      assert.equal(await prisma.coinTransaction.count({ where: { userId } }), count);
      assert.equal((await service.read(userId)).coins.balance, amount);
    }
    await Promise.all([run({ action: 'set-coins', amount: 120 }), run({ action: 'set-coins', amount: 120 })]);
    assert.equal((await service.read(userId)).coins.balance, 120);
    assert.deepEqual(await prisma.coinTransaction.findMany({ where: { userId, id: { in: rewardRows.map(r => r.id) } }, orderBy: { id: 'asc' } }), rewardRows);
    const key = randomUUID(); await service.purchase(userId, key);
    assert.equal((await service.read(userId)).streak.protectorCount, 1);
    await run({ action: 'reset-inventory' }); await run({ action: 'reset-inventory' });
    const spent = (await service.read(userId)).coins.balance;
    await service.purchase(userId, key); // Original request remains acknowledged, never debited again.
    assert.equal((await service.read(userId)).coins.balance, spent);
    assert.equal((await service.read(userId)).streak.protectorCount, 0);
    await service.purchase(userId, randomUUID());
    await prisma.coinTransaction.create({ data: { userId, amount: 10, type: 'CREDIT', reason: 'STREAK_MILESTONE', idempotencyKey: 'streak-milestone:7' } });
    const repairDebit = await prisma.coinTransaction.create({ data: { userId, amount: -1, type: 'DEBIT', reason: 'TEST_FIXTURE', idempotencyKey: randomUUID() } });
    const used = await prisma.streakRepair.create({ data: { userId, brokenDate: new Date('2026-09-29'), previousStreakDays: 4,
      createdAt: new Date('2026-09-30T10:00:00Z'), eligibleUntil: now, status: 'USED', repairedAt: new Date('2026-09-30T11:00:00Z'), coinTransactionId: repairDebit.id } });
    const eligible = await prisma.streakRepair.create({ data: { userId, brokenDate: new Date('2026-09-30'), previousStreakDays: 4,
      createdAt: new Date('2026-10-01T10:00:00Z'), eligibleUntil: new Date('2026-10-02T10:00:00Z') } });
    const item = await prisma.shopItem.findUniqueOrThrow({ where: { code: 'STREAK_PROTECTOR' } });
    await prisma.streakProtectionEvent.create({ data: { userId, shopItemId: item.id, protectedDate: new Date('2026-09-28') } });
    const before = await service.read(userId), events = await prisma.gamificationLearningEvent.findMany({ where: { userId }, orderBy: { id: 'asc' } });
    await run({ action: 'reset-streak' }); await run({ action: 'reset-streak' });
    const reset = await service.read(userId);
    assert.equal(await prisma.streakProtectionEvent.count({ where: { userId } }), 0);
    assert.equal((await prisma.streakRepair.findUniqueOrThrow({ where: { id: eligible.id } })).status, 'INVALIDATED');
    assert.deepEqual(await prisma.streakRepair.findUniqueOrThrow({ where: { id: used.id } }), used);
    assert.ok(await prisma.coinTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: 'streak-milestone:7' } } }));
    assert.equal(reset.streak.currentDays, 0); assert.equal(reset.streak.activeToday, false);
    assert.equal(reset.streak.longestDays, before.streak.longestDays);
    assert.equal(reset.streak.protectorCount, before.streak.protectorCount);
    assert.deepEqual(reset.coins, before.coins); assert.deepEqual(reset.dailyGoal, before.dailyGoal);
    assert.deepEqual(await prisma.gamificationLearningEvent.findMany({ where: { userId }, orderBy: { id: 'asc' } }), events);
    assert.equal((await complete(userId, sourceId)).streak.advancedToday, false);
    assert.equal((await service.read(userId)).streak.currentDays, 0);
    const fresh = await complete(userId); assert.equal(fresh.streak.currentDays, 1); assert.equal(fresh.streak.advancedToday, true); assert.equal(fresh.coinsEarned, 0);
    assert.deepEqual(await service.read(other), untouched);
    assert.deepEqual(await progressSnapshot(), originalProgress);
    assert.equal(await prisma.lessonRun.count({ where: { userId: { in: ids } } }), 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids }, email: { endsWith: '@gamification-demo-test.invalid' } } });
    await prisma.$disconnect();
  }
});
