const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { matchingDraft } = require('../src/features/lessons/matchingDraft.ts');
const empty = () => ({ pairs: [], word: null, image: null });
test('Matching connects from either side, toggles selection, replaces associations and resets both sides', () => {
  const wordFirst = matchingDraft(matchingDraft(empty(), { type: 'select', word: 'book' }), { type: 'connect', image: 'book-image' });
  const imageFirst = matchingDraft(matchingDraft(empty(), { type: 'connect', image: 'book-image' }), { type: 'select', word: 'book' });
  assert.deepEqual(wordFirst, imageFirst);
  assert.deepEqual(imageFirst.pairs, [{ wordId: 'book', imageId: 'book-image' }]);
  for (const action of [{ type: 'select', word: 'book' }, { type: 'connect', image: 'book-image' }]) {
    assert.deepEqual(matchingDraft(matchingDraft(empty(), action), action), empty());
    assert.deepEqual(matchingDraft(matchingDraft(wordFirst, action), { type: 'retry' }), empty());
  }
  let state = matchingDraft(wordFirst, { type: 'connect', image: 'book-image' });
  state = matchingDraft(state, { type: 'select', word: 'cup' });
  assert.deepEqual(state.pairs, [{ wordId: 'cup', imageId: 'book-image' }]);
  state = matchingDraft(matchingDraft(state, { type: 'select', word: 'cup' }), { type: 'connect', image: 'cup-image' });
  assert.deepEqual(state.pairs, [{ wordId: 'cup', imageId: 'cup-image' }]);
});
test('AudioButton hides absent/unsafe URLs and opens the real HTTP audio with accessible external-player copy', async () => {
  const Module = require('node:module');
  const path = require('node:path');
  const filename = path.resolve(__dirname, '../src/features/lessons/components/RichContent.tsx');
  const component = new Module(filename, module);
  component.filename = filename;
  component.paths = module.paths;
  const opened = [];
  component.require = id => id === 'react-native'
    ? { Pressable: 'Pressable', StyleSheet: { create: x => x }, Linking: { openURL: async url => opened.push(url) }, Alert: { alert: () => assert.fail('Unexpected audio error') } }
    : id.includes('lucide') ? { default: 'Volume2' }
    : id === './lessonStyles' ? { lessonStyles: {} }
    : id === '../contentPresentation' ? require('../src/features/lessons/contentPresentation.ts') : require(id);
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  const { AudioButton } = component.exports;
  for (const audioUrl of [undefined, '', 'file:///a.wav', 'javascript:alert(1)', 'https://u:p@host/a.wav']) assert.equal(AudioButton({ audioUrl }), null);
  const audioUrl = 'http://192.168.1.64:3000/demo-media/nice-to-meet-you.wav';
  const button = AudioButton({ audioUrl, audioAlt: 'Nice to meet you!' });
  assert.equal(button.props.accessibilityLabel, 'Abrir audio: Nice to meet you!');
  assert.match(button.props.accessibilityHint, /externa/);
  button.props.onPress();
  await Promise.resolve();
  assert.deepEqual(opened, [audioUrl]);
});
