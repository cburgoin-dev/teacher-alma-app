const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compile = filename => ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
require.extensions['.ts'] = (module, filename) => module._compile(compile(filename), filename);
const { parseHome, homeApi } = require('../src/features/home/api.ts');
const { HomeResource, homeResource } = require('../src/features/home/resource.ts');
const { gamificationResource } = require('../src/features/gamification/resource.ts');
const { activeDestination, courseDestination } = require('../src/features/home/presentation.ts');
const course = { id: 'c', title: 'Inglés real', description: 'Bases para comunicarte en situaciones reales.', level: 'A1', coverUrl: null, status: 'PUBLISHED', progress: null, access: { hasFullAccess: false, hasFreeContent: true, source: 'NONE' } };
const progress = { status: 'IN_PROGRESS', completedRequiredNodes: 3, totalRequiredNodes: 10, percentage: 30 };
const node = { type: 'LESSON', id: 'lesson', title: 'Lección real', access: { hasAccess: true, lockReason: null } };
const active = { type: 'ACTIVE', course: { ...course, progress }, topic: { id: 't', title: 'Tema real' }, currentNode: node };
const assessed = { type: 'ASSESSED', diagnostic: { attemptId: 'd', completedAt: null, recommendedLevel: 'A2' }, recommendedCourse: course };
const completed = { type: 'COURSE_COMPLETED', completedCourse: { ...course, completedAt: null, progress: { ...progress, status: 'COMPLETED', percentage: 100 } }, recommendedCourse: course };
const fresh = { type: 'NEW', beginnerCourse: course };
const response = hero => ({ state: hero.type, hero, learner: { displayName: 'Ana' }, review: { pendingCount: 0 }, featuredCourses: [course] });
const aggregate = { coins: { balance: 37 }, streak: { currentDays: 3 }, dailyGoal: { preset: 'NORMAL', target: 2, progress: 1, completed: false } };
function component(relative, overrides = {}) {
  const filename = path.resolve(__dirname, relative), localRequire = require('node:module').createRequire(filename), output = { exports: {} };
  const load = name => {
    if (name in overrides) return overrides[name];
    if (name === 'react') return { useEffect() {}, useState: value => [value, () => {}], useCallback: fn => fn, useSyncExternalStore: (_, snapshot) => snapshot() };
    if (name === 'react-native') return { StyleSheet: { create: v => v }, useWindowDimensions: () => overrides.dimensions ?? { width: 390, fontScale: 1 }, ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'RefreshControl', 'ActivityIndicator'].map(n => [n, n])) };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name.startsWith('lucide-react-native/icons/')) return { default: name };
    if (name.endsWith('/ui')) return { Button: 'Button' };
    if (name.endsWith('/CourseCover')) return { CourseCover: 'CourseCover', courseCoverSource: () => 1 };
    if (name === 'react-native-svg') return { default: 'Svg', ...Object.fromEntries(['ClipPath', 'Defs', 'Ellipse', 'Image', 'LinearGradient', 'Path', 'Rect', 'Stop'].map(n => [n, n])) };
    if (name.endsWith('/MainAppHeader')) return { MainAppHeader: 'MainAppHeader' };
    if (name.endsWith('/theme')) return { colors: { blue: 'blue', red: 'red' }, shadows: { card: {} } };
    if (name.includes('/components/Home') || name.endsWith('/ActiveHomeHero') || name.endsWith('/HomeCourseArtwork')) return component(localRequire.resolve(name + '.tsx'), overrides);
    return localRequire(name);
  };
  new Function('require', 'module', 'exports', compile(filename))(load, output, output.exports);
  return output.exports;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (tree == null || typeof tree === 'boolean') return [];
  if (typeof tree.type === 'function') return [tree, ...nodes(tree.type(tree.props))];
  return typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [tree];
}
const text = tree => nodes(tree).filter(n => typeof n === 'string' || typeof n === 'number').join(' ').replace(/\s+/g, ' ');
const buttons = tree => nodes(tree).filter(n => n.type === 'Button' || n.type === 'Pressable');
const heroCard = (hero, onNavigate = () => {}) => component('../src/features/home/components/HomeHeroCard.tsx').HomeHeroCard({ hero, onNavigate });

