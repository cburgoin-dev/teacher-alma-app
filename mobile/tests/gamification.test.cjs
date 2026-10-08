global.__DEV__ = false;
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
    if (name.endsWith('.png')) return name;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react') return { useEffect() {}, useRef: value => ({ current: value }), useCallback: fn => fn, useMemo: fn => fn(), useSyncExternalStore: (_, snapshot) => snapshot() };
    if (name === 'react-native') return { Image: 'Image', View: 'View', Text: 'Text', ScrollView: 'ScrollView', Pressable: 'Pressable', SafeAreaView: 'SafeAreaView', RefreshControl: 'RefreshControl', ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView', FlatList: 'FlatList', Platform: { OS: 'android' }, StyleSheet: { create: value => value }, useWindowDimensions: () => overrides.dimensions ?? ({ width: 320, fontScale: 1.5 }) };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) };
    if (name === 'react-native-svg') return { default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' };
    if (name === '@react-navigation/native') return { useFocusEffect() {}, usePreventRemove() {}, NavigationContainer: 'NavigationContainer', getFocusedRouteNameFromRoute: route => route.state?.routes[route.state.index ?? 0]?.name };
    if (name === '@react-navigation/native-stack') return { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'StackScreen' }) };
    if (name === '@react-navigation/bottom-tabs') return { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'TabScreen' }) };
    if (name.startsWith('lucide-react-native/icons/')) return { default: name };
    if (name.endsWith('/GamificationMetrics')) return component(localRequire.resolve(name + '.tsx'), overrides);
    if (name.endsWith('/DevStreakReplay')) return { DevStreakReplay: 'DevStreakReplay' };
    if (name.endsWith('/theme') || name === './styles') return component(localRequire.resolve(name), overrides);
    if (name.endsWith('/ui')) return { Button: 'Button', ProgressBar: 'ProgressBar', ResourceState: 'ResourceState', colors: {}, styles: {} };
    if (name.endsWith('/lessonStyles')) return { lessonStyles: {} };
    if (name.endsWith('/AudioButton')) return { lessonAudio: { stop() {} } };
    const leaves = ['AlmaLogo', 'ContextualHeader', 'LearningIcon', 'ActivityStep', 'NavigationIcon', 'HomeScreen', 'CoursesScreen', 'CourseDetailScreen', 'RoadmapScreen', 'LessonScreen', 'UnitChallengeScreen', 'ReviewScreen', 'RoadmapHeader', 'ProgressScreen', 'ProgressCalendarScreen', 'ProfileScreen', 'GamificationShopScreen'];
    const leaf = leaves.find(leaf => name.endsWith('/' + leaf));
    if (leaf) return { [leaf]: leaf };
    if (name.endsWith('/LessonResultScreen')) return { CompletionHero: 'CompletionHero', LessonResultScreen: 'LessonResultScreen' };
    if (name.endsWith('/useStreakCelebration')) return { useStreakCelebration: () => ({ continue: (_, __, done) => done(), wrap: node => node }) };
    if (name.endsWith('/GamificationDeltaCard')) return { GamificationDeltaCard: 'GamificationDeltaCard' };
    if (name.endsWith('/GamificationIcon')) return { GamificationIcon: 'GamificationIcon' };
    return localRequire(name);
  };
  new Function('require', 'module', 'exports', compile(filename))(load, output, output.exports);
  return output.exports;
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (node == null || typeof node === 'boolean') return [];
  if (node.type?.name === 'GamificationMetrics') return [node, ...nodes(node.type(node.props))];
  return typeof node === 'object' ? [node, ...nodes(node.props?.children), ...nodes(node.props?.trailing)] : [node];
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

