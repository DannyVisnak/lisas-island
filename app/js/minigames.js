/* Lisa's Island - shared mini-game base. A game is ONE file app/js/mg_<id>.js (+ optional app/css/mg_<id>.css) that calls MG.register(...).
   This file owns: the registry, the world-path entry nodes (next to the seek-and-find scene node), the screen UI.screens.minigame,
   the per-game ctx (chrome, Lisa, ask/say/ru, correct/other, target picking, idle help, finish) and the pointer-drag helper MG.drag.
   API reference: SPEC.md "Mini-games". Looks: css/minigames.css. Nothing here touches fx.js / the fx rules in style.css. */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap, SRS = Core.SRS;
var MG = window.MG = { games: {}, order: [], cur: null };

var PEEK_MS = 8000;      /* idle: replay the question + wiggle the target (like the scenes) */
var HELP_MS = 15000;     /* idle: assist (glow / game hint); the answer then counts as helped */

/* ---------- registry ---------- */
/* def = { id, worlds:[worldIds], icon:'<svg viewBox="0 0 100 100">..</svg>' (white on the node colour), title, color:'#hex' (node), scene:'meadow'|'sea'|..|false (backdrop),
           start:function (root, ctx) } */
MG.register = function (def) {
  if (!def || !def.id || typeof def.start !== 'function') throw new Error('MG.register: need {id, start}');
  if (!MG.games[def.id]) MG.order.push(def.id);
  MG.games[def.id] = def;
  return def;
};
MG.forWorld = function (wid) { return MG.order.map(function (k) { return MG.games[k]; }).filter(function (g) { return (g.worlds || []).indexOf(wid) >= 0; }); };
/* same rule as the scenes: open once the world's first level (meeting the first words) is done */
MG.unlocked = function (lang, wid) { return !!Core.lv(lang, wid)[0].done; };
MG.rec = function (lang, id) {
  var L = Core.L(lang); if (!L.minigames) L.minigames = {};
  return L.minigames[id] || (L.minigames[id] = { stars: 0, plays: 0 });
};
MG.starRow = function (n) { return '<span class="lvstars">' + [0, 1, 2].map(function (s) { return '<i>' + (n > s ? Lisa.ico.star : Lisa.ico.starOff) + '</i>'; }).join('') + '</span>'; };

/* ---------- path entry nodes: scene node first (if the world has a scene), then every registered game of the world ---------- */
/* three slots in the free band above the level path (checked at 1366x768 and 1128x752: no overlap with the 5 level nodes or their stars) */
MG.SLOTS = [{ x: 90, y: 21 }, { x: 77, y: 21 }, { x: 64, y: 21 }];
/* g = { busy: function () -> bool, take: function () } (the path screen's double-tap guard) */
MG.pathNodes = function (root, lang, wid, g) {
  var entries = [];
  var scn = window.Scene && Scene.forWorld(wid);
  if (scn) entries.push({ kind: 'scene', id: scn.id, icon: SceneArt.icon, rec: Scene.rec(lang, scn.id), open: Scene.unlocked(lang, wid), go: function () { UI.go('scene', { lang: lang, world: wid, scene: scn.id }); } });
  MG.forWorld(wid).forEach(function (d) {
    entries.push({ kind: 'mg', id: d.id, icon: d.icon, color: d.color, rec: MG.rec(lang, d.id), open: MG.unlocked(lang, wid), go: function () { UI.go('minigame', { lang: lang, world: wid, game: d.id }); } });
  });
  entries.slice(0, MG.SLOTS.length).forEach(function (e, i) {
    var pos = MG.SLOTS[i], stars = e.rec.stars || 0;
    var cls = (e.kind === 'scene' ? 'scenenode' : 'mgnode mg-' + e.id) + (e.open ? ' open' : ' locked') + (stars ? ' done' : '');
    var n = el('div', cls);
    n.style.left = pos.x + '%'; n.style.top = pos.y + '%';
    if (e.kind === 'scene') n.dataset.scene = e.id; else { n.dataset.mg = e.id; if (e.color) n.style.setProperty('--mgc', e.color); }
    n.innerHTML = '<span class="lvic">' + e.icon + '</span>' + (stars ? MG.starRow(stars) : '');
    if (!e.open) n.appendChild(el('span', 'lockic', Lisa.ico.lock));
    tap(n, function () {
      if (g.busy()) return;
      if (!e.open) { Snd.sfx('boop'); n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); return; }
      g.take(); Snd.sfx('door'); e.go();
    }, { nopress: true });
    root.appendChild(n);
  });
};

