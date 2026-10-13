import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../shared/app.js';
import { CourseService } from '../courses/course.service.js';
import { MemoryCourses, userId } from '../courses/course.test-fixtures.js';
import { DiagnosticService } from './diagnostic.service.js';

test('Diagnostic HTTP authenticates all endpoints, validates paths/keys and sanitizes unexpected errors', async t => {
  let reads = 0, writes = 0;
  const service = new DiagnosticService({
    read: async () => { reads++; throw new Error('private DB detail'); },
    write: async () => { writes++; throw new Error('private DB detail'); },
  });
  const server = createApp(new CourseService(new MemoryCourses()), (req, _res, next) => {
    if (req.headers['x-test-auth'] === 'yes') req.auth = { userId }; next();
  }, undefined, undefined, undefined, undefined, undefined, undefined, service).listen(0, '127.0.0.1');
  t.after(() => new Promise<void>((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections(); }));
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/diagnostic`;
  async function request(path: string, method = 'GET', auth = true, body: unknown = {}) {
    const response = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(auth ? { 'x-test-auth': 'yes' } : {}) },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  }
  const attempt = randomUUID(), question = randomUUID();
  for (const [path, method] of [['', 'GET'], ['/result', 'GET'], ['/attempts', 'POST'],
    [`/attempts/${attempt}/questions/${question}/submit`, 'POST'], [`/attempts/${attempt}/abandon`, 'POST']]) {
    assert.equal((await request(path!, method, false)).status, 401);
  }
  assert.equal(reads + writes, 0);
  assert.equal((await request('/attempts', 'POST')).body.error.code, 'INVALID_DIAGNOSTIC_REQUEST_KEY');
  assert.equal((await request('/attempts/bad/abandon', 'POST')).body.error.code, 'INVALID_ATTEMPT_ID');
  assert.equal((await request(`/attempts/${attempt}/questions/bad/submit`, 'POST')).body.error.code, 'INVALID_DIAGNOSTIC_QUESTION_ID');
  assert.equal((await request(`/attempts/${attempt}/questions/${question}/submit`, 'POST')).body.error.code, 'INVALID_DIAGNOSTIC_SUBMISSION_REQUEST_KEY');
  assert.equal(reads + writes, 0);
  const failed = await request(''); assert.equal(failed.status, 500); assert.ok(!JSON.stringify(failed.body).includes('private'));
  assert.equal(reads, 1);
});
