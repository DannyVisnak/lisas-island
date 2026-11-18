'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('lesson early-exit smoke uses visible Back navigation on the shared screen flow', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'smoke_lesson.js'), 'utf8');
  const match = source.match(/async function earlyExitCase\(lib\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'actual smoke earlyExitCase exists');
  const state = { screen: 'home', seen: 1, taps: [] };
  const context = { Core: { curLang: () => 'pt' }, Lesson: { seen: () => state.seen }, sleep: async () => {} };
  context.window = context;
  context.__test = { screen: () => state.screen, go(name) {
    state.screen = name;
    if (name === 'home') context.__lessonTest = null;
    else context.__lessonTest = { id: 'more', state: () => ({ phase: 'prompt' }), handle: { stop() { /* shared UI.flow remains owned by screen */ } } };
  } };
  vm.createContext(context);
  const evaluate = fn => vm.runInContext('(' + fn.toString() + ')()', context);
  const lib = {
    page: { evaluate: async fn => evaluate(fn), waitForFunction: async fn => assert.ok(evaluate(fn), 'requested browser condition') },
    expect: (ok, message) => assert.ok(ok, message),
    tapSel: async selector => { assert.equal(selector, '.ls-bar .b-back'); state.taps.push(selector); context.__test.go('home'); }
  };
  await vm.runInContext('(' + match[0] + ')', context)(lib);
  assert.deepEqual(state.taps, ['.ls-bar .b-back'], 'exercise the existing visible Back action');
  assert.equal(state.screen, 'home');
  assert.equal(state.seen, 1, 'no new completion');
});