test('MainAppHeader preserves last-known balance/streak on refresh/error and only uses placeholders without data', () => {
  const { MainAppHeader } = component('../src/components/MainAppHeader.tsx'); let opens = 0;
  const props = { data: aggregate(), loading: false, error: null, onOpenShop: () => opens++ };
  const tree = MainAppHeader(props), pressable = nodes(tree).find(n => n.type === 'Pressable');
  assert.match(pressable.props.accessibilityLabel, /250 monedas/); pressable.props.onPress(); assert.equal(opens, 1);
  assert.ok(nodes(tree).some(n => n.props?.accessibilityLabel === 'Racha de 4 días' && !n.props.onPress));
  for (const state of [{ loading: true }, { error: 'offline' }, { data: null }]) {
    const safe = MainAppHeader({ ...props, ...state });
    if (state.data === null) assert.doesNotMatch(text(safe), /250/); else assert.match(text(safe), /250/);
    nodes(safe).find(n => n.type === 'Pressable').props.onPress();
  }
  assert.equal(opens, 4);
});

test('Shop renders stock/disabled states, real deadline, contextual repair and origin back', () => {
  let state = { data: aggregate(), loading: false, busy: false, error: null, pending: null, operationError: null, notice: null, refresh() {} }, back = 0;
  const { GamificationShopScreen } = component('../src/features/gamification/screens/GamificationShopScreen.tsx', { '../hooks/useGamification': { useGamification: () => state } });
  const render = () => GamificationShopScreen({ navigation: { goBack: () => back++ } });
  for (const stock of [0, 1, 2]) {
    state.data = aggregate(stock); const tree = render(); assert.match(text(tree), new RegExp(`Tienes ${stock} / 2`));
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

test('delta renders operation earnings/breakdown, daily reward without a streak tile or balance', () => {
  const { GamificationDeltaCard } = component('../src/features/gamification/components/GamificationDeltaCard.tsx');
  assert.equal(GamificationDeltaCard({}), null);
  const first = delta([reward('LESSON_FIRST_COMPLETION', 3), reward('LESSON_FIRST_PERFECT', 2), reward('DAILY_GOAL', 10), reward('COURSE_COMPLETION', 20), reward('STREAK_MILESTONE', 15)]);
  const copy = text(GamificationDeltaCard({ delta: first }));
  assert.match(copy, /\+50 monedas/); assert.match(copy, /Ganadas en esta sesión/); assert.match(copy, /Primera lección completada/); assert.match(copy, /Primer resultado perfecto/); assert.match(copy, /Curso completado/); assert.match(copy, /Hito de racha/);
  assert.match(copy, /Normal/); assert.match(copy, /2\/2/); assert.match(copy, /\+10 incluidas en el total/); assert.equal(copy.match(/\+10/g).length, 1); assert.doesNotMatch(copy, /999/);
  const sameDay = text(GamificationDeltaCard({ delta: delta([], false) })); assert.doesNotMatch(sameDay, /Sin avance adicional|días|racha/); assert.doesNotMatch(sameDay, /\+1|avanzó/);
});

test('V3 horizontal header retains full large values/48dp target; goal caps overflow without a streak tile', () => {
  const { MainAppHeader } = component('../src/components/MainAppHeader.tsx');
  for (const amount of [0, 9, 99, 999, 1234567]) {
    const data = aggregate(); data.coins.balance = amount; data.streak.currentDays = amount;
    const tree = MainAppHeader({ data, loading: false, error: null, onOpenShop() {} });
    assert.equal(nodes(tree).find(n => n.type === 'AlmaLogo').props.horizontal, true);
    assert.equal(tree.props.style.flexWrap, 'wrap');
    const coin = nodes(tree).find(n => n.type === 'Pressable');
    assert.ok(coin.props.accessibilityLabel.startsWith(`${amount} monedas`));
    assert.ok(coin.props.style({ pressed: false }).some(style => style?.minHeight >= 48));
    assert.equal(nodes(tree).filter(n => n === amount).length, 2, 'display exact values without truncation or invented abbreviations');
  }
  for (const dimensions of [{ width: 320, fontScale: 1 }, { width: 390, fontScale: 1.5 }, { width: 390, fontScale: 1 }]) {
    const { GamificationDeltaCard } = component('../src/features/gamification/components/GamificationDeltaCard.tsx', { dimensions });
    const earned = delta(); earned.dailyGoal.progress = 3;
    const tree = GamificationDeltaCard({ delta: earned });
    assert.match(text(tree), /2\/2/); assert.doesNotMatch(text(tree), /3\/2/);
    assert.equal(nodes(tree).filter(n => n.type === 'GamificationIcon' && n.props.kind === 'flame').length, 0);
    const bar = nodes(tree).find(n => n.props?.accessibilityRole === 'progressbar');
    assert.equal(bar.props.accessibilityValue.now, 2); assert.equal(bar.props.accessibilityValue.text, '3 de 2 sesiones');
    assert.equal(bar.props.children.props.style[1].width, '100%');
  }
});

test('V3 Shop supports zero balance, no fabricated product, loading, compact notices and busy retry', () => {
  let state = { data: null, loading: true, busy: false, error: null, pending: null, operationError: null, notice: null, refresh() {} };
  const { GamificationShopScreen } = component('../src/features/gamification/screens/GamificationShopScreen.tsx', { '../hooks/useGamification': { useGamification: () => state } });
  const render = () => GamificationShopScreen({ navigation: { goBack() {} } });
  assert.equal(button(render(), 'Comprar protector'), undefined);
  assert.ok(nodes(render()).some(n => n.props?.accessibilityLabel === 'Cargando protección de racha'));
  state = { ...state, loading: false, data: { ...aggregate(), coins: { balance: 0 } } };
  assert.ok(nodes(render()).some(n => n.props?.accessibilityLabel === 'Saldo: 0 monedas'));
  assert.ok(nodes(render()).some(n => n.props?.accessibilityLabel === 'Precio: 50 monedas'));
  const shortage = nodes(render()).find(n => n.type?.name === 'Shortage');
  assert.match(text(shortage.type(shortage.props)), /Te faltan 50 monedas.*Sigue aprendiendo/);
  assert.equal(button(render(), 'Comprar protector').props.disabled, true);
  assert.equal(button(render(), 'Restaurar racha'), undefined);
  state.notice = 'Protector comprado.'; assert.match(text(render()), /Protector comprado/);
  state.busy = true; state.pending = { kind: 'purchase', requestKey: 'stable' };
  assert.equal(button(render(), 'Comprar protector').props.busy, true);
  state.busy = false; state.operationError = 'Todavía no tienes suficientes monedas.';
  assert.equal(button(render(), 'Comprar protector').props.disabled, true); assert.ok(button(render(), 'Reintentar operación'));
  state.pending = null; assert.equal(button(render(), 'Reintentar operación'), undefined);
  assert.doesNotMatch(text(render()), /7 días|Comenzar reto/);
});

test('Lesson normal result passes exact delta; Replay never mounts gamification even with stray field', () => {
  const { LessonResultScreen } = component('../src/features/lessons/screens/LessonResultScreen.tsx');
  const response = { lesson: { id: 'l', title: 'Lesson' }, result: { correctAnswers: 1, totalActivities: 1, isPerfect: true, pendingReviewCount: 0 }, courseProgress: { percentage: 25, completedRequiredNodes: 1, totalRequiredNodes: 4 }, nextNode: null, gamification: delta([reward('LESSON_FIRST_COMPLETION', 3), reward('LESSON_FIRST_PERFECT', 2)]) };
  const render = result => LessonResultScreen({ route: { params: { courseId: 'c', result } }, navigation: {} });
  assert.equal(deltaNodes(render(response))[0].props.delta, response.gamification);
  for (const [isPerfect, pendingReviewCount, emphasis] of [[true, 0, 'celebration'], [false, 0, 'standard'], [false, 2, 'quiet']]) {
    assert.equal(deltaNodes(render({ ...response, result: { ...response.result, isPerfect, pendingReviewCount } }))[0].props.emphasis, emphasis);
  }
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
    if (gamification) { assert.equal(deltaNodes(tree)[0].props.delta, gamification); assert.equal(deltaNodes(tree)[0].props.emphasis, 'quiet'); }
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

test('root stack owns one learning history above unchanged MainTabs and global Shop', () => {
  const { RootNavigator, MainTabs } = component('../src/navigation/RootNavigator.tsx');
  const root = RootNavigator();
  assert.equal(root.type, 'NavigationContainer');
  const screens = nodes(root).filter(n => n.type === 'StackScreen');
  assert.deepEqual(screens.map(n => n.props.name), ['MainTabs', 'GamificationShop', 'ProgressCalendar', 'CourseDetail', 'Roadmap', 'Lesson', 'LessonResult', 'UnitChallenge', 'Review']); assert.equal(screens[0].props.component, MainTabs);
  const tabs = MainTabs(); assert.deepEqual(nodes(tabs).filter(n => n.type === 'TabScreen').map(n => n.props.name), ['Home', 'CoursesTab', 'Progress', 'Profile']);

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
const { StreakCelebrationGate, streakMilestones } = require('../src/features/gamification/streakCelebration.ts');

test('celebration gates only real advances, deduplicates taps/remounts and forwards one destination', () => {
  const seen = new Set(), earned = delta(), destinations = [];
  const gate = new StreakCelebrationGate(seen);
  gate.continue(earned, 'run:1', () => destinations.push('Roadmap'));
  assert.equal(gate.snapshot(), earned); assert.deepEqual(destinations, []);
  gate.continue(earned, 'run:1', () => destinations.push('wrong'));
  gate.finish(); gate.finish(); assert.deepEqual(destinations, ['Roadmap']); assert.equal(gate.snapshot(), null);
  const reopened = new StreakCelebrationGate(seen);
  reopened.continue(earned, 'run:1', () => destinations.push('origin'));
  assert.equal(reopened.snapshot(), null); assert.deepEqual(destinations, ['Roadmap', 'origin']);
  for (const [value, replay] of [[delta([], false), false], [undefined, false], [earned, true]]) {
    const skipped = new StreakCelebrationGate(new Set()); let exits = 0;
    skipped.continue(value, 'source', () => exits++, replay);
    assert.equal(skipped.snapshot(), null); assert.equal(exits, 1);
  }
  const abandoned = new StreakCelebrationGate(new Set()); let exits = 0;
  abandoned.continue(earned, 'source', () => exits++); abandoned.dispose(); abandoned.finish(); assert.equal(exits, 0);
});

const celebrationHook = gate => ({ useStreakCelebration: () => ({ continue: gate.continue, wrap: node => node }) });
test('Lesson Continue delays the original completion ticket/destination; Replay bypasses even a stray advance', () => {
  for (const mode of ['NORMAL', 'REPLAY']) {
    const gate = new StreakCelebrationGate(new Set()), exits = [], tickets = [];
    const { LessonResultScreen } = component('../src/features/lessons/screens/LessonResultScreen.tsx', {
      '../../gamification/hooks/useStreakCelebration': celebrationHook(gate),
      '../../courses/completionMotion': { finishCompletion: (...args) => { tickets.push(args); return 42; } },
    });
    const response = { mode, lesson: { id: 'l', title: 'Lesson' }, result: { correctAnswers: 1, totalActivities: 1, isPerfect: true, pendingReviewCount: 0 }, courseProgress: { percentage: 25, completedRequiredNodes: 1, totalRequiredNodes: 4 }, gamification: delta() };
    const tree = LessonResultScreen({ route: { params: { courseId: 'course', completionTicket: 42, result: response } }, navigation: { popTo: (...args) => exits.push(args) } });
    button(tree, 'Continuar en la ruta').props.onPress();
    if (mode === 'NORMAL') { assert.equal(exits.length, 0); assert.equal(tickets.length, 0); assert.equal(gate.snapshot(), response.gamification); gate.finish(); }
    else assert.equal(gate.snapshot(), null);
    assert.deepEqual(tickets, [[42, mode !== 'REPLAY']]);
    assert.deepEqual(exits, [['Roadmap', { courseId: 'course', completionTicket: 42 }]]);
  }
});

test('Challenge celebration retains progressed route ticket and the existing non-progressed origin exit', () => {
  for (const progressed of [true, false]) {
    const gate = new StreakCelebrationGate(new Set()), exits = [], tickets = [];
    const state = { metadata: { challenge: { topic: { position: 1 }, title: 'Reto' }, progress: { passed: !progressed }, access: {}, progression: {} }, response: { run: { id: 'durable-run', status: 'COMPLETED' }, result: { passed: true, percentage: 100, correctItems: 2, totalItems: 2 }, gamification: delta() } };
    const { UnitChallengeScreen } = component('../src/features/unit-challenges/UnitChallengeScreen.tsx', {
      '../gamification/hooks/useStreakCelebration': celebrationHook(gate),
      '../courses/completionMotion': { finishCompletion: (...args) => { tickets.push(args); return 42; } },
      './flow': { ChallengeFlow: class { snapshot = () => state; subscribe() {} } }, './useConversationScroll': { useConversationScroll: () => ({}) },
      './ChallengeArt': { ChallengeBackdrop: 'Backdrop', ChallengeHero: 'Hero' }, './phaseViews': {},
    });
    const tree = UnitChallengeScreen({ route: { params: { courseId: 'c', unitChallengeId: 'uc', completionTicket: 42 } }, navigation: { canGoBack: () => true, goBack: () => exits.push('back'), popTo: (...args) => exits.push(args) } });
    button(tree, 'Continuar en la ruta').props.onPress(); assert.equal(exits.length, 0); assert.equal(tickets.length, 0);
    gate.finish(); gate.finish();
    assert.deepEqual(exits, progressed ? [['Roadmap', { courseId: 'c', completionTicket: 42 }]] : ['back']);
    assert.deepEqual(tickets, progressed ? [[42, true]] : []);
  }
});

test('Review final Continue gates the original exit; same-day result exits directly', () => {
  for (const advanced of [true, false]) {
    const gate = new StreakCelebrationGate(new Set()); let exits = 0;
    const state = { phase: 'RESULT', outcomes: [{ response: { attempt: { id: 'final-attempt' }, gamification: delta([], advanced) } }], index: 0, batch: { items: [] } };
    const { ReviewScreen } = component('../src/features/review/screens/ReviewScreen.tsx', {
      '../../gamification/hooks/useStreakCelebration': celebrationHook(gate),
      '../flow': { ReviewFlow: class { snapshot = () => state; subscribe() {} requestExit = () => exits++; } },
      '../presentation': { reviewResult: () => ({ topics: [], resolved: 1, total: 1, pending: 0 }), reviewError: () => '' },
    });
    const tree = ReviewScreen({ route: { params: { courseId: 'c' } }, navigation: {} });
    button(tree, 'Continuar mi ruta').props.onPress(); assert.equal(exits, advanced ? 0 : 1);
    gate.finish(); assert.equal(exits, 1);
  }
});

function motionHarness(preference) {
  const effects = [], values = [], updates = [], tweens = [];
  let listener, stopped = 0, started = 0, removed = 0;
  class Value { constructor(value) { this.value = value; values.push(this); } setValue(value) { this.value = value; } interpolate(config) { return config; } }
  const { StreakCelebration } = component('../src/features/gamification/components/StreakCelebration.tsx', {
    react: { useEffect: fn => effects.push(fn), useRef: value => ({ current: value }), useState: initial => [initial, value => updates.push(value)] },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Modal: 'Modal', StyleSheet: { create: value => value },
      Easing: { cubic: 'cubic', out: fn => fn },
      Animated: { View: 'AnimatedView', Value, timing: (_, config) => { tweens.push(config); return config; }, delay: ms => ({ delay: ms }), sequence: steps => steps, parallel: steps => ({ start: () => started++, stop: () => stopped++ }) },
      AccessibilityInfo: { isReduceMotionEnabled: () => preference, addEventListener: (_, fn) => { listener = fn; return { remove: () => removed++ }; } },
    },
  });
  let exits = 0;
  const tree = StreakCelebration({ delta: delta([reward('STREAK_MILESTONE', 15), reward('DAILY_GOAL', 10)]), onContinue: () => exits++ });
  const cleanup = effects[0]();
  return { tree, cleanup, values, updates, tweens, change: value => listener(value), status: () => ({ stopped, started, removed, exits }) };
}

test('streak motion enables CTA at 900ms, honors live Reduce Motion and cleans timers/animation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = motionHarness(Promise.resolve(false)); await Promise.resolve();
  assert.equal(h.status().started, 1); assert.deepEqual(h.tweens.map(t => [t.delay, t.duration]), [[0, 400], [300, 700], [700, 700], [1200, 1000]]);
  assert.ok(h.tweens.every(t => t.useNativeDriver));
  t.mock.timers.tick(899); assert.deepEqual(h.updates, []); t.mock.timers.tick(1); assert.deepEqual(h.updates, [true]);
  h.change(true); assert.ok(h.values.every(v => v.value === 1)); assert.equal(h.status().stopped, 1);
  h.cleanup(); assert.equal(h.status().removed, 1);
  const early = motionHarness(Promise.resolve(false)); await Promise.resolve(); early.cleanup(); t.mock.timers.tick(1000); assert.deepEqual(early.updates, []);
});

test('Reduce Motion or failed preference renders final state immediately; late preference cannot animate after unmount', async () => {
  for (const preference of [Promise.resolve(true), Promise.reject(Error('unavailable'))]) {
    const h = motionHarness(preference); await Promise.resolve(); await Promise.resolve();
    assert.equal(h.status().started, 0); assert.ok(h.values.every(v => v.value === 1)); assert.deepEqual(h.updates, [true]);
    button(h.tree, 'Continuar').props.onPress(); assert.equal(h.status().exits, 1); h.cleanup();
  }
  const pending = deferred(), h = motionHarness(pending.promise); h.cleanup(); pending.resolve(false); await Promise.resolve();
  assert.equal(h.status().started, 0); assert.deepEqual(h.updates, []);
});

test('celebration shows only real milestone reward, without invented dates/history', () => {
  assert.deepEqual(streakMilestones(delta()), []);
  assert.deepEqual(streakMilestones(delta([reward('DAILY_GOAL', 10), reward('STREAK_MILESTONE', 15)])), [reward('STREAK_MILESTONE', 15)]);
  const h = motionHarness(new Promise(() => {}));
  assert.match(text(h.tree), /4 días seguidos/); assert.match(text(h.tree), /\+15 monedas ganadas/); assert.doesNotMatch(text(h.tree), /\+10|Lunes|Martes/); h.cleanup();
});

test('Shop local shortage, silent refresh, domain rejection and repair use authoritative balance', () => {
  let state = { data: { ...aggregate(0, candidate), coins: { balance: 26 } }, loading: true, busy: false, error: null, pending: null, operationError: null, operationErrorCode: null, notice: null, refresh() {} };
  const { GamificationShopScreen } = component('../src/features/gamification/screens/GamificationShopScreen.tsx', { '../hooks/useGamification': { useGamification: () => state } });
  const render = () => GamificationShopScreen({ navigation: { goBack() {} } });
  const shortageCopy = tree => nodes(tree).filter(n => n.type?.name === 'Shortage').map(n => text(n.type(n.props))).join('');
  assert.doesNotMatch(text(render()), /Actualizando|pendientes de actualizar/);
  assert.ok(nodes(render()).some(n => n.type === 'ActivityIndicator'));
  state.loading = false;
  assert.match(shortageCopy(render()), /Te faltan 24 monedas.*Sigue aprendiendo.*Te faltan 94 monedas/);
  assert.equal(button(render(), 'Comprar protector').props.disabled, true); assert.equal(button(render(), 'Restaurar racha').props.disabled, true);
  state.operationError = 'Todavía no tienes suficientes monedas.'; state.operationErrorCode = 'INSUFFICIENT_COINS';
  assert.doesNotMatch(text(render()), /Todavía no/); assert.match(shortageCopy(render()), /24 monedas/);
  state.operationErrorCode = 'UNKNOWN'; state.operationError = 'No pudimos completar la compra'; assert.match(text(render()), /No pudimos/);
  state.operationError = null; state.data.coins.balance = 120;
  assert.equal(button(render(), 'Comprar protector').props.disabled, false); assert.equal(button(render(), 'Restaurar racha').props.disabled, false);
  assert.equal(shortageCopy(render()), '');
  assert.equal(nodes(render()).find(n => n.type === 'ContextualHeader').props.title, 'Tienda');
});

test('horizontal official derivative is bounded at every density; back-only preserves 48dp/a11y/safe area', () => {
  const { AlmaLogo } = component('../src/components/AlmaLogo.tsx');
  const logo = AlmaLogo({ horizontal: true });
  const trimmed = AlmaLogo({ horizontal: true, horizontalWidth: 184, trimHorizontal: true });
  const image = nodes(trimmed).find(n => n.type === 'Image');
  assert.equal(trimmed.props.style.overflow, 'hidden');
  assert.ok(Math.abs(image.props.style.width / image.props.style.height - 592 / 124) < 1e-10);
  assert.equal(image.props.source, logo.props.source);
  assert.match(logo.props.source, /la-teacher-alma-horizontal\.png$/); assert.equal(logo.props.resizeMode, 'contain');
  for (const density of [1, 2, 3, 4]) {
    const bytes = fs.readFileSync(path.resolve(__dirname, `../assets/branding/la-teacher-alma-horizontal${density === 1 ? '' : '@' + density + 'x'}.png`));
    assert.equal(bytes.readUInt32BE(16), 148 * density); assert.equal(bytes.readUInt32BE(20), 31 * density);
  }
  const { ContextualHeader } = component('../src/components/ContextualHeader.tsx'); let back = 0;
  const tree = ContextualHeader({ title: 'Tienda', backOnly: true, safeTop: true, backLabel: 'Volver desde Tienda', onBack: () => back++ });
  assert.doesNotMatch(text(tree), /Tienda/); assert.equal(tree.props.style[1].paddingTop, 24);
  const target = nodes(tree).find(n => n.type === 'Pressable'); assert.equal(target.props.accessibilityLabel, 'Volver desde Tienda');
  assert.equal(target.props.style({ pressed: false })[0].width, 48); assert.equal(target.props.style({ pressed: false })[0].minHeight, 48); target.props.onPress(); assert.equal(back, 1);
  assert.match(text(ContextualHeader({ title: 'Repaso', onBack() {} })), /Repaso/);
});

test('V4 DEV replay repeats actual state without production gate, backend, tickets or destination side effects', () => {
  const { devCelebrationPreview, rememberDevCelebration } = require('../src/features/gamification/devStreakReplay.ts');
  assert.equal(devCelebrationPreview(aggregate()), null);
  rememberDevCelebration(delta()); // Production never captures a preview.
  const gate = new StreakCelebrationGate(new Set()); let exits = 0;
  gate.continue(delta(), 'real', () => exits++);
  const savedFetch = global.fetch; let requests = 0;
  global.fetch = () => { requests++; throw Error('DEV preview must not call backend'); };
  global.__DEV__ = true;
  try {
    const preview = devCelebrationPreview(aggregate());
    assert.equal(preview.delta.streak.currentDays, aggregate().streak.currentDays);
    assert.equal(preview.delta.streak.advancedToday, false); assert.deepEqual(preview.delta.coinRewards, []);
    const actual = delta([reward('STREAK_MILESTONE', 15)]); rememberDevCelebration(actual);
    assert.equal(devCelebrationPreview(null).delta, actual);
    const slots = []; let index = 0;
    const { DevStreakReplay } = component('../src/features/gamification/components/DevStreakReplay.tsx', {
      react: { useState: initial => { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; } },
      './StreakCelebration': { StreakCelebration: 'StreakCelebration' },
    });
    const render = () => { index = 0; return DevStreakReplay({ data: aggregate() }); };
    button(render(), 'DEV · Reproducir celebración').props.onPress();
    for (let i = 0; i < 3; i++) {
      const surface = nodes(render()).find(n => n.type === 'StreakCelebration');
      assert.equal(surface.key, String(i)); assert.equal(surface.props.delta, actual); assert.match(surface.props.devLabel, /DEV/);
      surface.props.onReplay(); assert.equal(exits, 0); assert.ok(gate.snapshot());
    }
    nodes(render()).find(n => n.type === 'StreakCelebration').props.onContinue();
    assert.equal(nodes(render()).filter(n => n.type === 'StreakCelebration').length, 0);
    assert.equal(requests, 0); assert.equal(exits, 0); gate.finish(); assert.equal(exits, 1);
    global.__DEV__ = false; assert.equal(render(), null); assert.equal(devCelebrationPreview(aggregate()), null);
  } finally { global.__DEV__ = false; global.fetch = savedFetch; }
});

test('V4 composed Roadmap header shares live metrics and coin navigation; root logo adapts moderately', () => {
  let opened = 0, backs = 0;
  const { RoadmapHeader } = component('../src/features/gamification/components/RoadmapHeader.tsx', {
    '../hooks/useGamification': { useGamification: () => ({ data: aggregate(), loading: false, error: null }) },
  });
  const tree = RoadmapHeader({ onBack: () => backs++, onOpenShop: () => opened++ });
  tree.props.onBack(); nodes(tree).find(n => n.type === 'Pressable').props.onPress();
  assert.equal(opened, 1); assert.equal(backs, 1); assert.equal(tree.props.safeTop, true);
  assert.ok(text(tree).includes('250')); assert.ok(text(tree).includes('4'));
  for (const [width, fontScale, expected] of [[320, 1, 150], [390, 1, 172], [390, 1.5, 150]]) {
    const { MainAppHeader } = component('../src/components/MainAppHeader.tsx', { dimensions: { width, fontScale } });
    const header = MainAppHeader({ data: aggregate(), loading: false, error: null, onOpenShop() {} });
    assert.equal(nodes(header).find(n => n.type === 'AlmaLogo').props.horizontalWidth, expected);
    assert.equal(header.props.style.flexWrap, 'wrap');
  }
});


test('root Detail and Roadmap headers use natural Back and existing global Shop', () => {
  const { RootNavigator } = component('../src/navigation/RootNavigator.tsx');
  const screens = nodes(RootNavigator()).filter(n => n.type === 'StackScreen');
  const visited = []; let back = 0;
  for (const name of ['CourseDetail', 'Roadmap']) {
    const screen = screens.find(n => n.props.name === name);
    const header = screen.props.options.header({ navigation: { goBack: () => back++, navigate: name => visited.push(name) } });
    header.props.onBack();
    if (name === 'Roadmap') header.props.onOpenShop();
  }
  assert.deepEqual(visited, ['GamificationShop']); assert.equal(back, 2);
});

test('V4 header policy is shared by Home and Courses, with common trimming and responsive metrics', () => {
  for (const [width, fontScale, expected, compact] of [[320, 1, 150, true], [360, 1, 172, true], [390, 1, 172, false], [390, 1.5, 150, true]]) {
    const { MainAppHeader } = component('../src/components/MainAppHeader.tsx', { dimensions: { width, fontScale } });
    const tree = MainAppHeader({ data: aggregate(), loading: false, error: null });
    const logo = nodes(tree).find(n => n.type === 'AlmaLogo');
    assert.equal(logo.props.horizontalWidth, expected); assert.equal(logo.props.trimHorizontal, true);
    const metric = nodes(tree).find(n => typeof n.type === 'function' && n.type.name === 'GamificationMetrics');
    assert.equal(metric.props.compact, compact);
  }
  for (const screen of ['home/screens/HomeScreen.tsx', 'courses/screens/CoursesScreen.tsx']) {
    const source = fs.readFileSync(path.resolve(__dirname, '../src/features', screen), 'utf8');
    assert.match(source, /<MainAppHeader data=/); assert.doesNotMatch(source, /<MainAppHeader home/);
  }
});
