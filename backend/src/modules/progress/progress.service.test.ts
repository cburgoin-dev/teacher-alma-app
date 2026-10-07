import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressService } from './progress.service.js';
import type { ProgressCourseFacts, ProgressHistory, ProgressReadSession } from './progress.types.js';
import { course, lesson } from '../courses/course.test-fixtures.js';
import { courseProgress } from '../courses/course.progression.js';
import { dateValue } from '../gamification/gamification.rules.js';
import { monthEnd, weekBounds } from './progress.rules.js';

function fixture() {
  const facts: ProgressCourseFacts = { courses: [], progress: [], completions: [], grants: [], reviewItems: [] };
  const history: ProgressHistory = { days: [], protections: [], repairs: [] };
  const state = { timezone: 'America/Mazatlan', now: new Date('2026-10-10T18:00:00Z') };
  const session: ProgressReadSession = { timezone: async () => state.timezone, dashboard: async () => facts, history: async () => history };
  const service = new ProgressService({ read: work => work(session) }, () => state.now);
  return { facts, history, state, service };
}
const start = (courseId: string, day = 1, status = 'IN_PROGRESS', completedAt: Date | null = null) =>
  ({ courseId, status, startedAt: dateValue(`2026-09-${String(day).padStart(2, '0')}`), completedAt });

test('Dashboard selects visible courses with shared recency, start and id tie breaks', async () => {
  const { facts: f, service: s } = fixture();
  assert.equal((await s.read('u')).course, null);
  f.courses = ['a', 'b', 'hidden'].map(id => course({ id, status: id === 'hidden' ? 'DRAFT' : 'PUBLISHED' }));
  f.progress = [start('a')]; assert.equal((await s.read('u')).course?.id, 'a');
  f.progress.push(start('b', 2), start('hidden', 10));
  assert.equal((await s.read('u')).course?.id, 'b');
  f.completions = [{ courseId: 'a', completedAt: dateValue('2026-10-01') }, { courseId: 'hidden', completedAt: dateValue('2026-10-09') }];
  assert.equal((await s.read('u')).course?.id, 'a');
  f.completions.push({ courseId: 'b', completedAt: dateValue('2026-10-01') });
  assert.equal((await s.read('u')).course?.id, 'b');
  f.progress[0]!.startedAt = f.progress[1]!.startedAt;
  assert.equal((await s.read('u')).course?.id, 'a');
  assert.equal((await s.read('u')).course?.completedAt, null);
});

test('Completed fallback ranks dated before legacy null, then start/id; hidden active cannot displace visible completed', async () => {
  const { facts: f, service: s } = fixture();
  f.courses = ['a', 'b', 'hidden'].map(id => course({ id, status: id === 'hidden' ? 'DRAFT' : 'PUBLISHED' }));
  f.progress = [start('hidden'), start('a', 5, 'COMPLETED'), start('b', 1, 'COMPLETED', dateValue('2026-09-02'))];
  assert.equal((await s.read('u')).course?.id, 'b');
  assert.equal((await s.read('u')).course?.completedAt, '2026-09-02T00:00:00.000Z');
  f.progress[1]!.completedAt = dateValue('2026-09-03'); assert.equal((await s.read('u')).course?.id, 'a');
  f.progress[1]!.completedAt = null; f.progress[2]!.completedAt = null;
  assert.equal((await s.read('u')).course?.id, 'a');
  assert.equal((await s.read('u')).course?.completedAt, null);
  f.progress[2]!.startedAt = f.progress[1]!.startedAt; assert.equal((await s.read('u')).course?.id, 'a');
  f.courses = []; assert.equal((await s.read('u')).course, null);
});

test('Required progress equals Courses, including UC and excluding optional lessons', async () => {
  const { facts: f, service: s } = fixture(), c = course();
  f.courses = [c]; f.progress = [start(c.id)];
  c.topics[0]!.lessons = [lesson(1, { lessonProgress: [{ status: 'COMPLETED' }] }), lesson(2, { isRequired: false })];
  c.topics[0]!.unitChallenge = { id: 'uc', title: 'UC', status: 'PUBLISHED', accessType: 'FREE', progress: [], runs: [] };
  const { status, percentage, completedRequiredNodes, totalRequiredNodes } = courseProgress(c);
  assert.deepEqual((await s.read('u')).course?.progress, { status, percentage, completedRequiredNodes, totalRequiredNodes });
  assert.equal(percentage, 50); assert.equal(totalRequiredNodes, 2);
});

