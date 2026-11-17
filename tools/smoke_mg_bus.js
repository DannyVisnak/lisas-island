/* Lisa's Island - smoke for the "bus" mini-game: 5 stops, one wrong stop (errorless, bus honks), correct taps, misses = 0, result screen, shots at 1128x752.
   Standalone: node tools/smoke_mg_bus.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('bus');
  const misses0 = await page.evaluate(() => FX.misses);
  const ready = () => page.waitForFunction(() => { const s = __mgTest.state(); return s.target && s.active && !s.locked; }, null, { timeout: 25000 }).catch(() => lib.fail('bus: no stop became ready'));
  await ready(); await sleep(300);
  const order = [];
  for (let i = 0; i < 5; i++) {
    await ready();
    let s = await lib.gameState();
    order.push(s.target);
    lib.expect(s.stops.length === 3 && new Set(s.stops).size === 3 && s.stops.includes(s.target), 'bus: three distinct stops incl. the target');
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.mg-bus .mgbus-stop')].map((n) => { const r = n.getBoundingClientRect(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize); return [r.width / rem, r.height / rem]; }));
    sizes.forEach((z) => lib.expect(z[0] >= 9 && z[1] >= 9, 'bus: touch target >= 9rem'));
    if (i === 0) await lib.shot('bus_ask');
    if (i === 1) {
      const wrong = s.stops.find((x) => x !== s.target), o0 = s.others, d0 = s.done;
      const c = await lib.center('.mg-bus .mgbus-stop[data-id="' + wrong + '"]');
      await lib.waitPromptFree();
      await page.touchscreen.tap(c.x, c.y);
      await page.waitForFunction((n) => __mgTest.state().others === n + 1, o0, { timeout: 6000 }).catch(() => lib.fail('bus: wrong stop should count as other'));
      await sleep(150); await lib.shot('bus_wrong');
      await ready();
      lib.expect((await lib.gameState()).done === d0, 'bus: wrong stop must not advance');
    }
    const c = await lib.center('.mg-bus .mgbus-stop[data-id="' + s.target + '"]');
    await lib.waitPromptFree();
    await page.touchscreen.tap(c.x, c.y);
    if (i === 2) { await page.waitForSelector('.mg-bus .mgbus-bus.mgbus-open', { timeout: 8000 }).catch(() => lib.fail('bus: doors never opened')); await sleep(60); await lib.shot('bus_arrive'); }
    if (i === 3) { await sleep(900); await lib.shot('bus_driving'); }
    await page.waitForFunction((n) => __mgTest.state().done > n, i, { timeout: 15000 }).catch(() => lib.fail('bus: correct stop #' + i + ' did not count'));
  }
  lib.expect(new Set(order).size === 5, 'bus: five different places, got ' + order.join());
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 20000 }).catch(() => lib.fail('bus: no result screen'));
  lib.expect(await page.evaluate(() => FX.misses) === misses0, 'bus: FX.miss must never be called');
  const st = await page.evaluate(() => Core.L(Core.curLang()).minigames.bus);
  lib.expect(st && st.stars >= 1 && st.plays >= 1, 'bus: stars stored');
  await sleep(600); await lib.shot('bus_result');
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG BUS SMOKE')); })();
