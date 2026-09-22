const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Use the project's compiler, without adding a test runner or emitting files.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { catalogDestination, catalogLabel, detailAction, lessonState } = require('../src/features/courses/presentation.ts');
const { coursesApi } = require('../src/features/courses/api/courses.ts');
const { ApiError } = require('../src/services/api/client.ts');
const { serpentineStops, curvedDashes } = require('../src/features/courses/components/pathGeometry.ts');

const course = { id: '550e8400-e29b-41d4-a716-446655440000', status: 'PUBLISHED', progress: null, access: { hasFullAccess: false, hasFreeContent: true, source: 'NONE' } };
const lesson = { progressStatus: 'NOT_STARTED', access: { type: 'FREE', hasAccess: true }, progression: { unlocked: true, isCurrent: false, lockReason: null } };
const roadmap = { topics: [{ lessons: [lesson] }] };

test('responsive path alternates sides with wide amplitude and keeps nodes inside the viewport', () => {
  for (const width of [280, 320, 360, 600]) {
    for (const scale of [1, 1.3, 1.5]) {
      const stops = serpentineStops(width, [false, true, false, false], 0, scale);
      stops.forEach((stop, index) => {
        assert.ok(stop.x - stop.size / 2 >= 0);
        assert.ok(stop.x + stop.size / 2 <= width);
        if (index) {
          assert.notEqual(stop.right, stops[index - 1].right);
          assert.ok(Math.abs(stop.x - stops[index - 1].x) >= width * .59);
          assert.ok(stop.y - stops[index - 1].y > (stop.size + stops[index - 1].size) / 2);
        }
      });
      const dashes = curvedDashes(stops[0], stops[1]);
      assert.ok(dashes.length > 5);
      assert.ok(dashes.every(dot => dot.x > 0 && dot.x < width && Number.isFinite(dot.angle)));
    }
  }
  assert.equal(serpentineStops(360, [false], 1)[0].right, true);
});

test('unstarted and locked courses navigate to detail', () => {
  assert.equal(catalogDestination(course), 'CourseDetail');
  assert.equal(catalogDestination({ ...course, access: { ...course.access, hasFreeContent: false } }), 'CourseDetail');
});
test('started/completed courses go to roadmap regardless of full commercial access', () => {
  for (const status of ['IN_PROGRESS', 'COMPLETED']) assert.equal(catalogDestination({ ...course, progress: { status } }), 'Roadmap');
});
test('coming soon never offers a start, even if progress exists', () => {
  const soon = { ...course, status: 'COMING_SOON', progress: { status: 'IN_PROGRESS' } };
  assert.equal(catalogDestination(soon), 'CourseDetail');
  assert.equal(catalogLabel(soon), 'Próximamente');
  assert.equal(detailAction(soon, roadmap), 'SOON');
});
test('start uses first lesson access, not existence of any free lesson', () => {
  assert.equal(detailAction(course, roadmap), 'START');
  assert.equal(detailAction(course, { topics: [{ lessons: [{ ...lesson, access: { type: 'PAID', hasAccess: false } }, lesson] }] }), 'ACCESS');
  assert.equal(detailAction(course, { topics: [{ lessons: [{ ...lesson, access: { type: 'PAID', hasAccess: true } }] }] }), 'START');
});
test('empty course cannot start; existing progress offers route', () => {
  assert.equal(detailAction(course, { topics: [] }), 'EMPTY');
  assert.equal(detailAction({ ...course, progress: { status: 'COMPLETED' } }, roadmap), 'ROUTE');
});
test('all five roadmap states come from independent server values', () => {
  assert.equal(lessonState(lesson), 'AVAILABLE');
  assert.equal(lessonState({ ...lesson, progressStatus: 'COMPLETED' }), 'COMPLETED');
  assert.equal(lessonState({ ...lesson, progression: { ...lesson.progression, isCurrent: true } }), 'CURRENT');
  assert.equal(lessonState({ ...lesson, access: { type: 'PAID', hasAccess: false }, progression: { unlocked: false, isCurrent: false, lockReason: 'PREREQUISITE' } }), 'LOCKED_PREREQUISITE');
  assert.equal(lessonState({ ...lesson, access: { type: 'PAID', hasAccess: false }, progression: { unlocked: true, isCurrent: true, lockReason: 'ACCESS' } }), 'LOCKED_ACCESS');
});
test('access expiration does not silently turn a completed paid lesson into an accessible one', () => {
  assert.equal(lessonState({ ...lesson, progressStatus: 'COMPLETED', access: { type: 'PAID', hasAccess: false }, progression: { unlocked: true, isCurrent: false, lockReason: 'ACCESS' } }), 'LOCKED_ACCESS');
});
test('HTTP integration: four routes, explicit POST, cancellation and contract errors', async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://courses.test/';
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ courses: [] }), { status: 200 }); };
  try {
    const signal = new AbortController().signal;
    assert.deepEqual(await coursesApi.catalog(signal), { courses: [] });
    await coursesApi.detail(course.id, signal); await coursesApi.roadmap(course.id, signal); await coursesApi.start(course.id, signal);
    assert.deepEqual(calls.map(call => call.url), ['https://courses.test/courses', 'https://courses.test/courses/' + course.id, 'https://courses.test/courses/' + course.id + '/roadmap', 'https://courses.test/courses/' + course.id + '/start']);
    assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);
    assert.equal(calls[3].options.body, undefined);
    assert.ok(calls.every(call => call.options.signal === signal));
    for (const [status, code] of [[401, 'UNAUTHENTICATED'], [403, 'COURSE_ACCESS_REQUIRED'], [404, 'COURSE_NOT_FOUND'], [409, 'COURSE_NOT_AVAILABLE'], [409, 'COURSE_HAS_NO_CONTENT']]) {
      global.fetch = async () => new Response(JSON.stringify({ error: { code, message: 'Contract error' } }), { status });
      await assert.rejects(coursesApi.start(course.id), error => error instanceof ApiError && error.status === status && error.code === code);
    }
  } finally { global.fetch = originalFetch; if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = originalUrl; }
});
