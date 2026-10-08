export type HistoryState = 'LEARNED' | 'PROTECTED' | 'REPAIRED' | 'BROKEN';
export type WeekState = HistoryState | 'NONE';
export type ProgressCourse = {
  id: string; title: string; level: string | null; coverUrl: string | null; status: 'PUBLISHED' | 'COMING_SOON';
  progress: { status: 'IN_PROGRESS' | 'COMPLETED'; completedRequiredNodes: number; totalRequiredNodes: number; percentage: number };
  completedAt: string | null;
};
export type ProgressResponse = {
  course: ProgressCourse | null;
  review: { pendingCount: number; groups: { topic: { id: string; title: string }; pendingCount: number }[] };
  consistency: { timezone: string; today: string; weekStart: string; weekEnd: string; learningDaysThisWeek: number; days: { date: string; state: WeekState }[] };
};
export type CalendarResponse = {
  month: string; timezone: string; today: string; learningDaysCount: number;
  days: { date: string; state: HistoryState }[];
};
