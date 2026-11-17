/* Lisa's Island - smoke for the "fish" mini-game: a full round (one wrong fish first), no misses, slow swimmers, result screen, shots.
   Called by smoke_mg.js; standalone: node tools/smoke_mg_fish.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
  await lib.openGame('fish');
  const st = () => page.evaluate(() => Object.assign({}, __mgTest.state()));
  for (const [width, height] of [[1128, 752], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => [...document.querySelectorAll('.mg-fish .fh-fish')].map((n) => {
      const r = n.getBoundingClientRect(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { visible: getComputedStyle(n).display !== 'none', large: Math.min(r.width, r.height) >= 9 * rem };
    }));
    lib.expect(layout.length === 6 && layout.every((f) => f.visible && f.large), 'fish: all six tappable choices fit at ' + width + 'x' + height);
  }
  await page.setViewportSize({ width: 1128, height: 752 });
  lib.expect(await page.evaluate(() => document.querySelectorAll('.mg-fish .fh-fish').length) === 6, 'fish: 6 fish');
  const small = await page.evaluate(() => { const rem = parseFloat(getComputedStyle(document.documentElement).fontSize); return [...document.querySelectorAll('.mg-fish .fh-fish')].filter((n) => { const b = n.getBoundingClientRect(); return Math.min(b.width, b.height) < 9 * rem; }).length; });
  lib.expect(small === 0, 'fish: every fish tap area is at least 9 rem (' + small + ' too small)');
  /* swim speed: sample two fish positions 400 ms apart (real time), must stay below ~6 rem/s */
  const sample = () => page.evaluate(() => [...document.querySelectorAll('.mg-fish .fh-fish')].map((n) => { const b = n.getBoundingClientRect(); return [b.left, b.top]; }));
  const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  const a = await sample(); await sleep(400); const b = await sample();
  const vmax = Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) / rem / 0.4));
  lib.expect(vmax <= 6, 'fish: swim speed ' + vmax.toFixed(1) + ' rem/s must be <= 6');
  await lib.shot('fish_open');
  const center = (id) => lib.center('.mg-fish .fh-fish[data-id="' + id + '"]');
  for (let round = 0; round < 6; round++) {
    await page.waitForFunction(() => window.__mgTest && __mgTest.state().target && __mgTest.state().stage === 'ask', null, { timeout: 15000 }).catch(() => lib.fail('fish: round ' + round + ' never asked a colour'));
    const s = await st();
    const readyFish = await page.evaluate(() => [...document.querySelectorAll('.mg-fish .fh-fish')].filter((n) => getComputedStyle(n).display !== 'none').length);
    lib.expect(readyFish === 6, 'fish: question ' + (round + 1) + ' has all six swimmers available (' + readyFish + ')');
    if (round === 0) {
      const wrong = s.ids.find((i) => i !== s.target), o0 = s.others;
      const c = await center(wrong); await lib.tapAt(c.x, c.y); await sleep(200);
      const s2 = await st();
      lib.expect(s2.others === o0 + 1 && s2.target === s.target && s2.stage === 'ask', 'fish: a wrong fish is errorless (others+1, same question)');
      await lib.shot('fish_wrong');
      await sleep(500);
    }
    if (round === 5) await lib.shot('fish_final_question');
    const c = await center(s.target); await lib.tapAt(c.x, c.y);
    /* A second tap during the catch animation must not collect this fish twice. */
    await lib.tapAt(c.x, c.y);
    if (round === 2) { await sleep(180); await lib.shot('fish_hook'); await sleep(80); await lib.shot('fish_swing'); }
    await page.waitForFunction((n) => __mgTest.state().caught === n + 1, round, { timeout: 15000 }).catch(() => lib.fail('fish: round ' + round + ' fish was not caught'));
    lib.expect((await st()).caught === round + 1, 'fish: duplicate taps add exactly one bucket fish and one catch');
    if (round < 5) {
      await page.waitForFunction(() => [...document.querySelectorAll('.mg-fish .fh-fish')].every((n) => getComputedStyle(n).display !== 'none'), null, { timeout: 3000 }).catch(() => lib.fail('fish: caught swimmer was not restored for next question'));
    }
    if (round === 5) { await sleep(60); await lib.shot('fish_full'); }
  }
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 15000 }).catch(() => lib.fail('fish: no result screen after the last fish'));
  lib.expect(await page.evaluate(() => FX.misses) === 0, 'fish: FX.misses must stay 0');
  const rec = await page.evaluate(() => Core.L(Core.curLang()).minigames.fish);
  lib.expect(rec && rec.plays >= 1 && rec.stars >= 1, 'fish: stars stored');
  await lib.shot('fish_result');
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot({ viewport: { width: 1128, height: 752 } }); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG FISH SMOKE')); })();
