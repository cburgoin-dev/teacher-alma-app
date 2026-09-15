import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entitlementSource, hasLessonAccess, isVisible, requireStartableStatus, requireVisible } from './course.rules.js';
import type { CourseRecord, EntitlementRecord, LessonRecord } from './course.types.js';

const course: CourseRecord = {
  id: '550e8400-e29b-41d4-a716-446655440000', title: 'Course', slug: 'course',
  level: null, description: null, coverUrl: null, status: 'PUBLISHED', position: 1,
  topics: [], courseProgress: [],
};
const lesson: LessonRecord = {
  id: '550e8400-e29b-41d4-a716-446655440001', title: 'Lesson', position: 1,
  status: 'PUBLISHED', isRequired: true, accessType: 'PAID', lessonProgress: [],
};
const now = new Date('2026-01-15T12:00:00Z');
const grant: EntitlementRecord = {
  scope: 'COURSE', courseId: course.id, status: 'ACTIVE',
  startsAt: new Date('2026-01-01T00:00:00Z'), expiresAt: null,
};

test('DRAFT is hidden and indistinguishable from a missing course', () => {
  const hidden = { ...course, status: 'DRAFT' };
  assert.equal(isVisible(hidden), false);
  for (const value of [null, hidden]) {
    assert.throws(() => requireVisible(value), { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' });
  }
});

test('COMING_SOON is visible but cannot start; PUBLISHED can pass status validation', () => {
  const coming = { ...course, status: 'COMING_SOON' };
  assert.equal(isVisible(coming), true);
  assert.throws(() => requireStartableStatus(coming), {
    status: 409, code: 'COURSE_NOT_AVAILABLE', message: 'Course is not available yet',
  });
  assert.doesNotThrow(() => requireStartableStatus(course));
});

test('free lesson access does not require an entitlement or progress record', () => {
  assert.equal(hasLessonAccess({ ...lesson, accessType: 'FREE' }, 'NONE'), true);
  assert.equal(hasLessonAccess(lesson, 'NONE'), false);
  assert.equal(hasLessonAccess({ ...lesson, lessonProgress: [{ status: 'COMPLETED' }] }, 'NONE'), false);
});

test('valid course ownership and subscription independently unlock paid lessons', () => {
  assert.equal(entitlementSource(course.id, [grant], now), 'COURSE_PURCHASE');
  assert.equal(entitlementSource(course.id, [{ ...grant, scope: 'ALL_COURSES', courseId: null }], now), 'SUBSCRIPTION');
  assert.equal(hasLessonAccess(lesson, 'COURSE_PURCHASE'), true);
  assert.equal(hasLessonAccess(lesson, 'SUBSCRIPTION'), true);
  assert.equal(entitlementSource(course.id, [{ ...grant, courseId: 'another-course' }], now), 'NONE');
});

test('expired, revoked, future and exactly expired grants cannot authorize access', () => {
  for (const invalid of [
    { ...grant, status: 'EXPIRED' }, { ...grant, status: 'REVOKED' },
    { ...grant, startsAt: new Date(now.getTime() + 1) },
    { ...grant, expiresAt: new Date(now.getTime() - 1) }, { ...grant, expiresAt: now },
  ]) assert.equal(entitlementSource(course.id, [invalid], now), 'NONE');
  assert.equal(entitlementSource(course.id, [{ ...grant, startsAt: now }], now), 'COURSE_PURCHASE');
});

test('permanent course ownership survives subscription expiration and takes source priority', () => {
  const subscription = { ...grant, scope: 'ALL_COURSES', courseId: null };
  assert.equal(entitlementSource(course.id, [subscription, grant], now), 'COURSE_PURCHASE');
  assert.equal(entitlementSource(course.id, [{ ...subscription, expiresAt: now }, grant], now), 'COURSE_PURCHASE');
});
