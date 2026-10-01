import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { fail } from './gamification.rules.js';

/** All writes run under the owning user's row lock, including calls from learning domains. */
export class GamificationSession {
  constructor(private readonly db: Prisma.TransactionClient) {}
  user(userId: string) { return this.db.user.findUnique({ where: { id: userId }, select: { timezone: true } }); }
  async initialize(userId: string) {
    const streak = await this.db.userStreak.upsert({ where: { userId }, create: { userId }, update: {} });
    const settings = await this.db.gamificationSettings.upsert({ where: { userId }, create: { userId }, update: {} });
    return { streak, settings };
  }
  settings(userId: string, data: Prisma.GamificationSettingsUpdateInput) { return this.db.gamificationSettings.update({ where: { userId }, data }); }
  streak(userId: string, data: Prisma.UserStreakUpdateInput) { return this.db.userStreak.update({ where: { userId }, data }); }
  catalog() { return this.db.shopItem.findUnique({ where: { code: 'STREAK_PROTECTOR' } }); }
  async stock(userId: string, shopItemId: string) {
    return (await this.db.userInventory.findUnique({ where: { userId_shopItemId: { userId, shopItemId } } }))?.quantity ?? 0;
  }
  incrementStock(userId: string, shopItemId: string) {
    return this.db.userInventory.upsert({ where: { userId_shopItemId: { userId, shopItemId } },
      create: { userId, shopItemId, quantity: 1 }, update: { quantity: { increment: 1 } } });
  }
  async protect(userId: string, shopItemId: string, protectedDate: Date, now: Date) {
    await this.db.userInventory.update({ where: { userId_shopItemId: { userId, shopItemId } }, data: { quantity: { decrement: 1 } } });
    await this.db.streakProtectionEvent.create({ data: { userId, shopItemId, protectedDate, createdAt: now } });
  }
  async history(userId: string) {
    const days = await this.db.learningDay.findMany({ where: { userId }, orderBy: { activityDate: 'asc' } });
    const protections = await this.db.streakProtectionEvent.findMany({ where: { userId } });
    const repairs = await this.db.streakRepair.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { days, protections, repairs };
  }
  createRepair(data: Prisma.StreakRepairUncheckedCreateInput) { return this.db.streakRepair.create({ data }); }
  repair(id: string, data: Prisma.StreakRepairUncheckedUpdateInput) { return this.db.streakRepair.update({ where: { id }, data }); }
  findRepair(userId: string, id: string) { return this.db.streakRepair.findFirst({ where: { userId, id } }); }
  transaction(userId: string, idempotencyKey: string) {
    return this.db.coinTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
  }
  async balance(userId: string) { return (await this.db.coinTransaction.aggregate({ where: { userId }, _sum: { amount: true } }))._sum.amount ?? 0; }
  async credit(userId: string, amount: number, reason: string, idempotencyKey: string, now: Date, referenceId?: string, referenceValue?: string) {
    if (await this.transaction(userId, idempotencyKey)) return false;
    await this.db.coinTransaction.create({ data: { userId, amount, type: 'CREDIT', reason, idempotencyKey, createdAt: now,
      ...(referenceId ? { referenceId } : {}), ...(referenceValue ? { referenceValue } : {}) } });
    return true;
  }
  async debit(userId: string, amount: number, reason: string, idempotencyKey: string, referenceId: string, now: Date) {
    const existing = await this.transaction(userId, idempotencyKey);
    if (existing) {
      if (existing.reason !== reason || existing.referenceId !== referenceId || existing.amount !== -amount) fail('IDEMPOTENCY_CONFLICT');
      return { transaction: existing, inserted: false };
    }
    if (await this.balance(userId) < amount) fail('INSUFFICIENT_COINS');
    return { transaction: await this.db.coinTransaction.create({ data: { userId, amount: -amount, type: 'DEBIT', reason, idempotencyKey, referenceId, createdAt: now } }), inserted: true };
  }
  event(userId: string, sourceType: string, sourceId: string) {
    return this.db.gamificationLearningEvent.findUnique({ where: { userId_sourceType_sourceId: { userId, sourceType, sourceId } } });
  }
  createEvent(data: Prisma.GamificationLearningEventUncheckedCreateInput) { return this.db.gamificationLearningEvent.create({ data }); }
  async learningDay(userId: string, activityDate: Date, now: Date) {
    return (await this.db.learningDay.createMany({ data: [{ userId, activityDate, createdAt: now }], skipDuplicates: true })).count > 0;
  }
  countEvents(userId: string, learningDate: Date) { return this.db.gamificationLearningEvent.count({ where: { userId, learningDate } }); }
}
export class PrismaGamificationRepository {
  constructor(private readonly db: PrismaClient) {}
  write<T>(userId: string, work: (session: GamificationSession) => Promise<T>): Promise<T> {
    return this.db.$transaction(async tx => {
      const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (!users.length) fail('USER_NOT_FOUND', 404);
      return work(new GamificationSession(tx));
    }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
  }
}
