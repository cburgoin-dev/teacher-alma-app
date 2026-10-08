const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
require.extensions['.ts'] = (module, file) => module._compile(compile(file), file);
const { progressApi, parseProgress, parseCalendar } = require('../src/features/progress/api.ts');
const { ProgressResource, CalendarResources } = require('../src/features/progress/resource.ts');
const { calendarGrid, shiftMonth } = require('../src/features/progress/presentation.ts');
const course = { id: 'course', title: 'Inglés real', level: 'A2', coverUrl: null, status: 'PUBLISHED', completedAt: null,
  progress: { status: 'IN_PROGRESS', percentage: 38, completedRequiredNodes: 3, totalRequiredNodes: 8 } };
const week = { timezone: 'America/Mazatlan', today: '2026-10-10', weekStart: '2026-10-05', weekEnd: '2026-10-11', learningDaysThisWeek: 1,
  days: ['LEARNED', 'PROTECTED', 'REPAIRED', 'BROKEN', 'NONE', 'NONE', 'NONE'].map((state, i) => ({ date: `2026-10-${String(i + 5).padStart(2, '0')}`, state })) };
const review = { pendingCount: 5, groups: [{ topic: { id: 'a', title: 'Familia' }, pendingCount: 3 }, { topic: { id: 'b', title: 'Rutinas' }, pendingCount: 2 }] };
const dashboard = { course, review, consistency: week };
const calendar = { month: '2026-10', timezone: week.timezone, today: week.today, learningDaysCount: 1, days: week.days.filter(d => d.state !== 'NONE') };
function component(relative, overrides = {}) {
  const file = path.resolve(__dirname, relative), local = require('node:module').createRequire(file), output = { exports: {} };
  const load = name => {
    if (name in overrides) return overrides[name];
    if (name === 'react') return { useState: x => [x, () => {}], useMemo: f => f(), useCallback: f => f, useEffect() {}, useSyncExternalStore: (_, snapshot) => snapshot() };
    if (name === '@react-navigation/native') return { useFocusEffect() {} };
    if (name === 'react-native') return { Alert: { alert: (...args) => overrides.alerts?.push(args) }, StyleSheet: { create: x => x }, useWindowDimensions: () => overrides.dimensions ?? { width: 390, fontScale: 1 }, ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'RefreshControl', 'ActivityIndicator'].map(x => [x, x])) };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', ClipPath: 'ClipPath', Defs: 'Defs', Path: 'Path' };
    if (name.startsWith('lucide-react-native/icons/')) return { __esModule: true, default: name };
    for (const stub of ['Button', 'CourseCover', 'HomeCourseArtwork', 'GamificationIcon', 'MainAppHeader', 'ContextualHeader']) {
      if (name.endsWith('/' + (stub === 'Button' ? 'ui' : stub))) return { [stub]: stub };
    }
    if (name.endsWith('/theme')) return { colors: { blue: 'blue', red: 'red', ink: 'navy' } };
    if (name.endsWith('/styles')) return { s: {} };
    if (name.startsWith('.') && fs.existsSync(local.resolve(name + '.tsx'))) return component(local.resolve(name + '.tsx'), overrides);
    return local(name);
  };
  // Avoid resolve throwing for .ts imports.
  const safeLoad = name => {
    if (name.startsWith('.') && !name.endsWith('/styles') && !name.endsWith('/theme') && !Object.hasOwn(overrides, name)) {
      const stem = path.resolve(path.dirname(file), name);
      if (!fs.existsSync(stem + '.tsx') && fs.existsSync(stem + '.ts')) return local(name);
    }
    return load(name);
  };
  new Function('require', 'module', 'exports', compile(file))(safeLoad, output, output.exports);
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
const cards = () => component('../src/features/progress/components/ProgressCards.tsx');

