'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const source = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

function harness(setZoomLimits = () => Promise.resolve()) {
  const app = new EventEmitter();
  app.isPackaged = false;
  app.commandLine = { appendSwitch() {} };
  app.setName = () => {};
  app.requestSingleInstanceLock = () => true;
  app.quit = () => {};
  app.whenReady = () => Promise.resolve();

  const wc = new EventEmitter();
  const order = [];
  wc.setVisualZoomLevelLimits = (...args) => { order.push(['limits', ...args]); return setZoomLimits(...args); };
  wc.setZoomFactor = value => { order.push(['zoom', value]); };
  wc.setWindowOpenHandler = () => {};
  wc.closeDevTools = () => {};

  class BrowserWindow extends EventEmitter {
    constructor() { super(); this.webContents = wc; }
    removeMenu() {}
    setMenuBarVisibility() {}
    loadFile() {
      order.push(['loadFile']);
      assert.ok(wc.listenerCount('did-finish-load') > 0, 'load listener must be registered before loading');
    }
  }
  const consoleCalls = [];
  const electron = {
    app, BrowserWindow,
    Menu: { setApplicationMenu() {} },
    session: { defaultSession: { webRequest: { onBeforeRequest() {} }, setPermissionRequestHandler() {} } },
    globalShortcut: {}
  };
  const sandbox = {
    require(name) {
      if (name === 'electron') return electron;
      return require(name);
    },
    console: { error: (...args) => consoleCalls.push(args) },
    __dirname,
    process,
    URL,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, sandbox, { filename: path.join(__dirname, 'main.js') });
  return new Promise(resolve => setImmediate(() => resolve({ wc, order, consoleCalls })));
}

test('visual zoom limits apply only after each completed load; zoom factor stays 1', async () => {
  const { wc, order } = await harness();
  assert.deepEqual(order, [['zoom', 1], ['loadFile']]);
  wc.emit('did-finish-load');
  await Promise.resolve();
  assert.deepEqual(order, [['zoom', 1], ['loadFile'], ['limits', 1, 1]]);
  wc.emit('did-finish-load');
  await Promise.resolve();
  assert.deepEqual(order.filter(row => row[0] === 'limits'), [
    ['limits', 1, 1],
    ['limits', 1, 1]
  ]);
  assert.equal(order.filter(row => row[0] === 'zoom').length, 1);
});

test('zoom-limit rejection is caught and retains the original error in diagnostics', async () => {
  const error = new Error('native zoom failure details');
  const { wc, order, consoleCalls } = await harness(() => Promise.reject(error));
  assert.doesNotThrow(() => wc.emit('did-finish-load'));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(order.filter(row => row[0] === 'limits'), [['limits', 1, 1]]);
  assert.equal(consoleCalls.length, 1);
  assert.match(consoleCalls[0][0], /Failed to set visual zoom level limits/);
  assert.equal(consoleCalls[0][1], error);
});
