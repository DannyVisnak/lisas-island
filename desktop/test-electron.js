// Smoke test: node test-electron.js (needs Playwright; run under xvfb-run).
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { _electron } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }));

const exe = path.join(__dirname, 'dist/lisa-island-linux-x64/lisa-island');
const gameDir = path.join(__dirname, 'dist/lisa-island-linux-x64/resources/app/game');
const shot = path.join(__dirname, '..', 'tools', 'shots', 'electron-1.png');
const timeout = ms => new Promise(resolve => setTimeout(() => resolve(false), ms));

function findAudio(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const item = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findAudio(item);
      if (found) return found;
    } else if (/\.(mp3|ogg|wav|m4a)$/i.test(entry.name)) return item;
  }
  return null;
}

(async () => {
  let app;
  let exited;
  const diagnostics = [];
  try {
    assert.ok(fs.existsSync(exe), `packaged Electron executable missing: ${exe}`);
    const packagedAudio = findAudio(gameDir);
    assert.ok(packagedAudio, `no packaged audio found under ${gameDir}`);

    app = await _electron.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
    app.process().stdout.on('data', chunk => diagnostics.push(chunk.toString()));
    app.process().stderr.on('data', chunk => diagnostics.push(chunk.toString()));
    exited = new Promise(resolve => app.process().once('exit', resolve));

    const win = await app.firstWindow();
    await win.waitForLoadState('load');
    const pageInfo = await win.evaluate(() => ({ url: location.href, title: document.title }));
    assert.match(pageInfo.url, /^file:/, 'packaged game must load from file://');
    assert.ok(pageInfo.url.includes('/resources/app/game/index.html'), `unexpected packaged URL: ${pageInfo.url}`);

    const assertWindowState = async () => {
      const state = await app.evaluate(({ BrowserWindow, Menu }) => {
        const w = BrowserWindow.getAllWindows()[0];
        return { fullscreen: w.isFullScreen(), kiosk: w.isKiosk(), menu: Menu.getApplicationMenu() === null,
          menuBar: w.isMenuBarVisible(), zoomFactor: w.webContents.getZoomFactor() };
      });
      assert.equal(state.fullscreen, true, 'fullscreen must remain enabled');
      assert.equal(state.kiosk, true, 'kiosk must remain enabled');
      assert.equal(state.menu, true, 'application menu must remain absent');
      assert.equal(state.menuBar, false, 'menu bar must remain hidden');
      assert.equal(state.zoomFactor, 1, 'zoom factor must remain 1');
    };

    await assertWindowState();
    const remote = await win.evaluate(() => fetch('http://example.com').then(() => 'loaded', () => 'blocked'));
    assert.equal(remote, 'blocked', 'remote fetch must be blocked');

    const audioResult = await win.evaluate(async url => {
      const audio = new Audio(url);
      try {
        await audio.play();
        await new Promise(resolve => setTimeout(resolve, 300));
        return { ok: true, currentTime: audio.currentTime, paused: audio.paused };
      } catch (error) { return { ok: false, error: String(error) }; }
    }, `file://${packagedAudio}`);
    assert.equal(audioResult.ok, true, `packaged local audio playback failed: ${audioResult.error || 'unknown error'}`);
    assert.ok(audioResult.currentTime > 0, 'packaged local audio did not advance');

    await win.reload();
    await win.waitForLoadState('load');
    await assertWindowState();

    // Allow native startup/reload diagnostics to flush before checking them.
    await win.waitForTimeout(250);
    const diagnosticText = diagnostics.join('');
    assert.doesNotMatch(diagnosticText, /setVisualZoomLevelLimits|visual zoom.*(?:warn|fail|error)|UnhandledPromiseRejection/i,
      `zoom lifecycle warning or unhandled rejection found in packaged process output:\n${diagnosticText}`);

    await win.screenshot({ path: shot });
    await win.evaluate(() => window.close());
    const didExit = await Promise.race([exited.then(() => true), timeout(8000)]);
    assert.equal(didExit, true, 'window.close() did not exit the application within 8 seconds');
    console.log('Electron smoke passed: packaged load, reload, kiosk/window state, offline fetch, packaged audio, and clean exit.');
  } finally {
    if (app) {
      const connected = app.process() && app.process().exitCode === null;
      if (connected) await app.close().catch(() => {});
    }
  }
})().catch(error => { console.error('FAIL', error); process.exitCode = 1; });
