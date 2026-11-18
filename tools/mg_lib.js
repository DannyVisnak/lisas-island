/* Lisa's Island - shared helpers for the mini-game smokes (Node Playwright, Firefox, touch, file://).
   Run anything from: node tools/<smoke>.js
   const lib = await require('./mg_lib').boot({viewport:{width:1366,height:768}});  ... await lib.finish('name');
   lib: page, errors[], problems[], fail(msg), expect(cond,msg), sleep(ms), shot(name) -> tools/shots/mg_<name>.png, openGame(id) (level 1 done, tap the path node),
        gameState() -> window.__mgTest.state(), tapSel(sel), tapAt(x,y), dragMouse(from,to,steps), center(sel) -> {x,y}, finish(label) -> exit code. */
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const URL = 'file://' + path.join(ROOT, 'app', 'index.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(o) {
  o = o || {};
  const pw = require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }));
  const ffDirs = process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH) ? fs.readdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH).filter((d) => /^firefox-/.test(d)) : [];
  const ffExe = ffDirs.length ? process.env.PLAYWRIGHT_BROWSERS_PATH + '/' + ffDirs[ffDirs.length - 1] + '/firefox/firefox' : null;
  let browser;
  try { browser = await pw.firefox.launch(); } catch (e) { browser = await pw.firefox.launch({ executablePath: ffExe }); }
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1366, height: 768 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  const errors = [], problems = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.goto(o.url || URL, { waitUntil: o.waitUntil || 'load' });
  await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  await page.evaluate((n) => __test.speedUp(n), o.speed || 8);
  const lib = { page, browser, errors, problems, sleep };
  lib.fail = (m) => { problems.push(m); console.log('  FAIL: ' + m); };
  lib.expect = (c, m) => { if (!c) lib.fail(m); return !!c; };
  lib.shot = (name) => page.screenshot({ path: path.join(SHOTS, 'mg_' + name + '.png') });
  lib.screen = () => page.evaluate(() => __test.screen());
  lib.gameState = () => page.evaluate(() => (window.__mgTest ? __mgTest.state() : null));
  lib.waitPromptFree = (timeout = 22000) => page.waitForFunction(() => !document.querySelector('.prompt-playing, .prompt-choice') && !(window.__test && __test.quizBusy && __test.quizBusy()), null, { timeout });
  lib.holdAudio = () => page.evaluate(() => {
    if (window.__mgHeldAudio) throw new Error('audio is already held');
    const snd = Core.Snd;
    const state = { fast: Core.fast, Audio: window.Audio, cache: snd.cache, pending: [] };
    window.__mgHeldAudio = state;
    Core.fast = false;
    snd.cache = {};
    window.Audio = function () {
      const audio = document.createElement('audio');
      Object.defineProperty(audio, 'duration', { configurable: true, value: 30 });
      audio.addEventListener('error', (e) => { if (!e.lisaTest) e.stopImmediatePropagation(); });
      audio.play = function () { state.pending.push(audio); return Promise.resolve(); };
      return audio;
    };
  });
  lib.releaseAudio = async () => {
    await page.evaluate(() => {
      const state = window.__mgHeldAudio;
      if (!state) return;
      state.pending.forEach((audio) => audio.dispatchEvent(new Event('ended')));
      window.Audio = state.Audio;
      Core.Snd.cache = state.cache;
      Core.fast = state.fast;
      delete window.__mgHeldAudio;
    });
    await lib.waitPromptFree();
  };
  lib.center = (sel) => page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  lib.tapAt = (x, y) => page.touchscreen.tap(x, y);
  lib.tapSel = async (sel) => { const c = await lib.center(sel); await page.touchscreen.tap(c.x, c.y); return c; };
  lib.dragMouse = async (from, to, steps) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    const n = steps || 8;
    for (let i = 1; i <= n; i++) { await page.mouse.move(from.x + (to.x - from.x) * i / n, from.y + (to.y - from.y) * i / n); await sleep(15); }
    await page.mouse.up();
  };
  lib.goPath = async (world, level1Done) => {
    await page.evaluate(([w, d]) => { const l = Core.lv(Core.curLang(), w)[0]; l.done = !!d; Core.persist(); __test.go('path', { world: w }); }, [world, level1Done !== false]);
    await sleep(450);
  };
  lib.openGame = async (id) => {
    const world = await page.evaluate((i) => MG.games[i].worlds[0], id);
    await lib.goPath(world, true);
    await lib.tapSel('.mgnode[data-mg="' + id + '"]');
    await page.waitForFunction((i) => __test.screen() === 'minigame' && window.__mgTest && __mgTest.id === i, id, { timeout: 8000 }).catch(() => lib.fail('game ' + id + ' did not open from its path node'));
    await sleep(250);
  };
  lib.finish = async (label) => {
    if (errors.length) errors.forEach((e) => lib.fail(e));
    await browser.close();
    console.log(problems.length ? (label || 'MG SMOKE') + ' FAILED: ' + problems.length + ' problem(s)' : (label || 'MG SMOKE') + ' OK');
    return problems.length ? 1 : 0;
  };
  return lib;
}
module.exports = { boot, sleep, ROOT, SHOTS, URL };
