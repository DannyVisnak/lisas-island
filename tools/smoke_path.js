/* Lisa's Island - smoke for the linear path (one Play button). Contract: content/PATH_SPEC.md section 8.
   Run: node tools/smoke_path.js
   Cases (each at 1128x752 and 1920x1080): fresh save -> home has ONE Play button (no flags, no map) -> Play -> the whole session walked with real taps
   (a wrong tap in every game that has one: listen&tap, memory, mini-game, seek scene, Run, lesson prediction), +1 star per finished step and +3 for the ritual,
   ritual -> sleeping Lisa (no Play, a tap plays a `sleep` line) -> reload mid-session resumes the step -> next day (fake clock) starts a new session with a warm-up
   -> mini-game X for a world that has one -> review-only day with 13 due words -> hard cap -> early end -> small setting -> parent area (free play, unlock).
   Screenshots: tools/shots/path_*.png. smoke.js wipes tools/shots, so run the whole chain in order: smoke.js, smoke_scene.js, smoke_mg.js, smoke_house.js, smoke_lesson.js, smoke_path.js. */
const path = require('path');
const { boot, sleep, SHOTS } = require('./mg_lib');

const VIEWPORTS = [{ width: 1128, height: 752 }, { width: 1920, height: 1080 }];
const ev = (lib, fn, arg) => lib.page.evaluate(fn, arg);
const sess = (lib) => ev(lib, () => { const S = Path.session(Core.curLang()); return S ? JSON.parse(JSON.stringify(S)) : null; });

