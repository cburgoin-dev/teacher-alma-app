import { entitlementSource } from '../courses/course.rules.js';
import type { EntitlementRecord } from '../courses/course.types.js';

export interface ReviewEligibilityRecord {
  activity: { status: string };
  sourceLesson: { status: string; accessType: string; topic: { courseId: string; course: { status: string } } } | null;
}

export function isReviewEligible(item: ReviewEligibilityRecord, grants: EntitlementRecord[], now: Date) {
  const lesson = item.sourceLesson;
  return item.activity.status === 'ACTIVE' && lesson?.status === 'PUBLISHED' && lesson.topic.course.status === 'PUBLISHED'
    && (lesson.accessType === 'FREE' || (lesson.accessType === 'PAID' && entitlementSource(lesson.topic.courseId, grants, now) !== 'NONE'));
}
