/* Lisa's Island - smoke for the "dress" mini-game: a full round with real drags, one wrong piece, no FX.miss, pieces stay on, result screen, shots at 1128x752.
   Standalone: node tools/smoke_mg_dress.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('dress');
  for (const [width, height] of [[1128, 752], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      const lisa = document.querySelector('.mg-dress .mgd-lisa').getBoundingClientRect();
      const clothes = [...document.querySelectorAll('.mg-dress .mgd-cloth')].map((n) => n.getBoundingClientRect());
      return { lisa: lisa.width > 0 && lisa.height > 0, clothes: clothes.length === 6 && clothes.every((r) => r.width > 0 && r.height > 0) };
    });
    lib.expect(layout.lisa && layout.clothes, 'dress: Lisa and all clothing remain laid out at ' + width + 'x' + height);
  }
  await page.setViewportSize({ width: 1128, height: 752 });
  lib.expect(await page.evaluate(() => document.querySelectorAll('.mg-dress .mgd-cloth').length) === 6, 'dress: six clothes on the line');
  const misses0 = await page.evaluate(() => FX.misses);
  const ready = () => page.waitForFunction(() => { const s = __mgTest.state(); return s.target && !s.locked && !s.busy; }, null, { timeout: 20000 }).catch(() => lib.fail('dress: no question became ready'));
  const lisaC = () => lib.center('.mg-dress .mgd-lisa');
  const nodeFor = (id) => lib.center('.mg-dress .mgd-cloth[data-id="' + id + '"]');
  await ready(); await sleep(300);
  await lib.shot('dress_start');
  for (let i = 0; i < 6; i++) {
    await ready();
    let s = await lib.gameState();
    if (i === 1) {
      const other = (await page.evaluate(() => __mgTest.state().left)).find((k) => k !== s.target);
      const o0 = s.others, a = await nodeFor(other), l = await lisaC();
      await lib.dragMouse(a, l, 8);
      await page.waitForFunction((n) => __mgTest.state().others === n + 1, o0, { timeout: 8000 }).catch(() => lib.fail('dress: wrong piece should count as other'));
      await sleep(150); await lib.shot('dress_wrong');
      await ready();
      await sleep(600); const back = await nodeFor(other);
      lib.expect(Math.abs(back.x - a.x) < 4 && Math.abs(back.y - a.y) < 4, 'dress: the wrong piece must be back on the line');
      s = await lib.gameState();
      lib.expect(s.done === i, 'dress: a wrong piece must not advance');
    }
    const a = await nodeFor(s.target), l = await lisaC();
    await lib.dragMouse(a, l, 8);
    await page.waitForFunction((n) => __mgTest.state().done > n || __mgTest.state().finished, i, { timeout: 12000 }).catch(() => lib.fail('dress: correct piece #' + i + ' did not count'));
    const wornState = await page.evaluate((id) => ({ target: document.querySelectorAll('.mgd-wear-' + id + ' .mgd-on').length,
      torso: document.querySelectorAll('.mgd-wear-coat .mgd-on, .mgd-wear-dress .mgd-on').length }), s.target);
    lib.expect(wornState.target > 0, 'dress: latest garment remains visible on Lisa');
    lib.expect(wornState.torso <= 1, 'dress: coat and dress share one visible torso slot (' + wornState.torso + ')');
    if (i === 2) await lib.shot('dress_mid');
    if (i === 4) { await sleep(500); await lib.shot('dress_almost'); }
    if (i === 5) { await sleep(120); await lib.shot('dress_dance'); }
  }
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 15000 }).catch(() => lib.fail('dress: no result screen'));
  const s = await page.evaluate(() => Core.L(Core.curLang()).minigames.dress);
  lib.expect(s && s.stars >= 1, 'dress: stars stored');
  lib.expect(await page.evaluate(() => FX.misses) === misses0, 'dress: FX.miss must never be called');
  await lib.shot('dress_result');
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG DRESS SMOKE')); })();