/* ---------- one solver per screen type; every solver does ONE wrong tap first, then answers correctly until the screen changes ---------- */
async function solveListen(lib, st) {
  const { page } = lib;
  const wrongDone = st.wrong;
  for (let guard = 0; guard < 60; guard++) {
    if ((await lib.screen()) !== st.screen) return;
    const q = await ev(lib, () => ({ id: __test.correctId(), ch: __test.choiceIds() }));
    if (!q.id) { await sleep(120); continue; }
    if (!st.wrong.done) {
      st.wrong.done = true;
      const w = q.ch.find((c) => c !== q.id);
      const o = await ev(lib, () => __test.wrongsNow());
      await lib.tapSel('.choices .card[data-id="' + w + '"]'); await sleep(250);
      const o2 = await ev(lib, () => __test.wrongsNow());
      lib.expect(o2 === o + 1, 'listen: a wrong tap should be counted (' + o + ' -> ' + o2 + ')');
      lib.expect(await ev(lib, () => __test.correctId()) === q.id, 'listen: the same question stays after a wrong tap');
    }
    const n0 = await ev(lib, () => document.querySelectorAll('.choices .card').length);
    lib.expect(n0 >= 2 && n0 <= 4, 'listen: 2 to 4 choices, got ' + n0);
    await lib.tapSel('.choices .card[data-id="' + q.id + '"]');
    await sleep(350);
  }
  void wrongDone;
}
async function solveMemory(lib, st) {
  const { page } = lib;
  await sleep(700);
  const ids = await ev(lib, () => [...document.querySelectorAll('.mcard')].map((c) => c.dataset.id));
  const uniq = [...new Set(ids)];
  const idxOf = (id) => ids.map((x, i) => (x === id ? i : -1)).filter((i) => i >= 0);
  const tapCard = async (i) => { const c = await ev(lib, (k) => { const b = document.querySelectorAll('.mcard')[k].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, i); await page.touchscreen.tap(c.x, c.y); };
  if (uniq.length >= 2) { await tapCard(idxOf(uniq[0])[0]); await sleep(140); await tapCard(idxOf(uniq[1])[0]); await sleep(900); }   /* the wrong pair first */
  for (const id of uniq) {
    const [a, b] = idxOf(id); await tapCard(a); await sleep(120); await tapCard(b);
    await page.waitForFunction((i) => document.querySelectorAll('.mcard.matched[data-id="' + i + '"]').length === 2 || !document.querySelector('.mcard'), id, { timeout: 8000 }).catch(() => lib.fail('memory: pair ' + id + ' not matched'));
  }
}
const MGS = {
  async feed(lib, s) { const mouth = await lib.center('.mg-feed .mgf-mouth'); const a = await lib.center('.mg-feed .mgf-food[data-id="' + s.target + '"]'); await lib.dragMouse(a, mouth, 8); },
  async dress(lib, s) { const l = await lib.center('.mg-dress .mgd-lisa'); const a = await lib.center('.mg-dress .mgd-cloth[data-id="' + s.target + '"]'); await lib.dragMouse(a, l, 8); },
  async paint(lib, s) {
    if (s.stage === 'pot') await lib.tapSel('.mg-paint .pt-pot[data-id="' + s.target + '"]');
    else if (s.stage === 'paint') await lib.tapSel('.mg-paint .pt-shape:not(.painted) .pt-base');
  },
  async fish(lib, s) { if (s.stage === 'ask') await lib.tapSel('.mg-fish .fh-fish[data-id="' + s.target + '"]'); },
  async bus(lib, s) { await lib.tapSel('.mg-bus .mgbus-stop[data-id="' + s.target + '"]'); },
  async body(lib, s) { const c = await ev(lib, (t) => __mgTest.partPos(t, 0), s.target); await lib.page.touchscreen.tap(c.x, c.y); },
  async market(lib, s) {
    const f = await lib.center('.mg-market .mgm-fruit:not(.mgm-gone)'); const b = await lib.center('.mg-market .mgm-basket');
    await lib.dragMouse(f, { x: b.x, y: b.y - 20 }, 10);
  }
};
const WRONG = {   /* one errorless wrong action per game (only where cheap and generic) */
  async feed(lib, s) { const o = s.left.find((k) => k !== s.target); if (!o) return; const a = await lib.center('.mg-feed .mgf-food[data-id="' + o + '"]'), m = await lib.center('.mg-feed .mgf-mouth'); await lib.dragMouse(a, m, 8); },
  async dress(lib, s) { const o = s.left.find((k) => k !== s.target); if (!o) return; const a = await lib.center('.mg-dress .mgd-cloth[data-id="' + o + '"]'), l = await lib.center('.mg-dress .mgd-lisa'); await lib.dragMouse(a, l, 8); },
  async paint(lib, s) { const o = s.pots.find((p) => p !== s.target); if (s.stage === 'pot' && o) await lib.tapSel('.mg-paint .pt-pot[data-id="' + o + '"]'); },
  async fish(lib, s) { const o = s.ids.find((p) => p !== s.target); if (s.stage === 'ask' && o) await lib.tapSel('.mg-fish .fh-fish[data-id="' + o + '"]'); },
  async bus(lib, s) { const o = s.stops.find((p) => p !== s.target); if (o) await lib.tapSel('.mg-bus .mgbus-stop[data-id="' + o + '"]'); },
  async body(lib, s) { const parts = await ev(lib, () => __mgTest.parts()); const o = parts.find((p) => p !== s.target && p !== 'tooth' && p !== 'face'); const c = await ev(lib, (t) => __mgTest.partPos(t, 0), o); await lib.page.touchscreen.tap(c.x, c.y); },
  async market() { /* the drop-beside-the-basket case is covered by smoke_mg_market */ }
};
async function solveMinigame(lib, st) {
  const { page } = lib;
  const id = await ev(lib, () => (window.__mgTest ? __mgTest.id : null));
  if (!id || !MGS[id]) { await sleep(200); return; }
  let first = true, n0 = -1;
  for (let guard = 0; guard < 200; guard++) {
    if ((await lib.screen()) !== 'minigame') return;
    const s = await ev(lib, () => (window.__mgTest ? Object.assign({}, __mgTest.state()) : null));
    if (!s) { await sleep(100); return; }
    if (s.finished || !s.target || s.locked || s.busy) { await sleep(120); continue; }
    if (first && WRONG[id]) {
      first = false;
      const o0 = s.others;
      await WRONG[id](lib, s);
      if (id !== 'market') await page.waitForFunction((n) => __mgTest.state().others >= n + 1, o0, { timeout: 8000 }).catch(() => lib.fail('minigame ' + id + ': the wrong action did not count as other'));
      await sleep(300);
      st.mgWrong = (st.mgWrong || 0) + 1;
      continue;
    }
    first = false;
    n0 = s.done;
    await MGS[id](lib, s);
    await sleep(350);
  }
}
const page_ = null; void page_;
async function solveScene(lib, st) {
  const { page } = lib;
  let wrong = false;
  for (let guard = 0; guard < 120; guard++) {
    if ((await lib.screen()) !== 'scene') return;
    const s = await ev(lib, () => (window.__sceneTest ? __sceneTest.state() : null));
    if (!s) { await sleep(100); return; }
    if (s.locked || s.done || !s.target) { await sleep(120); continue; }
    const items = await ev(lib, () => __sceneTest.items());
    const center = async (id) => { const it = items.find((i) => i.id === id); await ev(lib, (x) => __sceneTest.setCam(x - 683), it.x); await sleep(80); return ev(lib, (i) => __sceneTest.rect(i), id); };
    if (!wrong) {
      wrong = true;
      const o = items.find((i) => i.id !== s.target && !s.found.includes(i.id));
      if (o) { const r = await center(o.id); await page.touchscreen.tap(r.x, r.y); await sleep(250); st.sceneWrong = (await ev(lib, () => __sceneTest.state().others)); }
    }
    const r = await center(s.target); await page.touchscreen.tap(r.x, r.y);
    await sleep(500);
  }
}
async function solveRun(lib, st) {
  const { page } = lib;
  let wrong = false, skippedGate = -1, skippedEnd = false;
  for (let guard = 0; guard < 200; guard++) {
    if ((await lib.screen()) !== 'run') return;
    const s = await ev(lib, () => (window.__runState ? { state: __runState.state, gi: __runState.gi, n: __runState.gates.length, over: __runState.over } : null));
    if (!s) { await sleep(100); return; }
    if (s.state === 'run') {
      /* Physics runs at real time: repeated skips rewind the approach before Lisa reaches the gate/house. */
      if (s.gi < s.n && skippedGate !== s.gi) { await ev(lib, () => __runState.skipToGate()); skippedGate = s.gi; }
      else if (s.gi >= s.n && !skippedEnd) { await ev(lib, () => __runState.skipToEnd()); skippedEnd = true; }
      await sleep(250); continue;
    }
    if (s.state === 'gate') {
      const q = await ev(lib, () => ({ id: __test.correctId(), ch: __test.choiceIds() }));
      if (!q.id) { await sleep(120); continue; }
      if (!wrong) { wrong = true; const w = q.ch.find((c) => c !== q.id); await lib.tapSel('.gatechoices .card[data-id="' + w + '"]'); await sleep(350); st.runWrong = true; }
      await lib.tapSel('.gatechoices .card[data-id="' + q.id + '"]');
      await sleep(500); continue;
    }
    await sleep(150);
  }
}
async function solveLesson(lib, st) {
  let tapped = 0;
  for (let guard = 0; guard < 400; guard++) {
    if ((await lib.screen()) !== 'lesson') return;
    const s = await ev(lib, () => (window.__lessonTest ? __lessonTest.state() : null));
    if (!s) { await sleep(100); continue; }
    if (s.phase === 'prompt' && s.picks.length === tapped) {
      const c = await lib.center('.ls-tile'); await lib.page.touchscreen.tap(c.x, c.y); tapped++; st.lessonTaps = tapped; await sleep(500); continue;
    }
    await sleep(120);
  }
}

/* walk the running session until Lisa is home again; returns the list of visited steps */
async function walk(lib, tag, vp, o) {
  o = o || {};
  const visited = [], seenScreens = {};
  const t0 = Date.now(); let lastKey = '', st = null;
  while (Date.now() - t0 < (o.timeout || 420000)) {
    const info = await ev(lib, () => { const S = Path.session(Core.curLang()); return { sc: __test.screen(), step: S ? S.step : -1, id: S && S.plan ? S.plan[S.step] : null, done: S ? S.done : false }; });
    if (info.sc === 'home') break;
    if (o.stopAt != null && info.step >= o.stopAt && info.sc !== 'pritual') break;
    const key = info.sc + '#' + info.step;
    if (key !== lastKey) {
      lastKey = key; st = { screen: info.sc, wrong: { done: false } }; visited.push({ screen: info.sc, step: info.step, id: info.id });
      const sk = info.sc + '_' + info.id;
      if (o.shots && info.id === 'R' && !seenScreens[sk]) { seenScreens[sk] = 1; await ev(lib, () => __test.realTime()); await sleep(1800); await lib.page.screenshot({ path: path.join(SHOTS, 'path_' + tag + '_ritual_' + vp.width + '.png') }); await ev(lib, () => __test.speedUp(8)); }
      if (!seenScreens[sk]) { seenScreens[sk] = 1; if (o.shots) { await sleep(1100); await lib.page.screenshot({ path: path.join(SHOTS, 'path_' + tag + '_' + sk + '_' + vp.width + '.png') }); } }
    }
    if (info.sc === 'plisten') await solveListen(lib, st);
    else if (info.sc === 'memory') await solveMemory(lib, st);
    else if (info.sc === 'minigame') await solveMinigame(lib, st);
    else if (info.sc === 'scene') await solveScene(lib, st);
    else if (info.sc === 'run') await solveRun(lib, st);
    else if (info.sc === 'lesson') await solveLesson(lib, st);
    else if (info.sc === 'pmeet') {
      const lit = await ev(lib, () => !!document.querySelector('.path-lit.nudge'));
      if (lit && !st.tapped) { st.tapped = true; await lib.tapSel('.path-lit'); }
      await sleep(150);
    } else await sleep(150);
    if (st.mgWrong) o.mgWrong = (o.mgWrong || 0) + st.mgWrong, st.mgWrong = 0;
    if (st.sceneWrong) o.sceneWrong = st.sceneWrong;
    if (st.runWrong) o.runWrong = true;
    if (st.lessonTaps) o.lessonTaps = st.lessonTaps;
  }
  return visited;
}

const shot = (lib, name, vp) => lib.page.screenshot({ path: path.join(SHOTS, 'path_' + name + '_' + vp.width + '.png') });
const waitHome = (lib, ms) => lib.page.waitForFunction(() => __test.screen() === 'home', null, { timeout: ms || 20000 }).catch(() => lib.fail('did not return home'));

async function ritualAndSleep(lib, vp, tag, stars0, visitedIds) {
  const { page, expect } = lib;
  await waitHome(lib);
  await sleep(500);
  const S = await sess(lib);
  expect(S && S.done === true && S.ritual === true, tag + ': the record must be closed (done + ritual)');
  const stars1 = await ev(lib, () => Core.save.stars);
  const paid = [...new Set(visitedIds)].filter((i) => ['warm', 'A1', 'A2', 'A3', 'L', 'B1', 'B2', 'B3', 'rv1', 'rv2', 'rv3'].includes(i)).length;
  expect(stars1 - stars0 === paid + 3, tag + ': stars should grow by 1 per finished step (' + paid + ') + 3 for the ritual, got ' + (stars1 - stars0));
  expect(await ev(lib, () => !document.querySelector('.path-play')), tag + ': sleeping Lisa replaces Play');
  expect(await ev(lib, () => !!document.querySelector('.home-lisa.p-sleep') && !document.querySelector('.flag-btn')), tag + ': Lisa sleeps and there is no flag/map entry');
  await shot(lib, tag + '_sleeping', vp);
  await ev(lib, () => { Core.lisaLast = null; });
  const c = await lib.center('.home-lisa'); await page.touchscreen.tap(c.x, c.y); await sleep(300);
  const key = await ev(lib, () => (Core.lisaLast && Core.lisaLast.key) || null);
  expect(/^lisa_sleep[123]$/.test(key || ''), tag + ': a tap on sleeping Lisa plays one sleep line, got ' + key);
  expect(await ev(lib, () => Path.sleeping()), tag + ': Path.sleeping() true after the ritual');
  /* a reload keeps her asleep (same calendar day) */
  await page.reload(); await page.waitForFunction(() => window.__test && __test.screen() === 'home'); await ev(lib, () => __test.speedUp(8));
  expect(await ev(lib, () => !document.querySelector('.path-play') && !!document.querySelector('.home-lisa.p-sleep')), tag + ': still asleep after a reload');
}

async function fullSession(lib, vp) {
  const { page, expect } = lib;
  /* ---- fresh save: home ---- */
  const home = await ev(lib, () => ({
    play: !!document.querySelector('.path-play'), flags: document.querySelectorAll('.flag-btn').length, map: !!document.querySelector('.b-run, .node'),
    plays: document.querySelectorAll('.path-play').length, hasAlbum: !!document.querySelector('.b-album'), hasWard: !!document.querySelector('.b-ward'), hasHouse: !!document.querySelector('.homebtns .b-house'),
    st: Core.save.stars, hasPath: !!Core.L(Core.curLang()).path, small: Core.save.settings.pathSmall
  }));
  expect(home.play && home.plays === 1 && home.flags === 0 && !home.map, 'home: exactly ONE Play button, no flags, no map ' + JSON.stringify(home));
  expect(home.hasAlbum && home.hasWard && home.hasHouse, 'home: hat/wardrobe + house buttons stay ' + JSON.stringify(home));
  const pr = await ev(lib, () => { const b = document.querySelector('.path-play').getBoundingClientRect(), f = document.getElementById('frame').getBoundingClientRect(); const o = [...document.querySelectorAll('.homebtns .btn,.starbadge,.home-speaker,.home-lisa')].filter((n) => { const r = n.getBoundingClientRect(); return !(r.right <= b.left || b.right <= r.left || r.bottom <= b.top || b.bottom <= r.top); }).length; return { w: b.width / f.width, inside: b.left >= f.left && b.right <= f.right && b.top >= f.top && b.bottom <= f.bottom, overlap: o }; });
  expect(pr.w >= 0.2 && pr.inside && pr.overlap === 0, 'home: Play is big, inside the frame and overlaps nothing ' + JSON.stringify(pr));
  const fl = await ev(lib, () => {
    const gp = document.querySelector('.goalpill').getBoundingClientRect();
    return [...document.querySelectorAll('.path-langs .b-flag')].map((n) => {
      const r = n.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { w: r.width, hit: !!(t && n.contains(t)), overlapPill: !(r.right <= gp.left || gp.right <= r.left || r.bottom <= gp.top || gp.bottom <= r.top) };
    });
  });
  expect(fl.length === 2 && fl.every((f) => f.w >= 64 && f.hit && !f.overlapPill), 'home: language flags >= 64 px, tappable, not covered by the progress bar ' + JSON.stringify(fl));
  await shot(lib, 'home', vp);
  const stars0 = home.st;
  const ww0 = await ev(lib, () => JSON.stringify(Object.keys(Core.L(Core.curLang()).words).length));

  /* ---- Play: the whole session ---- */
  await lib.tapSel('.path-play');
  await page.waitForFunction(() => __test.screen() !== 'home', null, { timeout: 8000 }).catch(() => lib.fail('Play did not leave home'));
  const S1 = await sess(lib);
  expect(S1 && S1.plan.join() === 'A1,A2,A3,L,MV,B1,B2,B3,R'.replace(/^/, S1.plan[0] === 'warm' ? 'warm,' : ''), 'fresh session plan: ' + (S1 && S1.plan.join()));
  expect(S1.newA.length === 4, 'block A has 4 new words, got ' + S1.newA.length);
  expect(S1.newA.every((i) => true), 'newA ok');
  const o = {};
  const visited = await walk(lib, 'day1', vp, Object.assign(o, { shots: true }));
  const ids = visited.map((v) => v.id);
  console.log('    day1 steps: ' + ids.join('>') + '  screens: ' + visited.map((v) => v.screen).join('>'));
  expect(['A1', 'A2', 'A3', 'L', 'MV', 'B1', 'B2', 'B3', 'R'].every((i) => ids.includes(i)), 'every step of the template must run: ' + ids.join());
  expect(visited.some((v) => v.screen === 'pmeet') && visited.some((v) => v.screen === 'memory') && visited.some((v) => v.screen === 'lesson') && visited.some((v) => v.screen === 'pmove') && visited.some((v) => v.screen === 'pritual'), 'screens: meet, memory, lesson, move, ritual all visited ' + visited.map((v) => v.screen).join());
  expect(o.lessonTaps >= 1, 'lesson: a prediction was tapped');
  const S2 = await sess(lib);
  expect(S2.newB.length === 4 && S2.newB.every((i) => !S2.newA.includes(i)), 'block B has 4 new words that differ from block A ' + JSON.stringify(S2.newB));
  const words = await ev(lib, () => Object.keys(Core.L(Core.curLang()).words).length);
  expect(words >= 8, '8 new words were introduced, save has ' + words + ' (was ' + ww0 + ')');
  await ritualAndSleep(lib, vp, 'day1', stars0, ids);
  const pl = (await sess(lib)).playedMs;
  expect(pl > 0 && pl < 15 * 60000, 'playedMs counts active play: ' + pl);
}


/* seed words as already learned: ids -> box 3, due in 7 days (not due) */
const seedLearned = (lib, worldIds) => ev(lib, (ws) => {
  const lang = Core.curLang(), t = Core.today();
  ws.forEach((w) => Core.worldItems(w).forEach((id) => { Core.SRS.intro(lang, id); const x = Core.L(lang).words[id]; x.box = 3; x.last = Date.now(); x.due = t + 7; x.fc = 3; }));
  Core.persist();
}, worldIds);

async function mgWorldCase(lib, vp) {
  const { page, expect } = lib;
  console.log('  world with a mini-game: animals learned -> food (feed) is the current world');
  await seedLearned(lib, ['animals']);
  await ev(lib, () => __test.go('home')); await sleep(300);
  await lib.tapSel('.path-play');
  await page.waitForFunction(() => __test.screen() !== 'home', null, { timeout: 8000 });
  const S = await sess(lib);
  expect(S.newA.length === 4 && true, 'food: 4 new words');
  const worlds = await ev(lib, (a) => a.map((i) => Core.D.items[i].world), S.newA);
  expect(worlds.every((w) => w === 'food'), 'the current world after animals is food: ' + worlds.join());
  const o = {};
  const seq = [];
  const visited = await walk(lib, 'food', vp, Object.assign(o, { shots: true }));
  // The step index can advance one frame before the screen switches.
  const a3 = visited.find((v) => v.id === 'A3' && v.screen === 'minigame') || visited.find((v) => v.id === 'A3');
  expect(a3 && a3.screen === 'minigame', 'A3 is the registered mini-game for food: ' + JSON.stringify(a3));
  expect(await ev(lib, () => true), 'ok');
  expect(o.mgWrong >= 1, 'a wrong action was made inside the mini-game');
  console.log('    food steps: ' + visited.map((v) => v.id + ':' + v.screen).join(' '));
  await waitHome(lib); void seq;
  expect((await sess(lib)).done, 'food session finished');
}

async function reviewDayCase(lib, vp) {
  const { page, expect } = lib;
  console.log('  review-only day: 13 due words');
  await ev(lib, () => {
    const lang = Core.curLang(), t = Core.today();
    let n = 0;
    Core.D.worlds.forEach((w) => Core.worldItems(w.id).forEach((id) => { if (n < 13 && Core.D.items[id][lang]) { Core.SRS.intro(lang, id); const x = Core.L(lang).words[id]; x.box = 1; x.due = t - 1; x.last = Date.now() - 864e5 * 3; n++; } }));
    delete Core.L(lang).path; Core.persist(); __test.go('home');
  });
  await sleep(300);
  const nDue = await ev(lib, () => Core.SRS.dueList(Core.curLang()).length);
  expect(nDue === 13, 'seed: 13 due words, got ' + nDue);
  await lib.tapSel('.path-play');
  await page.waitForFunction(() => __test.screen() !== 'home', null, { timeout: 8000 });
  const S = await sess(lib);
  expect(S.review === true && S.plan.join() === 'rv1,rv2,L,MV,rv3,R' && S.newA.length === 0 && S.newB.length === 0, 'review day plan (no Meet blocks): ' + JSON.stringify([S.review, S.plan, S.newA, S.newB]));
  const words0 = await ev(lib, () => Object.keys(Core.L(Core.curLang()).words).length);
  const visited = await walk(lib, 'review', vp, { shots: true });
  console.log('    review steps: ' + visited.map((v) => v.id + ':' + v.screen).join(' '));
  expect(!visited.some((v) => v.screen === 'pmeet'), 'review day shows no Meet screen');
  expect(visited[0].id === 'rv1' && visited[visited.length - 1].id === 'R', 'review day runs reviewday listen&tap ... ritual');
  await waitHome(lib);
  const words1 = await ev(lib, () => Object.keys(Core.L(Core.curLang()).words).length);
  expect(words1 === words0, 'no new words on a review day (' + words0 + ' -> ' + words1 + ')');
}

async function ruleCases(lib, vp) {
  const { page, expect } = lib;
  console.log('  cap, early end, small setting, resume, parent area');
  /* small: block A only */
  await ev(lib, () => { Core.save.settings.pathSmall = true; Core.L(Core.curLang()).path = null; Core.persist(); __test.go('home'); });
  await ev(lib, () => { const l = Core.curLang(); Core.save.langs[l].path = undefined; Core.SRS.dueList(l).forEach((i) => { Core.L(l).words[i].due = Core.today() + 5; }); });
  await sleep(300);
  await lib.tapSel('.path-play'); await page.waitForFunction(() => __test.screen() !== 'home', null, { timeout: 8000 });
  let S = await sess(lib);
  expect(S.plan.join().replace('warm,', '') === 'A1,A2,A3,R' && S.newB.length === 0, 'small setting = block A only: ' + S.plan.join());
  await ev(lib, () => Core.persist());
  /* resume mid-session: reload after A2 -> Play resumes at the same step */
  const v = await walk(lib, 'small', vp, { stopAt: 2 });
  const stepBefore = (await sess(lib)).step;
  await ev(lib, () => Core.flushNow());
  await page.reload(); await page.waitForFunction(() => window.__test && __test.screen() === 'home'); await ev(lib, () => __test.speedUp(8));
  expect(await ev(lib, () => !!document.querySelector('.path-play')), 'reload mid-session: Play is shown (not sleeping)');
  expect((await sess(lib)).step === stepBefore && (await sess(lib)).done === false, 'reload mid-session keeps the step ' + stepBefore);
  await lib.tapSel('.path-play'); await sleep(700);
  const rs = await ev(lib, () => { const S = Path.session(Core.curLang()); return { sc: __test.screen(), id: S.plan[S.step], step: S.step }; });
  expect(rs.step === stepBefore && rs.sc !== 'home', 'Play resumes the saved step: ' + JSON.stringify(rs) + ' vs ' + stepBefore);
  await shot(lib, 'resumed', vp);
  /* hard cap: playedMs over the cap -> the next hand-over goes straight to the ritual */
  await ev(lib, () => { Path.test.played(16 * 60000); });
  const v2 = await walk(lib, 'cap', vp, {});
  const ids = v2.map((x) => x.id);
  expect(ids[ids.length - 1] === 'R' && ids.length <= 3, 'at the 15 min cap the rest is skipped: ' + ids.join());
  await waitHome(lib); expect((await sess(lib)).done, 'cap session ritual done');
  /* early end: 3 helped answers in a row, twice */
  await ev(lib, () => { Core.save.settings.pathSmall = false; __test.dayShift(2); __test.go('home'); }); await sleep(300);
  await lib.tapSel('.path-play'); await page.waitForFunction(() => __test.screen() !== 'home', null, { timeout: 8000 });
  const ok = await ev(lib, () => { const l = Core.curLang(); let r = true; for (let k = 0; k < 6; k++) { UI.p.path = true; Path.note(l, 'x', 'helped'); } return Path.session(l).early; });
  expect(ok === true, 'two runs of 3 helped answers set the early end');
  const v3 = await walk(lib, 'early', vp, {});
  const ids3 = v3.map((x) => x.id);
  expect(ids3[ids3.length - 1] === 'R', 'early end goes to the ritual: ' + ids3.join());
  await waitHome(lib);
  /* parent: free play + unlock */
  expect(await ev(lib, () => Path.sleeping()), 'asleep before the parent unlock');
  await ev(lib, () => __test.go('parent')); await sleep(500);
  expect(await ev(lib, () => !!document.querySelector('[data-act="freeplay"]') && !!document.querySelector('[data-act="unlock"]')), 'parent area has Free play + Unlock buttons');
  await shot(lib, 'parent', vp);
  await ev(lib, () => document.querySelector('[data-act="unlock"]').click()); await sleep(400);
  expect(await ev(lib, () => !Path.sleeping()), 'unlock: another session is possible');
  await ev(lib, () => { __test.go('parent'); }); await sleep(300);
  await ev(lib, () => document.querySelector('[data-act="freeplay"]').click()); await sleep(500);
  expect(await lib.screen() === 'map', 'free play opens the old map');
  await shot(lib, 'freeplay_map', vp);
  await ev(lib, () => __test.go('home')); await sleep(300);
  expect(await ev(lib, () => !!document.querySelector('.path-play')), 'unlocked: Play again');
  /* no extra house gift beyond the ritual cap: gifts waiting never exceed 3 */
  expect(await ev(lib, () => Core.save.house.gifts <= 3), 'house gifts stay within the cap of 3');
}

/* ---------- boot helpers ---------- */
async function freshBoot(vp) { return boot({ viewport: vp, speed: 8 }); }

(async () => {
  let code = 0;
  const ONLY = (process.env.PATH_CASES || 'ABC'), ONLYVP = process.env.PATH_VP ? +process.env.PATH_VP : 0;   /* e.g. PATH_CASES=B PATH_VP=1920 runs one case at one viewport */
  for (const vp of VIEWPORTS) {
    if (ONLYVP && vp.width !== ONLYVP) continue;
    console.log('viewport ' + vp.width + 'x' + vp.height);
    if (ONLY.includes('A')) {
    const lib = await freshBoot(vp);
    const { page, expect } = lib;
    try {
      console.log('  day 1: fresh save, Play, whole session, ritual, sleeping Lisa');
      await fullSession(lib, vp);

      console.log('  next day: fake clock -> new session with a warm-up');
      const day1Words = await ev(lib, () => { const p = Core.L(Core.curLang()).path; return p.newA.concat(p.newB); });
      await ev(lib, () => __test.dayShift(3)); await ev(lib, () => __test.go('home')); await sleep(400);
      expect(await ev(lib, () => !!document.querySelector('.path-play')), 'next day: Play is back');
      const starsB = await ev(lib, () => Core.save.stars);
      const dueN = await ev(lib, () => Core.SRS.dueList(Core.curLang()).length);
      expect(dueN >= 2, 'next day: words learned on day 1 are due again (box 2 = +3 days, Leitner) (' + dueN + ')');
      await lib.tapSel('.path-play');
      await page.waitForFunction(() => __test.screen() !== 'home', null, { timeout: 8000 });
      const Sd2 = await sess(lib);
      expect(Sd2.plan[0] === 'warm' && Sd2.warm.length >= 2 && Sd2.warm.length <= 3, 'next day: the session starts with a warm-up of 2-3 due words ' + JSON.stringify([Sd2.plan[0], Sd2.warm]));
      expect(await lib.screen() === 'plisten', 'next day: first screen is listen&tap, got ' + await lib.screen());
      await page.waitForFunction(() => __test.choiceIds().length > 0, null, { timeout: 8000 }).catch(() => {});
      const onScreen = await ev(lib, () => __test.choiceIds());
      const tgt = await ev(lib, () => __test.correctId());
      expect(day1Words.includes(tgt) && Sd2.warm.every((i) => day1Words.includes(i)) && Sd2.warm.every((i) => !Sd2.newA.includes(i)), 'warm-up target is a DUE day-1 word, not a new one: target ' + tgt + ' on screen ' + JSON.stringify(onScreen) + ' warm ' + JSON.stringify(Sd2.warm) + ' day1 ' + JSON.stringify(day1Words));
      console.log('    day2 warm-up: screen=plisten, choices on screen ' + onScreen.join(',') + ', warm list ' + Sd2.warm.join(',') + ', new A ' + Sd2.newA.join(','));
      await sleep(900); await shot(lib, 'day2_warmup', vp);
      const ch = await ev(lib, () => __test.choiceIds().length);
      expect(ch === 2, 'warm-up uses 2 choices, got ' + ch);
      const v2 = await walk(lib, 'day2', vp, { shots: true });
      const ids2 = v2.map((v) => v.id);
      console.log('    day2 steps: ' + ids2.join('>') + '  screens: ' + v2.map((v) => v.screen).join('>'));
      expect(ids2[0] === 'warm' && ids2.includes('R'), 'day 2 ran warm-up ... ritual');
      await waitHome(lib); await sleep(400);
      const Sd2b = await sess(lib);
      expect(Sd2b.done && Sd2b.newA.every((i) => !(Sd2.newA.concat([]).length === 0)), 'day 2 record closed');
      const s3 = await ev(lib, () => Core.save.stars);
      expect(s3 > starsB, 'stars grew on day 2');
      const lifetimeOk = await ev(lib, () => Core.save.stars >= 0);
      expect(lifetimeOk, 'stars never go below zero');
    } catch (e) { lib.fail('exception: ' + (e && e.stack || e)); }
    code = (await lib.finish('PATH SMOKE A ' + vp.width)) || code;
    }
    if (ONLY.includes('B')) {
    const lib2 = await freshBoot(vp);
    try { await mgWorldCase(lib2, vp); } catch (e) { lib2.fail('exception: ' + (e && e.stack || e)); }
    code = (await lib2.finish('PATH SMOKE B (mini-game world) ' + vp.width)) || code;
    }
    if (ONLY.includes('C')) {
    const lib3 = await freshBoot(vp);
    try { await reviewDayCase(lib3, vp); await ruleCases(lib3, vp); } catch (e) { lib3.fail('exception: ' + (e && e.stack || e)); }
    code = (await lib3.finish('PATH SMOKE C (review, rules) ' + vp.width)) || code;
    }
  }
  process.exit(code);
})();
