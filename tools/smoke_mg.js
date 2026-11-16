/* Lisa's Island - generic mini-game smoke. For EVERY game registered with MG.register:
     - the entry node shows on its world path(s), locked until level 1 of that world is done, no overlap with level nodes / other entry nodes, inside the frame (1366x768 and 1128x752)
     - tapping the open node mounts the screen without console errors, back returns to the path
     - a stub game is run through its placeholder finish -> result -> path (real games skip that step)
   Per-game tests: tools/smoke_mg_<id>.js exporting `async function (lib)` (see tools/mg_lib.js); this runner requires each one that exists and runs it
   after the generic checks. A per-game file also runs standalone (see its header). Shots: tools/shots/mg_*.png. Run AFTER tools/smoke.js (which wipes tools/shots).
   Run: node tools/smoke_mg.js [id ...] */
const fs = require('fs');
const path = require('path');
const { boot, sleep } = require('./mg_lib');
const only = process.argv.slice(2);

function overlap(a, b, pad) { return !(a.right + pad <= b.left || b.right + pad <= a.left || a.bottom + pad <= b.top || b.bottom + pad <= a.top); }

async function layoutCheck(lib, viewport) {
  const worlds = await lib.page.evaluate(() => { const w = {}; MG.order.forEach((id) => MG.games[id].worlds.forEach((x) => { (w[x] = w[x] || []).push(id); })); return w; });
  for (const wid of Object.keys(worlds)) {
    await lib.goPath(wid, true);
    const r = await lib.page.evaluate(() => {
      const f = document.getElementById('frame').getBoundingClientRect();
      const rect = (n) => { const b = n.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, cls: n.className, id: n.dataset.mg || n.dataset.scene || n.dataset.level }; };
      const nodes = [...document.querySelectorAll('.mgnode, .scenenode')].map(rect), lv = [...document.querySelectorAll('.lvnode')].map(rect);
      const stars = [...document.querySelectorAll('.lvstars')].map((n) => rect(n));
      const tb = [...document.querySelectorAll('.topbar > *')].map(rect);
      return { f: { left: f.left, right: f.right, top: f.top, bottom: f.bottom }, nodes, lv, stars, tb };
    });
    const tag = viewport.width + 'x' + viewport.height + ' world ' + wid;
    lib.expect(r.lv.length === 5, tag + ': still 5 level nodes (got ' + r.lv.length + ')');
    lib.expect(r.nodes.length >= worlds[wid].length, tag + ': entry nodes missing (' + r.nodes.length + ' < ' + worlds[wid].length + ')');
    r.nodes.forEach((n, i) => {
      lib.expect(n.left >= r.f.left && n.right <= r.f.right && n.top >= r.f.top && n.bottom <= r.f.bottom, tag + ': node ' + n.id + ' outside the frame');
      r.lv.forEach((l) => lib.expect(!overlap(n, l, 4), tag + ': node ' + n.id + ' overlaps level node ' + l.id));
      r.nodes.slice(i + 1).forEach((m) => lib.expect(!overlap(n, m, 8), tag + ': nodes ' + n.id + ' and ' + m.id + ' overlap'));
      r.tb.forEach((t) => lib.expect(!overlap(n, t, 2), tag + ': node ' + n.id + ' overlaps the top bar'));
    });
    await lib.shot('path_' + wid + '_' + viewport.width);
  }
}

(async () => {
  const lib = await boot({ viewport: { width: 1366, height: 768 } });
  const { page } = lib;
  const ids = await page.evaluate(() => MG.order.slice());
  console.log('registered games: ' + ids.join(', '));
  lib.expect(ids.length >= 7, 'expected the 7 mini-games to be registered, got ' + ids.length);
  const lang = await page.evaluate(() => Core.curLang());
  try {
    await layoutCheck(lib, { width: 1366, height: 768 });
    for (const id of ids) {
      if (only.length && only.indexOf(id) < 0) continue;
      console.log('--- ' + id);
      const world = await page.evaluate((i) => MG.games[i].worlds[0], id);
      /* locked before level 1 of the world is done */
      await lib.goPath(world, false);
      lib.expect(await page.evaluate((i) => !!document.querySelector('.mgnode.locked[data-mg="' + i + '"]'), id), id + ': node should be locked before level 1 is done');
      await lib.tapSel('.mgnode[data-mg="' + id + '"]'); await sleep(350);
      lib.expect(await lib.screen() === 'path', id + ': tapping the locked node must stay on the path');
      /* open + mount */
      await lib.openGame(id);
      lib.expect(await lib.screen() === 'minigame', id + ': screen should be minigame');
      lib.expect(await page.evaluate((i) => !!document.querySelector('.screen.mg.mg-' + i), id), id + ': root class mg mg-' + id);
      const st = await lib.gameState();
      lib.expect(st && st.id === id, id + ': __mgTest state');
      await lib.shot(id + '_open');
      /* back */
      await lib.tapSel('.topbar .b-back'); await sleep(450);
      lib.expect(await lib.screen() === 'path', id + ': back must return to the path');
      /* stub: finish -> result -> path, stars stored */
      await lib.openGame(id);
      if (await page.evaluate(() => !!document.querySelector('.mgstub-go'))) {
        await lib.tapSel('.mgstub-go');
        await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 8000 }).catch(() => lib.fail(id + ': stub finish did not reach the result screen'));
        const rec = await page.evaluate(([l, i]) => Core.L(l).minigames && Core.L(l).minigames[i], [lang, id]);
        lib.expect(rec && rec.stars >= 1 && rec.plays >= 1, id + ': stars not stored in Core.L(lang).minigames[' + id + ']');
        lib.expect(await page.evaluate((w) => Core.lv(Core.curLang(), w).slice(1).every((x) => !x.done), world), id + ': path levels 2-5 must not be completed by a mini-game');
        await lib.shot(id + '_result');
        await page.evaluate(() => document.querySelector('.b-skip').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
        await page.waitForFunction(() => __test.screen() === 'path', null, { timeout: 8000 }).catch(() => lib.fail(id + ': result did not return to the path'));
        lib.expect(await page.evaluate((i) => !!document.querySelector('.mgnode[data-mg="' + i + '"].done'), id), id + ': node should show done (gold border) after a play');
      }
      /* per-game test, if the builder wrote one */
      const f = path.join(__dirname, 'smoke_mg_' + id + '.js');
      if (fs.existsSync(f)) { console.log('  running ' + path.basename(f)); const t = require(f); if (typeof t === 'function') await t(lib); }
    }
    if (!only.length) { console.log('--- shared API (ctx + MG.drag)'); await require('./smoke_mg_api')(lib); }
    await lib.page.setViewportSize({ width: 1128, height: 752 }); await sleep(200);
    await layoutCheck(lib, { width: 1128, height: 752 });
  } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); }
  process.exit(await lib.finish('MG SMOKE'));
})();
