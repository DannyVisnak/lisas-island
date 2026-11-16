/* Lisa's Island - smoke for the "feed" mini-game: a full round with real drags, one wrong food, no FX.miss, result screen, shots at 1128x752.
   Standalone: node tools/smoke_mg_feed.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('feed');
  lib.expect(await page.evaluate(() => document.querySelectorAll('.mg-feed .mgf-food').length) === 6, 'feed: six foods on the cloth');
  const misses0 = await page.evaluate(() => FX.misses);
  const ready = () => page.waitForFunction(() => { const s = __mgTest.state(); return s.target && !s.locked && !s.busy; }, null, { timeout: 20000 }).catch(() => lib.fail('feed: no question became ready'));
  const mouth = async () => lib.center('.mg-feed .mgf-mouth');
  const nodeFor = (id) => lib.center('.mg-feed .mgf-food[data-id="' + id + '"]');
  await ready(); await sleep(300);
  await lib.shot('feed_start');
  for (let i = 0; i < 6; i++) {
    await ready();
    let s = await lib.gameState();
    if (i === 1) {
      /* wrong food: eaten happily, named, refilled; no miss; question repeats */
      const other = (await page.evaluate(() => __mgTest.state().left)).find((k) => k !== s.target);
      const o0 = s.others;
      const a = await nodeFor(other), m = await mouth();
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      for (let k = 1; k <= 8; k++) { await page.mouse.move(a.x + (m.x - a.x) * k / 8, a.y + (m.y - a.y) * k / 8); await sleep(15); }
      await lib.shot('feed_drag');
      await page.mouse.up();
      await page.waitForFunction((n) => __mgTest.state().others === n + 1, o0, { timeout: 8000 }).catch(() => lib.fail('feed: wrong food should count as other'));
      await sleep(250); await lib.shot('feed_chomp');
      await ready();
      lib.expect(await page.evaluate((id) => getComputedStyle(document.querySelector('.mgf-food[data-id="' + id + '"]')).opacity === '1', other), 'feed: the wrong food must be refilled on the cloth');
      s = await lib.gameState();
      lib.expect(s.done === i, 'feed: a wrong food must not advance the progress');
    }
    const a = await nodeFor(s.target), m = await mouth();
    await lib.dragMouse(a, m, 8);
    await page.waitForFunction((n) => __mgTest.state().done > n || __mgTest.state().finished, i, { timeout: 12000 }).catch(() => lib.fail('feed: correct food #' + i + ' did not count'));
    if (i === 2) await lib.shot('feed_mid');
    if (i === 4) await lib.shot('feed_belly');
  }
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 15000 }).catch(() => lib.fail('feed: no result screen'));
  const s = await page.evaluate(() => Core.L(Core.curLang()).minigames.feed);
  lib.expect(s && s.stars >= 1, 'feed: stars stored');
  lib.expect(await page.evaluate(() => FX.misses) === misses0, 'feed: FX.miss must never be called');
  await lib.shot('feed_result');
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG FEED SMOKE')); })();
