import { isUuid } from '../../shared/auth.js';
import type { GamificationSession, PrismaGamificationRepository } from './gamification.repository.js';
import { DAY_MS, GOALS, MILESTONES, PROTECTOR, REPAIR_COST, dateKey, dateValue, fail, learningDate, nextDate, preset, reconcileTimeline, requestKey, userTimezone } from './gamification.rules.js';
import type { GamificationDelta, LearningCompletion, Reward } from './gamification.types.js';

async function reconcile(session: GamificationSession, userId: string, now: Date) {
  const user = await session.user(userId);
  if (!user) return fail('USER_NOT_FOUND', 404);
  const today = learningDate(now, user.timezone);
  const initial = await session.initialize(userId);
  let settings = initial.settings;
  if (settings.pendingEffectiveDate && dateKey(settings.pendingEffectiveDate) <= today) {
    settings = await session.settings(userId, { dailyGoalPreset: settings.pendingDailyGoalPreset!, pendingDailyGoalPreset: null, pendingEffectiveDate: null });
  }
  const item = await session.catalog(), history = await session.history(userId);
  const stock = item ? await session.stock(userId, item.id) : 0;
  const timeline = reconcileTimeline({ days: history.days.map(d => dateKey(d.activityDate)),
    protectedDays: history.protections.map(p => dateKey(p.protectedDate)),
    repairedDays: history.repairs.filter(r => r.status === 'USED').map(r => dateKey(r.brokenDate)),
    today, evaluatedThrough: initial.streak.lastEvaluatedDate ? dateKey(initial.streak.lastEvaluatedDate) : null, stock });
  for (const date of timeline.consume) await session.protect(userId, item!.id, dateValue(date), now);
  const yesterday = nextDate(today, -1);
  const evaluated = initial.streak.lastEvaluatedDate && dateKey(initial.streak.lastEvaluatedDate) > yesterday ? initial.streak.lastEvaluatedDate : dateValue(yesterday);
  const streak = await session.streak(userId, { currentDays: timeline.currentDays,
    longestDays: Math.max(initial.streak.longestDays, timeline.longestDays),
    lastLearningDate: timeline.lastLearningDate ? dateValue(timeline.lastLearningDate) : null,
    continuityThrough: timeline.continuityThrough ? dateValue(timeline.continuityThrough) : null,
    lastEvaluatedDate: evaluated, updatedAt: now });
  let candidate = history.repairs.find(r => r.status === 'ELIGIBLE') ?? null;
  if (candidate && timeline.uncovered.some(d => d > dateKey(candidate!.brokenDate))) {
    await session.repair(candidate.id, { status: 'INVALIDATED', updatedAt: now }); candidate = null;
  }
  const lastUsed = history.repairs.filter(r => r.status === 'USED').sort((a, b) => b.repairedAt!.getTime() - a.repairedAt!.getTime())[0];
  const cooldown = !!lastUsed && now.getTime() < lastUsed.repairedAt!.getTime() + 14 * DAY_MS;
  for (const broken of timeline.breaks.filter(b => !history.repairs.some(r => dateKey(r.brokenDate) === b.date))) {
    const eligible = !cooldown && !timeline.uncovered.some(d => d > broken.date);
    if (eligible && candidate) await session.repair(candidate.id, { status: 'INVALIDATED', updatedAt: now });
    // Remember ineligible breaks too: expiry of a cooldown must not revive an old break.
    const recorded = await session.createRepair({ userId, brokenDate: dateValue(broken.date), previousStreakDays: broken.previousDays,
      status: eligible ? 'ELIGIBLE' : 'INVALIDATED', createdAt: now, updatedAt: now, eligibleUntil: new Date(now.getTime() + DAY_MS) });
    if (eligible) candidate = recorded;
  }
  return { today, timezone: user.timezone, settings, streak, item, stock: stock - timeline.consume.length, candidate, cooldown,
    activeToday: history.days.some(d => dateKey(d.activityDate) === today),
    protectedDate: timeline.consume.at(-1) ?? null };
}
type State = Awaited<ReturnType<typeof reconcile>>;

