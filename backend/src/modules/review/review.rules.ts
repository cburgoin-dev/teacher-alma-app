import { entitlementSource } from '../courses/course.rules.js';
import type { EntitlementRecord } from '../courses/course.types.js';

export interface ReviewEligibilityRecord {
  activity: { status: string };
  sourceLesson: { status: string; accessType: string; topic: { courseId: string; course: { status: string } } } | null;
}

export interface ReviewSummaryRecord extends ReviewEligibilityRecord {
  id: string; createdAt: Date; lastReviewedAt: Date | null;
  sourceLesson: (NonNullable<ReviewEligibilityRecord['sourceLesson']> & {
    topic: NonNullable<ReviewEligibilityRecord['sourceLesson']>['topic'] & { id: string; title: string };
  }) | null;
}

/** Input is ACTIVE rows; keep the canonical eligibility and item order for every reader. */
export function eligibleReviewItems<T extends ReviewSummaryRecord>(items: T[], grants: EntitlementRecord[], now: Date): T[] {
  return items.filter(item => isReviewEligible(item, grants, now)).sort((a, b) =>
    (a.lastReviewedAt?.getTime() ?? -Infinity) - (b.lastReviewedAt?.getTime() ?? -Infinity)
    || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
}

export function reviewGroups(items: ReviewSummaryRecord[]) {
  const groups = new Map<string, { topic: { id: string; title: string }; count: number }>();
  for (const item of items) {
    const topic = item.sourceLesson!.topic;
    const group = groups.get(topic.id) ?? { topic: { id: topic.id, title: topic.title }, count: 0 };
    group.count++; groups.set(topic.id, group);
  }
  return [...groups.values()];
}

export function isReviewEligible(item: ReviewEligibilityRecord, grants: EntitlementRecord[], now: Date) {
  const lesson = item.sourceLesson;
  return item.activity.status === 'ACTIVE' && lesson?.status === 'PUBLISHED' && lesson.topic.course.status === 'PUBLISHED'
    && (lesson.accessType === 'FREE' || (lesson.accessType === 'PAID' && entitlementSource(lesson.topic.courseId, grants, now) !== 'NONE'));
}
