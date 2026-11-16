/* Lisa's Island - seek-and-find scenes (zoo, house, picnic). A wide hand-drawn picture that the child pans with a finger;
   a voice asks for one item at a time, the child finds and taps it. Errorless: a wrong tap is just "that is a ...".
   Art + placements live in scenes_art.js, looks in css/scene.css. Hooks elsewhere: the entry node in UI.screens.path (ui.js). */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap, SRS = Core.SRS;
var SA = window.SceneArt;
var Scene = window.Scene = { cur: null };

var ROUND = 6;              /* targets per round (5 if the scene has fewer items) */
var PEEK_MS = 8000;         /* idle: voice + wiggle */
var HELP_MS = 15000;        /* idle: soft glow + auto-pan */
var MIN_HIT = 120;          /* units (1 unit = 0.1 rem): hit boxes are never smaller than 12 rem */
var VIEW_W = 1366;

/* scene for a world id (animals -> zoo, home/toys -> house, food -> picnic) */
Scene.forWorld = function (wid) {
  for (var k in SA) if (SA[k] && SA[k].worlds && SA[k].worlds.indexOf(wid) >= 0) return SA[k];
  return null;
};
/* the entry node is open once the world's first level (meeting the first words) is done */
Scene.unlocked = function (lang, wid) { return !!Core.lv(lang, wid)[0].done; };
Scene.rec = function (lang, sid) {
  var L = Core.L(lang); if (!L.scenes) L.scenes = {};
  return L.scenes[sid] || (L.scenes[sid] = { stars: 0, plays: 0 });
};

/* ---------- round selection: SRS due first, then new words, then the rest ---------- */
function pickTargets(lang, sc, pw) {
  var ids = sc.items.map(function (i) { return i.id; }).filter(function (id) { return D.items[id] && D.items[id][lang]; });
  if (pw) {   /* linear path: today's words first, then other met words of this scene; never an unmet word */
    var pref = Core.shuffle(ids.filter(function (id) { return pw.indexOf(id) >= 0; }));
    var met = Core.shuffle(ids.filter(function (id) { return pref.indexOf(id) < 0 && SRS.peek(lang, id).box >= 1; })), outP = [];
    pref.concat(met).forEach(function (id) { if (outP.length < Math.min(ROUND, ids.length) && outP.indexOf(id) < 0) outP.push(id); });
    if (outP.length >= 3) return Core.shuffle(outP);
  }
  var due = SRS.dueList(lang).filter(function (id) { return ids.indexOf(id) >= 0; });
  var neu = Core.shuffle(ids.filter(function (id) { return SRS.peek(lang, id).box < 1; }));
  var rest = Core.shuffle(ids.filter(function (id) { return due.indexOf(id) < 0 && neu.indexOf(id) < 0; }));
  var n = Math.min(ROUND, ids.length), out = [];
  due.concat(neu, rest).forEach(function (id) { if (out.length < n && out.indexOf(id) < 0) out.push(id); });
  return Core.shuffle(out);
}

