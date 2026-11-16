/* Lisa's Island - smoke for the "paint" mini-game: a full round (one wrong pot first), no misses, result screen, shots.
   Called by smoke_mg.js; standalone: node tools/smoke_mg_paint.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('paint');
  const st = () => page.evaluate(() => Object.assign({}, __mgTest.state()));
  lib.expect(await page.evaluate(() => document.querySelectorAll('.mg-paint .pt-pot').length) === 6, 'paint: 6 paint pots');
  lib.expect(await page.evaluate(() => document.querySelectorAll('.mg-paint .pt-shape').length) === 6, 'paint: 6 blank shapes');
  /* touch targets >= 9 rem */
  const small = await page.evaluate(() => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize); return [...document.querySelectorAll('.mg-paint .pt-pot, .mg-paint .pt-shape')].filter((n) => { const b = n.getBoundingClientRect(); return Math.min(b.width, b.height) < 9 * rem; }).length; });
  lib.expect(small === 0, 'paint: every pot/shape is at least 9 rem (' + small + ' too small)');
  await lib.shot('paint_open');
  for (let round = 0; round < 6; round++) {
    await page.waitForFunction(() => window.__mgTest && __mgTest.state().target && __mgTest.state().stage === 'pot', null, { timeout: 15000 }).catch(() => lib.fail('paint: round ' + round + ' never asked a colour'));
    const s = await st();
    if (round === 0) {
      const wrong = (await page.evaluate(() => __mgTest.state().pots)).find((p) => p !== s.target);
      const o0 = s.others;
      await lib.tapSel('.mg-paint .pt-pot[data-id="' + wrong + '"]'); await sleep(350);
      const s2 = await st();
      lib.expect(s2.others === o0 + 1 && s2.target === s.target && s2.stage === 'pot', 'paint: a wrong pot is errorless (others+1, same question)');
      await lib.shot('paint_wrong');
    }
    await lib.tapSel('.mg-paint .pt-pot[data-id="' + s.target + '"]');
    await page.waitForFunction(() => __mgTest.state().stage === 'paint', null, { timeout: 12000 }).catch(() => lib.fail('paint: round ' + round + ' brush never loaded'));
    await sleep(150);
    if (round === 1) await lib.shot('paint_brush');
    const hasBrush = await page.evaluate(() => getComputedStyle(document.querySelector('.mg-paint .pt-brush')).opacity === '1');
    lib.expect(hasBrush, 'paint: brush visible once the pot is chosen');
    const before = (await st()).painted;
    await lib.tapSel('.mg-paint .pt-shape:not(.painted) .pt-base');
    if (round === 2) { await sleep(250); await lib.shot('paint_flood'); }
    if (round < 5) await page.waitForFunction((b) => __mgTest.state().painted === b + 1 && __mgTest.state().stage === 'pot', before, { timeout: 12000 }).catch(() => lib.fail('paint: round ' + round + ' shape did not fill'));
    else { await page.waitForFunction(() => __mgTest.state().painted === 6, null, { timeout: 12000 }).catch(() => lib.fail('paint: last shape did not fill')); await sleep(120); await lib.shot("paint_done"); }
  }
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 15000 }).catch(() => lib.fail('paint: no result screen after the last shape'));
  lib.expect(await page.evaluate(() => FX.misses) === 0, 'paint: FX.misses must stay 0');
  const rec = await page.evaluate(() => Core.L(Core.curLang()).minigames.paint);
  lib.expect(rec && rec.plays >= 1 && rec.stars >= 1, 'paint: stars stored');
  await lib.shot('paint_result');
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot({ viewport: { width: 1128, height: 752 } }); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG PAINT SMOKE')); })();