test('Progress API reads exact endpoints, preserves payload and rejects incompatible weeks/groups/months', async () => {
  const original = global.fetch, url = process.env.EXPO_PUBLIC_API_URL; process.env.EXPO_PUBLIC_API_URL = 'http://progress.test';
  try {
    global.fetch = async (url, options) => { assert.equal(options.method, undefined); assert.equal(url, 'http://progress.test/me/progress'); return new Response(JSON.stringify(dashboard)); };
    assert.deepEqual(await progressApi.read(), dashboard);
    global.fetch = async url => { assert.equal(url, 'http://progress.test/me/progress/calendar?month=2026-10'); return new Response(JSON.stringify(calendar)); };
    assert.deepEqual(await progressApi.calendar('2026-10'), calendar);
    assert.throws(() => parseProgress({ ...dashboard, consistency: { ...week, days: [] } }));
    assert.throws(() => parseProgress({ ...dashboard, review: { ...review, groups: [...review.groups, review.groups[0]] } }));
    assert.throws(() => parseCalendar(calendar, '2026-09'));
    assert.throws(() => parseCalendar({ ...calendar, days: [{ date: '2026-10-01', state: 'NONE' }] }, '2026-10'));
  } finally { global.fetch = original; if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = url; }
});
test('Resources coalesce reads, preserve snapshots on errors and isolate out-of-order month responses', async () => {
  let finish, calls = 0, fail = false;
  const wait = new Promise(r => { finish = r; });
  const resource = new ProgressResource(async () => { calls++; await wait; if (fail) throw Error('offline'); return dashboard; });
  const pending = resource.refresh(); assert.equal(resource.refresh(), pending); finish(); await pending;
  assert.equal(calls, 1); fail = true; await resource.refresh(); assert.equal(resource.snapshot().data, dashboard); assert.ok(resource.snapshot().error);
  const resolves = {};
  const cache = new CalendarResources({ calendar: month => new Promise(resolve => { resolves[month] = resolve; }) });
  const oct = cache.month('2026-10'), sep = cache.month('2026-09');
  const first = oct.refresh(), second = sep.refresh(); await Promise.resolve();
  resolves['2026-09']({ ...calendar, month: '2026-09' }); await second;
  resolves['2026-10'](calendar); await first;
  assert.equal(sep.snapshot().data.month, '2026-09'); assert.equal(oct.snapshot().data.month, '2026-10'); assert.equal(cache.month('2026-09'), sep);
});
test('Course active/completed/null render real counts and wire Roadmap/catalog CTAs', () => {
  const { ProgressCourseCard } = cards(); let route;
  const props = { course, onRoadmap: id => { route = id; }, onCatalog: () => { route = 'catalog'; } };
  const tree = ProgressCourseCard(props); assert.match(text(tree), /38 %/); assert.match(text(tree), /3 de 8 pasos completados/);
  buttons(tree)[0].props.onPress(); assert.equal(route, 'course'); assert.equal(buttons(tree)[0].props.accessibilityLabel, 'Ver ruta');
  const completed = ProgressCourseCard({ ...props, course: { ...course, progress: { ...course.progress, status: 'COMPLETED', percentage: 100 } } });
  assert.match(text(completed), /100 %/); assert.match(text(completed), /Curso completado/);
  const empty = ProgressCourseCard({ ...props, course: null }); assert.doesNotMatch(text(empty), /A1|38/); buttons(empty)[0].props.onPress(); assert.equal(route, 'catalog');
});
test('Review pending groups/counts and empty state have only meaningful actions', () => {
  const { ProgressReviewCard } = cards(); let opened = false;
  const tree = ProgressReviewCard({ review, onReview: () => { opened = true; } });
  assert.match(text(tree), /Familia/); assert.match(text(tree), /Rutinas/); assert.match(text(tree), /5 ejercicios pendientes/);
  buttons(tree)[0].props.onPress(); assert.equal(opened, true); assert.equal(buttons(tree)[0].props.title, 'Ver repaso');
  const empty = ProgressReviewCard({ review: { pendingCount: 0, groups: [] }, onReview() {} });
  assert.match(text(empty), /Todo al día/); assert.equal(buttons(empty).length, 0);
});
test('Week has seven accessible days, all states, today/future and Calendar CTA', () => {
  const { ProgressWeekCard } = cards(); let opened = false;
  const tree = ProgressWeekCard({ week, onCalendar: () => { opened = true; } });
  const days = nodes(tree).filter(n => n.props?.accessibilityLabel?.startsWith('2026-10'));
  assert.equal(days.length, 7);
  const labels = days.map(d => d.props.accessibilityLabel).join(' ');
  for (const label of ['Aprendiste', 'Protegido', 'Reparado', 'Racha rota', 'Sin actividad', 'Hoy', 'Día futuro']) assert.ok(labels.includes(label));
  assert.match(text(tree), /1 día de aprendizaje esta semana/); buttons(tree)[0].props.onPress(); assert.ok(opened);
});
test('Calendar Monday grid, sparse facts, learning-only connections, today and subdued future/out-of-month', () => {
  const data = { ...calendar, days: [{ date: '2026-10-04', state: 'LEARNED' }, ...calendar.days] };
  const grid = calendarGrid(data); assert.equal(grid.length, 35); assert.equal(grid[0].date, '2026-09-28');
  assert.equal(grid.find(d => d.date === '2026-10-10').today, true);
  assert.equal(grid.find(d => d.date === '2026-10-11').future, true);
  for (const event of data.days) assert.equal(grid.find(d => d.date === event.date).state, event.state);
  assert.equal(grid.find(d => d.date === '2026-10-05').joinRight, false); // Protected is not learned.
  assert.equal(grid.find(d => d.date === '2026-10-04').joinRight, false); // No connection across week rows.
  assert.equal(calendarGrid({ ...calendar, days: [{ date: '2026-10-01', state: 'LEARNED' }, { date: '2026-10-02', state: 'LEARNED' }] }).find(d => d.date === '2026-10-01').joinRight, true);
  assert.equal(shiftMonth('2026-01', -1), '2025-12'); assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(calendarGrid({ ...calendar, month: '2024-02', days: [] }).filter(d => d.inMonth).length, 29);
});
test('Calendar renders authoritative count and disables future navigation', () => {
  const { CalendarCard } = component('../src/features/progress/components/CalendarCard.tsx'); let moved = '';
  const tree = CalendarCard({ month: calendar.month, today: calendar.today, data: calendar, onPrevious: () => { moved = 'previous'; }, onNext() {} });
  assert.match(text(tree), /Octubre 2026/);
  const actions = buttons(tree); assert.equal(actions[1].props.disabled, true); actions[0].props.onPress(); assert.equal(moved, 'previous');
  assert.equal(buttons(CalendarCard({ month: '2026-09', today: calendar.today, data: null, onPrevious() {}, onNext() {} }))[1].props.disabled, false);
});
test('Dashboard real CTAs navigate from Progress; shared Gamification passed to header without local streak calculation', () => {
  const routes = [], aggregate = { coins: { balance: 37 }, streak: { currentDays: 12 } };
  const { ProgressScreen } = component('../src/features/progress/screens/ProgressScreen.tsx', {
    '../useProgress': { useProgress: () => ({ data: dashboard, loading: false, error: null, refresh: async () => {} }) },
    '../../gamification/hooks/useGamification': { useGamification: () => ({ data: aggregate, loading: false, error: null, refresh: async () => {} }) },
  });
  const tree = ProgressScreen({ navigation: { navigate: (...args) => routes.push(args) } });
  for (const title of ['Ver ruta', 'Ver repaso', 'Ver calendario']) buttons(tree).find(b => (b.props.title ?? b.props.accessibilityLabel) === title).props.onPress();
  assert.deepEqual(routes, [['Roadmap', { courseId: 'course' }], ['Review', {}], ['ProgressCalendar']]);
  assert.equal(nodes(tree).find(n => n.type === 'MainAppHeader').props.data, aggregate);
  assert.doesNotMatch(text(tree), /fortalezas|logros|Ver práctica|XP/i);
});
test('Calendar current streak comes from shared resource and Back calls goBack', () => {
  let back = false;
  const { ProgressCalendarScreen } = component('../src/features/progress/screens/ProgressCalendarScreen.tsx', {
    '../../gamification/hooks/useGamification': { useGamification: () => ({ data: { coins: { balance: 1 }, streak: { currentDays: 19 } }, loading: false, error: null }) },
  });
  const tree = ProgressCalendarScreen({ navigation: { goBack: () => { back = true; } } });
  assert.match(text(tree), /19 días/); nodes(tree).find(n => n.type === 'ContextualHeader').props.onBack(); assert.ok(back);
});
test('Real stack router returns Calendar, Roadmap and Review to the same Progress tab instance', async () => {
  const { StackRouter, CommonActions } = await import('@react-navigation/routers');
  const config = { routeNames: ['MainTabs', 'ProgressCalendar', 'Roadmap', 'Review'], routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: 'MainTabs' }), base = router.getInitialState(config);
  base.routes[0].state = { index: 2, routes: [{ key: 'h', name: 'Home' }, { key: 'c', name: 'CoursesTab' }, { key: 'p', name: 'Progress' }] };
  for (const screen of ['ProgressCalendar', 'Roadmap', 'Review']) {
    const next = router.getStateForAction(base, CommonActions.navigate(screen, screen === 'Roadmap' ? { courseId: 'course' } : {}), config);
    const back = router.getStateForAction(next, CommonActions.goBack(), config);
    assert.deepEqual(back.routes[0], base.routes[0]);
  }
});

