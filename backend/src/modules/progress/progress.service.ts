import { HttpError } from '../../shared/http-error.js';
import { courseProgress } from '../courses/course.progression.js';
import { isVisible } from '../courses/course.rules.js';
import { orderedCourseCandidates } from '../courses/course.selection.js';
import { learningDate, nextDate } from '../gamification/gamification.rules.js';
import { eligibleReviewItems, reviewGroups } from '../review/review.rules.js';
import { historyStates, monthEnd, progressMonth, weekBounds } from './progress.rules.js';
import type { ProgressCalendarResponse, ProgressCourse, ProgressDashboardResponse, ProgressRepository, ProgressWeek } from './progress.types.js';

export class ProgressService {
  constructor(private readonly repository: ProgressRepository, private readonly clock: () => Date = () => new Date()) {}
  read(userId: string): Promise<ProgressDashboardResponse> {
    const now = this.clock();
    return this.repository.read(async session => {
      const timezone = await session.timezone(userId), today = learningDate(now, timezone);
      const { weekStart, weekEnd } = weekBounds(today);
      const [facts, history] = await Promise.all([session.dashboard(userId), session.history(userId, weekStart, today)]);
      const visible = new Map(facts.courses.filter(isVisible).map(c => [c.id, c]));
      const { activeCandidates, completedCandidates } = orderedCourseCandidates(facts.progress, facts.completions);
      const selected = activeCandidates.find(p => visible.has(p.courseId)) ?? completedCandidates.find(p => visible.has(p.courseId));
      let course: ProgressCourse | null = null;
      if (selected) {
        const c = visible.get(selected.courseId)!;
        const { status, completedRequiredNodes, totalRequiredNodes, percentage } = courseProgress(c);
        course = { id: c.id, title: c.title, level: c.level, coverUrl: c.coverUrl, status: c.status as ProgressCourse['status'],
          progress: { status, completedRequiredNodes, totalRequiredNodes, percentage },
          completedAt: selected.status === 'COMPLETED' ? selected.completedAt?.toISOString() ?? null : null };
      }
      const items = eligibleReviewItems(facts.reviewItems, facts.grants, now);
      const states = new Map(historyStates(history, weekStart, today).map(d => [d.date, d.state]));
      const days: ProgressWeek['days'] = Array.from({ length: 7 }, (_, index) => {
        const date = nextDate(weekStart, index); return { date, state: states.get(date) ?? 'NONE' };
      });
      return { course, review: { pendingCount: items.length, groups: reviewGroups(items).slice(0, 2)
        .map(g => ({ topic: g.topic, pendingCount: g.count })) },
        consistency: { timezone, today, weekStart, weekEnd, learningDaysThisWeek: days.filter(d => d.state === 'LEARNED').length, days } };
    });
  }
  calendar(userId: string, input: unknown): Promise<ProgressCalendarResponse> {
    const month = progressMonth(input), now = this.clock();
    return this.repository.read(async session => {
      const timezone = await session.timezone(userId), today = learningDate(now, timezone);
      if (month > today.slice(0, 7)) throw new HttpError(400, 'PROGRESS_MONTH_IN_FUTURE', 'PROGRESS_MONTH_IN_FUTURE');
      const start = month + '-01', end = monthEnd(month);
      const days = historyStates(await session.history(userId, start, end), start, end);
      return { month, timezone, today, learningDaysCount: days.filter(d => d.state === 'LEARNED').length, days };
    });
  }
}
