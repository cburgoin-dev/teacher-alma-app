import { HttpError } from '../../shared/http-error.js';
import { dateKey, dateValue, nextDate } from '../gamification/gamification.rules.js';
import type { ProgressHistory, ProgressHistoryState } from './progress.types.js';

export function progressMonth(value: unknown): string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new HttpError(400, 'INVALID_PROGRESS_MONTH', 'INVALID_PROGRESS_MONTH');
  }
  return value;
}
export function weekBounds(today: string) {
  const weekStart = nextDate(today, -((dateValue(today).getUTCDay() + 6) % 7));
  return { weekStart, weekEnd: nextDate(weekStart, 6) };
}
export function monthEnd(month: string) {
  const date = dateValue(month + '-01');
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return dateKey(date);
}
/** DATE serialization preserves stored local facts; it does not convert them to another timezone. */
export function historyStates(history: ProgressHistory, start: string, end: string) {
  const states = new Map<string, ProgressHistoryState>();
  const rank = { BROKEN: 1, PROTECTED: 2, REPAIRED: 3, LEARNED: 4 };
  const put = (date: Date, state: ProgressHistoryState) => {
    const key = dateKey(date), previous = states.get(key);
    if (key >= start && key <= end && (!previous || rank[state] > rank[previous])) states.set(key, state);
  };
  for (const row of history.repairs) put(row.brokenDate, row.status === 'USED' ? 'REPAIRED' : 'BROKEN');
  for (const row of history.protections) put(row.protectedDate, 'PROTECTED');
  for (const row of history.days) put(row.activityDate, 'LEARNED');
  return [...states].sort(([a], [b]) => a.localeCompare(b)).map(([date, state]) => ({ date, state }));
}