async function dailyGoal(session: GamificationSession, userId: string, state: State) {
  const selected = preset(state.settings.dailyGoalPreset), config = GOALS[selected];
  const progress = await session.countEvents(userId, dateValue(state.today));
  const reward = await session.transaction(userId, 'daily-goal:' + state.today);
  return { preset: selected, target: config.target, progress, rewardCoins: config.reward, completed: reward !== null,
    pendingPreset: state.settings.pendingDailyGoalPreset as ReturnType<typeof preset> | null };
}
async function rewardGoal(session: GamificationSession, userId: string, state: State, now: Date): Promise<Reward[]> {
  const goal = await dailyGoal(session, userId, state);
  if (goal.progress < goal.target || goal.completed) return [];
  const inserted = await session.credit(userId, goal.rewardCoins, 'DAILY_GOAL', 'daily-goal:' + state.today, now, undefined, state.today);
  return inserted ? [{ reason: 'DAILY_GOAL', amount: goal.rewardCoins }] : [];
}
async function aggregate(session: GamificationSession, userId: string, state: State, now: Date) {
  const next = MILESTONES.find(m => m.days > state.streak.currentDays);
  return { coins: { balance: await session.balance(userId) },
    streak: { currentDays: state.streak.currentDays, longestDays: state.streak.longestDays,
      activeToday: state.activeToday,
      protectorCount: state.stock, protectorMax: PROTECTOR.max,
      nextMilestone: next ? { days: next.days, rewardCoins: next.coins, rewardAlreadyEarned: !!await session.transaction(userId, 'streak-milestone:' + next.days) } : null,
      repair: state.candidate && !state.cooldown && state.candidate.eligibleUntil > now ? {
        id: state.candidate.id, eligible: true, previousDays: state.candidate.previousStreakDays, costCoins: REPAIR_COST,
        expiresAt: state.candidate.eligibleUntil.toISOString() } : null },
    dailyGoal: await dailyGoal(session, userId, state) };
}
async function delta(session: GamificationSession, userId: string, state: State, rewards: Reward[], advancedToday: boolean): Promise<GamificationDelta> {
  const goal = await dailyGoal(session, userId, state);
  return { coinsEarned: rewards.reduce((n, r) => n + r.amount, 0), coinRewards: rewards, balance: await session.balance(userId),
    streak: { currentDays: state.streak.currentDays, advancedToday, protectedDate: state.protectedDate },
    dailyGoal: { preset: goal.preset, progress: goal.progress, target: goal.target, completed: goal.completed,
      rewardEarnedNow: rewards.find(r => r.reason === 'DAILY_GOAL')?.amount ?? 0 } };
}

/** Called inside the source completion transaction, after acquiring the user row lock.
 * Replay and Practice are intentionally absent from the accepted v1 input union. */
export async function recordLearningCompletion(session: GamificationSession, input: LearningCompletion, now: Date): Promise<GamificationDelta> {
  const existing = await session.event(input.userId, input.sourceType, input.sourceId);
  if (existing) return delta(session, input.userId, await reconcile(session, input.userId, now), [], false);
  const user = await session.user(input.userId);
  if (!user) return fail('USER_NOT_FOUND', 404);
  const date = learningDate(input.occurredAt, user.timezone);
  await session.createEvent({ userId: input.userId, eventType: input.eventType, sourceType: input.sourceType, sourceId: input.sourceId,
    occurredAt: input.occurredAt, learningDate: dateValue(date), createdAt: now });
  const newDay = await session.learningDay(input.userId, dateValue(date), now);
  const state = await reconcile(session, input.userId, now), rewards: Reward[] = [];
  const credit = async (amount: number, reason: string, key: string, referenceId?: string, value?: string) => {
    if (await session.credit(input.userId, amount, reason, key, now, referenceId, value)) rewards.push({ reason, amount });
  };
  if (input.eventType === 'LESSON_COMPLETION' && input.scoreContext.firstCompletion) {
    const { lessonId, perfect } = input.scoreContext;
    await credit(3, 'LESSON_FIRST_COMPLETION', 'lesson:first-completion:' + lessonId, lessonId);
    if (perfect) await credit(2, 'LESSON_FIRST_PERFECT', 'lesson:first-perfect:' + lessonId, lessonId);
  }
  if (input.eventType === 'UNIT_CHALLENGE_COMPLETION') {
    const { challengeId, firstPass, firstCompletedRun, perfect } = input.scoreContext;
    if (firstPass) await credit(8, 'UNIT_CHALLENGE_FIRST_PASS', 'unit-challenge:first-pass:' + challengeId, challengeId);
    if (firstCompletedRun && perfect) await credit(3, 'UNIT_CHALLENGE_FIRST_PERFECT', 'unit-challenge:first-perfect:' + challengeId, challengeId);
  }
  if (input.courseCompletedId) await credit(20, 'COURSE_COMPLETION', 'course:first-completion:' + input.courseCompletedId, input.courseCompletedId);
  if (newDay) {
    const milestone = MILESTONES.find(m => m.days === state.streak.currentDays);
    if (milestone) await credit(milestone.coins, 'STREAK_MILESTONE', 'streak-milestone:' + milestone.days, undefined, String(milestone.days));
  }
  rewards.push(...await rewardGoal(session, input.userId, state, now));
  return delta(session, input.userId, state, rewards, newDay && date === state.today);
}
export async function currentGamificationDelta(session: GamificationSession, userId: string, now: Date) {
  return delta(session, userId, await reconcile(session, userId, now), [], false);
}

