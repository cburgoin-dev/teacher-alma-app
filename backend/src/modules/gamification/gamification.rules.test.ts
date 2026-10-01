import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learningDate, nextDate, reconcileTimeline } from './gamification.rules.js';

test('IANA learning dates cross UTC midnight and DST without fixed-offset arithmetic', () => {
  const instant = new Date('2026-10-01T00:30:00Z');
  assert.equal(learningDate(instant, 'America/Chihuahua'), '2026-09-30');
  assert.equal(learningDate(instant, 'Asia/Tokyo'), '2026-10-01');
  assert.equal(learningDate(new Date('2026-09-30T23:30:00Z'), 'Europe/Paris'), '2026-10-01');
  assert.equal(learningDate(new Date('2026-03-08T06:59:00Z'), 'America/New_York'), '2026-03-08');
  assert.equal(learningDate(new Date('2026-03-08T07:01:00Z'), 'America/New_York'), '2026-03-08');
  assert.equal(nextDate('2026-03-08'), '2026-03-09');
  assert.equal(nextDate('2026-12-31'), '2027-01-01');
  assert.throws(() => learningDate(instant, 'invalid/timezone'), /INVALID_USER_TIMEZONE/);
  assert.throws(() => learningDate(instant, '+06:00'), /INVALID_USER_TIMEZONE/);
});
test('continuity counts only real dates, consumes chronologically and never retroactively spends new stock', () => {
  const base = { days: ['2026-09-01', '2026-09-04'], protectedDays: [], repairedDays: [], today: '2026-09-04', evaluatedThrough: null, stock: 2 };
  const two = reconcileTimeline(base);
  assert.equal(two.currentDays, 2); assert.deepEqual(two.consume, ['2026-09-02', '2026-09-03']);
  const one = reconcileTimeline({ ...base, stock: 1 });
  assert.equal(one.currentDays, 1); assert.deepEqual(one.breaks, [{ date: '2026-09-03', previousDays: 1 }]);
  assert.deepEqual(reconcileTimeline({ ...base, evaluatedThrough: '2026-09-03' }).consume, []);
  assert.equal(reconcileTimeline({ ...base, stock: 0, protectedDays: ['2026-09-02'], repairedDays: ['2026-09-03'] }).currentDays, 2);
});