/* ---------- pointer drag with snap-back (touch + mouse) ----------
   h = MG.drag(node, { targets: [el..] | function () -> [el..], pad: 0 (px around each target), point: 'center'|'pointer' (what must be inside a target),
                       onStart(info), onMove(info), onDrop(targetEl|null, info) -> false | 'back' | Promise of those, onTap(info), lift: 1.12, minMove: 9 })
   - Moves the node with the CSS `translate` property (never touches `transform`, so wiggle animations keep working) and raises it above everything.
   - A release over a target calls onDrop(target, info); the node STAYS there unless onDrop returns false/'back'. A release over nothing calls onDrop(null, info)
     (so a game can play its errorless "that is X" line) and always snaps back. Movement under minMove px is a tap -> onTap.
   - h.disable(true|false), h.reset() (offset back to 0, no animation), h.destroy(). info = { node, x, y, dx, dy, target }. */
MG.drag = function (node, o) {
  o = o || {};
  var h = { disabled: false }, st = null, minMove = o.minMove || 9;
  node.classList.add('mgdrag-able');
  function list() { var t = typeof o.targets === 'function' ? o.targets() : o.targets; return [].concat(t || []).filter(Boolean); }
  function setOff(dx, dy, s) { node.style.translate = dx + 'px ' + dy + 'px'; node.style.scale = s || '1'; }
  function pick(cx, cy) {
    var best = null, bd = 1e9, pad = o.pad || 0;
    list().forEach(function (t) {
      var r = t.getBoundingClientRect();
      if (cx < r.left - pad || cx > r.right + pad || cy < r.top - pad || cy > r.bottom + pad) return;
      var d = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
      if (d < bd) { bd = d; best = t; }
    });
    return best;
  }
  function onDown(e) {
    if (h.disabled || st || (MG.cur && MG.cur.prompting && MG.cur.prompting())) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); Snd.unlock();
    st = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
  }
  function info(e, s) { s = s || st; return { node: node, x: e.clientX, y: e.clientY, dx: e.clientX - s.x, dy: e.clientY - s.y, target: null }; }
  function onMove(e) {
    if (!st || e.pointerId !== st.id) return;
    var dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved) {
      if (Math.hypot(dx, dy) <= minMove) return;
      st.moved = true; node.classList.remove('mgback'); node.classList.add('mgdragging');
      if (o.onStart) o.onStart(info(e));
    }
    setOff(dx, dy, String(o.lift || 1.12));
    if (o.onMove) o.onMove(info(e));
  }
  function snap() {
    node.classList.add('mgback'); setOff(0, 0, '1');
    setTimeout(function () { node.classList.remove('mgback', 'mgdragging'); }, 320 / Core.speed + 30);
  }
  async function onUp(e) {
    if (!st || e.pointerId !== st.id) return;
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    var s = st; st = null;
    var i = info(e, s);
    if (e.type === 'pointercancel') { if (s.moved) snap(); return; }
    if (s.promptBlocked || (MG.cur && MG.cur.prompting && MG.cur.prompting())) { snap(); return; }
    if (!s.moved) { if (o.onTap) o.onTap(i); return; }
    var cx, cy;
    if (o.point === 'pointer') { cx = e.clientX; cy = e.clientY; } else { var r = node.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    var t = pick(cx, cy); i.target = t;
    var keep = false;
    if (o.onDrop) { var r2 = o.onDrop(t, i); if (r2 && typeof r2.then === 'function') r2 = await r2; keep = !!t && r2 !== false && r2 !== 'back'; } else keep = false;
    if (keep) node.classList.remove('mgdragging'); else snap();
  }
  node.addEventListener('pointerdown', onDown);
  h.disable = function (on) { h.disabled = on == null ? true : !!on; node.classList.toggle('mgfrozen', h.disabled); };
  h.reset = function () { node.classList.remove('mgback', 'mgdragging'); node.style.translate = ''; node.style.scale = ''; };
  h.destroy = function () { node.removeEventListener('pointerdown', onDown); node.classList.remove('mgdrag-able'); h.reset(); st = null; };
  return h;
};

