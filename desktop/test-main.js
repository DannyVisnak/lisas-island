'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const source = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

function harness(setZoomLimits = () => Promise.resolve(), options = {}) {
  const platform = options.platform || 'linux';
  const timers = new Map();
  let timerId = 0;
  const menuCalls = [];
  const windows = [];
  const policy = {};
  let quitCount = 0;
  const app = new EventEmitter();
  app.isPackaged = false;
  app.commandLine = { appendSwitch() {} };
  app.setName = () => {};
  app.requestSingleInstanceLock = () => true;
  app.quit = () => { quitCount++; };
  app.whenReady = () => Promise.resolve();

  const wc = new EventEmitter();
  const order = [];
  wc.setVisualZoomLevelLimits = (...args) => { order.push(['limits', ...args]); return setZoomLimits(...args); };
  wc.setZoomFactor = value => { order.push(['zoom', value]); };
  wc.setWindowOpenHandler = handler => { policy.openWindow = handler; };
  wc.executeJavaScript = script => { order.push(['flush', script]); return options.executeJavaScript ? options.executeJavaScript(script) : Promise.resolve(); };
  wc.closeDevTools = () => {};

  class BrowserWindow extends EventEmitter {
    constructor(windowOptions) { super(); this.webContents = wc; this.options = windowOptions; this.destroyed = false; this.closeCount = 0; windows.push(this); }
    isDestroyed() { return this.destroyed; }
    close() {
      const e = event();
      this.emit('close', e);
      if (!e.prevented) { this.closeCount++; this.destroyed = true; this.emit('closed'); }
    }
    removeMenu() { order.push(['removeMenu']); }
    setMenuBarVisibility(value) { order.push(['menuVisibility', value]); }
    loadFile() {
      order.push(['loadFile']);
      assert.ok(wc.listenerCount('did-finish-load') > 0, 'load listener must be registered before loading');
    }
  }
  const consoleCalls = [];
  const electron = {
    app, BrowserWindow,
    Menu: { buildFromTemplate(template) { return template; }, setApplicationMenu(menu) { menuCalls.push(menu); } },
    session: { defaultSession: { webRequest: { onBeforeRequest(handler) { policy.network = handler; } }, setPermissionRequestHandler(handler) { policy.permission = handler; } } },
    globalShortcut: {}
  };
  const sandbox = {
    require(name) {
      if (name === 'electron') return electron;
      return require(name);
    },
    console: { error: (...args) => consoleCalls.push(args) },
    __dirname,
    process: { platform },
    URL,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, sandbox, { filename: path.join(__dirname, 'main.js') });
  return new Promise(resolve => setImmediate(() => resolve({ wc, order, consoleCalls, app, windows, menuCalls, policy, timers, quitCount: () => quitCount })));
}

