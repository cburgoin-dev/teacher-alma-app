const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compile = filename => ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
require.extensions['.ts'] = (module, filename) => module._compile(compile(filename), filename);
const { GamificationResource, deviceTimezone, gamificationResource, withLearningTimezone } = require('../src/features/gamification/resource.ts');
const { gamificationApi } = require('../src/features/gamification/api/gamification.ts');
const { ApiError } = require('../src/services/api/client.ts');
const { gamificationError, repairDeadline } = require('../src/features/gamification/presentation.ts');
const candidate = { id: 'repair-1', eligible: true, previousDays: 12, costCoins: 120, expiresAt: '2026-10-01T18:00:00.000Z' };
const aggregate = (stock = 0, repair = null) => ({
  coins: { balance: 250 }, streak: { currentDays: 4, longestDays: 12, activeToday: true, protectorCount: stock, protectorMax: 2, nextMilestone: null, repair },
  dailyGoal: { preset: 'NORMAL', target: 2, progress: 1, rewardCoins: 10, completed: false, pendingPreset: null },
});
const delta = (rewards = [], advancedToday = true) => ({
  coinsEarned: rewards.reduce((sum, r) => sum + r.amount, 0), coinRewards: rewards, balance: 999,
  streak: { currentDays: 4, advancedToday, protectedDate: null },
  dailyGoal: { preset: 'NORMAL', progress: 2, target: 2, completed: true, rewardEarnedNow: rewards.find(r => r.reason === 'DAILY_GOAL')?.amount ?? 0 },
});
const reward = (reason, amount) => ({ reason, amount });
const api = overrides => ({ read: async () => aggregate(), timezone: async timezone => ({ timezone }), purchase: async () => ({}), repair: async () => ({}), ...overrides });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

// Like existing Mobile tests: real TSX output and handlers, stubbed native primitives.
// Does not claim native layout, gestures or TalkBack acceptance.
function component(relative, overrides = {}) {
  const filename = path.resolve(__dirname, relative), localRequire = require('node:module').createRequire(filename);
  const output = { exports: {} };
  const load = name => {
    if (name in overrides) return overrides[name];
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useEffect() {}, useRef: value => ({ current: value }), useCallback: fn => fn, useMemo: fn => fn(), useSyncExternalStore: (_, snapshot) => snapshot() };
    if (name === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', SafeAreaView: 'SafeAreaView', RefreshControl: 'RefreshControl', ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView', FlatList: 'FlatList', Platform: { OS: 'android' }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 320, fontScale: 1.5 }) };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) };
    if (name === 'react-native-svg') return { default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' };
    if (name === '@react-navigation/native') return { useFocusEffect() {}, usePreventRemove() {}, NavigationContainer: 'NavigationContainer', getFocusedRouteNameFromRoute: route => route.state?.routes[route.state.index ?? 0]?.name };
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'StackScreen' }) };
    if (name === '@react-navigation/bottom-tabs') return { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'TabScreen' }) };
    if (name.startsWith('lucide-react-native/icons/')) return { default: name };
    if (name.endsWith('/theme') || name === './styles') return component(localRequire.resolve(name), overrides);
    if (name.endsWith('/ui')) return { Button: 'Button', ProgressBar: 'ProgressBar', ResourceState: 'ResourceState', colors: {}, styles: {} };
    if (name.endsWith('/lessonStyles')) return { lessonStyles: {} };
    if (name.endsWith('/AudioButton')) return { lessonAudio: { stop() {} } };
    const leaves = ['AlmaLogo', 'ContextualHeader', 'LearningIcon', 'ActivityStep', 'NavigationIcon', 'HomeScreen', 'CoursesNavigator', 'ProgressScreen', 'ProfileScreen', 'GamificationShopScreen'];
    const leaf = leaves.find(leaf => name.endsWith('/' + leaf));
    if (leaf) return { [leaf]: leaf };
    if (name.endsWith('/LessonResultScreen')) return { CompletionHero: 'CompletionHero' };
    if (name.endsWith('/GamificationDeltaCard')) return { GamificationDeltaCard: 'GamificationDeltaCard' };
    return localRequire(name);
  };
  new Function('require', 'module', 'exports', compile(filename))(load, output, output.exports);
  return output.exports;
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (node == null || typeof node === 'boolean') return [];
  return typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [node];
}
const text = tree => nodes(tree).filter(n => typeof n === 'string' || typeof n === 'number').join('');
const button = (tree, title) => nodes(tree).find(n => n.type === 'Button' && n.props.title === title);
const deltaNodes = tree => nodes(tree).filter(n => n.type === 'GamificationDeltaCard' && n.props.delta);

