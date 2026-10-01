export type DailyGoalPreset = 'CASUAL' | 'NORMAL' | 'INTENSE';
export type GamificationAggregate = {
  coins: { balance: number };
  streak: {
    currentDays: number; longestDays: number; activeToday: boolean;
    protectorCount: number; protectorMax: number;
    nextMilestone: { days: number; rewardCoins: number; rewardAlreadyEarned: boolean } | null;
    repair: { id: string; eligible: true; previousDays: number; costCoins: number; expiresAt: string } | null;
  };
  dailyGoal: { preset: DailyGoalPreset; target: number; progress: number; rewardCoins: number; completed: boolean; pendingPreset: DailyGoalPreset | null };
};
export type GamificationDelta = {
  coinsEarned: number; coinRewards: { reason: string; amount: number }[]; balance: number;
  streak: { currentDays: number; advancedToday: boolean; protectedDate: string | null };
  dailyGoal: { preset: DailyGoalPreset; progress: number; target: number; completed: boolean; rewardEarnedNow: number };
};
export type ProtectorPurchase = { coins: { balance: number }; protector: { count: number; max: number } };
export type StreakRepair = { coins: { balance: number }; streak: { currentDays: number; longestDays: number; repaired: true } };
