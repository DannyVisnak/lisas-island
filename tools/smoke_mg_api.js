/* Lisa's Island - smoke for the shared mini-game API itself (ctx helpers + MG.drag), using a throw-away game registered in the page.
   Called by smoke_mg.js; standalone: node tools/smoke_mg_api.js */
const { boot, sleep } = require('./mg_lib');

async function run(lib) {
  const { page } = lib;
  await page.evaluate(() => {
    window.__apit = { drops: [], taps: 0, rej: 0 };
    MG.register({ id: 'apitest', worlds: ['nowhere'], icon: '<svg viewBox="0 0 10 10"/>', title: 'api', scene: 'meadow', start: function (root, ctx) {
      ctx.chrome({ total: 2 });
      var T = ctx.pickTargets('food', 3); window.__apit.targets = T;
      var mk = function (cls, l, t) { var d = document.createElement('div'); d.className = cls; d.style.cssText = 'position:absolute;width:14rem;height:14rem;background:#ec407a;border-radius:2rem;left:' + l + 'rem;top:' + t + 'rem;z-index:8'; root.appendChild(d); return d; };
      var box = mk('apit-box', 90, 30), a = mk('apit-a', 15, 20), b = mk('apit-b', 15, 45); box.style.background = '#4caf50';
      var mode = 'accept';
      var ha = MG.drag(a, { targets: [box], onDrop: function (t) { window.__apit.drops.push(t ? 'box' : 'none'); if (t && mode === 'reject') { window.__apit.rej++; return false; } }, onTap: function () { window.__apit.taps++; } });
      MG.drag(b, { targets: [box], onDrop: function (t) { window.__apit.drops.push('b:' + (t ? 'box' : 'none')); return false; } });
      ctx.expose({ mode: function (m) { mode = m; }, ha: function () { return !!ha; },
        correct: function () { return ctx.correct(a, T[0]); }, other: function () { return ctx.other(b, T[1], { ru: 'other', after: 2 }); },
        target: function () { ctx.setTarget(T[0], a); }, helped: function () { return ctx.helped(); }, finish: function () { return ctx.finish({ helps: 0 }); },
        ru: function () { return ctx.ruUrl('help'); }, key: function () { return [ctx.ruUrl('intro'), ctx.ruUrl('mg_feed_done')]; }, ask: function () { return ctx.askUrl(T[0]); } });
    } });
    UI.go('minigame', { lang: Core.curLang(), world: 'food', game: 'apitest' });
  });
  await sleep(500);
  const T = await page.evaluate(() => __apit.targets);
  lib.expect(T.length === 3 && new Set(T).size === 3, 'pickTargets should return 3 unique items, got ' + JSON.stringify(T));
  lib.expect(await page.evaluate((t) => t.every((i) => Core.worldItems('food').indexOf(i) >= 0), T), 'pickTargets must stay inside the requested world');
  const urls = await page.evaluate(() => ({ ru: __mgTest.ru(), key: __mgTest.key(), ask: __mgTest.ask() }));
  lib.expect(/ui\/ru_mg_apitest_help\.ogg$/.test(urls.ru || ''), 'ctx.ruUrl("help") -> mg_<id>_help, got ' + urls.ru);
  lib.expect(/ru_mg_apitest_intro/.test(urls.key[0] || '') && /ru_mg_feed_done/.test(urls.key[1] || ''), 'ctx.ruUrl keys: short and full mg_ form');
  lib.expect(/_q\.ogg$/.test(urls.ask), 'ctx.askUrl should be the q_ clip');
  const zero = (v) => /^(0px( 0px)?)?$/.test(v || '');
  const off = () => page.evaluate(() => ({ a: document.querySelector('.apit-a').style.translate, b: document.querySelector('.apit-b').style.translate }));

  /* drag onto the target: accepted, stays put; onDrop(box) fired */
  let a = await lib.center('.apit-a'), box = await lib.center('.apit-box');
  await lib.dragMouse(a, box); await sleep(200);
  lib.expect((await page.evaluate(() => __apit.drops)).join() === 'box', 'drop on the box should call onDrop(box), got ' + (await page.evaluate(() => __apit.drops)).join());
  const o1 = await off(); lib.expect(o1.a && !/^(0px( 0px)?)?$/.test(o1.a), 'accepted drop must leave the node where it was dropped, got ' + o1.a);
  await lib.shot('api_dropped');
  await page.evaluate(() => document.querySelector('.apit-a').style.translate = '');
  /* a drop onto nothing: onDrop(null) + snap back */
  let b = await lib.center('.apit-b');
  await lib.dragMouse(b, { x: b.x + 40, y: b.y + 120 }); await sleep(500);
  lib.expect(zero((await off()).b), 'a drop over nothing must snap back, got ' + (await off()).b);
  /* a drop on the target that the game rejects (returns false): snap back */
  await lib.dragMouse(b, box); await sleep(500);
  lib.expect(zero((await off()).b), 'onDrop -> false must snap back, got ' + (await off()).b);
  lib.expect((await page.evaluate(() => __apit.drops)).slice(1).join() === 'b:none,b:box', 'onDrop calls for b: ' + (await page.evaluate(() => __apit.drops)).join());
  /* mouse drag works while touch tap works as tap: tiny move = onTap, no onDrop */
  a = await lib.center('.apit-a'); const dBefore = await page.evaluate(() => __apit.drops.length);
  await page.touchscreen.tap(a.x, a.y); await sleep(150);
  lib.expect(await page.evaluate(() => __apit.taps) === 1, 'a tap on a draggable must call onTap once');
  lib.expect(await page.evaluate(() => __apit.drops.length) === dBefore, 'a tap must not call onDrop');
  /* ctx.other: errorless, no FX.miss, no combo reset */
  const m0 = await page.evaluate(() => FX.misses);
  await page.evaluate(() => { __mgTest.other(); __mgTest.other(); __mgTest.other(); }); await sleep(200);
  lib.expect(await page.evaluate(() => FX.misses) === m0, 'ctx.other must never call FX.miss');
  lib.expect((await lib.gameState()).others === 3, 'ctx.other should count others');
  lib.expect(await page.evaluate(() => document.querySelector('.apit-b').classList.contains('mgwig')), 'ctx.other should wiggle the node');
  /* ctx.correct: FX reward + SRS + progress dot */
  const box0 = await page.evaluate((t) => Core.SRS.peek(Core.curLang(), t).box, T[0]);
  await page.evaluate(() => { __mgTest.correct(); }); await sleep(900);
  const s1 = await lib.gameState();
  lib.expect(s1.done === 1 && s1.correct === 1, 'ctx.correct should advance the progress, got ' + JSON.stringify(s1));
  lib.expect(await page.evaluate((t) => Core.SRS.peek(Core.curLang(), t).box, T[0]) > box0, 'an unhelped correct answer must promote the SRS box');
  lib.expect(await page.evaluate(() => FX.level.correct) === 1, 'FX.correct should have run');
  /* idle help: peek at 8 s, assist at 15 s (virtual time), assist counts as helped */
  await page.evaluate(() => __mgTest.target()); lib.expect(!(await page.evaluate(() => __mgTest.helped())), 'fresh target is not helped');
  await page.waitForFunction(() => document.querySelector('.apit-a').classList.contains('mgpeek'), null, { timeout: 6000 }).catch(() => lib.fail('8 s idle should wiggle the target (mgpeek)'));
  await page.waitForFunction(() => document.querySelector('.apit-a').classList.contains('mgglow'), null, { timeout: 8000 }).catch(() => lib.fail('15 s idle should glow the target (mgglow)'));
  lib.expect(await page.evaluate(() => __mgTest.helped()), 'assist must mark the answer as helped');
  const box1 = await page.evaluate((t) => Core.SRS.peek(Core.curLang(), t).box, T[0]);
  await page.evaluate(() => { __mgTest.correct(); }); await sleep(900);
  lib.expect(await page.evaluate((t) => Core.SRS.peek(Core.curLang(), t).box, T[0]) <= box1 + 0, 'a helped answer must not promote the SRS box');
  lib.expect((await lib.gameState()).helps === 1, 'helped answer counted in stats.helps');
  /* finish: result screen, stars stored under minigames[id] */
  await page.evaluate(() => { __mgTest.finish(); });
  await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 8000 }).catch(() => lib.fail('ctx.finish should open the result screen'));
  const rec = await page.evaluate(() => Core.L(Core.curLang()).minigames.apitest);
  lib.expect(rec && rec.stars >= 1 && rec.plays === 1, 'finish should store stars in Core.L(lang).minigames[id], got ' + JSON.stringify(rec));
  lib.expect(await page.evaluate(() => UI.p.kind === 'minigame' && UI.p.world === 'food'), 'result params kind:minigame + world');
  await page.evaluate(() => { delete Core.L(Core.curLang()).minigames.apitest; MG.order = MG.order.filter((x) => x !== 'apitest'); delete MG.games.apitest; });
}
module.exports = run;
if (require.main === module) (async () => { const lib = await boot(); try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); } process.exit(await lib.finish('MG API SMOKE')); })();