test('v2 course uses a left progress block, discreet level, meaningful artwork and accessible compact actions', () => {
  const { ProgressCourseCard, ProgressWeekCard, ProgressReviewCard } = cards();
  const props = { course: { ...course, title: 'Inglés A2' }, onRoadmap() {}, onCatalog() {} };
  const tree = ProgressCourseCard(props);
  assert.doesNotMatch(text(tree), /Nivel A2/);
  assert.match(text(ProgressCourseCard({ ...props, course: { ...course, title: 'Conversaciones' } })), /Nivel A2/);
  const artwork = nodes(tree).find(n => n.type === 'HomeCourseArtwork');
  assert.equal(artwork.props.level, 'A2'); assert.deepEqual(artwork.props.box, { x: 0, y: 0, width: 156, height: 146 });
  const action = buttons(tree)[0]; assert.equal(action.props.style({ pressed: false })[0].minHeight, 48);
  const clear = ProgressReviewCard({ review: { pendingCount: 0, groups: [] }, onReview() {} });
  const pending = ProgressReviewCard({ review, onReview() {} });
  assert.equal(clear.props.style[1].backgroundColor, '#F0FAF6');
  assert.notEqual(clear.props.style[1], pending.props.style[1]);
  assert.ok(nodes(clear).find(n => n.type === 'lucide-react-native/icons/circle-check'));
  const weekly = ProgressWeekCard({ week, onCalendar() {} });
  assert.ok(nodes(weekly).find(n => n.type === 'lucide-react-native/icons/calendar-days'));
  assert.equal(buttons(weekly)[0].props.style({ pressed: false })[0].minHeight, 48);
});