test('API sends exact aggregate, IANA, purchase and candidate-bound repair contracts', async () => {
  const saved = global.fetch, url = process.env.EXPO_PUBLIC_API_URL, calls = [];
  process.env.EXPO_PUBLIC_API_URL = 'http://local.test';
  const responses = [aggregate(), { timezone: 'America/Chihuahua' }, { coins: { balance: 200 }, protector: { count: 1, max: 2 } }, { coins: { balance: 80 }, streak: { currentDays: 12, longestDays: 12, repaired: true } }];
  global.fetch = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify(responses[calls.length - 1])); };
  try {
    assert.deepEqual(await gamificationApi.read(), responses[0]);
    assert.deepEqual(await gamificationApi.timezone('America/Chihuahua'), responses[1]);
    assert.deepEqual(await gamificationApi.purchase('purchase_stable_key'), responses[2]);
    assert.deepEqual(await gamificationApi.repair('repair_stable_key', candidate.id), responses[3]);
    assert.deepEqual(calls.map(c => c.url.replace('http://local.test', '')), ['/me/gamification', '/me/gamification/timezone', '/me/gamification/protectors/purchase', '/me/gamification/streak/repair']);
    assert.deepEqual(calls.slice(1).map(c => c.init.method), ['PATCH', 'POST', 'POST']);
    assert.deepEqual(calls.slice(1).map(c => JSON.parse(c.init.body)), [{ timezone: 'America/Chihuahua' }, { requestKey: 'purchase_stable_key' }, { requestKey: 'repair_stable_key', repairId: candidate.id }]);
  } finally { global.fetch = saved; if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = url; }
});

test('bootstrap sync precedes aggregate, coalesces reads and never PATCHes on every focus', async () => {
  const wait = deferred(), order = [];
  const resource = new GamificationResource(api({ timezone: async timezone => { order.push(timezone); await wait.promise; }, read: async () => { order.push('read'); return aggregate(); } }), () => 'Asia/Tokyo');
  const boot = resource.ensureTimezone(), read1 = resource.refresh(), read2 = resource.refresh();
  await Promise.resolve(); assert.deepEqual(order, ['Asia/Tokyo']); assert.equal(read1, read2);
  wait.resolve(); await Promise.all([boot, read1, read2]);
  await resource.refresh(); await resource.refresh(true); await resource.ensureTimezone();
  assert.deepEqual(order, ['Asia/Tokyo', 'read', 'read', 'read']);
  assert.deepEqual(resource.snapshot().data, aggregate());
});

test('unavailable timezone never invents fallback; transient sync failure has explicit retry', async () => {
  let calls = 0, reads = 0;
  const unavailable = new GamificationResource(api({ timezone: async () => { calls++; }, read: async () => { reads++; } }), () => null);
  await unavailable.refresh(); assert.equal(calls, 0); assert.equal(reads, 0); assert.match(unavailable.snapshot().error, /zona horaria/);
  const resource = new GamificationResource(api({ timezone: async () => { if (++calls === 1) throw Error('offline'); } }), () => 'Europe/Madrid');
  await resource.refresh(); await resource.refresh(); assert.equal(calls, 1); assert.equal(resource.snapshot().data, null);
  await resource.refresh(true); assert.equal(calls, 2); assert.equal(resource.snapshot().error, null);
});

test('runtime timezone accepts named IANA/UTC; rejects unavailable, invalid and offset values', () => {
  const original = Intl.DateTimeFormat;
  try {
    for (const value of ['America/Chihuahua', 'UTC', '', undefined, '+07:00', '-0700', 'UTC-7', 'Mars/Olympus']) {
      Intl.DateTimeFormat = function(locale, options) { return options ? new original(locale, options) : { resolvedOptions: () => ({ timeZone: value }) }; };
      assert.equal(deviceTimezone(), ['America/Chihuahua', 'UTC'].includes(value) ? value : null);
    }
    Intl.DateTimeFormat = () => { throw Error('unsupported'); }; assert.equal(deviceTimezone(), null);
  } finally { Intl.DateTimeFormat = original; }
});

