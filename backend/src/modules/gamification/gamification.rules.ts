import { HttpError } from '../../shared/http-error.js';
import type { GoalPreset } from './gamification.types.js';

export const GOALS = { CASUAL: { target: 1, reward: 5 }, NORMAL: { target: 2, reward: 10 }, INTENSE: { target: 3, reward: 15 } } as const;
export const MILESTONES = [{ days: 7, coins: 10 }, { days: 14, coins: 15 }, { days: 30, coins: 30 }, { days: 60, coins: 50 }, { days: 100, coins: 75 }] as const;
export const PROTECTOR = { code: 'STREAK_PROTECTOR', cost: 50, max: 2 } as const;
export const REPAIR_COST = 120;
export const DAY_MS = 86_400_000;
export const fail = (code: string, status = 409): never => { throw new HttpError(status, code, code); };
export function preset(value: unknown): GoalPreset {
  if (value !== 'CASUAL' && value !== 'NORMAL' && value !== 'INTENSE') return fail('INVALID_DAILY_GOAL_PRESET', 400);
  return value;
}
export function requestKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(value)) return fail('INVALID_GAMIFICATION_REQUEST_KEY', 400);
  return value;
}
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const dateValue = (key: string) => new Date(key + 'T00:00:00Z');
export const nextDate = (key: string, offset = 1) => dateKey(new Date(dateValue(key).getTime() + offset * DAY_MS));
export function learningDate(now: Date, timezone: string): string {
  if (/^[+-]/.test(timezone)) return fail('INVALID_USER_TIMEZONE', 409);
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const value = (type: string) => parts.find(p => p.type === type)!.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  } catch { return fail('INVALID_USER_TIMEZONE', 409); }
}

/** Calendar arithmetic uses DATE keys, never timezone-dependent 24-hour offsets. */
export function reconcileTimeline(input: {
  days: string[]; protectedDays: string[]; repairedDays: string[];
  today: string; evaluatedThrough: string | null; stock: number;
}) {
  const real = new Set(input.days), covered = new Set([...input.protectedDays, ...input.repairedDays]);
  const first = input.days[0], last = input.days.at(-1) ?? null;
  let currentDays = 0, longestDays = 0, continuityThrough: string | null = null;
  const consume: string[] = [], breaks: { date: string; previousDays: number }[] = [], uncovered: string[] = [];
  if (first) {
    const end = last && last > input.today ? last : input.today;
    for (let day = first; day <= end; day = nextDate(day)) {
      if (real.has(day)) { currentDays++; longestDays = Math.max(longestDays, currentDays); continuityThrough = day; }
      else if (covered.has(day)) { if (currentDays > 0) continuityThrough = day; }
      else if (day < input.today) {
        if (currentDays > 0 && input.stock > consume.length && (!input.evaluatedThrough || day > input.evaluatedThrough)) {
          consume.push(day); continuityThrough = day;
        } else {
          uncovered.push(day);
          if (currentDays > 0) breaks.push({ date: day, previousDays: currentDays });
          currentDays = 0; continuityThrough = null;
        }
      }
    }
  }
  return { currentDays, longestDays, lastLearningDate: last, continuityThrough, consume, breaks, uncovered };
}
