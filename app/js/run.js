/* Lisa's Island - "Run!" auto-run platformer with picture gates (canvas, fixed timestep). */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el;
var H = 768, GY = 480, SPEED = 300, GRAV = 2400, JUMP = 1000, HW = 30, DT = 1 / 60;

var THEMES = {
  meadow: { sky: ['#8fd3ff', '#e2f6ff'], far: '#b9e8a3', mid: '#8fd470', grass: '#6fcf4a', grass2: '#8be062', dirt: '#a8723f', dirt2: '#8a5c32', gap: '#5b3a22', crate: '#e0a35d', deco: 'tree', far2: 'hill', sun: 1 },
  farm: { sky: ['#ffd9a0', '#fff1d6'], far: '#f3d391', mid: '#e5b75f', grass: '#a6d44b', grass2: '#c3e76a', dirt: '#b17a45', dirt2: '#8f5e34', gap: '#5b3a22', crate: '#d9904a', deco: 'barn', far2: 'hill', sun: 1 },
  beach: { sky: ['#7fd8ff', '#d9f5ff'], far: '#ffe7b0', mid: '#ffd78a', grass: '#ffe08a', grass2: '#fff0b8', dirt: '#f2c773', dirt2: '#e0b058', gap: '#2f9fe0', crate: '#c98d50', deco: 'palm', far2: 'dune', sun: 1, water: true },
  night: { sky: ['#1c1c5e', '#4a3a8e'], far: '#3a468c', mid: '#2e3a7c', grass: '#3f8f6a', grass2: '#58b184', dirt: '#3b3568', dirt2: '#2d2955', gap: '#15153d', crate: '#8e7cc3', deco: 'pine', far2: 'mount', sun: 0 },
  town: { sky: ['#a9dcff', '#eaf7ff'], far: '#c4cee0', mid: '#a7b4cf', grass: '#8f98a8', grass2: '#aab3c2', dirt: '#6f7686', dirt2: '#5b6272', gap: '#3a3f4d', crate: '#e08f5d', deco: 'building', far2: 'sky', sun: 1 },
  candy: { sky: ['#ffd1ec', '#fff0fa'], far: '#f8b9dc', mid: '#f48fb1', grass: '#a5e68a', grass2: '#c4f2ae', dirt: '#c58a6b', dirt2: '#a86f52', gap: '#6b3f4f', crate: '#f2a3c7', deco: 'lolly', far2: 'hill', sun: 1 },
  autumn: { sky: ['#ffd8a8', '#fff3e0'], far: '#f0b27a', mid: '#e58f4b', grass: '#c9b84a', grass2: '#e0d06a', dirt: '#9c6a3c', dirt2: '#80532c', gap: '#4d3320', crate: '#d98c4a', deco: 'tree2', far2: 'hill', sun: 1 }
};
var WORLD_THEME = { animals: 'meadow', colors: 'candy', food: 'farm', phrases: 'meadow', numbers: 'beach', school: 'autumn', body: 'meadow', family: 'farm', toys: 'candy', clothes: 'autumn', home: 'farm', transport: 'town', nature: 'night', actions: 'beach' };

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hsh(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

UI.screens.run = function (flow, root, p) {
  var lang = p.lang, wid = p.world, wi = Core.worldIdx(wid), free = !!p.free, inPath = !!p.path;
  var th = THEMES[WORLD_THEME[wid] || 'meadow'];
  UI.scene(root, 'meadow');
  document.body.style.background = 'linear-gradient(' + th.sky[0] + ',' + th.dirt + ')';
  Core.$('.scene', root).remove();
  var cv = el('canvas', 'runcv'); root.appendChild(cv);
  var cx = cv.getContext('2d');
  var Wl = 1366, S0, dpr = 1, skyG = null;

  /* ----- world generation ----- */
  var rng = mulberry(Math.floor(Math.random() * 1e9));
  var words = inPath ? p.words.slice() : Core.worldItems(wid);   /* path: the words retrieved >= 2 times today */
  var nGates = inPath ? Math.min(5, Math.max(3, words.length)) : words.length > 6 ? 6 : 5;
  var gap = 3300, gateXs = [], i;
  for (i = 0; i < nGates; i++) gateXs.push(2800 + i * gap);
  var endX = gateXs[nGates - 1] + 2300, houseX = endX + 420;
  function nearGate(x, w) { return gateXs.some(function (g) { return x + w > g - 760 && x < g + 420; }); }
  var gaps = [], blocks = [], bubbles = [], cursor = 1250;
  var imgItems = Core.shuffle(words);
  function addBubble(x, y) {
    var id = imgItems[bubbles.length % imgItems.length], it = Core.item(id), b = { x: x, y: y, got: false, pop: 0, cv: null, hex: null };
    if (it.pic.type === 'emoji') {
      var im = new Image();
      im.onload = function () { try { var c = document.createElement('canvas'); c.width = c.height = 64; c.getContext('2d').drawImage(im, 0, 0, 64, 64); b.cv = c; } catch (e) {} };
      im.src = it.pic.src;
    } else if (it.pic.type === 'color') b.hex = it.pic.hex;
    bubbles.push(b);
  }
  while (cursor < endX - 1000) {
    var type = rng() < 0.55 ? 'gap' : 'block', w = type === 'gap' ? 150 + Math.floor(rng() * 45) : 100;
    if (nearGate(cursor, w)) { cursor += 500; continue; }
    if (type === 'gap') { gaps.push({ x0: cursor, x1: cursor + w }); }
    else { var bh = 70 + Math.floor(rng() * 25); blocks.push({ x0: cursor, x1: cursor + w, top: GY - bh }); }
    for (var k = 0; k < 5; k++) { var tt = k / 4; addBubble(cursor - 110 + (w + 220) * tt, GY - 70 - 150 * Math.sin(Math.PI * tt)); }
    cursor += w + 750 + Math.floor(rng() * 450);
  }
  for (i = 0; i < 14; i++) { var bx = 700 + i * ((endX - 900) / 14) + rng() * 200; if (!nearGate(bx, 150) && !gaps.some(function (g) { return bx > g.x0 - 120 && bx < g.x1 + 120; }) && !blocks.some(function (b) { return bx > b.x0 - 120 && bx < b.x1 + 120; })) for (k = 0; k < 3; k++) addBubble(bx + k * 70, GY - 60); }
  var segs = [], sx = -2000;
  gaps.forEach(function (g) { segs.push({ x0: sx, x1: g.x0 }); sx = g.x1; });
  segs.push({ x0: sx, x1: houseX + 1600 });

  /* gate targets: this world's words, plus up to 2 due review words from earlier worlds */
  var seq = UI.makeSeq(words, nGates), old = inPath ? [] : Core.SRS.dueList(lang).filter(function (id) { return Core.worldIdx(Core.item(id).world) < wi; });
  Core.shuffle(old).slice(0, 2).forEach(function (id, k) { seq[1 + k * 2] = id; });
  var gates = gateXs.map(function (x, k) { return { x: x, target: seq[k], state: 'closed', open: 0, lockT: 0 }; });
  var intro = Core.SRS.introduced(lang);
  var pool = intro.length >= 4 ? intro : words;

  /* ----- state ----- */
  var worn = Core.save.hats.worn.slice();
  var S = window.__runState = {
    state: 'ready', t: 0, gi: 0, gates: gates, mistakes: 0, collected: 0, blocked: false, blockT: 0, readyT: 0, finishT: 0,
    lisa: { x: 220, y: GY, vy: 0, onGround: true, coyote: 0, jumpBuf: 0 }, endX: endX, askActive: false, ad: { n: 2, recent: [], streak: 0 }, firstGate: true,
    cam: 0, parts: [], bounceT: 0, over: false, houseStop: houseX + 40, checkpointX: 220
  };
  var maxN = wi >= 3 ? 4 : 3;
  var ctxUI = { bar: null };

  /* ----- UI chrome ----- */
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { if (inPath) Path.home(); else UI.go(free ? 'map' : 'path', { world: wid }); }));
  FX.levelStart();
  var hud = UI.dots(gates.length); bar.appendChild(hud);
  var sp = UI.speakerBtn(function () { if (Q.cur) Q.cur.replay(); else Snd.say([Core.ruUrl('run_intro')]); });
  var coll = el('div', 'collected', '<i></i><b>0</b>'); bar.appendChild(coll);
  bar.appendChild(sp);
  var gateBar = null;

  /* ----- sizing ----- */
  function resize() {
    var w = root.clientWidth || 1366, h = root.clientHeight || 768;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    S0 = cv.height / H; Wl = cv.width / S0;
    skyG = cx.createLinearGradient(0, 0, 0, GY);
    skyG.addColorStop(0, th.sky[0]); skyG.addColorStop(1, th.sky[1]);
  }
  resize();
  window.addEventListener('resize', resize);
  flow.onKill(function () { window.removeEventListener('resize', resize); window.removeEventListener('keydown', onKeyDown); cancelAnimationFrame(raf); });

  /* ----- input ----- */
  function jumpAction() {
    Snd.unlock();
    if (S.state === 'ready') { startRun(); }
    if (S.state === 'run' || S.state === 'bounce') S.lisa.jumpBuf = 0.16;
  }
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); jumpAction(); });
  function startRun() { if (S.state === 'ready') S.state = 'run'; }
  function onKeyDown(e) {
    var target = e.target, tag = target && target.tagName;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tag || '') || (target.closest && target.closest('[contenteditable="true"]')))) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var key = e.key === ' ' || e.code === 'Space' ? 'Space' : e.code === 'ArrowUp' || e.key === 'ArrowUp' ? 'ArrowUp' : e.code === 'KeyW' || String(e.key || '').toLowerCase() === 'w' ? 'w' : '';
    if (!key) return;
    e.preventDefault();
    if (e.repeat) return;
    if (S.state === 'ready' || S.state === 'run' || S.state === 'bounce') jumpAction();
  }
  window.addEventListener('keydown', onKeyDown);

  /* ----- gate question: silent cue after 8 s, automatic help after 25 s without a tap ----- */
  UI.idle(flow, { visualMs: 8000, speakMs: 25000, active: function () { return S.askActive && !!Q.cur; },
    visual: function () { Q.cur.nudge(); }, speak: function () { Q.cur.help(); } });

  async function openGate(g) {
    S.askActive = true;
    gateBar = el('div', 'gatebar'); root.appendChild(gateBar); sp.classList.add('gone-gate');
    var gsp = UI.speakerBtn(function () { if (Q.cur) Q.cur.replay(); }); gsp.classList.add('gate-speaker'); gateBar.appendChild(gsp);
    var ghb = UI.helpBtn(function () { if (Q.cur) Q.cur.help(); }); ghb.classList.add('gate-help'); gateBar.appendChild(ghb);
    var holder = el('div', 'gate-holder'); gateBar.appendChild(holder);
    requestAnimationFrame(function () { gateBar.classList.add('up'); });
    Snd.sfx('whoosh');
    if (S.firstGate) { S.firstGate = false; await Core.sayRu(flow, 'gate'); }
    var n = Math.min(S.ad.n, maxN); if (inPath) n = Core.SRS.choiceCount(lang, g.target);
    var ids = Core.placeCorrect(Core.choices(lang, g.target, n, pool), g.target);
    var res = await Q.ask(flow, holder, {
      lang: lang, target: g.target, choices: ids, speaker: gsp, helpBtn: ghb, lisa: null, cls: 'gatechoices', hud: hud, voiceGroup: 'door',
      onCorrect: function () { g.state = 'opening'; g.lockT = 0; Snd.sfx('unlock'); hud.set(gates.indexOf(g) + 1); }
    });
    if (!res.first) S.mistakes++;
    var ad = S.ad;
    if (res.helped) { /* helped answer: no adaptive change */ }
    else { ad.recent.push(res.first); ad.streak = res.first ? 0 : ad.streak + 1; }
    if (res.helped) { }
    else if (ad.streak >= 2) { ad.n = 2; ad.recent = []; ad.streak = 0; }
    else { var r = ad.recent.slice(-5), acc = r.filter(Boolean).length / r.length; if (ad.n < maxN && r.length >= 3 && acc >= 0.8) { ad.n++; ad.recent = []; } }
    gateBar.classList.remove('up'); var gb = gateBar; setTimeout(function () { gb.remove(); }, 350 / Core.speed);
    gateBar = null; S.askActive = false; sp.classList.remove('gone-gate');
    Snd.sfx('door'); g.state = 'opening2';
    await flow.wait(900);
    g.state = 'open'; S.gi++; S.state = 'run';
  }

  /* ----- simulation ----- */
  function burst(x, y, n, cols) {
    for (var k = 0; k < n && S.parts.length < 140; k++) {
      var a = Math.random() * 6.283, v = 80 + Math.random() * 260;
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.7 + Math.random() * 0.5, c: cols[k % cols.length], r: 4 + Math.random() * 4 });
    }
  }
  function step(dt) {
    if (S.over) return;
    S.t += dt; var L = S.lisa;
    if (L.jumpBuf > 0) L.jumpBuf -= dt;
    if (L.coyote > 0) L.coyote -= dt;
    if (S.state === 'ready') { S.readyT += dt; if (S.readyT > 2.4) startRun(); }
    var vx = 0;
    if (S.state === 'run') vx = SPEED;
    else if (S.state === 'finish') vx = L.x < S.houseStop ? SPEED * 0.75 : 0;
    var g = gates[S.gi];
    if (S.state === 'run' && g && g.state === 'closed' && L.x + vx * dt >= g.x - 150) { vx = Math.max(0, (g.x - 150 - L.x) / dt); S.state = 'gatewait'; }
    var previousX = L.x, nx = L.x + vx * dt; S.blocked = false;
    for (var bi = 0; bi < blocks.length; bi++) {
      var b = blocks[bi];
      if (L.y > b.top + 10 && L.x + HW <= b.x0 + 4 && nx + HW > b.x0) { nx = b.x0 - HW; S.blocked = true; }
    }
    L.x = nx;
    /* Unlocking is not passage: checkpoint only after Lisa's full body clears an open gate. */
    gates.forEach(function (gg) {
      if (gg.state === 'open' && previousX <= gg.x + HW && L.x > gg.x + HW) S.checkpointX = gg.x + 80;
    });
    S.blockT = S.blocked ? S.blockT + dt : 0;
    /* jump */
    if (L.jumpBuf > 0 && (L.onGround || L.coyote > 0) && S.state === 'run') {
      L.vy = -JUMP; L.onGround = false; L.coyote = 0; L.jumpBuf = 0; Snd.sfx('jump');
      burst(L.x - 10, L.y, 4, ['#fff', '#e0e0e0']);
    }
    /* vertical */
    var py = L.y; L.vy += GRAV * dt; L.y += L.vy * dt;
    var landed = false;
    if (L.vy >= 0) {
      var f0 = L.x - 26, f1 = L.x + 26, top = null, j;
      if (py <= GY + 2 && L.y >= GY) for (j = 0; j < segs.length; j++) if (f1 > segs[j].x0 && f0 < segs[j].x1) { top = GY; break; }
      for (j = 0; j < blocks.length; j++) {
        var bb = blocks[j];
        if (f1 > bb.x0 && f0 < bb.x1 && py <= bb.top + 2 && L.y >= bb.top && (top == null || bb.top < top)) top = bb.top;
      }
      if (top != null) { if (!L.onGround && L.vy > 400) { Snd.sfx('land'); burst(L.x, top, 3, ['#fff', '#f1e4c8']); } L.y = top; L.vy = 0; L.onGround = true; landed = true; }
    }
    if (!landed && L.onGround) { L.onGround = false; L.coyote = 0.12; }
    /* gate arrival */
    if (S.state === 'gatewait' && L.onGround) { S.state = 'gate'; openGate(g); }
    /* fall -> spring back to the last open door physically passed */
    if (L.y > H + 120 && S.state !== 'bounce') {
      S.springX = S.checkpointX; S.bounceT = 0;
      L.x = S.checkpointX; L.y = H + 80; L.vy = -1650; L.onGround = false; L.coyote = 0; L.jumpBuf = 0; S.state = 'bounce'; Snd.sfx('bounce');
      burst(S.springX, GY + 40, 10, ['#ffd54f', '#fff', '#ff8a65']);
    }
    if (S.state === 'bounce') { S.bounceT += dt; if (L.onGround && S.bounceT > 0.3) S.state = 'run'; }
    /* collect */
    for (var q = 0; q < bubbles.length; q++) {
      var bu = bubbles[q];
      if (!bu.got && Math.abs(bu.x - L.x) < 70) {
        var dx = bu.x - L.x, dy = bu.y - (L.y - 55);
        if (dx * dx + dy * dy < 62 * 62) { bu.got = true; S.collected++; Snd.sfx('collect'); burst(bu.x, bu.y, 8, ['#fff59d', '#fff', '#80deea']); coll.querySelector('b').textContent = S.collected; coll.classList.remove('bump'); void coll.offsetWidth; coll.classList.add('bump'); }
      }
    }
    /* gate animation */
    gates.forEach(function (gg) {
      if (gg.state === 'opening' || gg.state === 'opening2') gg.lockT += dt;
      if (gg.state === 'opening2') gg.open = Math.min(1, gg.open + dt * 1.6);
      if (gg.state === 'open') gg.open = 1;
    });
    /* finish */
    if (S.state === 'run' && L.x >= endX) { S.state = 'finish'; Snd.sfx('fanfare'); }
    if (S.state === 'finish' && L.x >= S.houseStop && L.onGround) {
      S.finishT += dt;
      if (S.finishT === dt) burst(L.x, L.y - 100, 40, ['#ff8a65', '#ffd54f', '#81d4fa', '#a5d6a7', '#f48fb1']);
      if (S.finishT > 2.6 && !S.over) { S.over = true; done(); }
    }
    for (var m = S.parts.length - 1; m >= 0; m--) {
      var pt = S.parts[m]; pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 700 * dt;
      if (pt.life <= 0) S.parts.splice(m, 1);
    }
    S.cam = Math.max(0, L.x - Wl * 0.28);
  }
  function done() {
    if (inPath) { Path.finishStep(flow, { game: 'run' }); return; }
    var stars = Core.starsFor(S.mistakes);
    if (free) { UI.go('map'); return; }
    var r = Core.completeLevel(lang, wid, 4, stars);
    Core.addXP(Core.XP.level);
    UI.go('result', { lang: lang, world: wid, level: 4, stars: stars, gain: r.gain, mistakes: S.mistakes, xp: FX.level.xp + Core.XP.level, crownNew: r.crownNew ? r.crown : 0 });
  }

  /* ----- drawing ----- */
  function drawFar(cam, t) {
    var c = cx;
    c.fillStyle = th.far;
    var i0 = Math.floor(cam * 0.15 / 420) - 1;
    for (var i = i0; i < i0 + Wl / 420 + 3; i++) {
      var x = i * 420 - cam * 0.15, hh = hsh(i + 7);
      if (th.far2 === 'mount') { c.beginPath(); c.moveTo(x - 200, GY); c.lineTo(x + 40, GY - 200 - hh * 120); c.lineTo(x + 280, GY); c.fill(); }
      else if (th.far2 === 'sky') { var bw = 90 + hh * 60, bh = 140 + hsh(i) * 190; c.fillRect(x, GY - bh, bw, bh); c.fillStyle = 'rgba(255,255,255,.45)'; for (var wy = GY - bh + 18; wy < GY - 20; wy += 34) c.fillRect(x + 14, wy, 16, 16), c.fillRect(x + bw - 32, wy, 16, 16); c.fillStyle = th.far; }
      else if (th.far2 === 'dune') { c.beginPath(); c.ellipse(x + 100, GY + 30, 280, 70 + hh * 50, 0, Math.PI, 0); c.fill(); }
      else { c.beginPath(); c.ellipse(x + 100, GY + 40, 260, 120 + hh * 90, 0, Math.PI, 0); c.fill(); }
    }
  }
  function drawMid(cam, t) {
    var c = cx, sp = 340, i0 = Math.floor(cam * 0.45 / sp) - 1;
    for (var i = i0; i < i0 + Wl / sp + 3; i++) {
      var x = i * sp - cam * 0.45 + hsh(i) * 120, hh = hsh(i + 3), y = GY;
      if (hsh(i + 11) < 0.25) continue;
      switch (th.deco) {
        case 'palm':
          c.strokeStyle = '#a9743c'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18, y - 70, x + 6, y - 130 - hh * 40); c.stroke();
          c.fillStyle = '#43a047'; for (var a = 0; a < 5; a++) { c.save(); c.translate(x + 6, y - 130 - hh * 40); c.rotate(-1.2 + a * 0.6); c.beginPath(); c.ellipse(34, 0, 38, 11, 0, 0, 6.3); c.fill(); c.restore(); }
          break;
        case 'pine':
          c.fillStyle = '#244a48'; for (var s = 0; s < 3; s++) { c.beginPath(); c.moveTo(x - 50 + s * 8, y - 40 * s); c.lineTo(x, y - 90 - 40 * s - hh * 20); c.lineTo(x + 50 - s * 8, y - 40 * s); c.fill(); }
          break;
        case 'building':
          c.fillStyle = th.mid; var bw2 = 80 + hh * 60, bh2 = 90 + hh * 100; c.fillRect(x, y - bh2, bw2, bh2); c.fillStyle = 'rgba(255,255,255,.6)'; for (var wy2 = y - bh2 + 14; wy2 < y - 24; wy2 += 30) for (var wx = x + 12; wx < x + bw2 - 20; wx += 28) c.fillRect(wx, wy2, 14, 14);
          break;
        case 'lolly':
          c.fillStyle = '#fff'; c.fillRect(x - 3, y - 90, 6, 90); c.fillStyle = hh < 0.5 ? '#f06292' : '#ba68c8'; c.beginPath(); c.arc(x, y - 110, 34, 0, 6.3); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(x, y - 110, 18, 0, 5); c.stroke();
          break;
        case 'barn':
          c.fillStyle = '#d85b4a'; c.fillRect(x, y - 90, 110, 90); c.beginPath(); c.moveTo(x - 10, y - 90); c.lineTo(x + 55, y - 150); c.lineTo(x + 120, y - 90); c.fill(); c.fillStyle = '#fff'; c.fillRect(x + 38, y - 54, 34, 54);
          break;
        case 'tree2':
        case 'tree':
        default:
          c.fillStyle = '#8d5a2b'; c.fillRect(x - 7, y - 70, 14, 70);
          c.fillStyle = th.deco === 'tree2' ? (hh < 0.5 ? '#e57c23' : '#d4a017') : '#4caf50'; c.beginPath(); c.arc(x, y - 100, 44 + hh * 14, 0, 6.3); c.fill();
          c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(x - 14, y - 112, 16, 0, 6.3); c.fill();
      }
    }
  }
  function drawBack(cam, t) {
    var c = cx;
    c.fillStyle = skyG; c.fillRect(0, 0, Wl, GY + 2);
    if (th.sun) { c.fillStyle = 'rgba(255,240,170,.55)'; c.beginPath(); c.arc(Wl * 0.82, 120, 90, 0, 6.3); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.arc(Wl * 0.82, 120, 58, 0, 6.3); c.fill(); }
    else { c.fillStyle = 'rgba(255,249,196,.18)'; c.beginPath(); c.arc(Wl * 0.8, 130, 100, 0, 6.3); c.fill(); c.fillStyle = '#fff59d'; c.beginPath(); c.arc(Wl * 0.8, 130, 64, 0, 6.3); c.fill(); c.fillStyle = '#fff'; for (var s = 0; s < 14; s++) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s); c.fillRect((hsh(s) * Wl), hsh(s + 40) * 300, 3, 3); } c.globalAlpha = 1; }
    c.fillStyle = th.night ? '#fff' : 'rgba(255,255,255,.85)';
    if (WORLD_THEME[wid] !== 'night') for (var k = 0; k < 4; k++) { var x = ((k * 520 + t * 8 - cam * 0.05) % (Wl + 400)) - 200; c.beginPath(); c.ellipse(x, 90 + (k % 2) * 60, 70, 26, 0, 0, 6.3); c.ellipse(x + 50, 76 + (k % 2) * 60, 44, 24, 0, 0, 6.3); c.fill(); }
    drawFar(cam, t); drawMid(cam, t);
  }
  function drawGround(cam, t) {
    var c = cx;
    /* pit / water band behind the ground segments */
    if (th.water) {
      var wg = c.createLinearGradient(0, GY, 0, H); wg.addColorStop(0, '#5bc8f5'); wg.addColorStop(1, '#2a8fd6'); c.fillStyle = wg; c.fillRect(0, GY + 20, Wl, H - GY);
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath(); for (var wx = -40; wx < Wl + 40; wx += 40) { c.moveTo(wx + ((-cam * 0.6 + t * 30) % 40), GY + 34); c.quadraticCurveTo(wx + 10 + ((-cam * 0.6 + t * 30) % 40), GY + 24, wx + 20 + ((-cam * 0.6 + t * 30) % 40), GY + 34); } c.stroke();
    } else { c.fillStyle = th.gap; c.fillRect(0, GY, Wl, H - GY); }
    segs.forEach(function (sg) {
      var a = sg.x0 - cam, b = sg.x1 - cam; if (b < -20 || a > Wl + 20) return;
      var x0 = Math.max(a, -20), x1 = Math.min(b, Wl + 20);
      var gd = c.createLinearGradient(0, GY, 0, H); gd.addColorStop(0, th.dirt); gd.addColorStop(1, th.dirt2);
      c.fillStyle = gd; c.fillRect(x0, GY + 10, x1 - x0, H - GY);
      c.fillStyle = th.dirt2; for (var rx = Math.floor((x0 + cam) / 130) * 130; rx < x1 + cam; rx += 130) { var px = rx - cam + 40 * hsh(rx), py = GY + 80 + 110 * hsh(rx + 5); c.globalAlpha = 0.45; c.beginPath(); c.ellipse(px, py, 22, 12, 0, 0, 6.3); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = th.grass; c.fillRect(x0, GY - 6, x1 - x0, 34);
      c.fillStyle = th.grass2; c.fillRect(x0, GY - 6, x1 - x0, 9);
      if (a > -20) { c.fillStyle = th.grass; c.beginPath(); c.arc(a + 12, GY + 11, 17, 0, 6.3); c.fill(); }
      if (b < Wl + 20) { c.fillStyle = th.grass; c.beginPath(); c.arc(b - 12, GY + 11, 17, 0, 6.3); c.fill(); }
    });
    /* spring pad */
    if (S.state === 'bounce' && S.springX != null && S.bounceT < 1.4) {
      var spx = S.springX - cam, sq = Math.max(0, 1 - S.bounceT * 3);
      c.fillStyle = '#ef5350'; c.beginPath(); c.ellipse(spx, H - 30 - 10 * sq, 40, 14, 0, 0, 6.3); c.fill();
      c.strokeStyle = '#bdbdbd'; c.lineWidth = 6; c.beginPath(); for (var z = 0; z < 4; z++) { c.moveTo(spx - 22, H - 30 + z * 0); } c.stroke();
    }
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function drawBlocks(cam) {
    var c = cx;
    blocks.forEach(function (b) {
      var x = b.x0 - cam; if (x > Wl + 20 || x + 100 < -20) return;
      var h = GY - b.top;
      c.fillStyle = th.crate; roundRect(c, x, b.top, 100, h + 4, 14); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 5; roundRect(c, x + 5, b.top + 5, 90, h - 6, 10); c.stroke();
      c.beginPath(); c.moveTo(x + 10, b.top + 10); c.lineTo(x + 90, GY - 4); c.moveTo(x + 90, b.top + 10); c.lineTo(x + 10, GY - 4); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.3)'; roundRect(c, x + 8, b.top + 6, 84, 10, 5); c.fill();
    });
  }
  function drawGate(g, cam, t) {
    var c = cx, x = g.x - cam; if (x < -200 || x > Wl + 200) return;
    var w = 150, h = 250, y = GY;
    c.fillStyle = '#6d4426'; roundRect(c, x - w / 2 - 16, y - h - 14, w + 32, h + 14, 20); c.fill();
    /* interior */
    c.fillStyle = '#2f2418'; roundRect(c, x - w / 2, y - h, w, h, 16); c.fill();
    if (g.open > 0) { var gg = c.createRadialGradient(x, y - h / 2, 10, x, y - h / 2, 120); gg.addColorStop(0, 'rgba(255,230,150,.8)'); gg.addColorStop(1, 'rgba(255,230,150,0)'); c.fillStyle = gg; c.fillRect(x - w / 2, y - h, w, h); }
    /* door leaf */
    var lw = w * (1 - g.open * 0.88);
    if (lw > 4) {
      c.fillStyle = '#b87a44'; roundRect(c, x - w / 2, y - h, lw, h, 16); c.fill();
      c.strokeStyle = 'rgba(80,45,20,.55)'; c.lineWidth = 4; for (var k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x - w / 2 + lw * k / 4, y - h + 8); c.lineTo(x - w / 2 + lw * k / 4, y - 8); c.stroke(); }
      c.fillStyle = '#7d4d26'; c.fillRect(x - w / 2, y - h * 0.72, lw, 12); c.fillRect(x - w / 2, y - h * 0.28, lw, 12);
    }
    /* lock */
    if (g.state !== 'open' && g.open < 0.5) {
      var lt = g.state === 'closed' ? 0 : g.lockT, ly = y - h / 2 + lt * -60 + lt * lt * 260, la = g.state === 'closed' ? 1 : Math.max(0, 1 - lt * 2.2);
      if (la > 0) {
        c.save(); c.globalAlpha = la; c.translate(x - w / 2 + Math.min(lw, w) / 2, ly); c.rotate(lt * 3);
        c.strokeStyle = '#9e9e9e'; c.lineWidth = 9; c.beginPath(); c.arc(0, -16, 15, Math.PI, 0); c.stroke();
        c.fillStyle = '#ffc107'; roundRect(c, -24, -16, 48, 40, 9); c.fill(); c.strokeStyle = '#ff8f00'; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#7a4a10'; c.beginPath(); c.arc(0, 0, 6, 0, 6.3); c.fill(); c.fillRect(-3, 2, 6, 12);
        c.restore();
      }
    }
    c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(x - w / 2 - 6, y - h - 14); c.lineTo(x - w / 2 - 6, y - h - 60); c.lineTo(x - w / 2 + 40, y - h - 46); c.lineTo(x - w / 2 - 6, y - h - 32); c.fill();
  }
  function drawBubble(b, cam, t) {
    if (b.got && b.pop > 0.5) return;
    var c = cx, x = b.x - cam; if (x < -50 || x > Wl + 50) return;
    var y = b.y + Math.sin(t * 3 + b.x * 0.01) * 5, sc = 1;
    if (b.got) { b.pop += 0.04; sc = 1 + b.pop * 1.2; c.globalAlpha = Math.max(0, 1 - b.pop * 2); }
    c.fillStyle = 'rgba(255,255,255,.55)'; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 4;
    c.beginPath(); c.arc(x, y, 30 * sc, 0, 6.3); c.fill(); c.stroke();
    if (b.cv) c.drawImage(b.cv, x - 22 * sc, y - 22 * sc, 44 * sc, 44 * sc);
    else if (b.hex) { c.fillStyle = b.hex; c.beginPath(); c.arc(x, y, 17 * sc, 0, 6.3); c.fill(); }
    else { c.fillStyle = '#ffb74d'; c.beginPath(); c.arc(x, y, 14 * sc, 0, 6.3); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - 12 * sc, y - 14 * sc, 5 * sc, 0, 6.3); c.fill();
    c.globalAlpha = 1;
  }
  function drawEnd(cam, t) {
    var c = cx, fx = endX - cam, hx = houseX - cam;
    if (fx > -100 && fx < Wl + 100) {
      c.fillStyle = '#eceff1'; c.fillRect(fx - 4, GY - 220, 8, 220);
      c.fillStyle = '#ffc107'; c.beginPath(); c.arc(fx, GY - 224, 9, 0, 6.3); c.fill();
      c.fillStyle = '#e53935'; var fl = Math.sin(t * 6) * 6; c.beginPath(); c.moveTo(fx + 4, GY - 214); c.quadraticCurveTo(fx + 44, GY - 206 + fl, fx + 86, GY - 190); c.quadraticCurveTo(fx + 44, GY - 182 - fl, fx + 4, GY - 160); c.fill();
    }
    if (hx > -300 && hx < Wl + 300) {
      c.fillStyle = '#ffe0b2'; roundRect(c, hx, GY - 170, 230, 170, 12); c.fill();
      c.fillStyle = '#ef6c4a'; c.beginPath(); c.moveTo(hx - 24, GY - 160); c.lineTo(hx + 115, GY - 280); c.lineTo(hx + 254, GY - 160); c.closePath(); c.fill();
      c.fillStyle = '#8d5a2b'; roundRect(c, hx + 88, GY - 110, 54, 110, 24); c.fill();
      c.fillStyle = '#b3e5fc'; roundRect(c, hx + 24, GY - 128, 46, 46, 8); c.fill(); roundRect(c, hx + 160, GY - 128, 46, 46, 8); c.fill();
      c.fillStyle = '#ffd54f'; c.beginPath(); c.arc(hx + 134, GY - 56, 5, 0, 6.3); c.fill();
    }
  }
  function drawHint(cam, t) {
    var L = S.lisa, show = S.state === 'ready' || (S.blocked && S.blockT > 2.2);
    if (!show) return;
    var c = cx, x = L.x - cam + 40, y = L.y - 210, ph = (t * 1.6) % 1;
    c.strokeStyle = 'rgba(255,255,255,' + (0.9 - ph * 0.9) + ')'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, 40 + ph * 50, 0, 6.3); c.stroke();
    c.fillStyle = 'rgba(126,87,194,.92)'; c.beginPath(); c.arc(x, y, 38, 0, 6.3); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - 22); c.lineTo(x + 20, y + 6); c.lineTo(x + 7, y + 6); c.lineTo(x + 7, y + 22); c.lineTo(x - 7, y + 22); c.lineTo(x - 7, y + 6); c.lineTo(x - 20, y + 6); c.closePath(); c.fill();
  }
  function render() {
    var c = cx, cam = S.cam, t = S.t, L = S.lisa;
    c.setTransform(S0, 0, 0, S0, 0, 0);
    drawBack(cam, t); drawGround(cam, t); drawEnd(cam, t); drawBlocks(cam);
    gates.forEach(function (g) { drawGate(g, cam, t); });
    bubbles.forEach(function (b) { drawBubble(b, cam, t); });
    var moving = (S.state === 'run' || (S.state === 'finish' && L.x < S.houseStop)) && L.onGround && !S.blocked;
    Lisa.drawSide(c, L.x - cam, L.y, { t: t, air: !L.onGround, worn: worn, run: moving, sc: 0.95 });
    S.parts.forEach(function (pt) { c.globalAlpha = Math.max(0, Math.min(1, pt.life * 1.6)); c.fillStyle = pt.c; c.beginPath(); c.arc(pt.x - cam, pt.y, pt.r, 0, 6.3); c.fill(); });
    c.globalAlpha = 1;
    drawHint(cam, t);
  }

  /* ----- main loop: fixed timestep ----- */
  var raf = 0, last = performance.now(), acc = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * (Core.runScale || 1);
    var n = 0;
    while (acc >= DT && n < 40) { step(DT); acc -= DT; n++; }
    if (n === 40) acc = 0;
    render();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  /* test helpers */
  S.skipToGate = function () { if (S.state === 'run' && gates[S.gi]) { S.lisa.x = gates[S.gi].x - 400; } };
  S.skipToEnd = function () { S.lisa.x = endX - 100; };
  S.correctId = function () { return Q.cur ? Q.cur.target : null; };
  /* Read-only regression snapshot; recovery never mutates the bubble collection. */
  S.collectibleSnapshot = function () { return { collected: S.collected, got: bubbles.map(function (b) { return b.got; }), positions: bubbles.map(function (b) { return { x: b.x, y: b.y }; }) }; };

  flow.after(500, function () { Core.sayRu(flow, 'run_intro'); });
};
})();
