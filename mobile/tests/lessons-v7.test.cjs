const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { LessonAudio } = require('../src/features/lessons/lessonAudio.ts');
const { fillParts } = require('../src/features/lessons/fillPresentation.ts');
function setup(prepare = async () => {}, timeout = 1000) {
  const players = [];
  const audio = new LessonAudio(url => {
    const p = { url, played: 0, paused: 0, removed: 0, unlistened: 0, play() { this.played++; }, pause() { this.paused++; }, remove() { this.removed++; },
      addListener(_, fn) { this.emit = fn; return { remove: () => p.unlistened++ }; } };
    players.push(p); return p;
  }, prepare, timeout);
  return { audio, players };
}
test('audio is exclusive; completion permits replay; owner cleanup cannot stop a newer clip', async () => {
  const { audio, players } = setup(); const a = {}, b = {}, statesA = [], statesB = [];
  await audio.play(a, 'a.wav', s => statesA.push(s));
  players[0].emit({ playing: true, isLoaded: true }); assert.equal(statesA.at(-1), 'playing');
  await audio.play(b, 'b.wav', s => statesB.push(s));
  assert.equal(players[0].removed, 1); assert.equal(statesA.at(-1), 'idle');
  audio.stop(a); assert.equal(players[1].removed, 0);
  players[0].emit({ error: 'stale' }); assert.equal(statesB.at(-1), 'loading');
  players[1].emit({ didJustFinish: true }); assert.equal(statesB.at(-1), 'replay'); assert.equal(players[1].removed, 1);
  await audio.play(b, 'b.wav', s => statesB.push(s)); assert.equal(players[2].played, 1);
  audio.stop(); assert.equal(players[2].removed, 1); assert.equal(players[2].unlistened, 1);
});
test('audio cancels pending starts/source changes and catches load/playback errors', async () => {
  let resolve; const { audio, players } = setup(() => new Promise(r => resolve = r)); const owner = {}, states = [];
  const start = audio.play(owner, 'a', s => states.push(s)); audio.stop(owner); resolve(); await start;
  assert.equal(players.length, 0); assert.deepEqual(states, ['loading', 'idle']);
  const failed = setup(async () => { throw Error('mode failed'); });
  await failed.audio.play({}, 'a', s => states.push(s)); assert.equal(states.at(-1), 'error');
  const native = setup(); await native.audio.play(owner, 'a', s => states.push(s)); native.players[0].emit({ error: 'network' });
  assert.equal(states.at(-1), 'error'); assert.equal(native.players[0].removed, 1);
});
test('audio timeout returns a retryable error and a second tap cancels loading', async () => {
  const { audio, players } = setup(undefined, 5); const owner = {}, states = [];
  await audio.play(owner, 'a', s => states.push(s)); await new Promise(r => setTimeout(r, 15));
  assert.equal(states.at(-1), 'error'); assert.equal(players[0].removed, 1);
  await audio.play(owner, 'a', s => states.push(s)); await audio.play(owner, 'a', s => states.push(s));
  assert.equal(states.at(-1), 'idle'); assert.equal(players.length, 2);
});
test('Fill uses only the explicit single blank, preserving punctuation and legacy prompts', () => {
  for (const [prompt, answer, expected] of [["_____, I’m Sofía.", 'Hello', 'Hello, I’m Sofía.'], ['I _____ a student.', 'am', 'I am a student.'], ['Nice to meet you _____!', 'too', 'Nice to meet you too!']]) {
    const p = fillParts(prompt); assert.equal(p.before + answer + p.after, expected);
    assert.equal(p.before + '_____' + p.after, prompt);
  }
  assert.equal(fillParts('No marker'), null); assert.equal(fillParts('___ and ___'), null);
});

test('audio interrupted after starting releases resources and replays on the next single tap', async () => {
  const { audio, players } = setup(); const owner = {}, states = [];
  await audio.play(owner, 'a', s => states.push(s));
  players[0].emit({ isLoaded: true, playing: true });
  players[0].emit({ isLoaded: true, playing: false });
  assert.equal(states.at(-1), 'replay'); assert.equal(players[0].removed, 1);
  await audio.play(owner, 'a', s => states.push(s)); assert.equal(players[1].played, 1); audio.stop();
});
