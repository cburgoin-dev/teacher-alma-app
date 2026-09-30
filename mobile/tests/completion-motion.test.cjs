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
test('reduced motion resolves without travel; V7 surrounds unchanged V6 travel with completion and reveal', () => {
  assert.equal(motionDuration(true), 0);
  assert.equal(motionDuration(false), 6625);
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
      if (id === '../completionMotion') return require('../src/features/courses/completionMotion.ts');
      if (id === 'react-native') return {
        AccessibilityInfo: { isReduceMotionEnabled: async () => reduced, addEventListener: () => ({ remove() { removed++; } }) },
        Easing: { inOut: x => x, cubic: 'cubic', linear: 'linear' },
        Animated: { Value: class { setValue(value) { values.push(value); } addListener() { return "frame"; } removeListener() { removed++; } }, timing: (target, options) => { timings.push({...options,target}); return options; }, sequence: () => ({ start(callback) { completion = callback; }, stop() { stopped++; } }) },
      };
      throw Error(id);
    } });
    module.exports.useProgressMotion({ from: 'a', to: 'b', type: 'LESSON' }, true, () => finished++);
    if (reduced) { assert.equal(finished, 1); assert.equal(timings.length, 0); assert.equal(values.at(-1), 1); }
    else {
      assert.equal(timings.reduce((sum, t) => sum + t.duration, 0), 6625);
      assert.ok(timings.every(t => t.useNativeDriver));
      assert.deepEqual(Array.from(timings, t=>t.duration), [1300,275,3500,450,1100]);
      assert.deepEqual(Array.from(timings,t=>t.toValue), [1,1,3500/3950,1,1]);
      assert.notEqual(timings[0].target,timings[1].target);
      assert.equal(timings[2].target,timings[3].target);
      assert.notEqual(timings[0].target,timings[2].target);
      assert.notEqual(timings[2].target,timings[4].target);
      completion({ finished: false }); assert.equal(finished, 0);
      completion({ finished: true }); assert.equal(finished, 1);
    }
    cleanups.forEach(fn => fn());
    assert.equal(removed, reduced ? 1 : 2); assert.equal(stopped, reduced ? 0 : 1);
    await Promise.resolve();
  }
});

const { motionViewportOffset } = require('../src/features/courses/roadmapPosition.ts');
test('camera follows the bus even when the segment cannot fit and clamps document edges', () => {
  assert.equal(motionViewportOffset(650, 100, 300, 2000), 624);
  assert.equal(motionViewportOffset(200, 100, 600, 2000), 48);
  assert.equal(motionViewportOffset(0, 0, 600, 2000), 0);
  assert.equal(motionViewportOffset(1900, 100, 600, 2000), 1400);
});

const { travelSamples, travelPoint } = require('../src/features/courses/components/pathGeometry.ts');
const { devReplayTransition } = require('../src/features/courses/devMotion.ts');
test('arc distance drives both painted dash frontier and bus/camera coordinates; tangents turn continuously', () => {
  for (const section of [false, true]) for (const width of [280, 400]) {
    const stops = courseStops(width, [false, true], [true, section]);
    const points = busStops(stops[0], stops[1], section), samples = travelSamples(points);
    assert.equal(samples[0].fraction, 0); assert.equal(samples.at(-1).fraction, 1);
    samples.forEach((sample, i) => {
      const bus = travelPoint(samples, sample.fraction);
      assert.ok(Math.abs(bus.x - sample.x) < .001 && Math.abs(bus.y - sample.y) < .001);
      assert.ok(Number.isFinite(sample.angle));
      if (i) { assert.ok(sample.fraction > samples[i-1].fraction); assert.ok(Math.abs(sample.angle - samples[i-1].angle) <= 180); }
    });
    assert.ok(samples.some(s => Math.abs(s.angle) > 15));
    const mid = travelPoint(samples, (samples[1].fraction + samples[2].fraction) / 2);
    assert.ok(Math.abs(mid.x - (samples[1].x + samples[2].x) / 2) < .001);
  }
  assert.equal(travelSamples([{x:0,y:0},{x:0,y:10}])[0].angle, 0);
  assert.equal(travelSamples([{x:0,y:0},{x:10,y:0}])[0].angle, -90);
});
test('DEV replay uses real adjacent nodes repeatedly without consuming a completion or changing progress', () => {
  const { before, after, from } = maps(); const snapshot = JSON.stringify(after);
  const ticket = beginCompletion(before, from); finishCompletion(ticket, true);
  const expected = {from:'first',to:'second',type:'LESSON'};
  assert.deepEqual(devReplayTransition(after), expected); assert.deepEqual(devReplayTransition(after), expected);
  assert.equal(JSON.stringify(after), snapshot); assert.deepEqual(consumeCompletion(ticket, after), expected);
  assert.equal(devReplayTransition(before), null);
  assert.equal(devReplayTransition({...after, currentNode:null}), null);
});

