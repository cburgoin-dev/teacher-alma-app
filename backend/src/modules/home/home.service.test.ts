import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HomeService } from './home.service.js';
import type { HomeFacts } from './home.types.js';
import { course, lesson } from '../courses/course.test-fixtures.js';
const date = (n: number) => new Date(n * 1000);
const facts = (): HomeFacts => ({ learner: { displayName: 'Alma' }, courses: [course()], grants: [], progress: [], completions: [], diagnostic: null, reviewItems: [] });
const read = (f: HomeFacts) => new HomeService({ read: async () => f }, () => date(100)).read('user');
const start = (courseId: string, n = 1, status = 'IN_PROGRESS', completedAt: Date | null = null) => ({ courseId, status, startedAt: date(n), completedAt });

test('NEW, empty catalog, real beginner and deterministic featured cap', async () => {
  const f = facts();
  f.courses = [course({ id: 'c', position: 3 }), course({ id: 'a' }), course({ id: 'b', position: 2 })];
  const result = await read(f);
  assert.equal(result.state, 'NEW'); assert.equal(result.review.pendingCount, 0);
  assert.deepEqual(result.featuredCourses.map(c => c.id), ['a', 'b']);
  assert.equal(result.hero.type === 'NEW' && result.hero.beginnerCourse?.id, 'a');
  f.courses = []; assert.deepEqual((await read(f)).hero, { type: 'NEW', beginnerCourse: null });
  f.courses = [course({ level: 'B2' })]; assert.equal((await read(f)).hero.type === 'NEW', true);
});

test('ASSESSED preserves paid recommendation, null and hidden recommendations, featured deduplication', async () => {
  const f = facts(); f.courses.push(course({ id: 'recommended', position: 2, topics: [] }));
  f.diagnostic = { id: 'diagnostic', completedAt: date(2), recommendedLevel: 'A2', recommendedCourseId: 'recommended' };
  let result = await read(f); assert.equal(result.state, 'ASSESSED');
  assert.deepEqual(result.featuredCourses.map(c => c.id), ['recommended', f.courses[0]!.id]);
  assert.equal(result.hero.type === 'ASSESSED' && result.hero.recommendedCourse?.access.hasFullAccess, false);
  for (const id of [null, 'hidden']) {
    f.diagnostic.recommendedCourseId = id; f.diagnostic.recommendedLevel = null;
    result = await read(f); assert.equal(result.hero.type === 'ASSESSED' && result.hero.recommendedCourse, null);
  }
});

test('ACTIVE precedence, durable recency before startedAt, ties and start fallback', async () => {
  const f = facts(); f.courses = ['a', 'b'].map(id => course({ id, courseProgress: [{ status: 'IN_PROGRESS' }] }));
  f.progress = [start('a', 2), start('b', 3), start('c', 4, 'COMPLETED', date(10))];
  f.diagnostic = { id: 'd', completedAt: date(20), recommendedLevel: null, recommendedCourseId: null };
  const selected = async () => { const r = await read(f); assert.equal(r.state, 'ACTIVE'); return r.hero.type === 'ACTIVE' && r.hero.course?.id; };
  assert.equal(await selected(), 'b');
  f.completions = [{ courseId: 'a', completedAt: date(5) }]; assert.equal(await selected(), 'a');
  f.completions.push({ courseId: 'b', completedAt: date(6) }); assert.equal(await selected(), 'b');
  f.completions.push({ courseId: 'a', completedAt: date(6) }); assert.equal(await selected(), 'b');
});

test('canonical Lesson and Unit Challenge frontier remains access locked; required percentage', async () => {
  const f = facts(), c = f.courses[0]!; c.courseProgress = [{ status: 'IN_PROGRESS' }]; f.progress = [start(c.id)];
  c.topics[0]!.lessons = [lesson(1, { accessType: 'PAID' })];
  c.topics[0]!.unitChallenge = { id: 'uc', title: 'Challenge', status: 'PUBLISHED', accessType: 'PAID', progress: [], runs: [] };
  let r = await read(f); assert.ok(r.hero.type === 'ACTIVE');
  assert.equal(r.hero.currentNode?.type, 'LESSON'); assert.deepEqual(r.hero.currentNode?.access, { hasAccess: false, lockReason: 'ACCESS' });
  c.topics[0]!.lessons[0]!.lessonProgress = [{ status: 'COMPLETED' }];
  r = await read(f); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.currentNode?.id, 'uc');
  assert.equal(r.hero.course?.progress.percentage, 50); assert.equal(r.hero.currentNode?.access.lockReason, 'ACCESS');
});

test('latest completed course precedes Diagnostic; next COMING_SOON is not skipped; no next', async () => {
  const f = facts(); f.courses = [course({ id: 'a' }), course({ id: 'b', position: 2 }), course({ id: 'soon', position: 3, status: 'COMING_SOON' }), course({ id: 'later', position: 4 })];
  f.progress = [start('a', 10, 'COMPLETED', date(5)), start('b', 1, 'COMPLETED', date(6))];
  f.diagnostic = { id: 'd', completedAt: date(20), recommendedLevel: null, recommendedCourseId: null };
  let r = await read(f); assert.ok(r.hero.type === 'COURSE_COMPLETED'); assert.equal(r.hero.completedCourse?.id, 'b');
  assert.equal(r.hero.recommendedCourse?.id, 'soon'); assert.equal(r.featuredCourses[0]?.id, 'soon');
  f.progress.push(start('later', 2, 'COMPLETED', date(7)));
  r = await read(f); assert.ok(r.hero.type === 'COURSE_COMPLETED'); assert.equal(r.hero.recommendedCourse, null);
});