test('GET Home preserves all four discriminated states and nullable projections; rejects incompatible envelope', async () => {
  const original = global.fetch, url = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'http://home.test';
  try {
    for (const hero of [fresh, assessed, active, completed, { ...active, course: null, topic: null, currentNode: null }, { ...completed, completedCourse: null, recommendedCourse: null }]) {
      const expected = response(hero);
      global.fetch = async (url, options) => { assert.equal(url, 'http://home.test/me/home'); assert.equal(options.method, undefined); return new Response(JSON.stringify(expected)); };
      assert.deepEqual(await homeApi.read(), expected);
    }
    assert.throws(() => parseHome({ ...response(active), state: 'NEW' })); assert.throws(() => parseHome(null));
  } finally { global.fetch = original; if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = url; }
});
test('Home resource coalesces requests, retains last known data and error, refreshes on next read', async () => {
  let finish, calls = 0, fail = false;
  const wait = new Promise(resolve => { finish = resolve; });
  const resource = new HomeResource({ read: async () => { calls++; await wait; if (fail) throw Error('offline'); return response(active); } });
  const first = resource.refresh(); assert.equal(resource.refresh(), first); finish(); await first; assert.equal(calls, 1);
  const previous = resource.snapshot().data; fail = true; const pending = resource.refresh();
  assert.equal(resource.snapshot().data, previous); assert.equal(resource.snapshot().loading, true);
  await pending; assert.equal(resource.snapshot().data, previous); assert.ok(resource.snapshot().error);
  fail = false; await resource.refresh(); assert.equal(resource.snapshot().error, null); assert.equal(calls, 3);
  assert.deepEqual(Object.keys(resource.snapshot()).sort(), ['data', 'error', 'loading']);
});
test('NEW has honest disabled diagnosis and real beginner navigation', () => {
  const tree = heroCard(fresh); assert.match(text(tree), /Descubre tu nivel/);
  assert.equal(buttons(tree)[0].props.disabled, true); assert.equal(buttons(tree)[0].props.onPress, undefined);
  let route; const { HomeSecondaryCards } = component('../src/features/home/components/HomeSecondaryCards.tsx');
  const secondary = HomeSecondaryCards({ data: response(fresh), gamification: aggregate, onNavigate: r => { route = r; } });
  buttons(secondary)[0].props.onPress(); assert.deepEqual(route, { screen: 'CourseDetail', params: { courseId: 'c' } });
  assert.doesNotMatch(text(HomeSecondaryCards({ data: response({ ...fresh, beginnerCourse: null }), gamification: null, onNavigate() {} })), /A1/);
});
test('ASSESSED shows real level and course; null recommendation never invents a route', () => {
  let route; const tree = heroCard(assessed, r => { route = r; }); assert.match(text(tree), /A2/); buttons(tree)[0].props.onPress(); assert.equal(route.screen, 'CourseDetail');
  assert.equal(buttons(heroCard({ ...assessed, recommendedCourse: null })).length, 0);
});
for (const type of ['LESSON', 'UNIT_CHALLENGE']) test(`ACTIVE ${type} opens Roadmap with exact backend anchor and renders exact progress`, () => {
  const hero = { ...active, currentNode: { ...node, type } }; let route;
  const tree = heroCard(hero, r => { route = r; }); buttons(tree)[0].props.onPress();
  assert.equal(buttons(tree).length, 1); // Entire card and decorative CTA share one interaction.
  assert.match(text(buttons(tree)[0]), /Continuar aprendiendo/);
  assert.equal(route.screen, 'Roadmap');
  assert.deepEqual(route.params, { courseId: 'c', focusNode: { id: 'lesson', type } });
  assert.match(text(tree), /30 %/); assert.match(text(tree), /Lección real/);
});
test('ACTIVE access lock preserves node with no dead payment CTA; null context is safe', () => {
  const locked = { ...active, currentNode: { ...node, access: { hasAccess: false, lockReason: 'ACCESS' } } };
  assert.equal(activeDestination(locked).screen, 'Roadmap'); assert.match(text(heroCard(locked)), /Lección real/); assert.match(text(heroCard(locked)), /Ver ruta/);
  for (const hero of [{ ...active, course: null, topic: null, currentNode: null }, { ...active, currentNode: null }, { ...active, topic: null }]) {
    assert.doesNotThrow(() => heroCard(hero)); if (!hero.currentNode) assert.equal(buttons(heroCard(hero)).length, 0);
  }
});
test('COMPLETED celebrates real progress, preserves COMING_SOON, and handles missing completed context', () => {
  assert.match(text(heroCard(completed)), /Curso completado/);
  const soon = { ...completed, recommendedCourse: { ...course, status: 'COMING_SOON' } }; let route;
  const tree = heroCard(soon, r => { route = r; }); assert.match(text(tree), /Próximamente/); buttons(tree)[0].props.onPress(); assert.equal(route.screen, 'CourseDetail');
  const degraded = heroCard({ ...completed, completedCourse: null, recommendedCourse: null }); assert.equal(buttons(degraded).length, 0); assert.doesNotMatch(text(degraded), /Inglés real|100/);
});
test('secondary cards have Review only for real count, otherwise non-interactive Practice; goal comes from shared aggregate', () => {
  const { HomeSecondaryCards } = component('../src/features/home/components/HomeSecondaryCards.tsx'); let route;
  const data = { ...response(active), review: { pendingCount: 6 } };
  const tree = HomeSecondaryCards({ data, gamification: aggregate, onNavigate: r => { route = r; } });
  assert.match(text(tree), /6 ejercicios pendientes/); assert.match(text(tree), /1 \/ 2/); buttons(tree)[0].props.onPress(); assert.equal(route.screen, 'Review');
  const practice = HomeSecondaryCards({ data: response(active), gamification: aggregate, onNavigate() {} });
  assert.match(text(practice), /Práctica/); assert.equal(buttons(practice).length, 0);
  assert.match(text(practice), /Muy pronto →/); assert.match(text(practice), /Ver detalles →/);
  const done = HomeSecondaryCards({ data: response(active), gamification: { ...aggregate, dailyGoal: { ...aggregate.dailyGoal, completed: true } }, onNavigate() {} });
  assert.match(text(done), /Meta completada/);
});
test('featured courses keep server order and cap two, use existing catalog destinations', () => {
  const { HomeFeaturedCourses } = component('../src/features/home/components/HomeFeaturedCourses.tsx'); const routes = [];
  const courses = [{ ...course, id: 'b', progress }, { ...course, id: 'a', status: 'COMING_SOON' }, { ...course, id: 'never' }];
  const tree = HomeFeaturedCourses({ courses, onNavigate: r => routes.push(r) });
  buttons(tree).forEach(b => b.props.onPress()); assert.deepEqual(routes.map(r => r.screen), ['Courses', 'Roadmap', 'CourseDetail']);
  assert.deepEqual(routes.slice(1).map(r => r.params.courseId), ['b', 'a']);
  assert.equal(courseDestination({ ...course, access: { ...course.access, hasFreeContent: false } }).screen, 'CourseDetail');
  assert.match(text(tree), /Bases para comunicarte/); assert.doesNotMatch(text(tree), /30|pasos completados/);
  for (const [status, progressStatus, expected] of [['PUBLISHED', 'IN_PROGRESS', 'Roadmap'], ['PUBLISHED', 'COMPLETED', 'Roadmap'], ['PUBLISHED', 'NOT_STARTED', 'CourseDetail'], ['COMING_SOON', 'IN_PROGRESS', 'CourseDetail'], ['COMING_SOON', 'COMPLETED', 'CourseDetail']]) {
    assert.equal(courseDestination({ ...course, status, progress: { ...progress, status: progressStatus } }).screen, expected);
  }
  const nullable = { ...response(fresh), featuredCourses: [{ ...course, description: null }] };
  assert.equal(parseHome(nullable).featuredCourses[0].description, null);
  assert.match(text(HomeFeaturedCourses({ courses: nullable.featuredCourses, onNavigate() {} })), /Incluye contenido gratuito/);
});

