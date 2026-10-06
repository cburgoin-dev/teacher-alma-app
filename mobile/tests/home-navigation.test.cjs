const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { roadmapTarget, initialRoadmapOffset } = require('../src/features/courses/roadmapPosition.ts');

test('Home anchor focuses only the canonical Roadmap node; stale id/type cannot change progression target', () => {
  const roadmap = { currentNode: { id: 'uc', type: 'UNIT_CHALLENGE' }, progress: { completedRequiredNodes: 1, totalRequiredNodes: 2 }, topics: [{ nodes: [{ id: 'uc', type: 'UNIT_CHALLENGE' }] }] };
  assert.equal(roadmapTarget(roadmap, { id: 'uc', type: 'UNIT_CHALLENGE' }), 'uc');
  assert.equal(roadmapTarget(roadmap, { id: 'old-lesson', type: 'LESSON' }), 'uc');
  assert.equal(roadmapTarget(roadmap, { id: 'uc', type: 'LESSON' }), 'uc');
  assert.equal(roadmapTarget({ ...roadmap, currentNode: null }, { id: 'uc', type: 'UNIT_CHALLENGE' }), null);
  assert.equal(initialRoadmapOffset(800, 100, 600, 2000), 684);
});

test('real stack router: Detail returns to actual Home/catalog tab and learning unwinds through Roadmap', async () => {
  const { StackRouter, CommonActions, StackActions } = await import('@react-navigation/routers');
  const config = { routeNames: ['MainTabs', 'GamificationShop', 'CourseDetail', 'Roadmap', 'Lesson', 'LessonResult', 'UnitChallenge', 'Review'], routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: 'MainTabs' });
  for (const origin of ['Home', 'CoursesTab']) {
    const base = router.getInitialState(config);
    base.routes[0].state = { index: origin === 'Home' ? 0 : 1, routes: [{ key: 'home', name: 'Home' }, { key: 'catalog', name: 'CoursesTab' }] };
    const go = (state, action) => { const next = router.getStateForAction(state, action, config); assert.ok(next); return next; };
    const detail = go(base, CommonActions.navigate('CourseDetail', { courseId: 'c' }));
    assert.deepEqual(go(detail, CommonActions.goBack()).routes[0], base.routes[0]);
    const directRoadmap = go(base, CommonActions.navigate('Roadmap', { courseId: 'c' }));
    assert.deepEqual(go(directRoadmap, CommonActions.goBack()).routes[0], base.routes[0]);
    for (const kind of ['Lesson', 'UnitChallenge']) {
      const route = go(origin === 'Home' ? base : detail, CommonActions.navigate('Roadmap', { courseId: 'c', focusNode: { id: 'n', type: kind === 'Lesson' ? 'LESSON' : 'UNIT_CHALLENGE' } }));
      const lesson = go(route, CommonActions.navigate(kind, { courseId: 'c', completionTicket: 9 }));
      const backToMap = go(lesson, StackActions.popTo('Roadmap', { courseId: 'c', completionTicket: 10 }));
      assert.equal(backToMap.routes.at(-1).name, 'Roadmap'); assert.equal(backToMap.routes.at(-1).params.completionTicket, 10);
      const back = go(backToMap, CommonActions.goBack());
      assert.equal(back.routes.at(-1).name, origin === 'Home' ? 'MainTabs' : 'CourseDetail');
      assert.deepEqual(back.routes[0], base.routes[0]);
    }
    const review = go(base, CommonActions.navigate('Review', {}));
    assert.deepEqual(go(review, CommonActions.goBack()).routes[0], base.routes[0]);
  }
});
