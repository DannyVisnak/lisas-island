// Smoke test: node test-electron.js  (needs Node Playwright resolvable from the current directory; run under xvfb-run)
const { _electron } = require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }));
const path = require('path');
(async () => {
  const exe = path.join(__dirname, 'dist/lisa-island-linux-x64/lisa-island');
  const app = await _electron.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] });
  const closed = new Promise(r => app.process().once('exit', r));
  const win = await app.firstWindow();
  await win.waitForLoadState('load');
  await win.waitForTimeout(2500);
  const info = await win.evaluate(() => ({ url: location.href, title: document.title, w: innerWidth, h: innerHeight, sw: screen.width, sh: screen.height, fs: !!document.fullscreenElement }));
  console.log('page', JSON.stringify(info));
  const bw = await app.evaluate(({ BrowserWindow, Menu }) => { const w = BrowserWindow.getAllWindows()[0]; return { fullscreen: w.isFullScreen(), kiosk: w.isKiosk(), menu: Menu.getApplicationMenu() === null, title: w.getTitle(), menuBar: w.isMenuBarVisible(), devtools: w.webContents.isDevToolsOpened() }; });
  console.log('window', JSON.stringify(bw));
  const aud = await win.evaluate(async () => {
    const a = new Audio(); const src = [...document.querySelectorAll('audio[src]')][0]?.src;
    const f = src || (await (async()=>null)());
    return { policy: 'n/a', src: f || null };
  });
  // find a real audio file
  const fs = require('fs');
  const dir = path.join(__dirname, '../app/audio');
  const find = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { const r = find(p); if (r) return r; } else if (/\.(mp3|ogg|wav|m4a)$/.test(e.name)) return p; } };
  const f = find(dir);
  const play = await win.evaluate(async (u) => { const a = new Audio(u); try { await a.play(); await new Promise(r => setTimeout(r, 300)); return { ok: true, t: a.currentTime, paused: a.paused }; } catch (e) { return { ok: false, err: String(e) }; } }, 'file://' + f);
  console.log('audio', f, JSON.stringify(play));
  const net = await win.evaluate(() => fetch('http://example.com').then(() => 'LOADED', () => 'blocked'));
  console.log('remote fetch', net);
  await win.screenshot({ path: require('path').join(__dirname, '..', 'tools', 'shots', 'electron-1.png') });
  // quit: call the same thing the game calls
  await win.evaluate(() => { try { window.close(); } catch (e) {} });
  const res = await Promise.race([closed.then(() => 'exited'), new Promise(r => setTimeout(() => r('STILL RUNNING'), 8000))]);
  console.log('quit via window.close():', res);
  if (res !== 'exited') await app.close().catch(() => {});
})().catch(e => { console.error('FAIL', e); process.exit(1); });