test('Review uses eligibility, canonical group order, real counts and a two-group cap', async () => {
  const { facts: f, service: s } = fixture();
  assert.deepEqual((await s.read('u')).review, { pendingCount: 0, groups: [] });
  f.reviewItems = ['c', 'b', 'a', 'b'].map((topic, i) => ({ id: String(i), createdAt: new Date(i * 1000),
    lastReviewedAt: topic === 'c' ? new Date(0) : null, activity: { status: 'ACTIVE' },
    sourceLesson: { status: 'PUBLISHED', accessType: 'FREE', topic: { id: topic, title: topic, courseId: 'course', course: { status: 'PUBLISHED' } } } }));
  f.reviewItems.push({ ...f.reviewItems[0]!, id: 'ineligible', sourceLesson: null });
  assert.deepEqual((await s.read('u')).review, { pendingCount: 4, groups: [
    { topic: { id: 'b', title: 'b' }, pendingCount: 2 }, { topic: { id: 'a', title: 'a' }, pendingCount: 1 },
  ] });
});

test('Week and calendar share all states and overlap precedence; sparse month excludes out-of-range facts', async () => {
  const { history: h, service: s } = fixture();
  h.days = ['2026-10-05', '2026-09-30', '2026-11-01', '2026-10-11'].map(activityDate => ({ activityDate: dateValue(activityDate) }));
  h.protections = [5, 6, 7].map(n => ({ protectedDate: dateValue(`2026-10-0${n}`) }));
  h.repairs = [5, 6, 7, 8].map(n => ({ brokenDate: dateValue(`2026-10-0${n}`), status: n < 7 ? 'USED' : 'INVALIDATED' }));
  h.repairs.push({ brokenDate: dateValue('2026-10-06'), status: 'EXPIRED' });
  const week = (await s.read('u')).consistency;
  assert.equal(week.timezone, 'America/Mazatlan'); assert.equal(week.today, '2026-10-10');
  assert.equal(week.weekStart, '2026-10-05'); assert.equal(week.weekEnd, '2026-10-11');
  assert.deepEqual(week.days.map(d => d.state), ['LEARNED', 'REPAIRED', 'PROTECTED', 'BROKEN', 'NONE', 'NONE', 'NONE']);
  assert.equal(week.learningDaysThisWeek, 1);
  const calendar = await s.calendar('u', '2026-10');
  assert.deepEqual(calendar.days.map(d => d.date), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-11']);
  assert.equal(calendar.learningDaysCount, 2);
  assert.deepEqual((await s.calendar('u', '2025-01')).days, []);
  assert.equal((await s.calendar('u', '2025-01')).learningDaysCount, 0);
});

test('Strict month validation, local future boundary and immutable historical date facts', async () => {
  const { service: s, state, history } = fixture();
  for (const value of [undefined, null, '', '2026-1', '10-2026', 'abc', '2026-13', '2026-00', '0000-01', '2026-10 ', ['2026-10'], {}]) {
    assert.throws(() => s.calendar('u', value), { code: 'INVALID_PROGRESS_MONTH', status: 400 });
  }
  state.now = new Date('2026-11-01T01:00:00Z');
  await assert.rejects(s.calendar('u', '2026-11'), { code: 'PROGRESS_MONTH_IN_FUTURE', status: 400 });
  history.days = [{ activityDate: dateValue('2026-10-01') }];
  const before = await s.calendar('u', '2026-10'); assert.equal(before.today, '2026-10-31');
  state.timezone = 'Asia/Tokyo';
  const after = await s.calendar('u', '2026-10'); assert.equal(after.today, '2026-11-01');
  assert.deepEqual(after.days, before.days); await s.calendar('u', '2026-11');
  assert.equal(monthEnd('2024-02'), '2024-02-29'); assert.equal(monthEnd('2026-02'), '2026-02-28');
  assert.equal(monthEnd('2026-12'), '2026-12-31');
  assert.deepEqual(weekBounds('2026-11-01'), { weekStart: '2026-10-26', weekEnd: '2026-11-01' });
  assert.deepEqual(weekBounds('2026-10-05'), { weekStart: '2026-10-05', weekEnd: '2026-10-11' });
});
