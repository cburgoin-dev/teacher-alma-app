import { HttpError } from '../../shared/http-error.js';
import type { CourseRecord, EntitlementRecord, LessonRecord } from './course.types.js';

export function isVisible(course: CourseRecord): boolean {
  return course.status === 'PUBLISHED' || course.status === 'COMING_SOON';
}

export function requireVisible(course: CourseRecord | null): CourseRecord {
  if (!course || !isVisible(course)) {
    throw new HttpError(404, 'COURSE_NOT_FOUND', 'Course not found');
  }
  return course;
}

export function requireStartableStatus(course: CourseRecord): void {
  requireVisible(course);
  if (course.status === 'COMING_SOON') {
    throw new HttpError(409, 'COURSE_NOT_AVAILABLE', 'Course is not available yet');
  }
}

export function entitlementSource(
  courseId: string,
  entitlements: EntitlementRecord[],
  now: Date,
): 'COURSE_PURCHASE' | 'SUBSCRIPTION' | 'NONE' {
  const valid = entitlements.filter(e =>
    e.status === 'ACTIVE' && e.startsAt <= now && (e.expiresAt === null || now < e.expiresAt),
  );
  // The logical schema checks course-specific access before all-course access.
  if (valid.some(e => e.scope === 'COURSE' && e.courseId === courseId)) return 'COURSE_PURCHASE';
  if (valid.some(e => e.scope === 'ALL_COURSES')) return 'SUBSCRIPTION';
  return 'NONE';
}

export function hasLessonAccess(lesson: LessonRecord, source: ReturnType<typeof entitlementSource>): boolean {
  return lesson.accessType === 'FREE' || (lesson.accessType === 'PAID' && source !== 'NONE');
}
