import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CourseService } from './course.service.js';
import { course, courseId, lesson, MemoryCourses, now, userId } from './course.test-fixtures.js';

test('catalog is ordered, hides drafts/archives, and reads never start learning', async () => {
  const repo = new MemoryCourses([
    course({ id: 'later', status: 'COMING_SOON', position: 3 }),
    course({ id: 'draft', status: 'DRAFT' }), course({ id: 'archived', status: 'ARCHIVED' }), course(),
  ]);
  const service = new CourseService(repo);
  const result = await service.list(userId);
  assert.deepEqual(result.courses.map(c => c.id), [courseId, 'later']);
  assert.equal(result.courses[0]?.progress, null);
  assert.deepEqual(result.courses[0]?.access, { hasFullAccess: true, hasFreeContent: true, source: 'FREE' });
  await service.detail(courseId, userId);
  await service.roadmap(courseId, userId);
  assert.equal(repo.writes, 0);
});

test('published content includes optional lessons; progress counts required lessons only', async () => {
  const repo = new MemoryCourses([course({ topics: [
    { id: 'later', title: 'Later', position: 2, lessons: [lesson(4)] },
    { id: 'empty', title: 'Empty', position: 3, lessons: [lesson(5, { status: 'ARCHIVED' })] },
    { id: 'first', title: 'First', position: 1, lessons: [lesson(3, { status: 'DRAFT' }),
      lesson(2, { isRequired: false, accessType: 'PAID' }), lesson(1)] },
  ] })]);
  const service = new CourseService(repo);
  assert.deepEqual((await service.detail(courseId, userId)).content, { topicCount: 2, lessonCount: 3, freeLessonCount: 2 });
  const roadmap = await service.roadmap(courseId, userId);
  const path = roadmap.topics.flatMap(t => t.lessons);
  assert.deepEqual(path.map(l => l.title), ['Lesson 1', 'Lesson 2', 'Lesson 4']);
  assert.deepEqual(path[0]?.progression, { unlocked: true, isCurrent: false, lockReason: null });
  assert.deepEqual(path[1]?.progression, { unlocked: false, isCurrent: false, lockReason: 'PREREQUISITE' });
  assert.equal(roadmap.progress.totalLessons, 2);
  assert.equal(repo.writes, 0);
});

test('start is idempotent, marks first pending current, and does not start a lesson', async () => {
  const repo = new MemoryCourses();
  const service = new CourseService(repo);
  const first = await service.start(courseId, userId);
  const second = await service.start(courseId, userId);
  assert.deepEqual(first, second);
  assert.equal(repo.writes, 1);
  assert.deepEqual(first.progress, { status: 'IN_PROGRESS', completedLessons: 0, totalLessons: 2, percentage: 0 });
  const roadmap = await service.roadmap(courseId, userId);
  assert.equal(roadmap.topics[0]?.lessons[0]?.progression.isCurrent, true);
  assert.equal(roadmap.topics[0]?.lessons[0]?.progressStatus, 'NOT_STARTED');
  assert.equal(roadmap.topics[0]?.lessons[1]?.progression.unlocked, false);
});

test('concurrent starts remain idempotent through the repository conflict-safe operation', async () => {
  const repo = new MemoryCourses();
  const service = new CourseService(repo);
  const results = await Promise.all(Array.from({ length: 10 }, () => service.start(courseId, userId)));
  assert.equal(repo.writes, 1);
  assert.ok(results.every(result => JSON.stringify(result) === JSON.stringify(results[0])));
});

test('completion unlocks across topic boundaries; access never overrides prerequisites', async () => {
  const repo = new MemoryCourses([course({ courseProgress: [{ status: 'IN_PROGRESS' }], topics: [
    { id: 'a', title: 'A', position: 1, lessons: [lesson(1, { lessonProgress: [{ status: 'COMPLETED' }] })] },
    { id: 'b', title: 'B', position: 2, lessons: [lesson(2, { accessType: 'PAID', isRequired: false }), lesson(3)] },
  ] })]);
  const service = new CourseService(repo, () => now);
  let path = (await service.roadmap(courseId, userId)).topics.flatMap(t => t.lessons);
  assert.equal(path[0]?.progression.unlocked, true);
  assert.deepEqual(path[1]?.progression, { unlocked: true, isCurrent: false, lockReason: 'ACCESS' });
  assert.deepEqual(path[1]?.access, { type: 'PAID', hasAccess: false });
  assert.deepEqual(path[2]?.progression, { unlocked: true, isCurrent: true, lockReason: null });
  repo.grants = [{ scope: 'ALL_COURSES', courseId: null, status: 'ACTIVE', startsAt: now, expiresAt: null }];
  path = (await service.roadmap(courseId, userId)).topics.flatMap(t => t.lessons);
  assert.equal(path[1]?.access.hasAccess, true);
  assert.equal(path[1]?.progression.lockReason, null);
  assert.equal(path[2]?.progression.unlocked, true);
  assert.equal(repo.writes, 0);
});

