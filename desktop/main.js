'use strict';
const { app, BrowserWindow, Menu, session, globalShortcut } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const IS_MAC = process.platform === 'darwin';

app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('overscroll-history-navigation', '0');
app.commandLine.appendSwitch('disable-features', 'OverscrollHistoryNavigation,TouchpadOverscrollHistoryNavigation');
app.setName("Lisa's Island");

// Packaged: resources/app/game/index.html ; dev: ../app/index.html
const GAME_DIR = app.isPackaged ? path.join(__dirname, 'game') : path.join(__dirname, '..', 'app');
const INDEX = path.join(GAME_DIR, 'index.html');
const INDEX_URL = pathToFileURL(INDEX).href;
const GAME_PREFIX = pathToFileURL(GAME_DIR + path.sep).href;

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  if (IS_MAC) Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: app.name, submenu: [{ role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'togglefullscreen' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }, { type: 'separator' }, { role: 'front' }] }
  ])); else Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    title: "Lisa's Island",
    icon: path.join(GAME_DIR, 'icon', 'lisa.png'),
    fullscreen: true,
    kiosk: !IS_MAC,
    ...(IS_MAC ? { fullscreenable: true, minimizable: true, width: 1366, height: 768, minWidth: 1128, minHeight: 752, useContentSize: true } : {}),
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });
  if (!IS_MAC) {
    win.removeMenu();
    win.setMenuBarVisibility(false);
  }
  win.once('ready-to-show', () => win.show());
  const wc = win.webContents;
  wc.on('did-finish-load', () => {
    Promise.resolve(wc.setVisualZoomLevelLimits(1, 1)).catch((error) => {
      console.error('Failed to set visual zoom level limits:', error);
    });
  });
  wc.setZoomFactor(1);

  const blockNav = (e, url) => { if (!url.startsWith(GAME_PREFIX)) e.preventDefault(); };
  wc.on('will-navigate', blockNav);
  wc.on('will-redirect', blockNav);
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('devtools-opened', () => wc.closeDevTools());
  wc.on('context-menu', (e) => e.preventDefault());

  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = (input.key || '').toLowerCase();
    if (IS_MAC && input.meta && !input.alt && !input.shift && ['q', 'w', 'm', 'h'].includes(k)) return;
    if (IS_MAC && input.meta && input.control && k === 'f') return;
    const ctrl = input.control || input.meta;
    if (input.alt && k === 'f4') { e.preventDefault(); app.quit(); return; }
    if (k === 'f5' || k === 'f11' || k === 'f12') { e.preventDefault(); return; }
    if (ctrl && ['+', '-', '=', '_', '0', 'r', 'w', 'f', 'p', 's', 'u', 'l', 'n', 't'].includes(k)) e.preventDefault();
    if (ctrl && input.shift && ['i', 'j', 'c', 'r'].includes(k)) e.preventDefault();
    if (input.alt && (k === 'arrowleft' || k === 'arrowright')) e.preventDefault();
  });

  if (IS_MAC) {
    const window = win;
    let pendingFlush = null;
    let closing = false;
    let allowClose = false;
    const flush = () => {
      if (pendingFlush) return pendingFlush;
      if (window.isDestroyed()) return Promise.resolve();
      let timer;
      const cap = new Promise(resolve => { timer = setTimeout(resolve, 500); });
      const renderer = Promise.resolve().then(() => wc.executeJavaScript(
        'try{window.Core&&Core.flushNow&&Core.flushNow()}catch(e){}', true
      )).catch(() => {});
      pendingFlush = Promise.race([renderer, cap]).finally(() => {
        clearTimeout(timer);
        pendingFlush = null;
      });
      return pendingFlush;
    };
    window.on('close', e => {
      if (allowClose) return;
      e.preventDefault();
      if (closing) return;
      closing = true;
      flush().then(() => {
        allowClose = true;
        if (!window.isDestroyed()) window.close();
      });
    });
    ['minimize', 'hide', 'blur', 'leave-full-screen'].forEach(name => window.on(name, () => { flush(); }));
  }

  // The game quits via window.close(); closing the only window quits the app.
  win.on('closed', () => { win = null; app.quit(); });
  win.loadFile(INDEX);
}

app.whenReady().then(() => {
  // No network: allow only file:// requests inside the game folder (plus data/blob).
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    const u = details.url;
    const ok = u.startsWith('file://') || u.startsWith('data:') || u.startsWith('blob:');
    cb({ cancel: !ok });
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
