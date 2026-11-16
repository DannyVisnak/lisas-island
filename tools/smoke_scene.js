/* Lisa's Island - seek-and-find scene smoke test (Node Playwright, Firefox, touch, file://).
   Run: node tools/smoke_scene.js
   Plays the zoo, the house and the picnic end to end with real touch taps, checks the errorless rules, the idle help,
   drag + inertia, hit sizes, and saves screenshots to tools/shots/scene_*.png. */
const path = require('path');
const fs = require('fs');
const pw = require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const URL = 'file://' + path.join(ROOT, 'app', 'index.html');
const problems = [], errors = [];
let page, browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function fail(m) { problems.push(m); console.log('  FAIL: ' + m); }
function expect(c, m) { if (!c) fail(m); return !!c; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, 'scene_' + name + '.png') }); }
const st = () => page.evaluate(() => (window.__sceneTest ? __sceneTest.state() : null));
async function waitFor(fn, arg, timeout, what) { try { await page.waitForFunction(fn, arg, { timeout: timeout || 12000 }); return true; } catch (e) { fail('timeout: ' + what); return false; } }
async function tapItem(id) {
  const r = await page.evaluate((i) => __sceneTest.rect(i), id);
  await page.touchscreen.tap(r.x, r.y);
  return r;
}
async function centerOn(id) {
  const it = (await page.evaluate(() => __sceneTest.items())).find((i) => i.id === id);
  await page.evaluate((x) => __sceneTest.setCam(x - 683), it.x);
  await sleep(60);
  return it;
}