test('v2 calendar renders exact seven-column rows at narrow/large-font layouts and integrated day states', () => {
  for (const dimensions of [{ width: 320, fontScale: 1 }, { width: 360, fontScale: 1.5 }]) {
    const { CalendarCard, CalendarLegend } = component('../src/features/progress/components/CalendarCard.tsx', { dimensions });
    const tree = CalendarCard({ month: calendar.month, today: calendar.today, data: calendar, onPrevious() {}, onNext() {} });
    const rows = nodes(tree).filter(n => n.props?.testID === 'calendar-week');
    assert.equal(rows.length, 5);
    for (const row of rows) {
      assert.equal(row.props.children.length, 7);
      assert.equal(row.props.style.flexDirection, 'row');
      const cell = nodes(row).find(n => n.type === 'View' && n.props.accessible);
      assert.equal(cell.props.style[0].flex, 1); assert.equal(cell.props.style[0].minHeight, 50);
    }
    const labels = nodes(tree).filter(n => n.props?.accessibilityLabel).map(n => n.props.accessibilityLabel).join(' ');
    for (const label of ['Aprendiste', 'Protegido', 'Reparado', 'Racha rota', 'Sin actividad', 'Hoy', 'Día futuro']) assert.ok(labels.includes(label));
    const icons = nodes(tree).filter(n => n.type === 'GamificationIcon').map(n => n.props.kind);
    assert.deepEqual(icons, ['flame', 'protector', 'repair']);
    const legend = CalendarLegend(); assert.doesNotMatch(text(legend), /Los días protegidos/);
    assert.equal(nodes(legend).filter(n => n.props?.children === 'Aprendiste').length, 1);
    assert.ok(legend.props.style.rowGap <= 2);
  }
});

test('v2 summary sits before grid, uses API month count/shared streak, without duplicated bottom card', async () => {
  const cache = new CalendarResources({ calendar: async () => calendar }); await cache.month('2026-10').refresh();
  const { CalendarMonth } = component('../src/features/progress/screens/ProgressCalendarScreen.tsx', {
    '../../gamification/hooks/useGamification': { useGamification() {} },
  });
  let selected;
  const tree = CalendarMonth({ month: '2026-10', today: calendar.today, cache, onChange: month => { selected = month; }, gamification: { streak: { currentDays: 19 } } });
  const copy = text(tree); assert.ok(copy.indexOf('Racha actual') < copy.indexOf('Octubre 2026'));
  assert.equal((copy.match(/Racha actual/g) ?? []).length, 1);
  assert.match(copy, /19 días/); assert.match(copy, /1 día de aprendizaje en octubre 2026/);
  assert.doesNotMatch(copy, /Los días protegidos/);
  const actions = buttons(tree); actions.find(b => b.props.accessibilityLabel === 'Mes anterior').props.onPress(); assert.equal(selected, '2026-09');
  actions.find(b => b.props.accessibilityLabel === 'Mes siguiente').props.onPress(); assert.equal(selected, '2026-09'); // handler also guards future
});

