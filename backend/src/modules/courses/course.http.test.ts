import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../shared/app.js';
import { developmentAuth } from '../../shared/auth.js';
import { CourseService } from './course.service.js';
import { course, courseId, lesson, MemoryCourses, userId } from './course.test-fixtures.js';

async function serve(t: TestContext, repo = new MemoryCourses(), environment = 'development', id: string | undefined = userId) {
  const app = createApp(new CourseService(repo), developmentAuth(environment, id));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return async (path: string, method = 'GET', body?: string) => {
    const result = await fetch(url + path, { method, ...(body === undefined ? {} : { body, headers: { 'content-type': 'application/json' } }) });
    return { status: result.status, body: await result.json() };
  };
}

test('all four routes return contract-shaped 200 responses and start remains idempotent', async t => {
  const repo = new MemoryCourses();
  const request = await serve(t, repo);
  const list = await request('/courses');
  assert.equal(list.status, 200);
  assert.deepEqual(Object.keys(list.body), ['courses']);
  assert.equal(list.body.courses[0].progress, null);
  const detail = await request(`/courses/${courseId}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(Object.keys(detail.body).sort(), ['access', 'content', 'coverUrl', 'description', 'id', 'level', 'progress', 'slug', 'status', 'title']);
  const roadmap = await request(`/courses/${courseId}/roadmap`);
  assert.equal(roadmap.status, 200);
  assert.deepEqual(Object.keys(roadmap.body).sort(), ['course', 'progress', 'topics']);
  assert.equal(repo.writes, 0);
  const start = await request(`/courses/${courseId}/start`, 'POST');
  assert.equal(start.status, 200);
  assert.deepEqual(Object.keys(start.body).sort(), ['course', 'nextLesson', 'progress']);
  assert.deepEqual(await request(`/courses/${courseId}/start`, 'POST'), start);
  assert.equal(repo.writes, 1);
  assert.deepEqual(await request('/health'), { status: 200, body: { status: 'ok' } });
});

test('UUID validation precedes auth; missing auth is 401 and development injection is disabled in production', async t => {
  for (const environment of ['production', 'test']) {
    const repo = new MemoryCourses();
    const request = await serve(t, repo, environment);
    for (const [path, method] of [['/courses', 'GET'], [`/courses/${courseId}`, 'GET'],
      [`/courses/${courseId}/roadmap`, 'GET'], [`/courses/${courseId}/start`, 'POST']]) {
      assert.deepEqual(await request(path!, method!), {
        status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      });
    }
    assert.deepEqual(await request('/courses/invalid/start', 'POST'), {
      status: 400, body: { error: { code: 'INVALID_COURSE_ID', message: 'Invalid course id' } },
    });
    assert.equal(repo.writes, 0);
  }
});

test('business errors preserve exact contract status, code and message', async t => {
  for (const [value, status, code, message] of [
    [course({ status: 'DRAFT' }), 404, 'COURSE_NOT_FOUND', 'Course not found'],
    [course({ status: 'COMING_SOON' }), 409, 'COURSE_NOT_AVAILABLE', 'Course is not available yet'],
    [course({ topics: [] }), 409, 'COURSE_HAS_NO_CONTENT', 'Course has no available content'],
    [course({ topics: [{ id: 't', title: 'T', position: 1, lessons: [lesson(1, { accessType: 'PAID' })] }] }),
      403, 'COURSE_ACCESS_REQUIRED', 'Access to this course is required'],
  ] as const) {
    const repo = new MemoryCourses([value]);
    const request = await serve(t, repo);
    assert.deepEqual(await request(`/courses/${courseId}/start`, 'POST'), { status, body: { error: { code, message } } });
    assert.equal(repo.writes, 0);
  }
});

test('malformed JSON is 400; unexpected errors are 500 without internal details', async t => {
  const repo = new MemoryCourses();
  repo.findCourses = async () => { throw new Error('private connection detail'); };
  const request = await serve(t, repo);
  assert.deepEqual(await request('/courses'), {
    status: 500, body: { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } },
  });
  assert.equal((await request(`/courses/${courseId}/start`, 'POST', '{broken')).status, 400);
});

test('development user UUID is validated at configuration time', () => {
  assert.throws(() => developmentAuth('development', 'invalid'), /DEV_AUTH_USER_ID/);
  assert.doesNotThrow(() => developmentAuth('production', 'invalid'));
});
