import { Alert } from 'react-native';
import type { CalendarResponse, ProgressResponse } from './types';

export const dashboardModes = ['REAL', 'ACTIVE_COURSE', 'COMPLETED_COURSE', 'NO_COURSE', 'REVIEW_PENDING', 'REVIEW_CLEAR', 'MIXED_WEEK'] as const;
export const calendarModes = ['REAL', 'EMPTY_MONTH', 'WEEK_STREAK', 'MIXED_MONTH', 'PROTECTED', 'REPAIRED', 'BROKEN', 'MULTI_WEEK_STREAK'] as const;
export type DashboardMode = typeof dashboardModes[number];
export type CalendarMode = typeof calendarModes[number];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const dashboard: ProgressResponse = {
  course: { id: 'progress-preview-course', title: 'Inglés A1', level: 'A1', coverUrl: null, status: 'PUBLISHED', completedAt: null,
    progress: { status: 'IN_PROGRESS', completedRequiredNodes: 4, totalRequiredNodes: 12, percentage: 33 } },
  review: { pendingCount: 5, groups: [
    { topic: { id: 'preview-family', title: 'Familia y amigos' }, pendingCount: 3 },
    { topic: { id: 'preview-routines', title: 'Rutinas y vida diaria' }, pendingCount: 2 },
  ] },
  consistency: { timezone: 'America/Mazatlan', today: '2026-10-24', weekStart: '2026-10-19', weekEnd: '2026-10-25', learningDaysThisWeek: 3,
    days: ['LEARNED', 'LEARNED', 'LEARNED', 'NONE', 'NONE', 'NONE', 'NONE'].map((state, i) => ({ date: `2026-10-${19 + i}`, state: state as ProgressResponse['consistency']['days'][number]['state'] })) },
};
export function dashboardPreview(real: ProgressResponse | null, mode: DashboardMode, development: boolean): ProgressResponse | null {
  if (!development || mode === 'REAL') return real;
  const data = clone(dashboard);
  if (mode === 'COMPLETED_COURSE') data.course = { ...data.course!, completedAt: '2026-10-23T12:00:00Z', progress: { status: 'COMPLETED', completedRequiredNodes: 12, totalRequiredNodes: 12, percentage: 100 } };
  if (mode === 'NO_COURSE') data.course = null;
  if (mode === 'REVIEW_CLEAR') data.review = { pendingCount: 0, groups: [] };
  if (mode === 'MIXED_WEEK') {
    const states = ['LEARNED', 'PROTECTED', 'REPAIRED', 'BROKEN', 'LEARNED', 'NONE', 'NONE'] as const;
    data.consistency.days = data.consistency.days.map((day, i) => ({ ...day, state: states[i] }));
    data.consistency.learningDaysThisWeek = 2;
  }
  return data;
}
export const dashboardPreviewStreak: Record<Exclude<DashboardMode, 'REAL'>, number> = { ACTIVE_COURSE: 0, COMPLETED_COURSE: 0, NO_COURSE: 0, REVIEW_PENDING: 0, REVIEW_CLEAR: 0, MIXED_WEEK: 1 };
// Explicit authored presentation facts; never a production streak calculation.
export const calendarPreviewPresentation: Record<Exclude<CalendarMode, 'REAL'>, { currentStreakDays: number; todayDay: number }> = {
  EMPTY_MONTH: { currentStreakDays: 0, todayDay: 22 },
  WEEK_STREAK: { currentStreakDays: 7, todayDay: 12 },
  MIXED_MONTH: { currentStreakDays: 10, todayDay: 22 },
  PROTECTED: { currentStreakDays: 4, todayDay: 9 },
  REPAIRED: { currentStreakDays: 4, todayDay: 9 },
  BROKEN: { currentStreakDays: 0, todayDay: 9 },
  MULTI_WEEK_STREAK: { currentStreakDays: 21, todayDay: 22 },
};
export function calendarPreview(mode: Exclude<CalendarMode, 'REAL'>, month = '2026-10'): CalendarResponse {
  const days: CalendarResponse['days'] = [];
  const add = (day: number, state: CalendarResponse['days'][number]['state']) => days.push({ date: `${month}-${String(day).padStart(2, '0')}`, state });
  const learned = (start: number, end: number) => { for (let day = start; day <= end; day++) add(day, 'LEARNED'); };
  // Historical fixtures are intentionally different from the current month.
  const historical = month < '2026-10';
  if (historical) {
    if (mode !== 'EMPTY_MONTH') { learned(2, 4); learned(16, 17); }
    if (mode === 'MIXED_MONTH') { add(9, 'PROTECTED'); add(11, 'BROKEN'); add(12, 'REPAIRED'); }
  } else {
  if (mode === 'WEEK_STREAK') learned(5, 11);
  if (mode === 'MULTI_WEEK_STREAK') learned(1, 21);
  if (mode === 'MIXED_MONTH') {
    learned(1, 8); add(9, 'PROTECTED'); add(11, 'BROKEN'); add(12, 'REPAIRED'); learned(13, 21);
  }
  if (mode === 'PROTECTED' || mode === 'REPAIRED' || mode === 'BROKEN') { learned(5, 7); add(8, mode); }
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { month, today: `2026-10-${String(calendarPreviewPresentation[mode].todayDay).padStart(2, '0')}`, timezone: 'America/Mazatlan', learningDaysCount: days.filter(day => day.state === 'LEARNED').length, days };
}
export function blockPreviewNavigation() {
  Alert.alert('DEV · Progress preview', 'Selecciona REAL para abrir cursos, repaso o tienda. Los datos de muestra no modifican tu aprendizaje.');
}