/* ---------- placeholder screen used by the stub files (a builder deletes the MG.stub call and writes the real game) ---------- */
MG.stub = function (root, ctx) {
  ctx.chrome({ total: 1 });
  var go = el('div', 'mgstub-go', '<span class="mgstub-ic">' + ctx.def.icon + '</span>');
  tap(go, function () { go.classList.add('off'); ctx.setTarget(null); ctx.finish({ helps: 0 }); }, { nopress: true });
  go.style.setProperty('--mgc', ctx.def.color || '#7e57c2');
  root.appendChild(go); root.classList.add('mgstub');
  ctx.intro();
};

/* ---------- the screen ---------- */
UI.screens.minigame = function (flow, root, p) {
  var def = MG.games[p.game];
  if (!def) { UI.go(p.world ? 'path' : 'map', p.world ? { world: p.world } : {}); return; }
  var lang = p.lang || Core.curLang();
  root.classList.add('mg', 'mg-' + def.id);
  if (def.scene !== false) UI.scene(root, def.scene || 'meadow');
  FX.levelStart();
  var ctx = makeCtx(def, lang, p, flow, root);
  MG.cur = ctx;
  flow.onKill(function () { if (MG.cur === ctx) MG.cur = null; if (window.__mgTest && window.__mgTest.id === def.id) window.__mgTest = null; });
  window.__mgTest = { id: def.id, state: ctx.state };
  var fail = function (e) { try { console.error('minigame ' + def.id + ': ' + (e && e.stack || e)); } catch (x) { /* none */ } };
  try { var r = def.start(root, ctx); if (r && r.catch) r.catch(fail); } catch (e) { fail(e); }
};