test('SVG gradient uses valid numeric offsets; degraded hero has no arrow affordance', () => {
  const stops = nodes(heroCard(active)).filter(n => n.type === 'Stop');
  assert.deepEqual(stops.map(n => n.props.offset), [0, 0.5, 1]);
  const degraded = heroCard({ ...active, currentNode: null });
  assert.equal(nodes(degraded).filter(n => n.type === 'lucide-react-native/icons/arrow-right').length, 0);
});

test('installed SVG gradient extractor reproduces old warning and accepts rendered Home stops without warnings', () => {
  const extractGradient = component('../node_modules/react-native-svg/src/lib/extract/extractGradient.ts', {
    react: require('react'), 'react-native': { processColor: () => 0xff126ae1 },
    './extractTransform': () => null, '../units': {},
  }).default;
  const warnings = [], original = console.warn;
  console.warn = message => warnings.push(message);
  try {
    const { jsx } = require('react/jsx-runtime');
    extractGradient({ id: 'old', children: [jsx('Stop', { offset: '.5', stopColor: '#126AE1' })] }, null);
    assert.match(warnings[0], /not a valid number or percentage string/);
    warnings.length = 0;
    const stops = nodes(heroCard(active)).filter(n => n.type === 'Stop');
    const result = extractGradient({ id: 'home', children: stops }, null);
    assert.deepEqual(warnings, []);
    assert.deepEqual(result.gradient.filter((_, index) => index % 2 === 0), [0, .5, 1]);
  } finally { console.warn = original; }
});

