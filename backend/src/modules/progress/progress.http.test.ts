import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../shared/app.js';
import { CourseService } from '../courses/course.service.js';
import { MemoryCourses, userId } from '../courses/course.test-fixtures.js';
import { ProgressService } from './progress.service.js';

test('Progress HTTP auth, strict query errors and sanitized unexpected failures', async t => {
  let reads = 0, fail = false;
  const service = new ProgressService({ read: async work => {
    reads++; if (fail) throw new Error('private SQL detail');
    return work({ timezone: async () => 'America/Mazatlan', dashboard: async () => ({ courses: [], progress: [], completions: [], grants: [], reviewItems: [] }),
      history: async () => ({ days: [], protections: [], repairs: [] }) });
  } }, () => new Date('2026-11-01T01:00:00Z'));
  const server = createApp(new CourseService(new MemoryCourses()), (req, _res, next) => {
    if (req.headers['x-test-auth'] === 'yes') req.auth = { userId }; next();
  }, undefined, undefined, undefined, undefined, undefined, service).listen(0, '127.0.0.1');
  t.after(() => new Promise<void>((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections(); }));
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me/progress`;
  for (const path of ['', '/calendar', '/calendar?month=2026-10']) assert.equal((await fetch(base + path)).status, 401);
  assert.equal(reads, 0);
  const headers = { 'x-test-auth': 'yes' };
  for (const query of ['', '?month=abc', '?month=2026-1', '?month=2026-13', '?month=2026-10&month=2026-09']) {
    const response = await fetch(base + '/calendar' + query, { headers });
    assert.equal(response.status, 400); assert.equal((await response.json()).error.code, 'INVALID_PROGRESS_MONTH');
  }
  const future = await fetch(base + '/calendar?month=2026-11', { headers });
  assert.equal(future.status, 400); assert.equal((await future.json()).error.code, 'PROGRESS_MONTH_IN_FUTURE');
  const dashboard = await fetch(base, { headers }); assert.equal(dashboard.status, 200);
  assert.deepEqual(Object.keys(await dashboard.json()).sort(), ['consistency', 'course', 'review']);
  const calendar = await fetch(base + '/calendar?month=2026-10', { headers }); assert.equal(calendar.status, 200);
  assert.deepEqual(await calendar.json(), { month: '2026-10', timezone: 'America/Mazatlan', today: '2026-10-31', learningDaysCount: 0, days: [] });
  fail = true;
  for (const path of ['', '/calendar?month=2026-10']) {
    const response = await fetch(base + path, { headers }); assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes('private SQL'));
  }
});