export class GamificationService {
  constructor(private readonly repository: PrismaGamificationRepository, private readonly clock: () => Date = () => new Date()) {}
  changeTimezone(userId: string, value: unknown) {
    const timezone = userTimezone(value);
    return this.repository.write(userId, async session => {
      const user = await session.user(userId);
      if (!user) return fail('USER_NOT_FOUND', 404);
      // Serialize with completions, but do not initialize or reconcile Gamification here.
      return user.timezone === timezone ? user : session.timezone(userId, timezone);
    });
  }
  read(userId: string) {
    return this.repository.write(userId, async session => { const now = this.clock(); return aggregate(session, userId, await reconcile(session, userId, now), now); });
  }
  changeGoal(userId: string, value: unknown) {
    const selected = preset(value);
    return this.repository.write(userId, async session => {
      const now = this.clock(), state = await reconcile(session, userId, now);
      const rewarded = !!await session.transaction(userId, 'daily-goal:' + state.today);
      state.settings = await session.settings(userId, rewarded ? { pendingDailyGoalPreset: selected, pendingEffectiveDate: dateValue(nextDate(state.today)) }
        : { dailyGoalPreset: selected, pendingDailyGoalPreset: null, pendingEffectiveDate: null });
      const rewards = rewarded ? [] : await rewardGoal(session, userId, state, now);
      return { applies: rewarded ? 'NEXT_LOCAL_DAY' : 'TODAY', effectiveDate: rewarded ? nextDate(state.today) : state.today,
        ...await aggregate(session, userId, state, now), coinsEarned: rewards.reduce((n, r) => n + r.amount, 0) };
    });
  }
  purchase(userId: string, key: unknown) {
    const idempotencyKey = 'request:' + requestKey(key);
    return this.repository.write(userId, async session => {
      const now = this.clock(), state = await reconcile(session, userId, now);
      const prior = await session.transaction(userId, idempotencyKey);
      if (prior) {
        if (prior.reason !== 'STREAK_PROTECTOR_PURCHASE') fail('IDEMPOTENCY_CONFLICT');
      } else {
        if (!state.item?.active || state.item.itemType !== 'CONSUMABLE' || state.item.coinCost !== PROTECTOR.cost || state.item.maxOwned !== PROTECTOR.max) fail('ITEM_UNAVAILABLE');
        if (state.stock >= PROTECTOR.max) fail('PROTECTOR_STOCK_FULL');
        const payment = await session.debit(userId, PROTECTOR.cost, 'STREAK_PROTECTOR_PURCHASE', idempotencyKey, state.item!.id, now);
        if (payment.inserted) { await session.incrementStock(userId, state.item!.id); state.stock++; }
      }
      return { coins: { balance: await session.balance(userId) }, protector: { count: state.stock, max: PROTECTOR.max } };
    });
  }
  repair(userId: string, key: unknown, repairId: unknown) {
    const idempotencyKey = 'request:' + requestKey(key);
    if (!isUuid(repairId)) return fail('INVALID_STREAK_REPAIR_ID', 400);
    return this.repository.write(userId, async session => {
      const now = this.clock();
      let state = await reconcile(session, userId, now);
      const prior = await session.transaction(userId, idempotencyKey);
      if (prior) {
        if (prior.reason !== 'STREAK_REPAIR' || prior.referenceId !== repairId) fail('IDEMPOTENCY_CONFLICT');
      } else {
        const candidate = await session.findRepair(userId, repairId);
        if (candidate?.status === 'USED') fail('ALREADY_REPAIRED');
        if (state.cooldown) fail('STREAK_REPAIR_COOLDOWN');
        if (!candidate || candidate.status !== 'ELIGIBLE' || state.candidate?.id !== candidate.id) fail('STREAK_REPAIR_NOT_ELIGIBLE');
        if (candidate!.eligibleUntil <= now) fail('STREAK_REPAIR_EXPIRED');
        const payment = await session.debit(userId, REPAIR_COST, 'STREAK_REPAIR', idempotencyKey, repairId, now);
        await session.repair(repairId, { status: 'USED', repairedAt: now, coinTransactionId: payment.transaction.id, updatedAt: now });
        state = await reconcile(session, userId, now);
      }
      return { coins: { balance: await session.balance(userId) }, streak: { currentDays: state.streak.currentDays, longestDays: state.streak.longestDays, repaired: true } };
    });
  }
  recordLearningCompletion(input: LearningCompletion) {
    return this.repository.write(input.userId, session => recordLearningCompletion(session, input, this.clock()));
  }
}