test('later free content does not authorize a paid first lesson; entitlement does', async () => {
  const repo = new MemoryCourses([course({ topics: [
    { id: 't', title: 'T', position: 1, lessons: [lesson(1, { accessType: 'PAID' }), lesson(2)] },
  ] })]);
  const service = new CourseService(repo, () => now);
  await assert.rejects(service.start(courseId, userId), { status: 403, code: 'COURSE_ACCESS_REQUIRED' });
  assert.equal(repo.writes, 0);
  repo.grants = [{ scope: 'COURSE', courseId, status: 'ACTIVE', startsAt: now, expiresAt: null }];
  assert.equal((await service.start(courseId, userId)).nextLesson?.id, lesson(1).id);
  assert.equal((await service.detail(courseId, userId)).access.source, 'COURSE_PURCHASE');
});

test('free first lesson permits freemium start, while full access remains NONE', async () => {
  const repo = new MemoryCourses([course({ topics: [
    { id: 't', title: 'T', position: 1, lessons: [lesson(1), lesson(2, { accessType: 'PAID' })] },
  ] })]);
  const service = new CourseService(repo);
  await service.start(courseId, userId);
  assert.deepEqual((await service.detail(courseId, userId)).access, { hasFullAccess: false, hasFreeContent: true, source: 'NONE' });
  assert.deepEqual(repo.grants, []);
});

test('all published lessons completed produces 100%, COMPLETED and null next without updates', async () => {
  const repo = new MemoryCourses([course({ courseProgress: [{ status: 'IN_PROGRESS' }], topics: [
    { id: 't', title: 'T', position: 1, lessons: [lesson(1, { lessonProgress: [{ status: 'COMPLETED' }] }),
      lesson(2, { isRequired: false, lessonProgress: [{ status: 'COMPLETED' }] }), lesson(3, { status: 'DRAFT' })] },
  ] })]);
  const service = new CourseService(repo);
  const result = await service.start(courseId, userId);
  assert.equal(result.nextLesson, null);
  assert.deepEqual(result.progress, { status: 'COMPLETED', completedLessons: 1, totalLessons: 1, percentage: 100 });
  assert.deepEqual((await service.detail(courseId, userId)).progress, result.progress);
  assert.equal((await service.roadmap(courseId, userId)).topics[0]?.lessons.some(l => l.progression.isCurrent), false);
  assert.equal(repo.writes, 0);
  assert.equal(repo.courses[0]?.courseProgress[0]?.status, 'IN_PROGRESS');
});

test('start validation order: hidden, coming soon, no content, access; no failing start writes', async () => {
  for (const [status, code, http] of [
    ['DRAFT', 'COURSE_NOT_FOUND', 404], ['COMING_SOON', 'COURSE_NOT_AVAILABLE', 409],
    ['PUBLISHED', 'COURSE_HAS_NO_CONTENT', 409],
  ] as const) {
    const repo = new MemoryCourses([course({ status, topics: [] })]);
    await assert.rejects(new CourseService(repo).start(courseId, userId), { status: http, code });
    assert.equal(repo.writes, 0);
  }
  const service = new CourseService(new MemoryCourses([]));
  for (const method of ['detail', 'roadmap', 'start'] as const) {
    await assert.rejects(service[method](courseId, userId), { status: 404, code: 'COURSE_NOT_FOUND' });
  }
});

test('published course with only hidden lessons is readable but cannot be started', async () => {
  const repo = new MemoryCourses([course({ topics: [
    { id: 't', title: 'T', position: 1, lessons: [lesson(1, { status: 'DRAFT' }), lesson(2, { status: 'ARCHIVED' })] },
  ] })]);
  const service = new CourseService(repo);
  const detail = await service.detail(courseId, userId);
  assert.deepEqual(detail.content, { topicCount: 0, lessonCount: 0, freeLessonCount: 0 });
  assert.equal(detail.progress, null);
  assert.equal(detail.access.source, 'NONE');
  assert.deepEqual((await service.roadmap(courseId, userId)).progress, { completedLessons: 0, totalLessons: 0, percentage: 0 });
  await assert.rejects(service.start(courseId, userId), { code: 'COURSE_HAS_NO_CONTENT' });
  assert.equal(repo.writes, 0);
});

test('a repeated start still validates initial access and never treats progress as an entitlement', async () => {
  const repo = new MemoryCourses([course({ courseProgress: [{ status: 'IN_PROGRESS' }], topics: [
    { id: 't', title: 'T', position: 1, lessons: [lesson(1, { accessType: 'PAID' })] },
  ] })]);
  await assert.rejects(new CourseService(repo).start(courseId, userId), { code: 'COURSE_ACCESS_REQUIRED' });
  assert.equal(repo.writes, 0);
});

for (const requiredComplete of [true, false]) test('required progress independent of optional completion: ' + requiredComplete, async () => {
 const lessons = [lesson(1, { lessonProgress: requiredComplete ? [{status:'COMPLETED'}] : [] }), lesson(2, {isRequired:false, lessonProgress: requiredComplete ? [] : [{status:'COMPLETED'}]})];
 const repo = new MemoryCourses([course({courseProgress:[{status:'IN_PROGRESS'}],topics:[{id:'t',title:'T',position:1,lessons}]})]);
 const service=new CourseService(repo); const detail=await service.detail(courseId,userId);
 assert.equal(detail.content.lessonCount,2); assert.equal(detail.progress?.totalLessons,1);
 assert.equal(detail.progress?.completedLessons,requiredComplete?1:0); assert.equal(detail.progress?.status,requiredComplete?'COMPLETED':'IN_PROGRESS');
 assert.equal((await service.roadmap(courseId,userId)).topics[0]?.lessons.length,2);
});
