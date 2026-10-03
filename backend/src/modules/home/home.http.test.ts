import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../shared/app.js';
import { CourseService } from '../courses/course.service.js';
import { MemoryCourses, userId } from '../courses/course.test-fixtures.js';
import { HomeService } from './home.service.js';

test('Home HTTP authenticates before repository reads and sanitizes persistence failures', async t => {
  let reads = 0;
  const service = new HomeService({ read: async () => { reads++; throw new Error('private database detail'); } });
  const server = createApp(new CourseService(new MemoryCourses()), (req, _res, next) => {
    if (req.headers['x-test-auth'] === 'yes') req.auth = { userId }; next();
  }, undefined, undefined, undefined, undefined, service).listen(0, '127.0.0.1');
  t.after(() => new Promise<void>((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections(); }));
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/me/home`;
  assert.equal((await fetch(url)).status, 401); assert.equal(reads, 0);
  const response = await fetch(url, { headers: { 'x-test-auth': 'yes' } });
  assert.equal(response.status, 500); assert.equal(reads, 1);
  assert.ok(!(await response.text()).includes('private database detail'));
});
