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
