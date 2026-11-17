/* Lisa's Island - smoke for the "body" mini-game: a full round of real touches (incl. wrong parts + a tummy tickle), misses = 0, high five, result screen, shots at 1128x752.
   Standalone: node tools/smoke_mg_body.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('body');
  const misses0 = await page.evaluate(() => FX.misses);
  const ready = () => page.waitForFunction(() => { const s = __mgTest.state(); return s.target && !s.locked && !s.finishing; }, null, { timeout: 20000 }).catch(() => lib.fail('body: no question became ready'));
  const pos = (pid, i) => page.evaluate(([p, k]) => __mgTest.partPos(p, k), [pid, i || 0]);
  const parts = await page.evaluate(() => __mgTest.parts());
  lib.expect(parts.length === 9, 'body: nine parts');
  /* nearest-part logic: every part centre resolves to itself, and the hit boxes are generous (a touch 1.2 rem off still counts) */
  for (const p of parts) {
    const c = await pos(p);
    lib.expect(await page.evaluate(([x, y]) => __mgTest.hitAt(x, y), [c.x, c.y]) === p, 'body: centre of ' + p + ' must hit ' + p);
    const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    lib.expect(await page.evaluate(([x, y]) => __mgTest.hitAt(x, y), [c.x + rem * 1.2, c.y]) !== null, 'body: a touch near ' + p + ' must still hit something');
  }
  await ready(); await sleep(300);
  await lib.shot('body_start');
  const order = [];
  for (let i = 0; i < 6; i++) {
    await ready();
    let s = await lib.gameState();
    order.push(s.target);
    if (i === 1 || i === 3) {
      /* wrong part: it reacts + says its name, no progress; i === 3 -> three wrongs in total, the third one tickles */
      const n = i === 1 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const wrong = parts.find((p) => p !== s.target && p !== 'tooth' && p !== 'face' && (k === 0 || p !== 'nose'));
        const o0 = (await lib.gameState()).others, c = await pos(wrong);
        await lib.waitPromptFree();
        await page.touchscreen.tap(c.x, c.y);
        await page.waitForFunction((n0) => __mgTest.state().others === n0 + 1, o0, { timeout: 6000 }).catch(() => lib.fail('body: wrong part ' + wrong + ' should count as other'));
        if (k === 0) await lib.shot('body_wrong_' + wrong);
        await sleep(200);
      }
      /* a touch on the tummy = tickle, never counted */
      const t0 = await lib.gameState(), tummy = await page.evaluate(() => __mgTest.svgPos(120, 208));
      await lib.waitPromptFree();
      await page.touchscreen.tap(tummy.x, tummy.y); await sleep(200);
      lib.expect((await lib.gameState()).others === t0.others, 'body: a tummy touch must not count as an answer');
      await ready();
      s = await lib.gameState();
      lib.expect(s.done === i, 'body: wrong parts must not advance the progress');
    }
    const c = await pos(s.target, i % 2);
    if (i === 0) await lib.shot('body_ask');
    await lib.waitPromptFree();
    await page.touchscreen.tap(c.x, c.y);
    await sleep(120);
    if (i === 2) await lib.shot('body_react_' + s.target);
    await page.waitForFunction((n) => __mgTest.state().done > n || __mgTest.state().finishing, i, { timeout: 12000 }).catch(() => lib.fail('body: correct part #' + i + ' (' + s.target + ') did not count'));
  }
  lib.expect(new Set(order).size === 6, 'body: six different parts asked, got ' + order.join());
  await page.waitForSelector('.mg-body .mgb-five', { timeout: 15000 }).catch(() => lib.fail('body: no high five appeared'));
  await sleep(300); await lib.shot('body_highfive');
  await lib.tapSel('.mg-body .mgb-five');
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 15000 }).catch(() => lib.fail('body: high five did not lead to the result screen'));
  lib.expect(await page.evaluate(() => FX.misses) === misses0, 'body: FX.miss must never be called');
  const st = await page.evaluate(() => { const r = Core.L(Core.curLang()).minigames.body; return r; });
  lib.expect(st && st.stars >= 1 && st.plays >= 1, 'body: stars stored');
  await sleep(600); await lib.shot('body_result');
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG BODY SMOKE')); })();
