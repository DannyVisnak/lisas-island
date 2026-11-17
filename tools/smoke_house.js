/* Lisa's Island - smoke for Lisa's house (Node Playwright, Firefox, touch, file://).
   Run: node tools/smoke_house.js
   Checks: stages appear at their star milestones (and not before), stars never go down, hats are untouched, gifts are granted by finished activities
   (level / mini-game / review; the scene case lives in smoke_scene.js), the gift box -> two cards -> pick -> flies to its slot -> persists across a reload,
   an exhausted catalog is a quiet no-op, an old purse-draft save migrates. Screenshots at 1128x752 and 1920x1080 -> tools/shots/house_*.png.
   smoke.js wipes tools/shots, so run the whole chain in order: smoke.js, smoke_scene.js, smoke_mg.js, smoke_house.js. */
const path = require('path');
const { boot, sleep, SHOTS } = require('./mg_lib');

const shotTo = (lib, name) => lib.page.screenshot({ path: path.join(SHOTS, 'house_' + name + '.png') });
const hs = (lib) => lib.page.evaluate(() => (window.__houseTest ? __houseTest.state() : null));
const lang = (lib) => lib.page.evaluate(() => Core.curLang());
const expectSingleBuildSun = async (lib, label) => {
  const n = await lib.page.evaluate(() => {
    const exterior = document.querySelector('.house-bg svg');
    const garden = document.querySelector('.house-stage + .house-tray') && document.querySelector('.scene svg');
    return { exterior: exterior ? exterior.querySelectorAll('circle[cx="1040"]').length : 0,
      gardenSun: garden ? garden.querySelectorAll('circle[cx="1180"]').length : 0 };
  });
  lib.expect(n.exterior === 2 && n.gardenSun === 0, label + ': house exterior has one sun and backdrop adds none: ' + JSON.stringify(n));
};

