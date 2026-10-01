import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { GamificationService } from './gamification.service.js';
import { PrismaGamificationRepository, type GamificationSession } from './gamification.repository.js';
import { DAY_MS, GOALS } from './gamification.rules.js';
import { createApp } from '../../shared/app.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';

test('Gamification PostgreSQL: habits, ledger, concurrency and HTTP', { skip: process.env.RUN_GAMIFICATION_DB_TESTS !== '1' }, async t => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../shared/prisma.js');
  const users: string[] = [];
  const item = await prisma.shopItem.findUniqueOrThrow({ where: { code: 'STREAK_PROTECTOR' } });
  let now = new Date('2026-09-01T12:00:00Z');
  const service = new GamificationService(new PrismaGamificationRepository(prisma), () => now);
  const user = async () => {
    now = new Date('2026-09-01T12:00:00Z');
    const id = randomUUID(); users.push(id); await prisma.user.create({ data: { id, email: id + '@gamification.invalid' } }); return id;
  };
  const advance = (days = 1) => { now = new Date(now.getTime() + days * DAY_MS); };
  const complete = (userId: string, sourceId = randomUUID()) => service.recordLearningCompletion({ userId, sourceId, occurredAt: now, eventType: 'REVIEW_COMPLETION', sourceType: 'REVIEW_BATCH' });
  const funds = (userId: string, amount: number) => prisma.coinTransaction.create({ data: { userId, amount, type: 'CREDIT', reason: 'TEST_FIXTURE', idempotencyKey: randomUUID() } });
  const stock = (userId: string, quantity: number) => prisma.userInventory.create({ data: { userId, shopItemId: item.id, quantity } });
  const expectError = (promise: Promise<unknown>, code: string) => assert.rejects(promise, (e: { code?: string }) => e.code === code);
  try {
    await t.test('first day, same-day sessions, source retries, next day and longest', async () => {
      const id = await user(), source = randomUUID();
      const first = await complete(id, source); assert.equal(first.streak.currentDays, 1); assert.equal(first.streak.advancedToday, true);
      const second = await complete(id); assert.equal(second.streak.currentDays, 1); assert.equal(second.streak.advancedToday, false);
      assert.equal(second.dailyGoal.rewardEarnedNow, 10);
      const retry = await complete(id, source); assert.equal(retry.coinsEarned, 0); assert.equal(retry.dailyGoal.progress, 2);
      advance(); assert.equal((await complete(id)).streak.currentDays, 2);
      advance(3); const broken = await service.read(id); assert.equal(broken.streak.currentDays, 0); assert.equal(broken.streak.longestDays, 2);
      assert.equal(broken.streak.repair, null); assert.equal(await prisma.learningDay.count({ where: { userId: id } }), 2);
    });
    for (const [missed, owned, expected, consumed] of [[1, 1, 1, 1], [2, 2, 1, 2], [2, 1, 0, 1]]) {
      await t.test(`${missed} missed days / ${owned} protectors: only continuity, no fake learning or coins`, async () => {
        const id = await user(); await stock(id, owned!); await complete(id); advance(missed! + 1);
        const state = await service.read(id); assert.equal(state.streak.currentDays, expected); assert.equal(state.streak.protectorCount, owned! - consumed!);
        assert.equal(await prisma.streakProtectionEvent.count({ where: { userId: id } }), consumed);
        assert.equal(await prisma.learningDay.count({ where: { userId: id } }), 1);
        assert.equal(state.dailyGoal.progress, 0); assert.equal(state.coins.balance, 0);
        assert.equal((await service.read(id)).streak.protectorCount, state.streak.protectorCount);
        assert.equal((await complete(id)).streak.currentDays, expected! + 1);
      });
    }
    await t.test('second missed day invalidates candidate and buying stock cannot retroactively cover the break', async () => {
      const id = await user(); await complete(id); advance(2);
      const candidate = (await service.read(id)).streak.repair!; assert.ok(candidate);
      await stock(id, 2); advance(); assert.equal((await service.read(id)).streak.repair, null);
      assert.equal((await prisma.streakRepair.findUniqueOrThrow({ where: { id: candidate.id } })).status, 'INVALIDATED');
      assert.equal((await service.read(id)).streak.protectorCount, 2);
      await expectError(service.repair(id, randomUUID(), candidate.id), 'STREAK_REPAIR_NOT_ELIGIBLE');
    });
    await t.test('repair atomic payment, retry, no fake learning/rewards, real day retained and cooldown boundary', async () => {
      const id = await user(); await funds(id, 400); await complete(id); advance(); await complete(id); advance(2);
      const candidate = (await service.read(id)).streak.repair!; assert.equal(candidate.previousDays, 2);
      await complete(id); // today's real learning must survive repairing the preceding break.
      const count = await prisma.learningDay.count({ where: { userId: id } });
      const key = randomUUID();
      const results = await Promise.all([service.repair(id, key, candidate.id), service.repair(id, key, candidate.id)]);
      assert.equal(results[0]!.coins.balance, 280); assert.equal(results[0]!.streak.currentDays, 3);
      assert.equal(results[1]!.streak.currentDays, 3);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: id, reason: 'STREAK_REPAIR' } }), 1);
      assert.equal(await prisma.learningDay.count({ where: { userId: id } }), count);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: id, type: 'CREDIT', reason: { not: 'TEST_FIXTURE' } } }), 0);
      await expectError(service.repair(id, randomUUID(), candidate.id), 'ALREADY_REPAIRED');
      await expectError(service.repair(id, key, randomUUID()), 'IDEMPOTENCY_CONFLICT');
      advance(2); assert.equal((await service.read(id)).streak.repair, null);
      await expectError(service.repair(id, randomUUID(), randomUUID()), 'STREAK_REPAIR_COOLDOWN');
      advance(10); await complete(id); advance(2); assert.ok((await service.read(id)).streak.repair);
    });
    await t.test('24h expiry is timestamp based, insufficient balance rolls back and different requests charge once', async () => {
      const id = await user(); await complete(id); advance(2);
      const candidate = (await service.read(id)).streak.repair!;
      await expectError(service.repair(id, randomUUID(), candidate.id), 'INSUFFICIENT_COINS');
      assert.equal((await prisma.streakRepair.findUniqueOrThrow({ where: { id: candidate.id } })).status, 'ELIGIBLE');
      await complete(id); // no second missed day when the 24-hour window closes tomorrow.
      advance(); assert.equal((await service.read(id)).streak.repair, null);
      await expectError(service.repair(id, randomUUID(), candidate.id), 'STREAK_REPAIR_EXPIRED');
      const other = await user(); await funds(other, 150); await complete(other); advance(2);
      const active = (await service.read(other)).streak.repair!;
      const attempts = await Promise.allSettled([service.repair(other, randomUUID(), active.id), service.repair(other, randomUUID(), active.id)]);
      assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
      assert.equal((await service.read(other)).coins.balance, 30);
    });
    await t.test('a break observed during cooldown cannot become eligible later without a new break', async () => {
      const id = await user(); await funds(id, 200); await complete(id); advance(2);
      const candidate = (await service.read(id)).streak.repair!;
      await service.repair(id, randomUUID(), candidate.id); await complete(id); advance(2);
      assert.equal((await service.read(id)).streak.repair, null);
      for (let i = 0; i < 14; i++) { await complete(id); advance(); }
      assert.equal((await service.read(id)).streak.repair, null);
    });
    for (const selected of ['CASUAL', 'NORMAL', 'INTENSE'] as const) await t.test(`${selected} reward automatic once/day under concurrent completions`, async () => {
      const id = await user(); await service.changeGoal(id, selected);
      await Promise.all(Array.from({ length: 4 }, () => complete(id)));
      const result = await service.read(id); assert.equal(result.dailyGoal.progress, 4); assert.equal(result.coins.balance, GOALS[selected].reward);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: id, reason: 'DAILY_GOAL' } }), 1);
    });
    await t.test('goal change before reward, lowering completes immediately, later changes deferred to next local day', async () => {
      const id = await user(); await complete(id); await service.changeGoal(id, 'INTENSE');
      const lowered = await service.changeGoal(id, 'CASUAL'); assert.equal(lowered.coinsEarned, 5); assert.equal(lowered.applies, 'TODAY');
      const pending = await service.changeGoal(id, 'INTENSE'); assert.equal(pending.applies, 'NEXT_LOCAL_DAY');
      assert.equal(pending.dailyGoal.preset, 'CASUAL'); assert.equal(pending.dailyGoal.pendingPreset, 'INTENSE');
      advance(); const next = await service.read(id); assert.equal(next.dailyGoal.preset, 'INTENSE'); assert.equal(next.dailyGoal.pendingPreset, null);
      assert.equal(next.dailyGoal.completed, false); assert.equal(next.coins.balance, 5);
    });
    await t.test('purchase retries, concurrent spend cannot overdraw, max stock and cross-operation key conflict', async () => {
      const id = await user(); await expectError(service.purchase(id, randomUUID()), 'INSUFFICIENT_COINS');
      await funds(id, 75); const key = randomUUID();
      await Promise.all([service.purchase(id, key), service.purchase(id, key)]);
      assert.equal((await service.read(id)).coins.balance, 25); assert.equal((await service.read(id)).streak.protectorCount, 1);
      await expectError(service.repair(id, key, randomUUID()), 'IDEMPOTENCY_CONFLICT');
      const other = await user(); await funds(other, 75);
      const results = await Promise.allSettled([service.purchase(other, randomUUID()), service.purchase(other, randomUUID())]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal((await service.read(other)).coins.balance, 25);
      await funds(other, 200);
      const capped = await Promise.allSettled([service.purchase(other, randomUUID()), service.purchase(other, randomUUID())]);
      assert.equal(capped.filter(r => r.status === 'fulfilled').length, 1); assert.equal((await service.read(other)).streak.protectorCount, 2);
      await expectError(service.purchase(other, randomUUID()), 'PROTECTOR_STOCK_FULL');
    });
    await t.test('milestones are lifetime unique after a break and preserve longest', async () => {
      const id = await user();
      await service.changeGoal(id, 'INTENSE');
      for (let i = 0; i < 6; i++) { await complete(id); advance(); }
      await Promise.all([complete(id), complete(id)]);
      assert.equal((await service.read(id)).coins.balance, 10); advance(3);
      for (let i = 0; i < 7; i++) { await complete(id); if (i < 6) advance(); }
      const state = await service.read(id); assert.equal(state.coins.balance, 10); assert.equal(state.streak.longestDays, 7);
      assert.equal(await prisma.coinTransaction.count({ where: { userId: id, reason: 'STREAK_MILESTONE' } }), 1);
    });
    await t.test('unavailable catalog rejects purchase without a ledger or inventory mutation', async () => {
      class UnavailableCatalog extends PrismaGamificationRepository {
        override write<T>(id: string, work: (session: GamificationSession) => Promise<T>): Promise<T> {
          return super.write(id, session => work(new Proxy(session, { get(target, property) {
            if (property === 'catalog') return async () => null;
            const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
          } })));
        }
      }
      const id = await user(); await funds(id, 100);
      await expectError(new GamificationService(new UnavailableCatalog(prisma), () => now).purchase(id, randomUUID()), 'ITEM_UNAVAILABLE');
      assert.equal((await service.read(id)).coins.balance, 100);
      assert.equal((await service.read(id)).streak.protectorCount, 0);
    });
    await t.test('concurrent same-source replay and timezone changes never rewrite the original date', async () => {
      const id = await user(); await prisma.user.update({ where: { id }, data: { timezone: 'America/Chihuahua' } });
      now = new Date('2026-10-01T00:30:00Z'); const source = randomUUID();
      await Promise.all([complete(id, source), complete(id, source)]);
      await prisma.user.update({ where: { id }, data: { timezone: 'Asia/Tokyo' } });
      await complete(id, source);
      const events = await prisma.gamificationLearningEvent.findMany({ where: { userId: id } });
      assert.equal(events.length, 1); assert.equal(events[0]!.learningDate.toISOString().slice(0, 10), '2026-09-30');
      await complete(id); assert.equal((await service.read(id)).dailyGoal.progress, 1);
    });
    await t.test('HTTP aggregate, patch, purchase, repair, auth, validation and no generic award route', async () => {
      const id = await user(); await funds(id, 250); await complete(id); advance(2);
      const app = createApp(new CourseService(new PrismaCourseRepository(prisma)), (req, _res, next) => {
        if (req.headers['x-test-auth'] !== 'none') req.auth = { userId: id }; next();
      }, undefined, undefined, undefined, service);
      const server = app.listen(0, '127.0.0.1');
      await new Promise<void>(resolve => server.once('listening', resolve));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me/gamification`;
      const request = async (suffix = '', method = 'GET', body?: unknown, auth = 'yes') => {
        const res = await fetch(base + suffix, { method, headers: { 'content-type': 'application/json', 'x-test-auth': auth }, ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
        return { status: res.status, body: await res.json().catch(() => null) };
      };
      try {
        for (const [path, method] of [['', 'GET'], ['/daily-goal', 'PATCH'], ['/protectors/purchase', 'POST'], ['/streak/repair', 'POST']]) assert.equal((await request(path, method, {}, 'none')).status, 401);
        const read = await request(); assert.equal(read.status, 200); assert.equal(read.body.coins.balance, 250);
        assert.equal((await request('/daily-goal', 'PATCH', { preset: 'BAD' })).body.error.code, 'INVALID_DAILY_GOAL_PRESET');
        assert.equal((await request('/daily-goal', 'PATCH', { preset: 'CASUAL' })).status, 200);
        assert.equal((await request('/protectors/purchase', 'POST', { requestKey: 'bad' })).status, 400);
        const key = randomUUID(); const purchase = await request('/protectors/purchase', 'POST', { requestKey: key });
        assert.equal(purchase.body.coins.balance, 200);
        assert.deepEqual((await request('/protectors/purchase', 'POST', { requestKey: key })).body, purchase.body);
        const repaired = await request('/streak/repair', 'POST', { requestKey: randomUUID(), repairId: read.body.streak.repair.id });
        assert.equal(repaired.status, 200); assert.equal(repaired.body.coins.balance, 80); assert.equal(repaired.body.streak.currentDays, 1);
        assert.equal((await request('/award-coins', 'POST', { amount: 100 })).status, 404);
      } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
    });
  } finally { await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect(); }
});