/* ---------- the screen ---------- */
UI.screens.scene = function (flow, root, p) {
  var lang = p.lang || Core.curLang(), sc = SA[p.scene] || Scene.forWorld(p.world);
  var W = SA.W, H = SA.H, MAXCAM = W - VIEW_W;
  root.classList.add('scn');
  document.body.style.background = sc.edge;
  FX.levelStart();

  /* --- world layers --- */
  var world = el('div', 'sworld'); root.appendChild(world);
  world.appendChild(el('div', 'slayer sbg', sc.bg));
  var back = el('div', 'slayer sback'); world.appendChild(back);
  world.appendChild(el('div', 'slayer sfg', sc.fg));
  var front = el('div', 'slayer sfront'); world.appendChild(front);
  var nodes = {};          /* id -> {def, node, hidden(bool: still in the back layer), found} */
  sc.items.forEach(function (d) {
    if (!D.items[d.id]) return;
    var n = el('div', 'sitem'), s = d.s / 10;
    n.style.left = (d.x / 10 - s / 2) + 'rem'; n.style.top = (d.y / 10 - s / 2) + 'rem'; n.style.width = s + 'rem'; n.style.height = s + 'rem';
    n.dataset.id = d.id;
    var inner = el('div', 'sin'); inner.appendChild(Core.Pic.el(Core.item(d.id))); n.appendChild(inner);
    back.appendChild(n);
    var hit = Math.max(MIN_HIT, d.hit || MIN_HIT);
    /* a visible-in-debug hit box (never intercepts input: the engine hit-tests by distance) */
    var hb = el('div', 'shit'); hb.style.left = (d.x - hit / 2) / 10 + 'rem'; hb.style.top = (d.y - hit / 2) / 10 + 'rem'; hb.style.width = hit / 10 + 'rem'; hb.style.height = hit / 10 + 'rem'; hb.dataset.id = d.id;
    front.appendChild(hb);
    nodes[d.id] = { def: d, node: n, hit: hb, hitSize: hit, found: false };
  });

  /* --- chrome --- */
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { if (p.path) Path.home(); else UI.go('path', { world: p.world }); }));
  var targets = pickTargets(lang, sc, p.path ? (p.words || []) : null), total = targets.length;
  var dots = UI.dots(total); bar.appendChild(dots);
  var speaker = UI.speakerBtn(function () { replay(); });
  bar.appendChild(speaker);
  var helpBtn = UI.helpBtn(function () { onHelp(); }); helpBtn.classList.add('top-help'); bar.appendChild(helpBtn);
  var lisa = Lisa.make({ cls: 'corner-lisa scn-lisa' }); root.appendChild(lisa);
  var arrL = UI.btn('sarrow sar-l', '<span class="ic">' + Lisa.ico.back + '</span>', function () { panTo(cam - 760, 700); }, { nopress: true });
  var arrR = UI.btn('sarrow sar-r', '<span class="ic">' + Lisa.ico.next + '</span>', function () { panTo(cam + 760, 700); }, { nopress: true });
  root.appendChild(arrL); root.appendChild(arrR);

  /* --- camera: position in units, drag + inertia + tweens --- */
  var cam = 0, vel = 0, raf = 0, tween = null, dragging = false, lastT = 0;
  function setCam(v) { cam = Core.clamp(v, 0, MAXCAM); world.style.transform = 'translate3d(' + (-cam / 10) + 'rem,0,0)'; arrows(); }
  function arrows() { arrL.classList.toggle('off', cam < 30); arrR.classList.toggle('off', cam > MAXCAM - 30); arrL.classList.toggle('shown', cam >= 30); arrR.classList.toggle('shown', cam <= MAXCAM - 30); }
  function frameRect() { return document.getElementById('frame').getBoundingClientRect(); }
  function unitPx() { return frameRect().width / VIEW_W; }
  function tick(t) {
    raf = 0;
    if (flow.dead) return;
    var dt = Math.min(48, t - (lastT || t)); lastT = t;
    if (tween) {
      var k = Math.min(1, (t - tween.t0) / tween.ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setCam(tween.from + (tween.to - tween.from) * e);
      if (k >= 1) { var f = tween.done; tween = null; if (f) f(); }
    } else if (!dragging && Math.abs(vel) > 0.02) {
      setCam(cam + vel * dt);
      vel *= Math.pow(0.93, dt / 16);
      if (cam <= 0 || cam >= MAXCAM) vel = 0;
    }
    if (tween || (!dragging && Math.abs(vel) > 0.02)) raf = requestAnimationFrame(tick); else lastT = 0;
  }
  function kick() { if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); } }
  function panTo(x, ms, done) {
    x = Core.clamp(x, 0, MAXCAM); vel = 0;
    if (Core.fast) { setCam(x); if (done) done(); return; }
    tween = { from: cam, to: x, t0: performance.now(), ms: Math.max(200, (ms || 800) / Core.speed), done: done }; kick();
  }
  flow.onKill(function () { if (raf) cancelAnimationFrame(raf); raf = 0; });

  /* --- pointer handling on the scene: drag to pan, small movement = tap --- */
  var down = null, samples = [];
  root.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (down) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: cam, t: performance.now(), moved: false };
    samples = [{ x: e.clientX, t: down.t }];
    tween = null; vel = 0; dragging = true; root.classList.add('grab');
  });
  function onMove(e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 9) down.moved = true;
    if (down.moved) {
      setCam(down.cam - dx / unitPx());
      var now = performance.now(); samples.push({ x: e.clientX, t: now }); if (samples.length > 6) samples.shift();
    }
  }
  function onUp(e) {
    if (!down || e.pointerId !== down.id) return;
    var d = down; down = null; dragging = false; root.classList.remove('grab');
    if (e.type === 'pointercancel') return;
    if (!d.moved) { handleTap(e.clientX, e.clientY); return; }
    var a = samples[0], b = samples[samples.length - 1];
    if (a && b && b.t - a.t > 8 && performance.now() - b.t < 160) vel = -((b.x - a.x) / unitPx()) / (b.t - a.t);
    else vel = 0;
    vel = Core.clamp(vel, -3.2, 3.2);
    kick();
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  flow.onKill(function () { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); });

  /* --- round state --- */
  var idx = 0, tid = null, locked = true, helpedNow = false, helpPresses = 0, otherTaps = 0, tapOtherSaid = false, helps = 0, finishedRound = false;
  var foundResolve = null, glowEl = null, idleMs = 0, seq = Core.inputSeq, peeked = false, panned = false, asking = false;
  var frozen = false;
  function n0(id) { return nodes[id]; }

  function worldPoint(cx, cy) { var r = frameRect(), u = r.width / VIEW_W; return { x: cam + (cx - r.left) / u, y: (cy - r.top) / u }; }
  function hitTest(wx, wy) {
    var best = null, bd = 9;
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id], h = n.hitSize / 2, dx = Math.abs(wx - n.def.x), dy = Math.abs(wy - n.def.y);
      if (dx > h || dy > h) return;
      var d = Math.max(dx, dy) / h;
      if (d < bd) { bd = d; best = n; }
    });
    return best;
  }
  function wiggle(n, cls) { n.node.classList.remove('wig', 'peekwig'); void n.node.offsetWidth; n.node.classList.add(cls || 'wig'); }
  function toFront(n) { if (n.node.parentNode !== front) front.appendChild(n.node); }

  function handleTap(cx, cy) {
    var pt = worldPoint(cx, cy), n = hitTest(pt.x, pt.y);
    if (!n) { try { FX.burst(cx - frameRect().left, cy - frameRect().top, { n: 4, power: 0.45 }); } catch (e) { /* cosmetic */ } return; }
    if (locked) { /* between questions: still fun, still errorless */ if (!n.found) { toFront(n); wiggle(n); Snd.say([Core.url.w(lang, n.def.id)]); } return; }
    if (n.def.id === tid) { foundIt(n); return; }
    /* another item (or one already found): wiggle + its own name; never a miss, never a lost star */
    toFront(n); wiggle(n); Snd.sfx('pop');
    if (!n.found) otherTaps++;
    var list = [Core.url.w(lang, n.def.id)];
    if (otherTaps >= 2 && !tapOtherSaid && !n.found) {
      tapOtherSaid = true;
      var tl = Core.ruUrl('scene_tap_other');
      if (tl) list.push(250, tl);
      list.push(350, Core.url.q(lang, tid));
    }
    Snd.say(list);
    idleMs = 0;
  }

  function replay() { if (tid && !locked) { Snd.say([Core.url.q(lang, tid)]); UI.pulse(speaker); } }
  function onHelp() {
    if (!tid || locked) return;
    helpPresses++; idleMs = 0;
    var list = [Core.ruUrl('scene_help'), 300, Core.url.q(lang, tid)];
    Snd.say(list); lisa.react('point');
    /* the second press on the same target gives a real hint (glow + pan); that answer counts as helped */
    if (helpPresses >= 2) assist();
  }
  /* soft glow around the target + pan to it; the answer then counts as helped (no promotion, never a penalty) */
  function assist() {
    var n = nodes[tid]; if (!n) return;
    helpedNow = true; showGlow(n);
    var d = n.def; if (d.x < cam + 260 || d.x > cam + VIEW_W - 260) panTo(d.x - VIEW_W / 2, 1000);
  }
  function showGlow(n) {
    clearGlow();
    glowEl = el('div', 'sglow'); var g = Math.max(n.def.s, 140) * 1.5 / 10;
    glowEl.style.left = (n.def.x / 10 - g / 2) + 'rem'; glowEl.style.top = (n.def.y / 10 - g / 2) + 'rem'; glowEl.style.width = g + 'rem'; glowEl.style.height = g + 'rem';
    front.appendChild(glowEl);
  }
  function clearGlow() { if (glowEl && glowEl.parentNode) glowEl.parentNode.removeChild(glowEl); glowEl = null; }

  async function foundIt(n) {
    if (locked) return;
    locked = true; clearGlow();
    var first = !helpedNow, i = idx;
    n.found = true; toFront(n); n.node.classList.remove('wig', 'peekwig'); n.node.classList.add('found', 'joy');
    var bd = el('div', 'sbadge', Lisa.ico.star); n.node.appendChild(bd);
    var fxr = FX.correct(n.node, { hud: dots, lisa: lisa, first: first, helped: helpedNow });
    if (helpedNow) { SRS.touch(lang, tid); helps++; } else SRS.answer(lang, tid, true);
    dots.set(i + 1);
    var t0 = Date.now(), voice = FX.voiceFor('yes', fxr.milestone) || Core.praiseUrl(lang);
    await flow.say([Core.url.w(lang, tid), 150, voice]);
    await flow.wait(Math.max(150, fxr.hold - (Date.now() - t0) * Core.speed));
    if (foundResolve) { var f = foundResolve; foundResolve = null; f(); }
  }

  /* --- idle help: 8 s voice + wiggle, 15 s glow + auto-pan --- */
  flow.every(500, function () {
    if (finishedRound || locked || !tid || frozen) { idleMs = 0; return; }
    if (seq !== Core.inputSeq) { seq = Core.inputSeq; idleMs = 0; peeked = false; panned = false; return; }
    if (Snd.busy()) return;
    idleMs += 500;
    var n = nodes[tid];
    if (!peeked && idleMs >= PEEK_MS) {
      peeked = true;
      var pl = Core.ruUrl('scene_peek'); if (pl) Snd.say([pl]);
      if (n) wiggle(n, 'peekwig');
      UI.pulse(speaker);
    }
    if (!panned && idleMs >= HELP_MS) {
      panned = true; assist();
      Snd.say([Core.url.q(lang, tid)]);
    }
  });

  /* wait until the voice chain is quiet (an exploring tap may be mid-word), at most maxMs of virtual time */
  async function quiet(maxMs) { var w = 0; while (Snd.busy() && w < maxMs) { await flow.wait(200); w += 200; } }

  /* --- the round --- */
  (async function () {
    setCam(0); arrows();
    await flow.wait(350);
    var intro = Core.ruUrl(sc.introKey);
    Snd.say(intro ? [intro] : []);
    /* a little pan to the right and back shows the picture is bigger than the screen */
    panTo(300, 1400, function () { if (!down && !dragging) panTo(0, 1400); });
    await flow.wait(1200);
    locked = false; asking = true;
    for (var i = 0; i < total; i++) {
      if (p.path && i > 0 && Path.shouldStop()) { total = i; break; }
      idx = i; tid = targets[i]; helpedNow = false; helpPresses = 0; peeked = false; panned = false; idleMs = 0; seq = Core.inputSeq; locked = false;
      dots.set(i);
      var pr = new Promise(function (res) { foundResolve = res; });
      await quiet(7000);
      if (!n0(tid).found) { Snd.say([Core.url.q(lang, tid)]); UI.pulse(speaker); }
      await pr;
      locked = true;
    }
    finishedRound = true; tid = null; locked = true; dots.set(total);
    /* end: scene_done, then the normal level-complete flow */
    Snd.sfx('good'); lisa.react('cheer');
    if (!p.path) await flow.say([Core.ruUrl('scene_done'), 200, Core.lisaLine('level')].filter(Boolean));
    await flow.wait(400);
    if (p.path) { Path.finishStep(flow, { scene: sc.id, helps: helps }); return; }
    var rec = Scene.rec(lang, sc.id), stars = Core.starsFor(Math.max(0, helps - 1)), gain = Math.max(0, stars - (rec.stars || 0));
    rec.stars = Math.max(rec.stars || 0, stars); rec.plays++;
    if (gain) Core.addStars(gain);
    if (rec.plays === 1) Core.houseGift();
    Core.addXP(Core.XP.level);
    Core.persist();
    UI.go('result', { lang: lang, world: p.world, kind: 'scene', scene: sc.id, level: -1, stars: stars, gain: gain, mistakes: helps, xp: FX.level.xp + Core.XP.level });
  })();

  /* test hooks (harmless in production) */
  window.__sceneTest = {
    state: function () { return { scene: sc.id, cam: Math.round(cam), max: MAXCAM, idx: idx, total: total, target: tid, targets: targets.slice(), locked: locked, others: otherTaps, helps: helps, helped: helpedNow,
      found: Object.keys(nodes).filter(function (k) { return nodes[k].found; }), glow: !!glowEl, done: finishedRound }; },
    setCam: function (x) { tween = null; vel = 0; setCam(x); },
    rect: function (id) { var r = nodes[id].hit.getBoundingClientRect(), f = frameRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, fx: f.left, fy: f.top, fw: f.width, fh: f.height }; },
    items: function () { return Object.keys(nodes).map(function (k) { var n = nodes[k]; return { id: k, x: n.def.x, y: n.def.y, hit: n.hitSize, found: n.found }; }); },
    idle: function (ms) { idleMs = ms; seq = Core.inputSeq; },
    freeze: function (on) { frozen = !!on; idleMs = 0; }
  };
  flow.onKill(function () { window.__sceneTest = null; Scene.cur = null; });
  Scene.cur = { sc: sc };
};
})();
