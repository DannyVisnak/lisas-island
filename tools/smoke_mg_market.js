/* Lisa's Island - smoke for the "market" mini-game: 5 rounds of real drags (fruit by fruit into the basket), an extra fruit that must bounce back, a stray drop beside the basket,
   misses = 0, result screen, shots at 1128x752.
   Standalone: node tools/smoke_mg_market.js */
const fs = require('fs');
const path = require('path');
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('market');
  const originalRuHelp = await page.evaluate(() => Core.save.settings.ruHelp);
  await page.evaluate(() => {
    window.__marketAudio = [];
    window.__marketOriginalSay = Core.Snd.say;
    Core.Snd.say = function (list, opts) { window.__marketAudio.push([].concat(list)); return window.__marketOriginalSay.call(this, list, opts); };
  });
  try {
  for (const [width, height] of [[1128, 752], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    /* layout size: transforms (pop-in, glow) must not shrink the measured target */
    const fruitSize = await page.evaluate(() => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize), e = document.querySelector('.mg-market .mgm-fruit'); return [e.offsetWidth / rem, e.offsetHeight / rem]; });
    lib.expect(fruitSize[0] >= 9 && fruitSize[1] >= 9, 'market: fruit target remains at least 9rem at ' + width + 'x' + height);
  }
  await page.setViewportSize({ width: 1128, height: 752 });
  const misses0 = await page.evaluate(() => FX.misses);
  const ready = (r) => page.waitForFunction((n) => { const s = __mgTest.state(); return s.round === n && s.target && s.count === 0 && !s.solved; }, r, { timeout: 20000 }).catch(() => lib.fail('market: round ' + r + ' not ready'));
  const fruitC = () => lib.center('.mg-market .mgm-fruit:not(.mgm-gone)');
  const basketC = async () => { const c = await lib.center('.mg-market .mgm-basket'); return { x: c.x, y: c.y - 20 }; };
  const goals = [];
  for (let r = 0; r < 5; r++) {
    await ready(r);
    let s = await lib.gameState(); goals.push(s.goal);
    lib.expect(s.target === 'n' + s.goal, 'market: target is the number clip');
    if (r === 0) {
      await page.waitForFunction((goal) => window.__marketAudio.some((list) => {
        const h = list.findIndex((url) => /ru_mg_market_help\.ogg$/.test(url));
        const n = list.indexOf(Core.url.w(Core.curLang(), 'n' + goal));
        return h >= 0 && n > h;
      }), s.goal, { timeout: 6000 }).catch(() => lib.fail('market: timed peek requests instruction then current number'));
      await page.waitForFunction(() => document.querySelector('.mgm-pile .mgm-fruit.mgglow'), null, { timeout: 10000 }).catch(() => lib.fail('market: timed assist highlights an available fruit'));
      await lib.shot('market_hint');
    }
    if (r < 2) {
      if (r === 1) await page.evaluate(() => { Core.save.settings.ruHelp = false; });
      await page.evaluate(() => { window.__marketAudio = []; });
      await lib.tapSel('.mg-market .top-help'); await lib.tapSel('.mg-market .top-help'); await sleep(100);
      const reminderAudio = await page.evaluate(() => window.__marketAudio.slice(-5).map((list) => list.filter((x) => typeof x === 'string')));
      const expectedNumber = await page.evaluate((goal) => Core.url.w(Core.curLang(), 'n' + goal), s.goal);
      lib.expect(reminderAudio.some((list) => list.includes(expectedNumber)), 'market: assist requests current target recording ' + expectedNumber);
      const hasRussianHelp = reminderAudio.some((list) => list.some((url) => /ru_mg_market_help\.ogg$/.test(url)));
      lib.expect(hasRussianHelp === (r === 0), 'market: Russian help follows setting (round ' + r + ')');
      const ordered = reminderAudio.some((list) => {
        const helpAt = list.findIndex((url) => /ru_mg_market_help\.ogg$/.test(url));
        const numberAt = list.indexOf(expectedNumber);
        return r === 0 ? helpAt >= 0 && numberAt > helpAt : helpAt < 0 && numberAt >= 0;
      });
      lib.expect(ordered, 'market: reminder requests the current number after help (or number alone when Russian help is disabled)');
      if (r === 0) {
        const lang = await page.evaluate(() => Core.curLang());
        lib.expect(fs.existsSync(path.join(__dirname, '..', 'app', 'audio', lang, 'n' + s.goal + '.ogg')), 'market: requested number file exists for ' + lang);
      }
    }
    const sz = await page.evaluate(() => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize), e = document.querySelector('.mg-market .mgm-fruit'); return [e.offsetWidth / rem, e.offsetHeight / rem]; });
    lib.expect(sz[0] >= 9 && sz[1] >= 9, 'market: fruit touch target >= 9rem');
    if (r === 0) await lib.shot('market_ask');
    if (r === 2) {
      /* a stray drop beside the basket: back to the stall, nothing counted */
      const f = await fruitC(); await lib.waitPromptFree(); await lib.dragMouse(f, { x: f.x + 20, y: f.y + 120 }, 6); await sleep(400);
      lib.expect((await lib.gameState()).count === 0, 'market: a drop beside the basket must not count');
    }
    for (let k = 1; k <= s.goal; k++) {
      const f = await fruitC(), b = await basketC();
      await page.evaluate(() => { window.__marketAudio = []; });
      await lib.waitPromptFree();
      await lib.dragMouse(f, b, 10);
      await page.waitForFunction((n) => __mgTest.state().count === n, k, { timeout: 5000 }).catch(() => lib.fail('market: drop #' + k + ' in round ' + r + ' did not count'));
      const bareCount = await page.evaluate((count) => window.__marketAudio.some((list) => {
        const urls = list.filter((part) => typeof part === 'string');
        return urls.length === 1 && urls[0] === Core.url.w(Core.curLang(), 'n' + count);
      }), k);
      lib.expect(bareCount, 'market: fruit drop requests only bare counting number n' + k);
      if (r === 2 && k === 1) {
        await page.evaluate(() => { Core.save.settings.ruHelp = true; });
        await page.evaluate(() => { window.__marketAudio = []; });
        await lib.tapSel('.mg-market .top-help'); await lib.tapSel('.mg-market .top-help');
        await page.waitForFunction((goal) => window.__marketAudio.some((list) => list.some((url) => /ru_mg_market_more\.ogg$/.test(url))), s.goal, { timeout: 5000 }).catch(() => lib.fail('market: partial basket assist plays the more cue'));
        await lib.tapSel('.mg-market .b-speaker');
        await page.waitForFunction((goal) => window.__marketAudio.some((list) => list.includes(Core.url.q(Core.curLang(), 'n' + goal))), s.goal, { timeout: 5000 }).catch(() => lib.fail('market: speaker interruption replays the current question'));
        await page.waitForFunction(() => !Core.Snd.busy(), null, { timeout: 10000 }).catch(() => lib.fail('market: interrupted playback settles'));
        const canceled = await page.evaluate((goal) => window.__marketAudio.some((list) => {
          const h = list.findIndex((url) => /ru_mg_market_help\.ogg$/.test(url));
          return h >= 0 && list.indexOf(Core.url.w(Core.curLang(), 'n' + goal)) > h;
        }), s.goal);
        lib.expect(!canceled, 'market: interrupted more cue cannot start stale instruction/number audio');
        await page.evaluate(() => { window.__marketAudio = []; });
        await lib.tapSel('.mg-market .top-help'); await lib.tapSel('.mg-market .top-help');
        await lib.tapSel('.mg-market .top-help'); await lib.tapSel('.mg-market .top-help');
        await page.waitForFunction((goal) => window.__marketAudio.some((list) => {
          const h = list.findIndex((url) => /ru_mg_market_help\.ogg$/.test(url));
          const n = list.findIndex((url) => new RegExp('/n' + goal + '\\.ogg$').test(url));
          return h >= 0 && n > h;
        }), s.goal, { timeout: 7000 }).catch(() => lib.fail('market: partial basket reminder continues with instruction then current goal'));
      }
      if (r === 2 && k === 2) await lib.shot('market_count2');
      if (r === 3 && k === 1) await sleep(120);
    }
    if (r === 1) {
      /* an extra fruit right after the target: synchronous synthetic drag, must hop back (extras++), count unchanged */
      await lib.waitPromptFree();
      const res = await page.evaluate(() => {
        const n = document.querySelector('.mg-market .mgm-fruit:not(.mgm-gone)'), nr = n.getBoundingClientRect(), br = document.querySelector('.mg-market .mgm-basket').getBoundingClientRect();
        const ev = (t, x, y) => new PointerEvent(t, { pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true });
        const x0 = nr.left + nr.width / 2, y0 = nr.top + nr.height / 2, x1 = br.left + br.width / 2, y1 = br.top + br.height / 2;
        n.dispatchEvent(ev('pointerdown', x0, y0)); window.dispatchEvent(ev('pointermove', (x0 + x1) / 2, (y0 + y1) / 2)); window.dispatchEvent(ev('pointermove', x1, y1)); window.dispatchEvent(ev('pointerup', x1, y1));
        return __mgTest.state();
      });
      lib.expect(res.extras >= 1 && res.count === s.goal, 'market: an extra fruit must bounce back (extras ' + res.extras + ', count ' + res.count + ')');
    }
    if (r === 3) { await sleep(150); await lib.shot('market_reward'); }
    await page.waitForFunction((n) => __mgTest.state().round > n || __test.screen() === 'result', r, { timeout: 15000 }).catch(() => lib.fail('market: round ' + r + ' did not finish'));
  }
  lib.expect(goals.join() === '1,2,3,4,5', 'market: numbers rise 1..5, got ' + goals.join());
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 20000 }).catch(() => lib.fail('market: no result screen'));
  lib.expect(await page.evaluate(() => FX.misses) === misses0, 'market: FX.miss must never be called');
  const st = await page.evaluate(() => Core.L(Core.curLang()).minigames.market);
  lib.expect(st && st.stars >= 1 && st.plays >= 1, 'market: stars stored');
  await sleep(600); await lib.shot('market_result');
  } finally {
    await page.evaluate((ruHelp) => { Core.save.settings.ruHelp = ruHelp; if (window.__marketOriginalSay) Core.Snd.say = window.__marketOriginalSay; delete window.__marketAudio; delete window.__marketOriginalSay; }, originalRuHelp);
  }
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG MARKET SMOKE')); })();
