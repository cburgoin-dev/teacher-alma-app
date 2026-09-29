const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { beginCompletion, finishCompletion, consumeCompletion, motionDuration } = require('../src/features/courses/completionMotion.ts');
const { feedbackScrollTarget } = require('../src/features/lessons/fillPresentation.ts');
const node = (id, type, done = false, current = false) => ({ id, type, progressStatus: done ? 'COMPLETED' : 'NOT_STARTED', access: { hasAccess: true }, progression: { unlocked: done || current, isCurrent: current } });
function maps(type = 'LESSON') {
  const from = node('first', type, false, true), to = node('second', 'LESSON');
  const before = { course: { id: 'course' }, currentNode: { id: from.id, type }, progress: { completedRequiredNodes: 2 }, topics: [{ nodes: [from, to] }] };
  const after = { ...before, currentNode: { id: to.id, type: to.type }, progress: { completedRequiredNodes: 3 }, topics: [{ nodes: [node(from.id, type, true), node(to.id, to.type, false, true)] }] };
  return { before, after, from };
}
test('Lesson and passed Challenge completion consume once, using the server frontier', () => {
  for (const type of ['LESSON', 'UNIT_CHALLENGE']) {
    const { before, after, from } = maps(type);
    const original = JSON.stringify(after);
    const ticket = beginCompletion(before, from);
    assert.ok(ticket);
    assert.equal(finishCompletion(ticket, true), ticket);
    assert.deepEqual(consumeCompletion(ticket, after), { from: from.id, to: after.currentNode.id, type });
    assert.equal(consumeCompletion(ticket, after), null);
    assert.equal(JSON.stringify(after), original, 'presentation must never rewrite the backend state');
  }
});
test('normal entry, replay, failed Challenge, reload and uncompleted exits have no transition', () => {
  const { before, after, from } = maps('UNIT_CHALLENGE');
  assert.equal(consumeCompletion(undefined, after), null);
  let ticket = beginCompletion(before, from);
  assert.equal(finishCompletion(ticket, false), undefined);
  assert.equal(consumeCompletion(ticket, after), null);
  assert.equal(beginCompletion(after, after.topics[0].nodes[0]), undefined);
  ticket = beginCompletion(before, from);
  assert.equal(consumeCompletion(ticket, after), null, 'exit without a successful result');
  assert.equal(consumeCompletion(999999, after), null, 'restored navigation has no in-memory ticket');
});
test('stale result cannot invent unlocks or animate a different course/frontier', () => {
  const { before, after, from } = maps();
  for (const final of [before, { ...after, course: { id: 'other' } }, { ...after, currentNode: null }, { ...after, currentNode: { id: 'third' } }, { ...after, progress: before.progress }]) {
    const ticket = beginCompletion(before, from);
    finishCompletion(ticket, true);
    assert.equal(consumeCompletion(ticket, final), null);
  }
});
test('reduced motion resolves without travel; ordinary timeline lasts three seconds', () => {
  assert.equal(motionDuration(true), 0);
  assert.equal(motionDuration(false), 3000);
});
test('feedback visibility uses its entire measured height, including the previously hidden tail', () => {
  assert.equal(feedbackScrollTarget(0, 400, 280, 180), 72);
  assert.equal(feedbackScrollTarget(72, 400, 280, 180), null);
  assert.equal(feedbackScrollTarget(0, 600, 280, 180), null);
  assert.equal(feedbackScrollTarget(0, 300, 400, 500), 388, 'oversized accessible text starts at the top and remains scrollable');
  assert.equal(feedbackScrollTarget(0, 0, 280, 180), null);
});

const { busStops, curvedDashes, courseStops } = require('../src/features/courses/components/pathGeometry.ts');
test('bus uses the painted curved geometry, including topic boundaries, and parks exactly at the final marker', () => {
  for (const section of [false, true]) {
    const stops = courseStops(324, [false, true], [true, section]);
    const points = busStops(stops[0], stops[1], section);
    assert.deepEqual(points.slice(1, -1), curvedDashes(stops[0], stops[1], section));
    assert.deepEqual(points.at(-1), { x: stops[1].x, y: stops[1].y - stops[1].size / 2 - 2 });
    assert.ok(points.length > 10);
  }
});
test('motion hook honors reduce motion, native timing, cancellation and listener cleanup', async () => {
  const vm = require('node:vm');
  const filename = require.resolve('../src/features/courses/components/useProgressMotion.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const reduced of [true, false]) {
    const cleanups = [], timings = [], values = [];
    let removed = 0, stopped = 0, finished = 0, completion;
    const module = { exports: {} };
    vm.runInNewContext(code, { requestAnimationFrame: fn => { fn(); return 1; }, cancelAnimationFrame() {}, module, exports: module.exports, require: id => {
      if (id === 'react') return { useRef: value => ({ current: value }), useState: () => [reduced, () => {}], useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); } };
      if (id === '../completionMotion') return { motionDuration };
      if (id === 'react-native') return {
        AccessibilityInfo: { isReduceMotionEnabled: async () => reduced, addEventListener: () => ({ remove() { removed++; } }) },
        Easing: { inOut: x => x, cubic: 'cubic', linear: 'linear' },
        Animated: { Value: class { setValue(value) { values.push(value); } }, timing: (_, options) => { timings.push(options); return options; }, sequence: () => ({ start(callback) { completion = callback; }, stop() { stopped++; } }) },
      };
      throw Error(id);
    } });
    module.exports.useProgressMotion({ from: 'a', to: 'b', type: 'LESSON' }, true, () => finished++);
    if (reduced) { assert.equal(finished, 1); assert.equal(timings.length, 0); assert.equal(values.at(-1), 1); }
    else {
      assert.equal(timings.reduce((sum, t) => sum + t.duration, 0), 3000);
      assert.ok(timings.every(t => t.useNativeDriver));
      completion({ finished: false }); assert.equal(finished, 0);
      completion({ finished: true }); assert.equal(finished, 1);
    }
    cleanups.forEach(fn => fn());
    assert.equal(removed, 1); assert.equal(stopped, reduced ? 0 : 1);
    await Promise.resolve();
  }
});

const { motionViewportOffset } = require('../src/features/courses/roadmapPosition.ts');
test('viewport contains travel and arrival; short/large-text windows skip offscreen motion', () => {
  const offset = motionViewportOffset(200, 650, 100, 600, 2000);
  assert.ok(200 + 100 >= offset);
  assert.ok(650 + 100 <= offset + 600);
  assert.equal(motionViewportOffset(200, 650, 100, 300, 2000), null);
});