async function run(lib) {
  const { page, expect } = lib;
  const starsLog = [];
  const stars = async () => { const s = await page.evaluate(() => Core.save.stars); starsLog.push(s); return s; };
  const waitHouse = (fn, arg, what, t) => page.waitForFunction(fn, arg, { timeout: t || 30000 }).catch(() => lib.fail('timeout: ' + what));
  const goMap = async () => { await page.evaluate(() => __test.go('map')); await sleep(500); };
  const openFromMap = async () => { await goMap(); await lib.tapSel('.b-house'); await page.waitForFunction(() => __test.screen() === 'house', null, { timeout: 6000 }).catch(() => lib.fail('the map house button should open the house')); await sleep(300); };

  /* ---- 1. map button, empty house, nothing happens below the first milestone ---- */
  await goMap();
  expect(await page.evaluate(() => !!document.querySelector('.b-house')), 'the map needs the house button');
  expect(await page.evaluate(() => !document.querySelector('.b-house.news')), 'no sparkle on the house button while nothing waits');
  const bh = await page.evaluate(() => { const r = document.querySelector('.b-house').getBoundingClientRect(), s = document.querySelector('.map-speaker'), q = s ? s.getBoundingClientRect() : null, ov = []; document.querySelectorAll('.topbar .right .btn').forEach((b) => { if (b !== document.querySelector('.b-house')) { const x = b.getBoundingClientRect(); if (x.left < r.right && x.right > r.left) ov.push(b.className); } }); return { w: r.width, h: r.height, ov, speakerOverlap: q ? (q.right > r.left && q.left < r.right && q.bottom > r.top && q.top < r.bottom) : false }; });
  expect(bh.w >= 90 && bh.h >= 90, 'house button hit size ' + JSON.stringify(bh));
  expect(bh.ov.length === 0 && !bh.speakerOverlap, 'house button overlaps others: ' + JSON.stringify(bh));
  await shotTo(lib, 'map_1128');
  await lib.tapSel('.b-house');
  await page.waitForFunction(() => __test.screen() === 'house', null, { timeout: 6000 });
  await sleep(700);
  let s = await hs(lib);
  expect(s && s.mode === 'build' && s.stage === 0 && s.stageDue === 0 && !s.gift, 'fresh house = empty plot, nothing due: ' + JSON.stringify(s));
  await expectSingleBuildSun(lib, 'stage 0');
  await shotTo(lib, 'build0_1128');
  /* 2 stars are still below the first milestone (3) */
  await page.evaluate(() => { Core.addStars(2); __test.go('house', { from: 'map' }); });
  await sleep(900);
  s = await hs(lib);
  expect(s.stage === 0 && s.stageDue === 0, 'stage 1 must not appear before its milestone (2 stars): ' + JSON.stringify(s));
  await stars();

  /* ---- 2. stage 1 appears at its milestone ---- */
  const hatsA = await page.evaluate(() => JSON.stringify(Core.save.hats));
  await page.evaluate(() => { Core.addStars(1); });
  await goMap();
  expect(await page.evaluate(() => !!document.querySelector('.b-house.news .hspark')), 'a due stage should sparkle on the map button (no number)');
  expect(await page.evaluate(() => !/\d/.test(document.querySelector('.b-house').textContent)), 'the house button must show no number');
  await lib.tapSel('.b-house');
  await waitHouse(() => window.__houseTest && __houseTest.state().stage === 1, null, 'stage 1 should be built once the house is opened at 3 stars');
  await sleep(900);
  await shotTo(lib, 'build1_1128');
  s = await hs(lib);
  expect(s.stage === 1 && s.stageDue === 0, 'exactly one stage at 3 stars: ' + JSON.stringify(s));
  await expectSingleBuildSun(lib, 'stage 1');
  expect(await page.evaluate(() => JSON.stringify(Core.save.hats)) === hatsA, 'hats must be unaffected by the house');
  expect(await page.evaluate(() => document.querySelectorAll('.hstep.done').length) === 1, 'the roadmap should show one finished step');
  expect(await page.evaluate(() => !/more|еще|ещё/i.test(document.querySelector('.house-tray').textContent) && !/\d/.test(document.querySelector('.house-tray').textContent)), 'no "stars needed" text or number anywhere in the tray');
  await stars();

  /* ---- 3. build each remaining exterior stage and check its single sun ---- */
  for (const step of [{ add: 5, stage: 2 }, { add: 8, stage: 3 }, { add: 12, stage: 4 }]) {
    await page.evaluate((n) => Core.addStars(n), step.add);
    await openFromMap();
    await waitHouse((stage) => window.__houseTest && __houseTest.state().stage === stage, step.stage, 'exterior stage ' + step.stage + ' appears at its milestone');
    await expectSingleBuildSun(lib, 'stage ' + step.stage);
    await shotTo(lib, 'build' + step.stage + '_1128');
    await goMap();
  }

  /* ---- 4. final stage completes the house; hats come from stars only ---- */
  await page.evaluate(() => { Core.addStars(14); });  /* 42 lifetime stars = the last milestone */
  const hatsB = await page.evaluate(() => JSON.stringify(Core.save.hats.unlocked));
  expect(hatsB === '["cap","sunglasses"]', 'hats at 42 stars should be cap + sunglasses, got ' + hatsB);
  await page.evaluate(() => __test.go('house', { from: 'map' }));
  await waitHouse(() => window.__houseTest && __houseTest.state().stage === 5 && __houseTest.state().mode === 'room', null, 'the finished house should open into the room');
  await sleep(1200);
  s = await hs(lib);
  expect(s.stars === 42 && s.stage === 5 && !s.gift, 'built, no gift yet, stars untouched: ' + JSON.stringify(s));
  expect(await page.evaluate(() => JSON.stringify(Core.save.hats.unlocked)) === hatsB, 'building must not change the hat unlocks');
  await shotTo(lib, 'room_empty_1128');
  await stars();

  /* ---- 4. gifts come from finished activities, silently ---- */
  const L = await lang(lib);
  const g = () => page.evaluate(() => Core.save.house.gifts);
  const star0 = await stars();
  await page.evaluate(() => { Core.save.house.gifts = 0; Core.persist(); });
  await page.evaluate((l) => { window.__r1 = Core.completeLevel(l, 'animals', 0, 3); }, L);
  expect(await g() === 1, 'the first completion of a level grants one gift, got ' + await g());
  await page.evaluate((l) => { window.__r2 = Core.completeLevel(l, 'animals', 0, 3); }, L);
  expect(await g() === 1, 'finishing the same level again must not grant another gift, got ' + await g());
  expect(await stars() >= star0, 'stars never decrease');
  /* mini-game finish: a throw-away game, first finish grants, a replay does not */
  await page.evaluate(() => { Core.save.house.gifts = 0; MG.register({ id: 'hstest', worlds: ['nowhere'], icon: '<svg viewBox="0 0 10 10"/>', title: 'hs', scene: 'meadow', start: function (root, ctx) { ctx.chrome({ total: 1 }); ctx.expose({ finish: function () { return ctx.finish({ helps: 0 }); } }); } }); });
  for (let k = 0; k < 2; k++) {
    await page.evaluate(() => UI.go('minigame', { lang: Core.curLang(), world: 'food', game: 'hstest' }));
    await sleep(500);
    await page.evaluate(() => { __mgTest.finish(); });
    await page.waitForFunction(() => __test.screen() === 'result', null, { timeout: 8000 }).catch(() => lib.fail('mini-game finish should open the result screen'));
    await sleep(300);
    expect(await g() === 1, 'mini-game finish #' + (k + 1) + ': gifts should be 1, got ' + await g());
    expect(await page.evaluate(() => !document.querySelector('.hgift, .b-house, .house-tray')), 'no gift banner on the result screen');
  }
  await page.evaluate(() => { delete Core.L(Core.curLang()).minigames.hstest; MG.order = MG.order.filter((x) => x !== 'hstest'); delete MG.games.hstest; });
  /* review chest: once a day; cap of 3 waiting gifts */
  await page.evaluate(() => { Core.save.house.gifts = 0; Core.save.house.reviewDay = -1; Core.houseGift('review'); Core.houseGift('review'); });
  expect(await g() === 1, 'review gift once a day, got ' + await g());
  await page.evaluate(() => { for (let i = 0; i < 6; i++) Core.houseGift(); });
  expect(await g() === 3, 'at most 3 gifts wait, got ' + await g());
  await page.evaluate(() => { Core.save.house.gifts = 2; Core.persist(); });
  await goMap();
  expect(await page.evaluate(() => !!document.querySelector('.b-house.news')), 'waiting gifts sparkle on the map button');
  await shotTo(lib, 'map_news_1128');

  /* ---- 5. open the house: gift box -> 2 cards -> pick -> flies to its slot -> word + persists ---- */
  await lib.tapSel('.b-house');
  await page.waitForFunction(() => __test.screen() === 'house' && window.__houseTest && __houseTest.state().gift, null, { timeout: 15000 }).catch(() => lib.fail('a gift box should wait in the house'));
  await sleep(300);
  await shotTo(lib, 'gift_box_1128');
  const starsBefore = await stars();
  await lib.tapSel('.hgift');
  await waitHouse(() => __houseTest.state().cards.length === 2, null, 'opening the box should show two cards');
  await sleep(700);
  s = await hs(lib);
  expect(s.cards.length === 2 && s.cards[0] !== s.cards[1] && s.cards.every((c) => s.owned.indexOf(c) < 0), 'two different, not yet owned cards: ' + JSON.stringify(s));
  await shotTo(lib, 'gift_cards_1128');
  const fs_ = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  const cw = await page.evaluate(() => document.querySelector('.hcard').getBoundingClientRect().width);
  expect(cw >= 9 * fs_, 'card hit size ' + Math.round(cw) + ' px below 9 rem');
  const pick1 = s.cards[0];
  const heard0 = await page.evaluate(([l, i]) => Core.SRS.peek(l, i).heard || 0, [L, pick1]);
  await page.evaluate(() => { window.__cw = 0; });
  await lib.tapSel('.hcard[data-id="' + pick1 + '"]');
  await sleep(250);
  await shotTo(lib, 'gift_flying_1128');
  await waitHouse(([p]) => __houseTest.state().owned.indexOf(p) >= 0, [pick1], 'the picked item should be owned');
  await sleep(1500);
  s = await hs(lib);
  expect(s.owned.length === 1 && s.owned[0] === pick1 && s.gifts === 1, 'one gift used, one item placed: ' + JSON.stringify(s));
  expect(s.items.indexOf(pick1) >= 0 && s.placed[pick1] != null, 'the item sits in its slot: ' + JSON.stringify(s));
  expect(await page.evaluate(([l, i]) => (Core.SRS.peek(l, i).heard || 0), [L, pick1]) > heard0, 'the purchase counts as one word exposure');
  expect(await page.evaluate((i) => { const n = document.querySelector('.hitem[data-id="' + i + '"]'); return !!n && !n.classList.contains('hidden'); }, pick1), 'the placed item is visible');
  expect(s.gift === true, 'another gift is waiting, so a new box shows up: ' + JSON.stringify(s));
  expect(await stars() === starsBefore, 'picking a gift must not touch the stars');
  /* second gift: choose by dragging the card onto the room */
  await lib.tapSel('.hgift');
  await waitHouse(() => __houseTest.state().cards.length === 2, null, 'second gift: two cards');
  await sleep(700);
  s = await hs(lib);
  const pick2 = s.cards[1];
  const from = await lib.center('.hcard[data-id="' + pick2 + '"]'), to = await lib.center('.house-stage');
  await lib.dragMouse(from, to, 8);
  await waitHouse(([p]) => __houseTest.state().owned.indexOf(p) >= 0, [pick2], 'dragging a card onto the room should place it');
  await sleep(1500);
  s = await hs(lib);
  expect(s.owned.length === 2 && s.gifts === 0 && !s.gift && s.cards.length === 0, 'both gifts used, tray empty: ' + JSON.stringify(s));
  await shotTo(lib, 'room_two_1128');
  /* tapping a placed item replays its word */
  const heard1 = await page.evaluate(([l, i]) => Core.SRS.peek(l, i).heard || 0, [L, pick2]);
  await lib.tapSel('.hitem[data-id="' + pick2 + '"] .hpic');
  await sleep(300);
  expect(await page.evaluate(([l, i]) => Core.SRS.peek(l, i).heard || 0, [L, pick2]) > heard1, 'tapping a placed item replays its word (exposure counted)');
  await lib.tapSel('.house-lisa');   /* Lisa answers a tap, no error */
  await sleep(300);
  await stars();

  /* ---- 6. reload: everything persists ---- */
  const saved = await page.evaluate(() => { Core.flushNow(); return JSON.stringify(Core.save.house); });
  await sleep(400);
  await page.reload();
  await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  await page.evaluate(() => __test.speedUp(8));
  expect(await page.evaluate(() => JSON.stringify(Core.save.house)) === saved, 'house save must survive a reload');
  expect(await page.evaluate(() => Core.save.stars) >= starsLog[starsLog.length - 1], 'stars survive the reload');
  await page.evaluate(() => __test.go('house', { from: 'map' }));
  await waitHouse(() => window.__houseTest && __houseTest.state().mode === 'room', null, 'room after reload');
  await sleep(900);
  s = await hs(lib);
  expect(s.items.length === 2 && s.items.indexOf(pick1) >= 0 && s.items.indexOf(pick2) >= 0 && !s.gift, 'both items are back in the room after the reload: ' + JSON.stringify(s));

  /* ---- 7. bed: Lisa sleeps on it (optional play) ---- */
  await page.evaluate(() => { const H = Core.save.house; if (H.owned.indexOf('bed') < 0) { H.owned.push('bed'); H.placed.bed = 'bed'; } __test.go('house', { from: 'map' }); });
  await sleep(1000);
  await lib.tapSel('.house-lisa');
  await sleep(250);
  expect(await page.evaluate(() => __houseTest.state().sleeping), 'tapping Lisa with a bed sends her to sleep on it');
  await shotTo(lib, 'room_sleep_1128');

  /* ---- 8. exhausted catalog: quiet no-op ---- */
  await page.evaluate(() => { const H = Core.save.house; H.gifts = 0; H.owned = House.CATALOG.map((c) => c.id); House.CATALOG.forEach((c) => { H.placed[c.id] = c.id; }); Core.persist(); });
  const addedAny = await page.evaluate(() => { for (let i = 0; i < 3; i++) Core.houseGift(); return Core.save.house.gifts; });
  expect(addedAny === 0, 'no gifts once the catalog is exhausted, got ' + addedAny);
  await page.evaluate(() => { Core.save.house.gifts = 2; __test.go('house', { from: 'map' }); });
  await sleep(1200);
  s = await hs(lib);
  expect(s && s.mode === 'room' && !s.gift && s.items.length >= 10, 'furnished room, no gift box, no error when the catalog is exhausted: ' + JSON.stringify(s && { mode: s.mode, gift: s.gift, n: s.items.length }));
  await shotTo(lib, 'room_full_1128');
  await page.evaluate(() => { Core.save.house.gifts = 0; });

  /* ---- 9. a save from the purse draft migrates (stage kept, spent/built gone, nothing lost) ---- */
  await page.evaluate(() => { Core.save.house = { spent: 5, built: 3, owned: ['ball'], placed: { ball: 1 } }; Core.persist(); Core.flushNow(); });
  await sleep(300);
  await page.reload();
  await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  const mig = await page.evaluate(() => Core.save.house);
  expect(mig.stage === 3 && mig.gifts === 0 && mig.owned.length === 1 && !('spent' in mig) && !('built' in mig), 'purse-draft save should migrate: ' + JSON.stringify(mig));

  /* ---- stars never decreased anywhere ---- */
  for (let i = 1; i < starsLog.length; i++) expect(starsLog[i] >= starsLog[i - 1], 'stars decreased: ' + starsLog.join(','));
}