const { vehicleContact, vehiclePosition, vehicleAngle } = require('../src/features/courses/components/vehicleGeometry.ts');
test('vehicle tire baseline follows the tangent, with the tire midpoint exactly on the road', () => {
  assert.ok(Math.abs(vehicleContact.y - 37.8666666667) < .0001);
  assert.ok(vehicleContact.y < 42, 'SVG letterbox bottom is not tire contact');
  for (const facingLeft of [false,true]) for (const tangent of [30,60,90,120,150]) {
    const angle = vehicleAngle(tangent-90, facingLeft), radians=angle*Math.PI/180;
    const road={x:120,y:200}, origin=vehiclePosition(road);
    assert.equal(origin.x+vehicleContact.x,road.x); assert.equal(origin.y+vehicleContact.y,road.y);
    // Rotating about the tire midpoint keeps both contacts on the tangent line.
    for(const offset of [-11.3666667,11.3666667]) {
      const dx=offset*Math.cos(radians),dy=offset*Math.sin(radians);
      assert.ok(Math.abs(dx*Math.sin(tangent*Math.PI/180)-dy*Math.cos(tangent*Math.PI/180))<.00001);
    }
  }
  assert.equal(vehicleAngle(-60,false),30);
  assert.equal(vehicleAngle(60,true),-30);
});

test('fractional vehicle pivot bypasses the installed RN string parser and stays within the SVG viewport', () => {
  const { vehicleOrigin } = require('../src/features/courses/components/vehicleGeometry.ts');
  const source = fs.readFileSync(require.resolve('react-native/Libraries/StyleSheet/processTransformOrigin.js'), 'utf8');
  const declaration = source.match(/const TRANSFORM_ORIGIN_REGEX = ([^;]+);/)[1];
  const parser = require('node:vm').runInNewContext(declaration);
  const legacy = `${vehicleContact.x}px ${vehicleContact.y}px`;
  const parsed = [...legacy.matchAll(parser)].map(match => parseFloat(match[0]));
  assert.ok(parsed.some(value => value > 1000000), 'Reproduce the V6 offscreen pivot with this RN version');
  assert.ok(Array.isArray(vehicleOrigin), 'Numeric array takes the parser bypass');
  assert.deepEqual(vehicleOrigin, [vehicleContact.x, vehicleContact.y, 0]);
  assert.ok(vehicleOrigin[0] > 0 && vehicleOrigin[0] < 44);
  assert.ok(vehicleOrigin[1] > 0 && vehicleOrigin[1] < 42);
});


test('Drawing windows and staggered reveal order remain bounded; facing changes alone request a turn', () => {
  const {completionDrawing,stage,revealStages,changesFacing}=require('../src/features/courses/components/nodeMotion.ts');
  assert.deepEqual(completionDrawing(0),{ring:0,check:0,star:0});assert.equal(completionDrawing(.4).check,0);assert.equal(completionDrawing(.7).ring,1);assert.equal(completionDrawing(.95).check,1);
  assert.ok(revealStages.lock[0]<revealStages.icon[0]);assert.ok(revealStages.icon[0]<revealStages.dot[0]);assert.ok(revealStages.dot[0]<revealStages.card[0]);
  for(const window of Object.values(revealStages)){assert.equal(stage(-1,...window),0);assert.equal(stage(2,...window),1);}
  for(const from of [true,false])for(const to of [true,false])assert.equal(changesFacing(from,to),from!==to);
});
