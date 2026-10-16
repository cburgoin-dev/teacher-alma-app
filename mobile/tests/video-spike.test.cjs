const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { VideoWatchedCoverage } = require('../src/features/lessons/videoWatchedCoverage.ts');
function play(w, from, to, clock = 0) {
  for (let p = from; p <= to; p += 0.25) w.sample(p, clock + (p - from) * 1000, true);
}
test('normal sampling: 89.75% incomplete, 90% complete; optional never blocks', () => {
  const w = new VideoWatchedCoverage(100);
  assert.equal(w.canContinue('OPTIONAL'), true); assert.equal(w.canContinue('REQUIRED_WATCH'), false);
  play(w, 0, 89.75); assert.equal(w.complete, false);
  w.sample(90, 90000, true); assert.equal(w.complete, true);
});
test('0–30 then native seek to 60 then 60–100 = 70 unique; replay does not duplicate', () => {
  const w = new VideoWatchedCoverage(100); play(w, 0, 30); play(w, 60, 100, 30250);
  assert.equal(w.watchedUniqueSeconds, 70); assert.deepEqual(w.watchedRanges, [[0, 30], [60, 100]]);
  play(w, 0, 30, 71000); assert.equal(w.watchedUniqueSeconds, 70); assert.equal(w.complete, false);
});
test('overlap and exact adjacency merge; real gaps stay gaps', () => {
  const w = new VideoWatchedCoverage(100); play(w, 10, 20); play(w, 0, 15, 11000); play(w, 20, 25, 27000);
  assert.deepEqual(w.watchedRanges, [[0, 25]]);
  play(w, 25.5, 26, 32250); assert.deepEqual(w.watchedRanges, [[0, 25], [25.5, 26]]);
});
test('seek to 90/end gives no credit, subsequent playback starts at destination', () => {
  const w = new VideoWatchedCoverage(100); w.sample(0, 0, true); w.sample(90, 250, true);
  assert.equal(w.watchedUniqueSeconds, 0); w.sample(90.25, 500, true);
  assert.deepEqual(w.watchedRanges, [[90, 90.25]]); w.sample(100, 750, true); assert.equal(w.complete, false);
});
test('pause, background interruption and long event gaps cannot invent playback', () => {
  const w = new VideoWatchedCoverage(100); play(w, 0, 5); w.sample(6, 6000, false);
  w.sample(20, 20000, true); assert.equal(w.watchedUniqueSeconds, 5);
  w.sample(21, 22000, true); assert.equal(w.watchedUniqueSeconds, 5);
  w.interrupt(); w.sample(30, 23000, true); assert.equal(w.watchedUniqueSeconds, 5);
});
test('100ms scheduling tolerance, larger delta rejected, rate changes anchor, invalid input interrupts', () => {
  const w = new VideoWatchedCoverage(100); w.sample(0, 0, true); w.sample(.3, 250, true);
  assert.equal(w.watchedUniqueSeconds, .3); w.sample(1, 500, true); assert.equal(w.watchedUniqueSeconds, .3);
  w.sample(1.5, 750, true, 2); assert.equal(w.watchedUniqueSeconds, .3);
  w.sample(2, 1000, true, 2); assert.ok(Math.abs(w.watchedUniqueSeconds - .8) < 1e-9);
  w.sample(NaN, 1250, true); w.sample(5, 1500, true); assert.ok(Math.abs(w.watchedUniqueSeconds - .8) < 1e-9);
});
test('reset and new run remove coverage', () => {
  const w = new VideoWatchedCoverage(100); play(w, 0, 90); w.reset();
  assert.equal(w.watchedUniqueSeconds, 0); assert.equal(w.complete, false);
  assert.equal(new VideoWatchedCoverage(100).watchedUniqueSeconds, 0);
});
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [node];
function mount(platform = 'android') {
  let cursor = 0, now = 0, mounted = false, appChange;
  const slots = [], listeners = {}, cleanups = [], orientations = [], gates = [];
  const player = { duration: 100, playbackRate: 1, status: 'readyToPlay', playing: true, currentTime: 0,
    pause() { this.playing = false; listeners.playingChange?.({ isPlaying: false }); },
    play() { this.playing = true; listeners.playingChange?.({ isPlaying: true }); },
    async replaceAsync() {},
    addListener(name, fn) { listeners[name] = fn; return { remove: () => delete listeners[name] }; } };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
      useEffect: fn => { if (!mounted) cleanups.push(fn()); },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Platform: { OS: platform }, useWindowDimensions: () => ({ fontScale: 1 }), View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: v => v, absoluteFill: {} }, AppState: { currentState: 'active', addEventListener: (_, fn) => { appChange = fn; return { remove() {} }; } } },
    'expo-video': { useVideoPlayer: (_, setup, options) => { if (!mounted) { setup(player); player.builderOptions = options; } return player; }, VideoView: 'VideoView' },
    '../videoWatchedCoverage': { VideoWatchedCoverage }, './AudioButton': { lessonAudio: { stop() {} } },
  };
  const code = ts.transpileModule(fs.readFileSync(require('node:path').resolve(__dirname, '../src/features/lessons/components/LessonVideoSpike.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'performance', code)(name => {
    if (/\.(mp4|png)$/.test(name)) return 1;
    if (name.startsWith('lucide-')) return 'Icon';
    if (!(name in modules)) throw new Error(name); return modules[name];
  }, module, module.exports, { now: () => now });
  const render = () => { cursor = 0; const tree = module.exports.LessonVideoSpike({ onCanContinue: v => gates.push(v), onFullscreen: v => orientations.push(v) }); mounted = true; return tree; };
  const tick = p => { now += 250; player.currentTime = p; listeners.timeUpdate({ currentTime: p }); };
  const press = text => flatten(render()).find(n => n?.type === 'Pressable' && flatten(n).some(x => typeof x === 'string' && x.includes(text))).props.onPress();
  render(); return { render, tick, player, gates, orientations, press, background: v => appChange(v), listeners, dispose: () => cleanups.forEach(fn => fn?.()) };
}
test('native fullscreen retains player and coverage, background pauses, remount clears', () => {
  const h = mount(); for (let p = 0; p <= 30; p += .25) h.tick(p);
  const surface = () => flatten(h.render()).find(n => n?.type === 'VideoView');
  assert.equal(surface().props.nativeControls, true); surface().props.onFullscreenEnter();
  h.background('background'); h.player.pause(); /* native real-background pause */ h.tick(60); h.background('active'); h.player.play();
  for (let p = 60; p <= 100; p += .25) h.tick(p);
  surface().props.onFullscreenExit(); assert.equal(surface().props.player, h.player); assert.deepEqual(h.orientations, []);
  assert.equal(h.gates.at(-1), false); h.tick(30); for (let p = 30.25; p <= 50; p += .25) h.tick(p);
  assert.equal(h.gates.at(-1), true); h.dispose();
  const fresh = mount(); assert.equal(fresh.gates.at(-1), false); fresh.dispose();
});
test('collapsed DEV optional toggle immediately changes gate and learner copy', () => {
  const h = mount(); assert.ok(!flatten(h.render()).includes('Provocar error local'));
  h.press('Pruebas DEV'); h.press('Modo:'); assert.equal(h.gates.at(-1), true);
  assert.ok(flatten(h.render()).includes('Video opcional. Puedes continuar cuando quieras.'));
  h.press('Modo:'); assert.equal(h.gates.at(-1), false); h.dispose();
});
test('error retry retains coverage and position without crediting the replacement seek', async () => {
  const h = mount(); for (let p = 0; p <= 30; p += .25) h.tick(p);
  h.listeners.statusChange({ status: 'error' }); await h.press('Reintentar');
  assert.equal(h.player.currentTime, 30); h.player.play();
  for (let p = 30; p <= 90; p += .25) h.tick(p);
  assert.equal(h.gates.at(-1), true); h.dispose();
});