async function big() {
  const lib = await boot({ viewport: { width: 1920, height: 1080 } });
  try {
    const { page } = lib;
    /* mid-build exterior, a half-furnished room, and the gift cards at 1920x1080 */
    await page.evaluate(() => { Core.save.stars = 20; Core.save.house = { stage: 3, gifts: 0, owned: [], placed: {}, reviewDay: -1 }; Core.persist(); __test.go('house', { from: 'map' }); });
    await sleep(1500); await shotTo(lib, 'build3_1920');
    await page.evaluate(() => { Core.save.stars = 60; __test.go('house', { from: 'map' }); });
    await page.waitForFunction(() => window.__houseTest && __houseTest.state().mode === 'room', null, { timeout: 30000 }).catch(() => lib.fail('1920: room should open'));
    await sleep(1800); await shotTo(lib, 'room_empty_1920');
    await page.evaluate(() => { const H = Core.save.house; H.owned = ['bed', 'ball', 'car', 'chair', 'backpack', 'tv', 'cake', 'book', 'teddy', 'balloon', 'flower']; H.owned.forEach((i) => { H.placed[i] = i; }); H.gifts = 1; Core.persist(); __test.go('house', { from: 'map' }); });
    await page.waitForFunction(() => window.__houseTest && __houseTest.state().gift, null, { timeout: 15000 }).catch(() => lib.fail('1920: gift box should show'));
    await sleep(500); await shotTo(lib, 'gift_box_1920');
    await lib.tapSel('.hgift');
    await page.waitForFunction(() => __houseTest.state().cards.length === 2, null, { timeout: 8000 }).catch(() => lib.fail('1920: two cards'));
    await sleep(900); await shotTo(lib, 'gift_cards_1920');
    await page.evaluate(() => { const H = Core.save.house; H.gifts = 0; const all = House.CATALOG.map((c) => c.id); H.owned = all; all.forEach((i) => { H.placed[i] = i; }); Core.persist(); __test.go('house', { from: 'map' }); });
    await sleep(1600); await shotTo(lib, 'room_full_1920');
    await page.evaluate(() => __test.go('map')); await sleep(600); await shotTo(lib, 'map_1920');
  } catch (e) { lib.fail('1920 exception: ' + (e && e.stack || e)); }
  return lib.finish('HOUSE SMOKE 1920');
}
module.exports = run;
if (require.main === module) (async () => {
  const lib = await boot({ viewport: { width: 1128, height: 752 } });
  try { await run(lib); } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); }
  const a = await lib.finish('HOUSE SMOKE 1128');
  const b = await big();
  process.exit(a || b);
})();
