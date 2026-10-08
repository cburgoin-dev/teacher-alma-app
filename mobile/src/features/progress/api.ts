import { apiRequest } from '../../services/api/client';
import type { CalendarResponse, ProgressResponse } from './types';
const states = ['LEARNED', 'PROTECTED', 'REPAIRED', 'BROKEN'];
const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const count = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0;
export function parseProgress(value: unknown): ProgressResponse {
  const data = value as ProgressResponse | null, week = data?.consistency;
  if (!data || !week || !date(week.today) || typeof week.timezone !== 'string' || !date(week.weekStart) || !date(week.weekEnd)
    || !count(week.learningDaysThisWeek) || !Array.isArray(week.days) || week.days.length !== 7
    || week.days.some(d => !date(d.date) || ![...states, 'NONE'].includes(d.state))
    || !count(data.review?.pendingCount) || !Array.isArray(data.review.groups) || data.review.groups.length > 2
    || data.review.groups.some(g => !g.topic || typeof g.topic.title !== 'string' || typeof g.topic.id !== 'string' || !count(g.pendingCount))
    || (data.course !== null && (!data.course || typeof data.course.id !== 'string' || typeof data.course.title !== 'string'
      || !['IN_PROGRESS', 'COMPLETED'].includes(data.course.progress?.status) || !count(data.course.progress.completedRequiredNodes)
      || !count(data.course.progress.totalRequiredNodes) || !Number.isFinite(data.course.progress.percentage)
      || data.course.progress.percentage < 0 || data.course.progress.percentage > 100))) throw new Error('Invalid Progress response');
  return data;
}
export function parseCalendar(value: unknown, month: string): CalendarResponse {
  const data = value as CalendarResponse | null;
  if (!data || data.month !== month || !date(data.today) || typeof data.timezone !== 'string' || !count(data.learningDaysCount)
    || !Array.isArray(data.days) || data.days.some(d => !date(d.date) || !d.date.startsWith(month + '-') || !states.includes(d.state))) throw new Error('Invalid Progress calendar');
  return data;
}
export const progressApi = {
  read: async () => parseProgress(await apiRequest<unknown>('/me/progress')),
  calendar: async (month: string) => parseCalendar(await apiRequest<unknown>(`/me/progress/calendar?month=${encodeURIComponent(month)}`), month),
};
