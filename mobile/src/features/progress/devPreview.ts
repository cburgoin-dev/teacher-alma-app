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
export function calendarPreview(mode: Exclude<CalendarMode, 'REAL'>, month = '2026-10'): CalendarResponse {
  const days: CalendarResponse['days'] = [];
  const add = (day: number, state: CalendarResponse['days'][number]['state']) => days.push({ date: `${month}-${String(day).padStart(2, '0')}`, state });
  const learned = (start: number, end: number) => { for (let day = start; day <= end; day++) add(day, 'LEARNED'); };
  if (mode === 'WEEK_STREAK') learned(5, 11);
  if (mode === 'MULTI_WEEK_STREAK') learned(1, 21);
  if (mode === 'MIXED_MONTH') {
    learned(1, 8); add(9, 'PROTECTED'); add(11, 'BROKEN'); add(12, 'REPAIRED'); learned(13, 21);
  }
  if (mode === 'PROTECTED' || mode === 'REPAIRED' || mode === 'BROKEN') { learned(5, 7); add(8, mode); }
  return { month, today: '2026-10-22', timezone: 'America/Mazatlan', learningDaysCount: days.filter(day => day.state === 'LEARNED').length, days };
}
export function blockPreviewNavigation() {
  Alert.alert('DEV · Progress preview', 'Selecciona REAL para abrir cursos, repaso o tienda. Los datos de muestra no modifican tu aprendizaje.');
}
