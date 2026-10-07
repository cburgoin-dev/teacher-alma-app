import type { CourseRecord, EntitlementRecord } from '../courses/course.types.js';
import type { CourseCompletion, LearnerCourseProgress } from '../courses/course.selection.js';
import type { ReviewSummaryRecord } from '../review/review.rules.js';

export type ProgressHistoryState = 'LEARNED' | 'PROTECTED' | 'REPAIRED' | 'BROKEN';
export interface ProgressHistory {
  days: { activityDate: Date }[];
  protections: { protectedDate: Date }[];
  repairs: { brokenDate: Date; status: string }[];
}
export interface ProgressCourseFacts {
  courses: CourseRecord[]; progress: LearnerCourseProgress[]; completions: CourseCompletion[];
  grants: EntitlementRecord[]; reviewItems: ReviewSummaryRecord[];
}
export interface ProgressReadSession {
  timezone(userId: string): Promise<string>;
  dashboard(userId: string): Promise<ProgressCourseFacts>;
  history(userId: string, start: string, end: string): Promise<ProgressHistory>;
}
export interface ProgressRepository {
  read<T>(work: (session: ProgressReadSession) => Promise<T>): Promise<T>;
}
export interface ProgressCourse {
  id: string; title: string; level: string | null; coverUrl: string | null;
  status: 'PUBLISHED' | 'COMING_SOON';
  progress: { status: 'IN_PROGRESS' | 'COMPLETED'; completedRequiredNodes: number; totalRequiredNodes: number; percentage: number };
  completedAt: string | null;
}
export interface ProgressWeek {
  timezone: string; today: string; weekStart: string; weekEnd: string; learningDaysThisWeek: number;
  days: { date: string; state: ProgressHistoryState | 'NONE' }[];
}
export interface ProgressDashboardResponse {
  course: ProgressCourse | null;
  review: { pendingCount: number; groups: { topic: { id: string; title: string }; pendingCount: number }[] };
  consistency: ProgressWeek;
}
export interface ProgressCalendarResponse {
  month: string; timezone: string; today: string; learningDaysCount: number;
  days: { date: string; state: ProgressHistoryState }[];
}