test('Android Activity transitions preserve playing and paused intent without play/seek commands', () => {
  for (const playing of [true, false]) {
    const h = mount(); h.player.playing = playing; h.player.currentTime = 42;
    h.player.play = () => assert.fail('transition must not autoplay');
    h.player.pause = () => assert.fail('transition must not pause');
    const surface = flatten(h.render()).find(n => n?.type === 'VideoView');
    assert.deepEqual(h.player.builderOptions, { seekBackwardIncrement: 5, seekForwardIncrement: 10 });
    assert.equal(surface.props.surfaceType, 'textureView');
    surface.props.onFullscreenEnter(); h.background('background');
    surface.props.onFullscreenExit(); h.background('active');
    assert.equal(h.player.playing, playing); assert.equal(h.player.currentTime, 42);
    assert.deepEqual(h.orientations, []); h.dispose();
  }
  const ios = mount('ios'); assert.equal(ios.player.builderOptions, undefined); ios.dispose();
});
test('end retains position/completion; native replay keeps completion; status reserves two lines', () => {
  const h = mount();
  const status = () => flatten(h.render()).find(n => n?.props?.accessibilityLiveRegion === 'polite');
  const before = status().props.style;
  assert.ok(flatten(h.render()).includes('Mira el video para continuar.'));
  for (let p = 0; p <= 100; p += .25) h.tick(p);
  h.player.pause();
  assert.equal(h.player.currentTime, 100); assert.equal(h.gates.at(-1), true);
  const surface = flatten(h.render()).find(n => n?.type === 'VideoView');
  surface.props.onFullscreenExit(); assert.equal(h.player.currentTime, 100);
  assert.deepEqual(status().props.style, before);
  assert.ok(flatten(h.render()).includes('Video completado. Ya puedes continuar.'));
  h.player.currentTime = 0; h.player.play(); h.tick(.25);
  assert.equal(h.gates.at(-1), true); h.dispose();
});