test('Review count reuses eligibility and entitlement rules without returning items', async () => {
  const f = facts(); const item = { activity: { status: 'ACTIVE' }, sourceLesson: { status: 'PUBLISHED', accessType: 'FREE', topic: { courseId: 'a', course: { status: 'PUBLISHED' } } } };
  f.reviewItems = [item, { ...item, activity: { status: 'INACTIVE' } }, { ...item, sourceLesson: null }, { ...item, sourceLesson: { ...item.sourceLesson, accessType: 'PAID' } }];
  assert.deepEqual((await read(f)).review, { pendingCount: 1 });
  f.grants = [{ scope: 'ALL_COURSES', courseId: null, status: 'ACTIVE', startsAt: date(0), expiresAt: null }];
  assert.deepEqual((await read(f)).review, { pendingCount: 2 });
});

test('hidden progress keeps durable state without leaking content; missing frontier stays null', async () => {
  const f = facts(), c = f.courses[0]!; c.status = 'DRAFT'; f.progress = [start(c.id)];
  let r = await read(f); assert.deepEqual(r.hero, { type: 'ACTIVE', course: null, topic: null, currentNode: null });
  assert.deepEqual(r.featuredCourses, []);
  c.status = 'PUBLISHED'; c.courseProgress = [{ status: 'IN_PROGRESS' }]; c.topics = [];
  r = await read(f); assert.ok(r.hero.type === 'ACTIVE'); assert.equal(r.hero.currentNode, null);
  f.progress = [start(c.id, 1, 'COMPLETED')]; r = await read(f);
  assert.ok(r.hero.type === 'COURSE_COMPLETED'); assert.equal(r.hero.completedCourse?.completedAt, null);
});

test('ACTIVE prefers visible candidates, preserving durable recency, start fallback and deterministic ties', async () => {
  const f = facts();
  f.courses = ['hidden', 'a', 'b'].map(id => course({ id, status: id === 'hidden' ? 'DRAFT' : 'PUBLISHED', courseProgress: [{ status: 'IN_PROGRESS' }] }));
  f.progress = [start('hidden', 10), start('b', 3), start('a', 2)];
  f.completions = [{ courseId: 'hidden', completedAt: date(20) }, { courseId: 'a', completedAt: date(5) }, { courseId: 'b', completedAt: date(4) }];
  const selected = async () => {
    const r = await read(f); assert.equal(r.state, 'ACTIVE'); assert.ok(r.hero.type === 'ACTIVE');
    assert.ok(r.hero.currentNode); return r.hero.course?.id;
  };
  assert.equal(await selected(), 'a');
  f.completions[2]!.completedAt = date(6); assert.equal(await selected(), 'b');
  f.completions = [f.completions[0]!]; assert.equal(await selected(), 'b');
  f.progress[2]!.startedAt = date(3); assert.equal(await selected(), 'a');
  f.courses[1]!.status = 'DRAFT'; f.courses[2]!.status = 'DRAFT';
  const r = await read(f); assert.equal(r.state, 'ACTIVE');
  assert.deepEqual(r.hero, { type: 'ACTIVE', course: null, topic: null, currentNode: null });
});

test('COMPLETED prefers latest visible context and recommends from its position; only hidden stays nullable', async () => {
  const f = facts();
  f.courses = [course({ id: 'a', position: 1 }), course({ id: 'b', position: 2 }),
    course({ id: 'soon', position: 3, status: 'COMING_SOON' }), course({ id: 'hidden', position: 4, status: 'DRAFT' }),
    course({ id: 'later', position: 5 })];
  f.progress = [start('hidden', 3, 'COMPLETED', date(10)), start('a', 2, 'COMPLETED', date(5)), start('b', 1, 'COMPLETED', date(6))];
  let r = await read(f); assert.equal(r.state, 'COURSE_COMPLETED'); assert.ok(r.hero.type === 'COURSE_COMPLETED');
  assert.equal(r.hero.completedCourse?.id, 'b'); assert.equal(r.hero.completedCourse?.completedAt, date(6).toISOString());
  assert.equal(r.hero.recommendedCourse?.id, 'soon'); assert.equal(r.hero.recommendedCourse?.status, 'COMING_SOON');
  assert.equal(r.featuredCourses[0]?.id, 'soon');
  f.courses[0]!.status = 'DRAFT'; f.courses[1]!.status = 'DRAFT';
  r = await read(f); assert.equal(r.state, 'COURSE_COMPLETED');
  assert.deepEqual(r.hero, { type: 'COURSE_COMPLETED', completedCourse: null, recommendedCourse: null });
  assert.deepEqual(r.featuredCourses.map(c => c.id), ['soon', 'later']);
});
