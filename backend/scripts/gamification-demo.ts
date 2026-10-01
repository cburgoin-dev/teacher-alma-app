import { randomUUID } from 'node:crypto';
import type { Prisma } from '../src/generated/prisma/client.js';
import { isUuid } from '../src/shared/auth.js';

export type DemoAction = 'reset' | 'reset-streak' | 'reset-daily-goal' | 'reset-inventory' | 'set-coins';
export function demoTarget(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV !== 'development') throw new Error('NODE_ENV must be development.');
  const url = new URL(env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.port !== '5433' || url.pathname !== '/teacher_alma_dev' || url.search || url.hash) {
    throw new Error('Only local teacher_alma_dev on port 5433 without URL overrides is supported.');
  }
  if (!isUuid(env.DEV_AUTH_USER_ID)) throw new Error('An existing DEV_AUTH_USER_ID is required; no --user override is supported.');
  return env.DEV_AUTH_USER_ID;
}
export function demoCommand(args: string[]): { action: DemoAction; amount?: number } {
  const [action, ...options] = args;
  if (!['reset', 'reset-streak', 'reset-daily-goal', 'reset-inventory', 'set-coins'].includes(action ?? '')) throw new Error('Unknown Gamification demo command.');
  if (action === 'set-coins') {
    if (options.length !== 1 || !/^--amount=\d+$/.test(options[0]!)) throw new Error('Use set-coins --amount=0 (nonnegative integer).');
    const amount = Number(options[0]!.slice(9));
    if (!Number.isSafeInteger(amount) || amount > 2147483647) throw new Error('Amount must fit a nonnegative PostgreSQL integer.');
    return { action, amount };
  }
  if (options.length) throw new Error('Unexpected arguments; no user, date or database override is supported.');
  return { action: action as DemoAction };
}
export function assertSupported(action: DemoAction) {
  if (action === 'reset-daily-goal' || action === 'reset') {
    throw new Error(`${action} blocked: Daily Goal progress is derived from durable GamificationLearningEvent rows, and completion/reward uniqueness from CoinTransaction. A fresh reward baseline would erase source/request idempotency. No data changed. Use reset-streak, reset-inventory and set-coins separately; Daily Goal needs a new real learning date. No production rules/schema changed.`);
  }
}
/** Caller owns a transaction; same user row lock as the production learning/spend services. */
export async function applyDemoGamification(tx: Prisma.TransactionClient, userId: string, command: ReturnType<typeof demoCommand>) {
  assertSupported(command.action);
  const users = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  if (users.length !== 1) throw new Error('Configured demo user does not exist.');
  if (command.action === 'set-coins') {
    const before = (await tx.coinTransaction.aggregate({ where: { userId }, _sum: { amount: true } }))._sum.amount ?? 0;
    const after = command.amount!;
    const amount = after - before;
    if (before < 0 || !Number.isSafeInteger(amount) || Math.abs(amount) > 2147483647) throw new Error('Existing ledger or adjustment is outside supported bounds. No data changed.');
    let transactionId: string | null = null;
    if (amount !== 0) {
      const transaction = await tx.coinTransaction.create({ data: { userId, amount, type: amount > 0 ? 'CREDIT' : 'DEBIT',
        reason: 'DEV_DEMO_BALANCE_ADJUSTMENT', referenceType: 'DEV_LOCAL_TOOL', referenceValue: JSON.stringify({ before, target: after }),
        idempotencyKey: 'dev-demo:balance:' + randomUUID() } });
      transactionId = transaction.id;
    }
    return { action: command.action, userId, before, after, adjustment: amount, transactionId, preserved: 'Existing ledger entries, reward uniqueness, inventory and learning state' };
  }
  if (command.action === 'reset-inventory') {
    const item = await tx.shopItem.findUnique({ where: { code: 'STREAK_PROTECTOR' } });
    if (!item) throw new Error('STREAK_PROTECTOR catalog entry is missing. No data changed.');
    const changed = await tx.userInventory.updateMany({ where: { userId, shopItemId: item.id, quantity: { not: 0 } }, data: { quantity: 0 } });
    return { action: command.action, userId, changedRows: changed.count, protectorCount: 0, preserved: 'Coins, purchase keys, other inventory, learning and streak history' };
  }
  // Explicit local testing boundary: clear real-day inputs to restart the timeline.
  // Keep event sources so old completion retries cannot recreate a cleared day.
  const days = await tx.learningDay.deleteMany({ where: { userId } });
  const protections = await tx.streakProtectionEvent.deleteMany({ where: { userId } });
  const repairs = await tx.streakRepair.updateMany({ where: { userId, status: 'ELIGIBLE' }, data: { status: 'INVALIDATED' } });
  const streak = await tx.userStreak.upsert({ where: { userId }, create: { userId }, update: {
    currentDays: 0, lastLearningDate: null, continuityThrough: null, lastEvaluatedDate: null,
  } });
  return { action: command.action, userId, deletedLearningDays: days.count, deletedProtectionEvents: protections.count,
    invalidatedRepairs: repairs.count, currentDays: 0, longestDays: streak.longestDays,
    preserved: 'Durable event dedup, Daily Goal, coins/milestone uniqueness, inventory, longest streak, USED repairs/cooldown and all pedagogical progression',
    next: 'Complete a NEW durable Lesson/UC/Review source to advance 0 -> 1; old callbacks and Lesson Replay do not count.' };
}