test('completion waits for bootstrap timezone; failure prevents wrong-date write and can retry', async () => {
  const saved = gamificationResource.ensureTimezone, wait = deferred(); let writes = 0;
  try {
    gamificationResource.ensureTimezone = () => wait.promise;
    const result = withLearningTimezone(async () => ++writes);
    await Promise.resolve(); assert.equal(writes, 0); wait.resolve(); assert.equal(await result, 1);
    gamificationResource.ensureTimezone = async () => { throw new ApiError(400, 'INVALID_USER_TIMEZONE', 'invalid'); };
    await assert.rejects(withLearningTimezone(async () => ++writes), /zona horaria/); assert.equal(writes, 1);
  } finally { gamificationResource.ensureTimezone = saved; }
});

test('stock 0/1 permits purchase; stock 2 blocks; success uses fresh aggregate without optimistic balance', async () => {
  for (const stock of [0, 1, 2]) {
    let current = aggregate(stock), calls = 0; const wait = deferred();
    const resource = new GamificationResource(api({ read: async () => current, purchase: async () => { calls++; await wait.promise; current = { ...aggregate(stock + 1), coins: { balance: 200 } }; } }), () => 'UTC');
    await resource.refresh(); const purchasing = resource.purchase(); await resource.purchase();
    assert.equal(calls, stock === 2 ? 0 : 1); assert.equal(resource.snapshot().data.coins.balance, 250);
    wait.resolve(); await purchasing;
    assert.equal(resource.snapshot().data.streak.protectorCount, stock === 2 ? 2 : stock + 1);
    assert.equal(resource.snapshot().data.coins.balance, stock === 2 ? 250 : 200);
  }
});

test('ambiguous purchase keeps key across retry/focus and freezes other spending', async () => {
  const keys = [], resource = new GamificationResource(api({ read: async () => aggregate(0, candidate), purchase: async key => { keys.push(key); if (keys.length === 1) throw Error('lost response'); } }), () => 'UTC');
  await resource.refresh(); await resource.purchase(); await resource.purchase(); await resource.repair(); await resource.refresh();
  assert.equal(keys.length, 1); assert.equal(resource.snapshot().pending.kind, 'purchase');
  await resource.retryOperation(); assert.equal(keys[0], keys[1]); assert.match(keys[0], /^[a-zA-Z0-9_-]{16,100}$/);
  assert.equal(resource.snapshot().pending, null); assert.match(resource.snapshot().notice, /comprado/);
});

test('acknowledged purchase with failed refresh retries GET only and disables stale spending', async () => {
  let reads = 0, purchases = 0;
  const resource = new GamificationResource(api({ read: async () => { if (++reads === 2) throw Error('offline'); return aggregate(reads > 1 ? 1 : 0); }, purchase: async () => { purchases++; } }), () => 'UTC');
  await resource.refresh(); await resource.purchase(); assert.equal(resource.snapshot().pending, null); assert.ok(resource.snapshot().error);
  await resource.retryOperation(); await resource.purchase(); assert.equal(purchases, 1);
  await resource.refresh(); assert.equal(resource.snapshot().data.streak.protectorCount, 1); assert.equal(purchases, 1);
});

test('repair is candidate-bound through lost-response retry and disappears after confirmed refresh', async () => {
  let current = aggregate(0, candidate); const calls = [];
  const resource = new GamificationResource(api({ read: async () => current, repair: async (...args) => { calls.push(args); if (calls.length === 1) throw Error('lost'); current = { ...aggregate(), coins: { balance: 130 }, streak: { ...aggregate().streak, currentDays: 12 } }; } }), () => 'UTC');
  await resource.refresh(); await resource.repair();
  current = aggregate(0, { ...candidate, id: 'new-candidate' }); await resource.refresh(); await resource.retryOperation();
  assert.deepEqual(calls[0], calls[1]); assert.equal(calls[1][1], 'repair-1');
  assert.equal(resource.snapshot().data.streak.repair, null); assert.equal(resource.snapshot().data.streak.currentDays, 12); assert.equal(resource.snapshot().data.coins.balance, 130);
  await resource.repair(); assert.equal(calls.length, 2);
});