test('DEV presets are typed contract-compatible copies, mixed history has all states and learned-only bands', () => {
  const preview = component('../src/features/progress/devPreview.ts');
  const original = structuredClone(dashboard);
  for (const mode of preview.dashboardModes) {
    assert.equal(preview.dashboardPreview(dashboard, mode, false), dashboard);
    assert.doesNotThrow(() => parseProgress(preview.dashboardPreview(dashboard, mode, true)));
  }
  const altered = preview.dashboardPreview(dashboard, 'ACTIVE_COURSE', true); altered.course.title = 'Changed locally';
  assert.equal(preview.dashboardPreview(null, 'ACTIVE_COURSE', true).course.title, 'Inglés A1');
  assert.deepEqual(dashboard, original);
  for (const mode of preview.calendarModes.filter(m => m !== 'REAL')) {
    const fixture = preview.calendarPreview(mode); assert.doesNotThrow(() => parseCalendar(fixture, '2026-10'));
    assert.equal(fixture.learningDaysCount, fixture.days.filter(d => d.state === 'LEARNED').length);
  }
  const fixture = preview.calendarPreview('MIXED_MONTH'), grid = calendarGrid(fixture);
  assert.ok(grid.some(d => d.today)); assert.ok(grid.some(d => d.future));
  for (const state of ['LEARNED', 'PROTECTED', 'REPAIRED', 'BROKEN']) assert.ok(grid.some(d => d.state === state));
  assert.ok(grid.filter(d => d.joinLeft && d.joinRight).length >= 6);
  assert.ok(grid.filter(d => d.state !== 'LEARNED').every(d => !d.joinLeft && !d.joinRight));
  const { CalendarCard } = component('../src/features/progress/components/CalendarCard.tsx');
  const tree = CalendarCard({ month: fixture.month, today: fixture.today, data: fixture, onPrevious() {}, onNext() {} });
  const bands = nodes(tree).filter(n => n.props?.testID === 'learned-band');
  assert.equal(bands.length, fixture.learningDaysCount);
  assert.ok(bands.some(band => band.props.style[1] === false && band.props.style[2] === false));
});

test('DEV is gated off in production; fixture navigation cannot enter learning or Shop', () => {
  const previous = global.__DEV__, alerts = [], routes = [];
  try {
    global.__DEV__ = false;
    const prod = component('../src/features/progress/screens/ProgressScreen.tsx', {
      '../useProgress': { useProgress: () => ({ data: dashboard }) },
      '../../gamification/hooks/useGamification': { useGamification: () => ({ data: null }) },
      '../devPreview': new Proxy({}, { get() { throw Error('Production loaded preview'); } }),
    }).ProgressScreen({ navigation: { navigate() {} } });
    assert.doesNotMatch(text(prod), /DEV|MIXED_MONTH/);
    global.__DEV__ = true;
    const preview = component('../src/features/progress/devPreview.ts', { alerts });
    const Screen = component('../src/features/progress/screens/ProgressScreen.tsx', {
      react: { useState: value => [value === 'REAL' ? 'ACTIVE_COURSE' : value, () => {}] },
      '../useProgress': { useProgress: () => ({ data: dashboard }) },
      '../../gamification/hooks/useGamification': { useGamification: () => ({ data: null }) },
      '../devPreview': preview,
      '../components/ProgressPreviewControl': { ProgressPreviewControl: 'PreviewControl' },
    }).ProgressScreen;
    const tree = Screen({ navigation: { navigate: (...args) => routes.push(args) } });
    for (const label of ['Ver ruta', 'Ver repaso']) buttons(tree).find(b => (b.props.title ?? b.props.accessibilityLabel) === label).props.onPress();
    nodes(tree).find(n => n.type === 'MainAppHeader').props.onOpenShop();
    assert.equal(alerts.length, 3); assert.deepEqual(routes, []);
    buttons(tree).find(b => b.props.accessibilityLabel === 'Ver calendario').props.onPress();
    assert.deepEqual(routes, [['ProgressCalendar']]); // Safe secondary screen only; no synthetic IDs.
  } finally { if (previous === undefined) delete global.__DEV__; else global.__DEV__ = previous; }
});
