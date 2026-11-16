/* Lisa's Island - smoke for the "market" mini-game: 5 rounds of real drags (fruit by fruit into the basket), an extra fruit that must bounce back, a stray drop beside the basket,
   misses = 0, result screen, shots at 1128x752.
   Standalone: node tools/smoke_mg_market.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('market');
  const misses0 = await page.evaluate(() => FX.misses);
  const ready = (r) => page.waitForFunction((n) => { const s = __mgTest.state(); return s.round === n && s.target && s.count === 0 && !s.solved; }, r, { timeout: 20000 }).catch(() => lib.fail('market: round ' + r + ' not ready'));
  const fruitC = () => lib.center('.mg-market .mgm-fruit:not(.mgm-gone)');
  const basketC = async () => { const c = await lib.center('.mg-market .mgm-basket'); return { x: c.x, y: c.y - 20 }; };
  const goals = [];
  for (let r = 0; r < 5; r++) {
    await ready(r); await sleep(500);
    let s = await lib.gameState(); goals.push(s.goal);
    lib.expect(s.target === 'n' + s.goal, 'market: target is the number clip');
    const sz = await page.evaluate(() => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize), b = document.querySelector('.mg-market .mgm-fruit').getBoundingClientRect(); return [b.width / rem, b.height / rem]; });
    lib.expect(sz[0] >= 9 && sz[1] >= 9, 'market: fruit touch target >= 9rem');
    if (r === 0) await lib.shot('market_ask');
    if (r === 2) {
      /* a stray drop beside the basket: back to the stall, nothing counted */
      const f = await fruitC(); await lib.dragMouse(f, { x: f.x + 20, y: f.y + 120 }, 6); await sleep(400);
      lib.expect((await lib.gameState()).count === 0, 'market: a drop beside the basket must not count');
    }
    for (let k = 1; k <= s.goal; k++) {
      const f = await fruitC(), b = await basketC();
      await lib.dragMouse(f, b, 10);
      await page.waitForFunction((n) => __mgTest.state().count === n, k, { timeout: 5000 }).catch(() => lib.fail('market: drop #' + k + ' in round ' + r + ' did not count'));
      if (r === 2 && k === 2) await lib.shot('market_count2');
      if (r === 3 && k === 1) await sleep(120);
    }
    if (r === 1) {
      /* an extra fruit right after the target: synchronous synthetic drag, must hop back (extras++), count unchanged */
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
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG MARKET SMOKE')); })();
