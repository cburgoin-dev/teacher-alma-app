import type { GamificationAggregate, GamificationDelta } from './types';
// DEV presentation memory only. Never touches the production gate or resource.
let lastCelebration: GamificationDelta | undefined;
export function rememberDevCelebration(delta: GamificationDelta) {
  if (__DEV__) lastCelebration = delta;
}
export function devCelebrationPreview(data: GamificationAggregate | null) {
  if (!__DEV__) return null;
  if (lastCelebration) return { delta: lastCelebration, label: 'DEV · Última celebración real' };
  if (!data) return null;
  return { label: 'DEV · Vista previa del estado actual', delta: {
    coinsEarned: 0, coinRewards: [], balance: data.coins.balance,
    streak: { currentDays: data.streak.currentDays, advancedToday: false, protectedDate: null },
    dailyGoal: { preset: data.dailyGoal.preset, target: data.dailyGoal.target, progress: data.dailyGoal.progress, completed: data.dailyGoal.completed, rewardEarnedNow: 0 },
  } satisfies GamificationDelta };
}