test('visual zoom limits apply only after each completed load; zoom factor stays 1', async () => {
  const { wc, order } = await harness();
  assert.deepEqual(order.filter(row => ['zoom', 'loadFile'].includes(row[0])), [['zoom', 1], ['loadFile']]);
  wc.emit('did-finish-load');
  await Promise.resolve();
  assert.deepEqual(order.filter(row => ['zoom', 'loadFile', 'limits'].includes(row[0])), [['zoom', 1], ['loadFile'], ['limits', 1, 1]]);
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

function event() { return { prevented: false, preventDefault() { this.prevented = true; } }; }
const tick = () => new Promise(resolve => setImmediate(resolve));
function key(wc, key, modifiers = {}) {
  const e = event();
  wc.emit('before-input-event', e, { type: 'keyDown', key, ...modifiers });
  return e.prevented;
}
function roles(menu) { return menu.flatMap(item => [item.role, ...(item.submenu ? roles(item.submenu) : [])]).filter(Boolean); }

test('Mac starts fullscreen without kiosk and keeps native window controls and menus', async () => {
  const h = await harness(undefined, { platform: 'darwin' });
  const o = h.windows[0].options;
  assert.equal(o.fullscreen, true);
  assert.equal(o.kiosk, false);
  assert.equal(o.fullscreenable, true);
  assert.equal(o.minimizable, true);
  assert.equal(o.width, 1366);
  assert.equal(o.height, 768);
  assert.equal(o.minWidth, 1128);
  assert.equal(o.minHeight, 752);
  assert.equal(o.useContentSize, true);
  assert.ok(h.menuCalls[0]);
  for (const role of ['hide', 'hideOthers', 'unhide', 'togglefullscreen', 'quit', 'close', 'minimize']) {
    assert.ok(roles(h.menuCalls[0]).includes(role), `native ${role} role must exist`);
  }
  assert.equal(h.order.some(row => row[0] === 'removeMenu'), false);
  assert.equal(h.order.some(row => row[0] === 'menuVisibility'), false);
  assert.equal(h.menuCalls[0][1].label, 'View');
  assert.equal(h.menuCalls[0][2].label, 'Window');
  assert.deepEqual(Array.from(roles(h.menuCalls[0][2].submenu)), ['minimize', 'close', 'front']);
});

test('Mac allows native escape shortcuts while preserving reload, zoom and devtools blocks', async () => {
  const { wc } = await harness(undefined, { platform: 'darwin' });
  for (const k of ['q', 'w', 'm', 'h']) assert.equal(key(wc, k, { meta: true }), false, k);
  assert.equal(key(wc, 'f', { meta: true, control: true }), false);
  for (const k of ['r', '+', '-', '0', 'p', 'u', 'l', 'n', 't', 'f']) assert.equal(key(wc, k, { meta: true }), true, k);
  assert.equal(key(wc, 'i', { meta: true, shift: true }), true);
  for (const k of ['F5', 'F11', 'F12']) assert.equal(key(wc, k), true, k);
  assert.equal(key(wc, 'ArrowLeft', { alt: true }), true);
});

test('Linux preserves kiosk, menu removal, blocked close shortcut and quit-on-close', async () => {
  const h = await harness();
  assert.equal(h.windows[0].options.kiosk, true);
  assert.equal(h.windows[0].options.fullscreen, true);
  assert.equal(h.windows[0].options.width, undefined);
  assert.deepEqual(h.menuCalls, [null]);
  assert.ok(h.order.some(row => row[0] === 'removeMenu'));
  assert.equal(key(h.wc, 'w', { control: true }), true);
  assert.equal(key(h.wc, 'f', { control: true, meta: true }), true);
  h.windows[0].close();
  assert.equal(h.windows[0].closeCount, 1);
  assert.equal(h.quitCount(), 1);
  assert.equal(h.order.some(row => row[0] === 'flush'), false);
});

test('Mac waits for one shared flush before closing and clears its 500ms cap', async () => {
  let resolveFlush;
  const h = await harness(undefined, { platform: 'darwin', executeJavaScript: () => new Promise(resolve => { resolveFlush = resolve; }) });
  const window = h.windows[0];
  window.emit('blur');
  window.close(); window.close(); window.emit('hide');
  await tick();
  assert.equal(window.closeCount, 0);
  assert.equal(h.order.filter(row => row[0] === 'flush').length, 1);
  assert.equal(h.timers.size, 1);
  assert.equal([...h.timers.values()][0].delay, 500);
  resolveFlush();
  await tick();
  assert.equal(window.closeCount, 1);
  assert.equal(h.quitCount(), 1);
  assert.equal(h.timers.size, 0);
});

test('Mac flush cap closes a stalled renderer, never waits indefinitely', async () => {
  const h = await harness(undefined, { platform: 'darwin', executeJavaScript: () => new Promise(() => {}) });
  h.windows[0].close();
  await tick();
  assert.equal(h.windows[0].closeCount, 0);
  assert.equal(h.timers.size, 1);
  [...h.timers.values()][0].callback();
  await tick();
  assert.equal(h.windows[0].closeCount, 1);
  assert.equal(h.timers.size, 0);
});

test('Mac flush rejection or synchronous execution error cannot strand a closing window', async () => {
  for (const executeJavaScript of [() => Promise.reject(new Error('renderer gone')), () => { throw new Error('destroyed renderer'); }]) {
    const h = await harness(undefined, { platform: 'darwin', executeJavaScript });
    h.windows[0].close();
    await tick();
    assert.equal(h.windows[0].closeCount, 1);
    assert.equal(h.timers.size, 0);
  }
});

test('Mac flushes on each departure event and does not close a destroyed window', async () => {
  const h = await harness(undefined, { platform: 'darwin' });
  for (const name of ['minimize', 'hide', 'blur', 'leave-full-screen']) {
    h.windows[0].emit(name);
    await tick();
  }
  assert.equal(h.order.filter(row => row[0] === 'flush').length, 4);
  h.windows[0].close();
  h.windows[0].destroyed = true;
  await tick();
  assert.equal(h.windows[0].closeCount, 0);
});

test('Mac and Linux retain sandbox, network and permission restrictions', async () => {
  for (const platform of ['darwin', 'linux']) {
    const h = await harness(undefined, { platform });
    const prefs = h.windows[0].options.webPreferences;
    assert.equal(prefs.sandbox, true);
    assert.equal(prefs.contextIsolation, true);
    assert.equal(prefs.nodeIntegration, false);
    assert.equal(prefs.devTools, false);
    assert.equal(prefs.webSecurity, true);
    assert.equal(h.policy.openWindow().action, 'deny');
    let result;
    h.policy.network({ url: 'https://example.com' }, value => { result = value.cancel; });
    assert.equal(result, true);
    h.policy.permission(null, 'camera', value => { result = value; });
    assert.equal(result, false);
  }
});

test('Mac invokes the renderer persistence hook, including on close after a completed departure flush', async () => {
  let writes = 0;
  const h = await harness(undefined, { platform: 'darwin', executeJavaScript(script) {
    const Core = { flushNow() { writes++; } };
    return Promise.resolve(vm.runInNewContext(script, { window: { Core }, Core }));
  } });
  h.windows[0].emit('minimize');
  await tick();
  assert.equal(writes, 1);
  assert.equal(h.timers.size, 0);
  h.windows[0].close();
  await tick();
  assert.equal(writes, 2);
  assert.equal(h.windows[0].closeCount, 1);
});