test('domain errors are human, refresh authoritative state and release definite rejected requests', async () => {
  for (const code of ['INSUFFICIENT_COINS', 'PROTECTOR_STOCK_FULL', 'ITEM_UNAVAILABLE', 'STREAK_REPAIR_EXPIRED', 'STREAK_REPAIR_NOT_ELIGIBLE', 'STREAK_REPAIR_COOLDOWN', 'ALREADY_REPAIRED', 'IDEMPOTENCY_CONFLICT']) {
    const rejection = new ApiError(409, code, 'private server copy'); let reads = 0;
    const resource = new GamificationResource(api({ read: async () => { reads++; return aggregate(0, candidate); }, purchase: async () => { throw rejection; }, repair: async () => { throw rejection; } }), () => 'UTC');
    await resource.refresh();
    if (code.startsWith('STREAK_REPAIR') || code === 'ALREADY_REPAIRED') await resource.repair(); else await resource.purchase();
    assert.equal(resource.snapshot().pending, null); assert.equal(reads, 2);
    assert.equal(resource.snapshot().operationError, gamificationError(rejection)); assert.doesNotMatch(resource.snapshot().operationError, /private|_/);
  }
});

test('MainAppHeader has real balance/streak, coin action, and safe loading/error placeholders', () => {
  const { MainAppHeader } = component('../src/components/MainAppHeader.tsx'); let opens = 0;
  const props = { data: aggregate(), loading: false, error: null, onOpenShop: () => opens++ };
  const tree = MainAppHeader(props), pressable = nodes(tree).find(n => n.type === 'Pressable');
  assert.match(pressable.props.accessibilityLabel, /250 monedas/); pressable.props.onPress(); assert.equal(opens, 1);
  assert.ok(nodes(tree).some(n => n.props?.accessibilityLabel === 'Racha de 4 días' && !n.props.onPress));
  for (const state of [{ loading: true }, { error: 'offline' }, { data: null }]) {
    const safe = MainAppHeader({ ...props, ...state }); assert.doesNotMatch(text(safe), /250/);
    nodes(safe).find(n => n.type === 'Pressable').props.onPress();
  }
  assert.equal(opens, 4);
});

test('Shop renders stock/disabled states, real deadline, contextual repair and origin back', () => {
  let state = { data: aggregate(), loading: false, busy: false, error: null, pending: null, operationError: null, notice: null, refresh() {} }, back = 0;
  const { GamificationShopScreen } = component('../src/features/gamification/screens/GamificationShopScreen.tsx', { '../hooks/useGamification': { useGamification: () => state } });
  const render = () => GamificationShopScreen({ navigation: { goBack: () => back++ } });
  for (const stock of [0, 1, 2]) {
    state.data = aggregate(stock); const tree = render(); assert.match(text(tree), new RegExp(`Disponibles: ${stock} / 2`));
    assert.equal(button(tree, stock === 2 ? 'Inventario completo' : 'Comprar protector').props.disabled, stock === 2);
    assert.equal(button(tree, 'Restaurar racha'), undefined);
  }
  state.data = aggregate(0, candidate); const tree = render();
  assert.ok(button(tree, 'Restaurar racha')); assert.ok(text(tree).includes(repairDeadline(candidate.expiresAt))); assert.match(text(tree), /12 días/);
  nodes(tree).find(n => n.type === 'ContextualHeader').props.onBack(); assert.equal(back, 1);
  state.error = 'offline'; assert.equal(button(render(), 'Comprar protector').props.disabled, true);
  state.pending = { kind: 'purchase', requestKey: 'stable' }; state.operationError = 'Sin conexión';
  assert.ok(button(render(), 'Reintentar operación')); assert.equal(button(render(), 'Restaurar racha').props.disabled, true);
});

