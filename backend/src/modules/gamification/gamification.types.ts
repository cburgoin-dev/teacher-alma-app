export type GoalPreset = 'CASUAL' | 'NORMAL' | 'INTENSE';
export type Reward = { reason: string; amount: number };
// Internal, trusted completion boundary only; no HTTP route accepts learning events or scores.
export type LearningCompletion = {
  userId: string; sourceId: string; occurredAt: Date;
  courseCompletedId?: string;
} & (
  { eventType: 'LESSON_COMPLETION'; sourceType: 'LESSON_RUN'; scoreContext: { lessonId: string; firstCompletion: boolean; perfect: boolean } }
  | { eventType: 'UNIT_CHALLENGE_COMPLETION'; sourceType: 'UNIT_CHALLENGE_RUN'; scoreContext: { challengeId: string; firstPass: boolean; firstCompletedRun: boolean; perfect: boolean } }
  | { eventType: 'REVIEW_COMPLETION'; sourceType: 'REVIEW_BATCH' }
);
export type GamificationDelta = {
  coinsEarned: number; coinRewards: Reward[]; balance: number;
  streak: { currentDays: number; advancedToday: boolean; protectedDate: string | null };
  dailyGoal: { preset: GoalPreset; progress: number; target: number; completed: boolean; rewardEarnedNow: number };
};
