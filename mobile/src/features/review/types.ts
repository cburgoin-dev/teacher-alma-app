import type { Activity, Answer, ReviewFeedback } from '../lessons/types';
export type ReviewSummary = { state: 'READY' | 'EMPTY'; pendingCount: number; groups: { topic: { id: string; title: string }; count: number }[] };
export type ReviewItem = {
  id: string;
  source: { lesson: { id: string; title: string }; topic: { id: string; title: string }; course: { id: string; title: string; level: string | null } };
  activity: Activity;
};
export type ReviewBatch = { batchToken: string | null; items: ReviewItem[]; totalEligiblePending: number };
export type ReviewSubmission = { batchToken: string; requestKey: string; answer: Answer };
export type ReviewAttempt = {
  gamification?: import('../gamification/types').GamificationDelta;
  reviewItem: { id: string; status: 'ACTIVE' | 'RESOLVED' };
  attempt: { id: string; attemptNumber: number; isCorrect: boolean };
  feedback: ReviewFeedback['feedback'];
  pendingReviewCount: number;
};
export type ReviewOutcome = { item: ReviewItem; response: ReviewAttempt | null };