test('shared artwork frame preserves A1 landmark/bus and has deterministic safe fallbacks', () => {
  const { courseArtworkFrame } = require('../src/features/home/artwork.ts');
  const box = { x: 225, y: 24, width: 135, height: 260 };
  const frame = courseArtworkFrame(' a1 ', box);
  assert.deepEqual(frame, courseArtworkFrame('A1', box));
  // Actual landmark at x=.62 and bus at x=.64, y=.89 in the bundled landscape.
  for (const x of [0.62, 0.64]) assert.ok(frame.x + frame.width * x > 275 && frame.x + frame.width * x < 310);
  assert.ok(frame.y + frame.height * .89 < 278);
  assert.deepEqual(courseArtworkFrame(null, box), courseArtworkFrame('unknown', box));
  assert.deepEqual(courseArtworkFrame('A1', box, 2, false), courseArtworkFrame(null, box, 2, false));
  assert.deepEqual(courseArtworkFrame('A1', { x: 0, y: 0, width: 150, height: 100 }), { x: 0, y: 0, width: 150, height: 100 });
});
test('Home screen uses shared Gamification, preserves data on error, and routes existing Courses and Shop', () => {
  const routes = [], data = response(active);
  const { HomeScreen } = component('../src/features/home/screens/HomeScreen.tsx', {
    '../useHome': { useHome: () => ({ data, loading: true, error: 'offline', refresh() {} }) },
    '../../gamification/hooks/useGamification': { useGamification: () => ({ data: aggregate, loading: true, error: null, refresh() {} }) },
  });
  const tree = HomeScreen({ navigation: { navigate: (...args) => routes.push(args) } });
  const header = nodes(tree).find(n => n.type === 'MainAppHeader'); assert.equal(header.props.data, aggregate); header.props.onOpenShop();
  assert.match(text(tree), /última información/); assert.match(text(tree), /Hola , Ana/);
  buttons(tree).find(b => b.props.accessibilityLabel === 'Continuar en la ruta del curso').props.onPress();
  assert.equal(routes[0][0], 'GamificationShop'); assert.equal(routes[1][0], 'Roadmap'); assert.deepEqual(routes[1][1].focusNode, { id: 'lesson', type: 'LESSON' });
});
test('focus refreshes Home, background resume refreshes Home/shared Gamification, blur removes listener', async () => {
  const oldHome = homeResource.refresh, oldGamification = gamificationResource.refresh; let homes = 0, games = 0, callback, cleanup, removed = 0;
  homeResource.refresh = async () => { homes++; }; gamificationResource.refresh = async () => { games++; };
  try {
    const { useHome } = component('../src/features/home/useHome.ts', {
      '@react-navigation/native': { useFocusEffect: fn => { cleanup = fn(); } },
      'react-native': { AppState: { currentState: 'active', addEventListener: (_, cb) => { callback = cb; return { remove: () => removed++ }; } } },
    });
    useHome(); assert.equal(homes, 1); callback('active'); assert.equal(homes, 1);
    callback('background'); callback('active'); assert.equal(homes, 2); assert.equal(games, 1);
    cleanup(); assert.equal(removed, 1);
  } finally { homeResource.refresh = oldHome; gamificationResource.refresh = oldGamification; }
});