function makeCtx(def, lang, p, flow, root) {
  var id = def.id, world = p.world;
  var ctx = { id: id, def: def, lang: lang, world: world, flow: flow, root: root, MG: MG, ui: null, dots: null, lisa: null, speaker: null, helpBtn: null, total: 0,
    target: null, targetNode: null, stats: { helps: 0, others: 0, correct: 0 }, done: 0, finished: false, locked: false, frozen: false };
  var helpedNow = false, helpPresses = 0, othersSince = 0, saidOther = {}, idleMs = 0, seq = Core.inputSeq, peeked = false, assisted = false, idleOn = false;
  var promptTargets = [];
  var promptGeneration = 0;
  ctx.prompting = function () { return flow.promptActive(); };
  ctx.promptGen = function () { return promptGeneration; };
  ctx.prompt = function (list, targets) { promptGeneration++; return flow.prompt(root, list, targets || promptTargets); };
  /* Prompt dimming shows the active answer surface; targetNode remains the separate hint/glow target. */
  ctx.setPromptTargets = function (nodes) {
    promptTargets = (nodes || []).filter(Boolean);
    if (flow.promptActive()) promptTargets.forEach(function (node) { flow.promptAddTarget(node); });
  };
  ctx.input = function (fn) { return function () { if (flow.promptActive() || ctx.locked || ctx.finished) return; return fn.apply(this, arguments); }; };
  var hooks = { peek: null, assist: null, help: null }, extra = {}, glowNode = null, idx = 0;

  /* ----- keys / audio ----- */
  /* ctx.key('help') -> 'mg_<id>_help'; a key that already starts with mg_ or exists in the RU ui table is used as is */
  function key(k) { return (k.indexOf('mg_') === 0 || (D.ui.ru && D.ui.ru[k])) ? k : 'mg_' + id + '_' + k; }
  ctx.ruUrl = function (k) { return Core.ruUrl(key(k)); };                          /* url or null (parent switch off) */
  ctx.ru = function (k, extraList) { var u = ctx.ruUrl(k), l = [].concat(u || [], extraList || []); return l.length ? flow.say(l) : flow.wait(150); };
  ctx.askUrl = function (item) { return Core.url.q(lang, item); };
  ctx.wordUrl = function (item) { return Core.url.w(lang, item); };
  ctx.ask = function (item) { return ctx.prompt([ctx.askUrl(item)]); };               /* "where is the X" / "what is it" clip in the current language */
  ctx.say = function (item) { return flow.say([ctx.wordUrl(item)]); };               /* the bare word */
  ctx.praise = function (milestone) { return FX.voiceFor('yes', milestone) || Core.praiseUrl(lang); };
  ctx.quiet = async function (maxMs) { var w = 0; maxMs = maxMs || 7000; while (Snd.busy() && w < maxMs) { await flow.wait(200); w += 200; } };
  ctx.intro = async function () { await flow.wait(350); return ctx.ru('intro'); };

  /* ----- chrome: back, progress dots (FX.hud), speaker replay, help bulb, corner Lisa. opts = {total, lisa: 'corner'|false, speaker, help} ----- */
  ctx.chrome = function (o) {
    o = o || {};
    var bar = el('div', 'topbar'); root.appendChild(bar);
    bar.appendChild(UI.backBtn(function () { if (p.path) Path.home(); else UI.go('path', { world: world }); }));
    ctx.total = o.total || ctx.total || 0;
    ctx.dots = UI.dots(ctx.total); bar.appendChild(ctx.dots);
    if (o.speaker !== false) { ctx.speaker = UI.speakerBtn(function () { ctx.replay(); }); bar.appendChild(ctx.speaker); }
    if (o.help !== false) { ctx.helpBtn = UI.helpBtn(function () { onHelp(); }); ctx.helpBtn.classList.add('top-help'); bar.appendChild(ctx.helpBtn); }
    if (o.lisa !== false) { ctx.lisa = Lisa.make({ cls: 'corner-lisa mg-lisa' }); root.appendChild(ctx.lisa); }
    ctx.ui = { bar: bar, dots: ctx.dots, speaker: ctx.speaker, helpBtn: ctx.helpBtn, lisa: ctx.lisa };
    return ctx.ui;
  };
  /* put Lisa anywhere: o = { left, top, width (units: 1 unit = 0.1 rem, frame is 1366 x 768), cls, pose, replace: true replaces the corner Lisa } */
  ctx.placeLisa = function (o) {
    o = o || {};
    if (o.replace !== false && ctx.lisa && ctx.lisa.parentNode) ctx.lisa.parentNode.removeChild(ctx.lisa);
    var l = Lisa.make({ cls: 'mg-lisa mg-lisa-placed ' + (o.cls || '') });
    var w = (o.width || 150) / 10;
    l.style.left = (o.left || 0) / 10 + 'rem'; l.style.top = (o.top || 0) / 10 + 'rem'; l.style.width = w + 'rem'; l.style.height = (w * 1.127) + 'rem';
    root.appendChild(l); if (o.pose) l.pose(o.pose);
    ctx.lisa = l; if (ctx.ui) ctx.ui.lisa = l;
    return l;
  };
  ctx.progress = function (n) { ctx.done = n; if (ctx.dots) ctx.dots.set(n); };
  ctx.replay = function () { if (ctx.target && !ctx.locked && !ctx.prompting()) { ctx.ask(ctx.target); if (ctx.speaker) UI.pulse(ctx.speaker); } };

  /* ----- target + idle help ----- */
  ctx.setTarget = function (item, node) {
    ctx.target = item; ctx.targetNode = node || null; helpedNow = false; helpPresses = 0; othersSince = 0; peeked = false; assisted = false; idleMs = 0; seq = Core.inputSeq;
    ctx.clearGlow(); ctx.locked = !item; if (item) startIdle();
  };
  ctx.setTargetNode = function (node) {
    ctx.targetNode = node || null;
    if (node) flow.promptAddTarget(node);
  };
  ctx.lock = function (on) { ctx.locked = on == null ? true : !!on; idleMs = 0; };
  ctx.freeze = function (on) { ctx.frozen = !!on; idleMs = 0; };                     /* pauses idle help (tests, long animations) */
  ctx.helped = function () { return helpedNow; };
  ctx.markHelped = function () { helpedNow = true; };
  ctx.onPeek = function (fn) { hooks.peek = fn; };                                     /* 8 s idle. default: replay question + wiggle the target node */
  ctx.onAssist = function (fn) { hooks.assist = fn; };                                 /* 15 s idle / 2nd help press. default: glow the target node. counts as helped */
  ctx.onHelp = function (fn) { hooks.help = fn; };                                     /* every help press, after the voice (fn(pressCount)) */
  ctx.wiggle = function (node, cls) { if (!node) return; node.classList.remove('mgwig', 'mgpeek'); void node.offsetWidth; node.classList.add(cls || 'mgwig'); };
  ctx.glow = function (node) { ctx.clearGlow(); if (node) { glowNode = node; node.classList.add('mgglow'); } };
  ctx.clearGlow = function () { if (glowNode) glowNode.classList.remove('mgglow'); glowNode = null; };
  function assist() {
    if (!ctx.target) return;
    helpedNow = true;
    if (hooks.assist) hooks.assist(ctx.target, ctx.targetNode); else ctx.glow(ctx.targetNode);
  }
  ctx.assist = assist;
  function onHelp() {
    if (!ctx.target || ctx.locked || flow.promptActive()) return;
    helpPresses++; idleMs = 0;
    ctx.prompt([ctx.ruUrl('help'), 300, ctx.askUrl(ctx.target)]); if (ctx.lisa && ctx.lisa.react) ctx.lisa.react('point');
    if (hooks.help) hooks.help(helpPresses);
    if (helpPresses >= 2) assist();                      /* the second press on the same target gives a real hint; that answer counts as helped */
  }
  function startIdle() {
    if (idleOn) return; idleOn = true;
    flow.every(500, function () {
      if (ctx.finished || ctx.locked || !ctx.target || ctx.frozen) { idleMs = 0; return; }
      if (seq !== Core.inputSeq) { seq = Core.inputSeq; idleMs = 0; peeked = false; assisted = false; return; }
      if (Snd.busy()) return;
      idleMs += 500;
      if (!peeked && idleMs >= PEEK_MS) {
        peeked = true;
        if (hooks.peek) hooks.peek(ctx.target, ctx.targetNode); else { ctx.wiggle(ctx.targetNode, 'mgpeek'); ctx.ask(ctx.target); }
        if (ctx.speaker) UI.pulse(ctx.speaker);
      }
      if (!assisted && idleMs >= HELP_MS) { assisted = true; assist(); if (!hooks.assist) ctx.ask(ctx.target); }
    });
  }

  /* ----- picking: SRS due -> new -> rest, shuffled. worldIds = 'food' | ['food','nature']; o = { pool: [itemIds] (restrict), exclude: [itemIds] } ----- */
  ctx.pickTargets = function (worldIds, n, o) {
    o = o || {};
    var ids = [];
    [].concat(worldIds || world).forEach(function (w) { (Core.worldItems(w) || []).forEach(function (i) { if (ids.indexOf(i) < 0) ids.push(i); }); });
    ids = ids.filter(function (i) { return D.items[i] && D.items[i][lang] && (!o.pool || o.pool.indexOf(i) >= 0) && (!o.exclude || o.exclude.indexOf(i) < 0); });
    if (p.path) {
      /* linear path: today's words first (p.words), then due words, then other words the child already met. Never an unmet word. */
      var pref = Core.shuffle(ids.filter(function (i) { return (p.words || []).indexOf(i) >= 0; }));
      var met = ids.filter(function (i) { return pref.indexOf(i) < 0 && SRS.peek(lang, i).box >= 1; });
      var dueP = SRS.dueList(lang).filter(function (i) { return met.indexOf(i) >= 0; });
      var restP = Core.shuffle(met.filter(function (i) { return dueP.indexOf(i) < 0; }));
      var outP = [];
      pref.concat(dueP, restP).forEach(function (i) { if (outP.length < Math.min(n || 6, ids.length) && outP.indexOf(i) < 0) outP.push(i); });
      if (outP.length) return Core.shuffle(outP);
    }
    var due = SRS.dueList(lang).filter(function (i) { return ids.indexOf(i) >= 0; });
    var neu = Core.shuffle(ids.filter(function (i) { return SRS.peek(lang, i).box < 1; }));
    var rest = Core.shuffle(ids.filter(function (i) { return due.indexOf(i) < 0 && neu.indexOf(i) < 0; }));
    var out = [];
    due.concat(neu, rest).forEach(function (i) { if (out.length < Math.min(n || 6, ids.length) && out.indexOf(i) < 0) out.push(i); });
    return Core.shuffle(out);
  };

  /* ----- answers ----- */
  /* correct answer: FX reward + SRS (helped -> touch, else answer first-try) + progress dot + [word, praise] voice; resolves after the reward hold.
     o = { helped: bool (default: the idle/help state), say: false (skip voice), count: false (don't advance the progress dots), praise: false } */
  ctx.correct = async function (node, item, o) {
    o = o || {};
    var helped = o.helped != null ? !!o.helped : helpedNow, first = !helped;
    ctx.clearGlow(); ctx.locked = true;
    var fxr = FX.correct(node, { hud: ctx.dots, lisa: ctx.lisa, first: first, helped: helped });
    if (item && D.items[item]) { if (helped) SRS.touch(lang, item); else SRS.answer(lang, item, true); }
    ctx.stats.correct++; if (helped) ctx.stats.helps++;
    if (o.count !== false) ctx.progress(ctx.done + 1);
    if (o.say === false) return fxr;
    var t0 = Date.now(), list = item ? [ctx.wordUrl(item)] : [];
    if (o.praise !== false) list.push(150, ctx.praise(fxr.milestone));
    await flow.say(list);
    await flow.wait(Math.max(150, fxr.hold - (Date.now() - t0) * Core.speed));
    return fxr;
  };
  /* errorless other answer: wiggle + the item's own name. Never FX.miss, never a lost star, never a reset of the combo.
     o = { ru: 'other' (a mg_<id>_ key played ONCE after `after` other-answers, then the question again), after: 2, replay: true, cls } */
  ctx.other = function (node, item, o) {
    o = o || {};
    ctx.stats.others++; othersSince++; idleMs = 0;
    ctx.wiggle(node, o.cls || 'mgwig'); Snd.sfx('pop');
    var list = item && D.items[item] ? [ctx.wordUrl(item)] : [];
    if (o.ru && othersSince >= (o.after || 2) && !saidOther[o.ru]) {
      var u = ctx.ruUrl(o.ru);
      if (u) { saidOther[o.ru] = true; list.push(250, u); if (o.replay !== false && ctx.target) list.push(350, ctx.askUrl(ctx.target)); }
    }
    return ctx.prompt(list);
  };

  /* ----- a standard round loop: intro, then for each target: setTarget -> ask -> await play(item, i) (resolves on the correct answer), then finish.
     o = { targets: [ids], intro: true, ask: true, play: async function (item, i) } ----- */
  ctx.run = async function (o) {
    var targets = o.targets || [];
    if (!ctx.dots) ctx.chrome({ total: targets.length });
    if (o.intro !== false) await ctx.intro();
    for (var i = 0; i < targets.length; i++) {
      if (p.path && i > 0 && Path.shouldStop()) break;
      idx = i; ctx.setTarget(targets[i], null); ctx.progress(i);
      await ctx.quiet(7000);
      if (o.ask !== false) ctx.ask(targets[i]);
      await o.play(targets[i], i);
      ctx.lock(true);
    }
    return ctx.finish();
  };

  /* ----- finish: mg_<id>_done + Lisa line, stars (3 / 2 / 1 from how many answers needed help), then the normal result screen ----- */
  ctx.finish = async function (s) {
    s = s || {};
    ctx.finished = true; ctx.target = null; ctx.locked = true; ctx.clearGlow();
    if (ctx.dots) ctx.dots.set(ctx.total);
    var helps = s.helps != null ? s.helps : ctx.stats.helps;
    Snd.sfx('good'); if (ctx.lisa && ctx.lisa.react) ctx.lisa.react('cheer');
    if (p.path) { await flow.wait(500); Path.finishStep(flow, { game: id, helps: helps }); return; }   /* path: no stars, gift or result screen here (PATH_SPEC 5) */
    await flow.say([ctx.ruUrl('done'), 200, Core.lisaLine('level')].filter(Boolean));
    await flow.wait(400);
    var rec = MG.rec(lang, id), stars = s.stars != null ? Core.clamp(s.stars, 1, 3) : Core.starsFor(Math.max(0, helps - 1)), gain = Math.max(0, stars - (rec.stars || 0));
    rec.stars = Math.max(rec.stars || 0, stars); rec.plays = (rec.plays || 0) + 1;
    if (gain) Core.addStars(gain);
    if (rec.plays === 1) Core.houseGift();
    Core.addXP(Core.XP.level);
    Core.persist();
    UI.go('result', { lang: lang, world: world, kind: 'minigame', game: id, level: -1, stars: stars, gain: gain, mistakes: helps, xp: FX.level.xp + Core.XP.level });
  };

  /* ----- test hooks: window.__mgTest = { id, state(), ...ctx.expose(obj) } ----- */
  ctx.state = function () {
    var s = { id: id, lang: lang, idx: idx, total: ctx.total, done: ctx.done, target: ctx.target, locked: ctx.locked, finished: ctx.finished, helps: ctx.stats.helps, others: ctx.stats.others, correct: ctx.stats.correct, helped: helpedNow, glow: !!glowNode };
    if (extra.state) { var e = extra.state(); for (var k in e) s[k] = e[k]; }
    return s;
  };
  ctx.expose = function (obj) { for (var k in obj) { if (k === 'state') extra.state = obj[k]; else window.__mgTest[k] = obj[k]; } };
  return ctx;
}
})();
