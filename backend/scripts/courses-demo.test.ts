import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCourses, demoId, demoUserId } from './courses-demo-data.js';
import { MemoryCourses } from '../src/modules/courses/course.test-fixtures.js';
import { CourseService } from '../src/modules/courses/course.service.js';

test('demo catalog derives 37.5%, unstarted A2, locked B1 and coming soon C1 through the real service', async () => {
  const service = new CourseService(new MemoryCourses(demoCourses()));
  const { courses } = await service.list(demoUserId);
  assert.deepEqual(courses.map(c => c.title), ['Inglés A1', 'Inglés A2', 'Inglés B1', 'Inglés C1']);
  assert.equal(courses[0]!.progress?.percentage, 37.5);
  assert.equal(courses[0]!.progress?.completedLessons, 3);
  assert.equal(courses[1]!.progress, null);
  assert.equal(courses[2]!.access.hasFreeContent, false);
  assert.equal(courses[2]!.access.hasFullAccess, false);
  assert.equal(courses[3]!.status, 'COMING_SOON');
  const detail = await service.detail(demoId(2), demoUserId);
  assert.deepEqual(detail.content, { topicCount: 4, lessonCount: 8, freeLessonCount: 2 });
});

test('demo A2 starts idempotently without lesson progress and errors remain real service errors', async () => {
  const repository = new MemoryCourses(demoCourses());
  const service = new CourseService(repository);
  const first = await service.start(demoId(2), demoUserId);
  const second = await service.start(demoId(2), demoUserId);
  assert.deepEqual(second, first);
  assert.equal(repository.writes, 1);
  assert.equal(first.progress.percentage, 0);
  const lessons = (await service.roadmap(demoId(2), demoUserId)).topics.flatMap(t => t.lessons);
  assert.equal(lessons[0]!.progression.isCurrent, true);
  assert.equal(lessons[0]!.access.hasAccess, true);
  assert.ok(lessons.every(l => l.progressStatus === 'NOT_STARTED'));
  await assert.rejects(service.start(demoId(3), demoUserId), { code: 'COURSE_ACCESS_REQUIRED' });
  await assert.rejects(service.start(demoId(4), demoUserId), { code: 'COURSE_NOT_AVAILABLE' });
});

test('eight A1 nodes derive current/prerequisite locks and the alternate paid boundary without UI overrides', async () => {
  const service = new CourseService(new MemoryCourses(demoCourses()));
  const roadmap = await service.roadmap(demoId(1), demoUserId);
  const lessons = roadmap.topics.flatMap(t => t.lessons);
  assert.equal(roadmap.topics.length, 4);
  assert.equal(lessons.length, 8);
  assert.ok(lessons.slice(0, 3).every(l => l.progressStatus === 'COMPLETED'));
  assert.equal(lessons[3]!.progression.isCurrent, true);
  assert.equal(lessons[3]!.progression.lockReason, null);
  assert.ok(lessons.slice(4).every(l => l.progression.lockReason === 'PREREQUISITE'));
  const boundary = new CourseService(new MemoryCourses(demoCourses(true)));
  const paid = (await boundary.roadmap(demoId(1), demoUserId)).topics.flatMap(t => t.lessons)[4]!;
  assert.equal(paid.progression.isCurrent, true);
  assert.equal(paid.progression.unlocked, true);
  assert.equal(paid.access.hasAccess, false);
  assert.equal(paid.progression.lockReason, 'ACCESS');
});
