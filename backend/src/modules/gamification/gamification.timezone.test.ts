import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { userTimezone } from './gamification.rules.js';
import { GamificationService } from './gamification.service.js';
import { PrismaGamificationRepository } from './gamification.repository.js';
import { createApp } from '../../shared/app.js';
import { CourseService } from '../courses/course.service.js';
import { PrismaCourseRepository } from '../courses/course.repository.js';

test('timezone request validation accepts IANA identifiers and rejects invalid input and offsets with 400', () => {
  for (const zone of ['America/Mazatlan', 'Asia/Tokyo', 'UTC', 'Etc/GMT+7']) assert.equal(userTimezone(zone), zone);
  for (const value of [undefined, null, 7, true, {}, [], '', '   ', 'invalid/timezone', 'UTC-7', '+07:00', '-0700']) {
    assert.throws(() => userTimezone(value), { status: 400, code: 'INVALID_USER_TIMEZONE' });
  }
});

test('timezone HTTP sync is authenticated, idempotent and changes only future learning dates', {
  skip: process.env.RUN_GAMIFICATION_DB_TESTS !== '1',
}, async () => {
  await import('dotenv/config');
  const target = new URL(process.env.DATABASE_URL ?? '');
  assert.ok(process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    && target.port === '5433' && target.pathname === '/teacher_alma_dev');
  const { prisma } = await import('../../shared/prisma.js');
  const userId = randomUUID(), freshId = randomUUID();
  const now = new Date('2026-10-01T00:30:00Z');
  const service = new GamificationService(new PrismaGamificationRepository(prisma), () => now);
  const snapshot = () => Promise.all([
    prisma.learningDay.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    prisma.gamificationLearningEvent.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    prisma.userStreak.findUnique({ where: { userId } }),
    prisma.gamificationSettings.findUnique({ where: { userId } }),
    prisma.coinTransaction.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    prisma.userInventory.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    prisma.streakProtectionEvent.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
    prisma.streakRepair.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
  ]);
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await prisma.user.createMany({ data: [userId, freshId].map(id => ({ id, email: id + '@timezone.invalid' })) });
    server = createApp(new CourseService(new PrismaCourseRepository(prisma)), (req, _res, next) => {
      if (req.headers['x-test-auth'] !== 'none') req.auth = { userId }; next();
    }, undefined, undefined, undefined, service).listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server!.once('listening', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me/gamification/timezone`;
    const patch = async (body: unknown, auth = 'yes') => {
      const response = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-test-auth': auth }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await patch({ timezone: 'America/Mazatlan' }, 'none')).status, 401);
    assert.deepEqual(await patch({ timezone: 'America/Mazatlan' }), { status: 200, body: { timezone: 'America/Mazatlan' } });
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.deepEqual(await patch({ timezone: 'America/Mazatlan' }), { status: 200, body: { timezone: 'America/Mazatlan' } });
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: userId } }), unchanged);
    for (const body of [{}, { timezone: null }, { timezone: 3 }, { timezone: '' }, { timezone: '  ' },
      { timezone: 'invalid/timezone' }, { timezone: 'UTC-7' }, { timezone: '+07:00' }, { timezone: '-0700' }]) {
      const rejected = await patch(body);
      assert.equal(rejected.status, 400); assert.equal(rejected.body.error.code, 'INVALID_USER_TIMEZONE');
    }
    assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: userId } }), unchanged);
    await service.changeTimezone(freshId, 'Asia/Tokyo');
    assert.equal(await prisma.userStreak.count({ where: { userId: freshId } }), 0);
    assert.equal(await prisma.gamificationSettings.count({ where: { userId: freshId } }), 0);

    const sourceId = randomUUID();
    const completion = { userId, sourceId, occurredAt: now, sourceType: 'REVIEW_BATCH', eventType: 'REVIEW_COMPLETION' } as const;
    await service.recordLearningCompletion(completion);
    await service.changeGoal(userId, 'CASUAL'); // populated reward ledger
    const item = await prisma.shopItem.findUniqueOrThrow({ where: { code: 'STREAK_PROTECTOR' } });
    await prisma.userInventory.create({ data: { userId, shopItemId: item.id, quantity: 1 } });
    await prisma.streakProtectionEvent.create({ data: { userId, shopItemId: item.id, protectedDate: new Date('2026-09-28') } });
    await prisma.streakRepair.create({ data: { userId, brokenDate: new Date('2026-09-27'), previousStreakDays: 2,
      status: 'INVALIDATED', createdAt: new Date('2026-09-28'), eligibleUntil: new Date('2026-09-29') } });
    const before = await snapshot();
    assert.deepEqual(await patch({ timezone: 'Asia/Tokyo' }), { status: 200, body: { timezone: 'Asia/Tokyo' } });
    assert.deepEqual(await snapshot(), before, 'timezone sync must not reconcile or mutate historical state');
    await service.recordLearningCompletion({ ...completion, sourceId: randomUUID() });
    await service.recordLearningCompletion(completion); // retry cannot re-derive the old date
    const events = await prisma.gamificationLearningEvent.findMany({ where: { userId } });
    assert.equal(events.length, 2);
    assert.equal(events.find(e => e.sourceId === sourceId)!.learningDate.toISOString().slice(0, 10), '2026-09-30');
    assert.equal(events.find(e => e.sourceId !== sourceId)!.learningDate.toISOString().slice(0, 10), '2026-10-01');
    const days = await prisma.learningDay.findMany({ where: { userId }, orderBy: { activityDate: 'asc' } });
    assert.deepEqual(days.map(d => d.activityDate.toISOString().slice(0, 10)), ['2026-09-30', '2026-10-01']);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    await prisma.user.deleteMany({ where: { id: { in: [userId, freshId] } } });
    await prisma.$disconnect();
  }
});