test('delta renders operation earnings/breakdown, daily reward and same-day distinction, never balance', () => {
  const { GamificationDeltaCard } = component('../src/features/gamification/components/GamificationDeltaCard.tsx');
  assert.equal(GamificationDeltaCard({}), null);
  const first = delta([reward('LESSON_FIRST_COMPLETION', 3), reward('LESSON_FIRST_PERFECT', 2), reward('DAILY_GOAL', 10), reward('COURSE_COMPLETION', 20), reward('STREAK_MILESTONE', 15)]);
  const copy = text(GamificationDeltaCard({ delta: first }));
  assert.match(copy, /\+50 monedas ganadas/); assert.match(copy, /Primera lección completada/); assert.match(copy, /Primer resultado perfecto/); assert.match(copy, /Curso completado/); assert.match(copy, /Hito de racha/);
  assert.match(copy, /Normal · 2\/2/); assert.match(copy, /\+10 monedas en esta sesión/); assert.doesNotMatch(copy, /999/);
  const sameDay = text(GamificationDeltaCard({ delta: delta([], false) })); assert.match(sameDay, /Sin avance adicional/); assert.doesNotMatch(sameDay, /\+1|avanzó/);
});

test('Lesson normal result passes exact delta; Replay never mounts gamification even with stray field', () => {
  const { LessonResultScreen } = component('../src/features/lessons/screens/LessonResultScreen.tsx');
  const response = { lesson: { id: 'l', title: 'Lesson' }, result: { correctAnswers: 1, totalActivities: 1, isPerfect: true, pendingReviewCount: 0 }, courseProgress: { percentage: 25, completedRequiredNodes: 1, totalRequiredNodes: 4 }, nextNode: null, gamification: delta([reward('LESSON_FIRST_COMPLETION', 3), reward('LESSON_FIRST_PERFECT', 2)]) };
  const render = result => LessonResultScreen({ route: { params: { courseId: 'c', result } }, navigation: {} });
  assert.equal(deltaNodes(render(response))[0].props.delta, response.gamification);
  assert.equal(deltaNodes(render({ ...response, mode: 'REPLAY' })).length, 0);
});

test('completed Challenge displays backend delta for pass, failed habits, zero reward replay and missing historical delta', () => {
  let state;
  const flow = { snapshot: () => state, subscribe() {} };
  const { UnitChallengeScreen } = component('../src/features/unit-challenges/UnitChallengeScreen.tsx', {
    './flow': { ChallengeFlow: class { constructor() { return flow; } } }, './useConversationScroll': { useConversationScroll: () => ({}) },
    './ChallengeArt': { ChallengeBackdrop: 'Backdrop', ChallengeHero: 'Hero' }, './phaseViews': {},
  });
  for (const [passed, gamification] of [[true, delta([reward('UNIT_CHALLENGE_FIRST_PASS', 8)])], [false, delta()], [true, delta([], false)], [true, undefined]]) {
    state = { metadata: { challenge: { topic: { position: 1 }, title: 'Reto' }, progress: { passed: false }, access: {}, progression: {} }, response: { run: { status: 'COMPLETED' }, result: { passed, percentage: passed ? 100 : 0, correctItems: passed ? 2 : 0, totalItems: 2 }, gamification } };
    const tree = UnitChallengeScreen({ route: { params: { courseId: 'c', unitChallengeId: 'uc' } }, navigation: {} });
    assert.equal(deltaNodes(tree).length, gamification ? 1 : 0);
    if (gamification) assert.equal(deltaNodes(tree)[0].props.delta, gamification);
  }
});

test('Review renders gamification only in final result when final backend attempt carries it', () => {
  let state = { phase: 'RESULT', outcomes: [], index: 0, batch: { items: [] } };
  const flow = { snapshot: () => state, subscribe() {} };
  const { ReviewScreen } = component('../src/features/review/screens/ReviewScreen.tsx', {
    '../flow': { ReviewFlow: class { constructor() { return flow; } } },
    '../presentation': { reviewResult: () => ({ topics: [], correct: 1, total: 1, pending: 0 }), reviewError: () => '' },
  });
  const render = () => ReviewScreen({ route: { params: {} }, navigation: {} });
  assert.equal(deltaNodes(render()).length, 0);
  const earned = delta([reward('DAILY_GOAL', 10)]); state.outcomes = [{ response: { gamification: earned } }];
  assert.equal(deltaNodes(render())[0].props.delta, earned);
  state.phase = 'IN_PROGRESS'; state.batch.items = [{ id: 'item', activity: {}, source: { topic: { title: 'Tema' } } }];
  assert.equal(deltaNodes(render()).length, 0);
});