(async () => {
  const ffDirs = process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH) ? fs.readdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH).filter((d) => /^firefox-/.test(d)) : [];
  const ffExe = ffDirs.length ? process.env.PLAYWRIGHT_BROWSERS_PATH + '/' + ffDirs[ffDirs.length - 1] + '/firefox/firefox' : null;
  try { browser = await pw.firefox.launch(); } catch (e) { browser = await pw.firefox.launch({ executablePath: ffExe }); }
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true, deviceScaleFactor: 1 });
  page = await ctx.newPage(); page.setDefaultTimeout(15000);
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  fs.mkdirSync(SHOTS, { recursive: true });
  try {
    await page.goto(URL);
    await page.waitForFunction(() => window.__test && __test.screen() === 'home');
    await page.evaluate(() => __test.speedUp(8));
    const lang = await page.evaluate(() => Core.curLang());
    console.log('language: ' + lang);

    /* locked entry: first level of the world not done */
    await page.evaluate(() => __test.go('path', { world: 'animals' }));
    await sleep(500);
    expect(await page.evaluate(() => !!document.querySelector('.scenenode.locked')), 'scene node should be locked before level 1 of the world is done');
    await page.touchscreen.tap(...(await page.evaluate(() => { const b = document.querySelector('.scenenode').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
    await sleep(400);
    expect(await page.evaluate(() => __test.screen()) === 'path', 'tapping the locked scene node must stay on the path');
    /* the level nodes must be untouched by the new node */
    expect(await page.evaluate(() => document.querySelectorAll('.lvnode').length) === 5, 'path must still have exactly 5 level nodes');

    for (const S of [{ id: 'zoo', world: 'animals' }, { id: 'house', world: 'toys' }, { id: 'picnic', world: 'food' }]) {
      console.log('--- scene ' + S.id + ' (from world ' + S.world + ')');
      const giftsBefore = await page.evaluate(() => Core.save.house.gifts);
      await page.evaluate((w) => { Core.lv(Core.curLang(), w)[0].done = true; Core.persist(); __test.go('path', { world: w }); }, S.world);
      await sleep(500);
      if (S.id === 'zoo') await shot('path_node');
      expect(await page.evaluate(() => !!document.querySelector('.scenenode.open')), S.id + ': node should be open');
      await page.touchscreen.tap(...(await page.evaluate(() => { const b = document.querySelector('.scenenode').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })));
      await waitFor(() => __test.screen() === 'scene' && window.__sceneTest, null, 8000, S.id + ' scene opens from the path node');
      await sleep(300);
      const s0 = await st();
      expect(s0 && s0.scene === S.id, S.id + ': wrong scene ' + (s0 && s0.scene));
      expect(s0.total >= 5 && s0.total <= 6, S.id + ': round size ' + s0.total);

      /* hit sizes + bounds */
      const items = await page.evaluate(() => __sceneTest.items());
      const fs_ = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      items.forEach((i) => { if (i.hit < 120) fail(S.id + ': ' + i.id + ' hit ' + i.hit + ' < 120 units'); if (i.hit / 10 * fs_ < 9 * fs_) fail(S.id + ': hit under 9rem'); });
      /* every item must be distinct enough: hit boxes may overlap but centres need >= 100 units apart */
      for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
        const d = Math.hypot(items[a].x - items[b].x, items[a].y - items[b].y);
        if (d < 100) fail(S.id + ': ' + items[a].id + ' and ' + items[b].id + ' centres only ' + Math.round(d) + ' apart');
      }
      /* screenshots across the whole picture */
      await page.evaluate(() => __sceneTest.freeze(true)); await page.evaluate(() => __sceneTest.setCam(0)); await sleep(200);
      for (const [n, c] of [['cam0', 0], ['cam1', Math.round(s0.max / 2)], ['cam2', s0.max]]) { await page.evaluate((x) => __sceneTest.setCam(x), c); await sleep(250); await shot(S.id + '_' + n); }
      await page.evaluate(() => { __sceneTest.setCam(0); __sceneTest.freeze(false); }); await sleep(150);

      /* drag + inertia with the mouse (finger and mouse share pointer events) */
      await page.mouse.move(1000, 560); await page.mouse.down();
      for (let k = 1; k <= 8; k++) { await page.mouse.move(1000 - k * 60, 560); await sleep(16); }
      await page.mouse.up();
      const atRelease = (await st()).cam; await sleep(450);
      const after = (await st()).cam;
      expect(atRelease > 250, S.id + ': drag moved the camera only ' + atRelease);
      expect(after > atRelease + 20, S.id + ': no inertia after release (' + atRelease + ' -> ' + after + ')');
      expect((await st()).found.length === 0, S.id + ': a drag must never count as a tap');
      await page.evaluate(() => __sceneTest.setCam(0));

      /* the round */
      const missesBefore = await page.evaluate(() => __test.fx().misses);
      let otherDone = false, idleDone = false;
      for (let q = 0; q < s0.total; q++) {
        await waitFor((n) => __sceneTest.state().idx === n && !__sceneTest.state().locked, q, 12000, S.id + ' question ' + q + ' ready');
        const s = await st();
        const tid = s.target;
        /* put the target on screen the way a child would: first look at the wrong end */
        const it = await centerOn(tid);
        /* exploring: tap a different item (errorless) on the first question */
        if (!otherDone) {
          otherDone = true;
          const other = items.find((i) => i.id !== tid && !s.found.includes(i.id));
          await centerOn(other.id);
          const rr = await tapItem(other.id);
          await sleep(150);
          const sh = await page.evaluate((i) => document.querySelector('.sitem[data-id="' + i + '"]').className, other.id);
          expect(/wig/.test(sh), S.id + ': tapped other item did not wiggle (' + sh + ')');
          const o = await tapItem(other.id); void o; void rr;           /* second tap: scene_tap_other once */
          await sleep(200);
          const s2 = await st();
          expect(s2.others === 2 && s2.idx === q && s2.found.length === 0, S.id + ': other taps must not advance or count as found');
          expect((await page.evaluate(() => __test.fx().misses)) === missesBefore, S.id + ': other tap triggered FX.miss');
          await shot(S.id + '_other');
          await centerOn(tid);
        }
        /* idle help on the second question: peek wiggle at 8 s, glow + pan at 15 s */
        if (q === 1 && !idleDone) {
          idleDone = true;
          await page.evaluate(() => __sceneTest.setCam(0));
          await page.evaluate(() => __sceneTest.idle(7600));
          await waitFor((id) => document.querySelector('.sitem[data-id="' + id + '"]').classList.contains('peekwig'), tid, 6000, S.id + ' 8 s peek wiggle');
          await shot(S.id + '_peek');
          await page.evaluate(() => __sceneTest.idle(14600));
          await waitFor(() => __sceneTest.state().glow, null, 6000, S.id + ' 15 s glow');
          await sleep(300);
          const sg = await st();
          const r2 = await page.evaluate((i) => __sceneTest.rect(i), tid);
          expect(r2.x > r2.fx && r2.x < r2.fx + r2.fw && r2.y > r2.fy && r2.y < r2.fy + r2.fh, S.id + ': auto-pan did not bring the target on screen');
          expect(sg.helped, S.id + ': help should mark the answer as helped');
          await shot(S.id + '_glow');
        } else await centerOn(tid);
        const r = await page.evaluate((i) => __sceneTest.rect(i), tid);
        expect(r.w >= 9 * fs_, S.id + ': ' + tid + ' on-screen hit ' + Math.round(r.w) + ' px below 9 rem');
        if (q === 2) { await sleep(400); await shot(S.id + '_before_tap'); }
        await tapItem(tid);
        if (q === 0) { await sleep(300); await shot(S.id + '_found'); }
        await waitFor((n) => __sceneTest.state().found.length >= n, q + 1, 8000, S.id + ' target ' + tid + ' found');
      }
      await shot(S.id + '_all_found');
      await waitFor(() => __test.screen() === 'result', null, 15000, S.id + ' result screen after scene_done');
      const rp = await page.evaluate(() => __test.params());
      expect(rp.kind === 'scene' && rp.stars >= 1, S.id + ': result params ' + JSON.stringify(rp));
      const misses = await page.evaluate(() => __test.fx().misses);
      expect(misses === missesBefore, S.id + ': FX.miss fired ' + (misses - missesBefore) + ' times');
      expect(await page.evaluate((id) => Core.L(Core.curLang()).scenes[id].stars, S.id) >= 1, S.id + ': scene stars not saved');
      { const g = await page.evaluate(() => Core.save.house.gifts); expect(g > giftsBefore || g === 3, S.id + ': the first scene finish should grant a house gift (' + giftsBefore + ' -> ' + g + ')'); }
      await sleep(400); await shot(S.id + '_result');
      await waitFor(() => __test.screen() === 'path', null, 25000, S.id + ' back to the path after the result');
      /* the level nodes are unchanged by scene play */
      expect(await page.evaluate((w) => Core.lv(Core.curLang(), w)[1].done, S.world) === false, S.id + ': scene play must not complete path levels');
    }
  } catch (e) { if (e.message !== 'stop') fail('exception: ' + e.message); }
  errors.forEach((e) => fail(e));
  await browser.close();
  console.log(problems.length ? '\nSCENE SMOKE FAILED (' + problems.length + ')' : '\nSCENE SMOKE OK');
  process.exit(problems.length ? 1 : 0);
})();