test('root stack contains MainTabs and global Shop, retaining nested study tab-bar hiding', () => {
  const { RootNavigator, MainTabs } = component('../src/navigation/RootNavigator.tsx');
  const root = RootNavigator();
  assert.equal(root.type, 'NavigationContainer');
  const screens = nodes(root).filter(n => n.type === 'StackScreen');
  assert.deepEqual(screens.map(n => n.props.name), ['MainTabs', 'GamificationShop']); assert.equal(screens[0].props.component, MainTabs);
  const tabs = MainTabs(); assert.deepEqual(nodes(tabs).filter(n => n.type === 'TabScreen').map(n => n.props.name), ['Home', 'CoursesTab', 'Progress', 'Profile']);
  for (const name of ['Lesson', 'LessonResult', 'Review', 'UnitChallenge']) {
    assert.equal(tabs.props.screenOptions({ route: { name: 'CoursesTab', state: { routes: [{ name }] } } }).tabBarStyle.display, 'none');
  }
  assert.equal(tabs.props.screenOptions({ route: { name: 'CoursesTab' } }).tabBarStyle.display, 'flex');
});

test('Courses coin entry targets global Shop and pull refresh reloads both independent resources', () => {
  let courses = 0, gamification = 0; const destinations = [];
  const { CoursesScreen } = component('../src/features/courses/screens/CoursesScreen.tsx', {
    '../hooks/useCourseResource': { useCourseResource: () => ({ data: null, loading: false, retry: () => courses++ }) },
    '../../gamification/hooks/useGamification': { useGamification: () => ({ data: aggregate(), loading: false, error: null, refresh: () => gamification++ }) },
    '../../../components/MainAppHeader': { MainAppHeader: 'MainAppHeader' },
    '../components/CourseCard': { CourseCard: 'CourseCard' },
  });
  const tree = CoursesScreen({ navigation: { navigate: (...args) => destinations.push(args) } });
  const list = nodes(tree).find(n => n.type === 'FlatList');
  nodes(list.props.ListHeaderComponent).find(n => n.type === 'MainAppHeader').props.onOpenShop();
  assert.deepEqual(destinations, [['GamificationShop']]);
  list.props.refreshControl.props.onRefresh(); assert.equal(courses, 1); assert.equal(gamification, 1);
});

test('real root stack router returns to retained tab/nested route on back, preserving completion ticket', async () => {
  const { StackRouter, CommonActions } = await import('@react-navigation/routers');
  const config = { routeNames: ['MainTabs', 'GamificationShop'], routeParamList: {}, routeGetIdList: {} };
  const router = StackRouter({ initialRouteName: 'MainTabs' });
  for (const origin of ['Home', 'CoursesTab', 'Progress', 'Profile']) {
    const initial = router.getInitialState(config);
    initial.routes[0].state = { index: 0, routes: [{ name: origin, state: { index: 0, routes: [{ name: 'Roadmap', params: { courseId: 'c', completionTicket: 42 } }] } }] };
    const shop = router.getStateForAction(initial, CommonActions.navigate('GamificationShop'), config);
    assert.equal(shop.routes[shop.index].name, 'GamificationShop');
    const back = router.getStateForAction(shop, CommonActions.goBack(), config);
    assert.equal(back.index, 0); assert.deepEqual(back.routes[0], initial.routes[0]);
  }
});

test('ReviewFlow retains only server completion delta after the final authorized item, including wrong answers', async () => {
  const { ReviewFlow } = require('../src/features/review/flow.ts');
  const items = ['a', 'b'].map(id => ({ id })), earned = delta([reward('DAILY_GOAL', 10)]);
  const flow = new ReviewFlow(undefined, {
    read: async () => ({ pendingCount: 2 }), batch: async () => ({ batchToken: 'authorized', items }),
    attempt: async id => ({ attempt: { isCorrect: false }, ...(id === 'b' ? { gamification: earned } : {}) }),
  });
  await flow.load(); await flow.start(); await flow.submit({ text: 'wrong' }); flow.continue();
  assert.equal(flow.snapshot().phase, 'IN_PROGRESS'); assert.equal(flow.snapshot().outcomes[0].response.gamification, undefined);
  await flow.submit({ text: 'wrong' }); flow.continue();
  assert.equal(flow.snapshot().phase, 'RESULT'); assert.equal(flow.snapshot().outcomes.at(-1).response.gamification, earned);
});
