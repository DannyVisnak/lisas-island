/* Lisa's Island - reward layer (Duolingo-style joy, errorless): particles, XP chips, combo meter, progress bar,
   fireworks, daily-goal ring, crowns, chest opening, high five, Lisa poke.
   Rules kept here: nothing is ever taken away, no timers against the child, no text to read (numbers only),
   transforms + opacity only, at most FX.cap (80) live particles. Everything is time-scaled by Core.speed for the self-test. */
(function () {
'use strict';
var Core = window.Core, Snd = Core.Snd, el = Core.el;
var FX = window.FX = {
  cap: 80, parts: [], spawned: 0, chips: 0, combo: 0, bestCombo: 0, misses: 0, corrects: 0, oopsToggle: false,
  level: { xp: 0, correct: 0 }, activeHud: null, celebrations: 0, lastCelebration: null, log: [], pokes: 0, fives: 0, lastPoke: 0, lastVoice: 0, voiced: 0
};
Object.defineProperty(FX, 'live', { get: function () { return FX.parts.length; } });

var COL = ['#ffd54f', '#ff8a65', '#4fc3f7', '#81c784', '#ba68c8', '#f06292', '#fff176', '#ffb300'];
function rnd(a, b) { return a + Math.random() * (b - a); }
function rem() { return parseFloat(getComputedStyle(document.documentElement).fontSize) || 10; }
function layer() { return document.getElementById('fx'); }
FX.note = function (what) { FX.lastCelebration = what; FX.celebrations++; FX.log.push(what); if (FX.log.length > 60) FX.log.shift(); };

/* ---------- icons ---------- */
var ICON = {
  flame: '<svg viewBox="0 0 64 64"><path d="M32 3C34 16 51 22 51 40C51 52 43 61 32 61C21 61 13 52 13 40C13 31 19 26 22 20C23 27 27 30 29 30C26 19 28 9 32 3Z" fill="#ff7043" stroke="#e64a19" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 31C34 37 43 39 43 47C43 54 38 58 32 58C26 58 21 54 21 47C21 41 29 39 32 31Z" fill="#ffd54f"/></svg>',
  bolt: '<svg viewBox="0 0 40 40"><path d="M23 2L7 23H19L15 38L33 15H21Z" fill="#ffc107" stroke="#ff8f00" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 40 40"><g stroke="#ffb300" stroke-width="3.2" stroke-linecap="round"><path d="M20 3V8M20 32V37M3 20H8M32 20H37M8 8L11.5 11.5M28.5 28.5L32 32M32 8L28.5 11.5M11.5 28.5L8 32"/></g><circle cx="20" cy="20" r="9.5" fill="#ffd54f" stroke="#ffb300" stroke-width="2.5"/><circle cx="17" cy="17" r="3" fill="#fff" opacity=".6"/></svg>',
  trophy: '<svg viewBox="0 0 100 100"><path d="M24 14H76V40C76 58 64 68 50 68C36 68 24 58 24 40Z" fill="#ffca28" stroke="#ff8f00" stroke-width="4" stroke-linejoin="round"/><path d="M24 20H10C10 38 18 46 28 48M76 20H90C90 38 82 46 72 48" fill="none" stroke="#ff8f00" stroke-width="5" stroke-linecap="round"/><rect x="43" y="66" width="14" height="14" fill="#ffb300"/><rect x="30" y="80" width="40" height="10" rx="4" fill="#ff8f00"/><path d="M50 26L54 36L65 37L57 44L59 55L50 49L41 55L43 44L35 37L46 36Z" fill="#fff8e1"/><path d="M32 22V40C32 48 36 54 42 58" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/></svg>',
  crown: '<svg viewBox="0 0 60 46"><path d="M6 38L2 10L17 22L30 4L43 22L58 10L54 38Z" fill="#ffca28" stroke="#ff8f00" stroke-width="3" stroke-linejoin="round"/><rect x="6" y="36" width="48" height="7" rx="3" fill="#ffb300" stroke="#ff8f00" stroke-width="2"/><circle cx="30" cy="27" r="4" fill="#ef5350"/><circle cx="16" cy="30" r="3" fill="#42a5f5"/><circle cx="44" cy="30" r="3" fill="#66bb6a"/></svg>',
  chest: '<svg viewBox="0 0 120 110"><ellipse class="cglow" cx="60" cy="50" rx="44" ry="26" fill="#fff59d" opacity="0"/><rect x="10" y="52" width="100" height="50" rx="10" fill="#a8672c"/><rect x="10" y="60" width="100" height="10" fill="#7a461b"/><g class="clid"><path d="M10 56Q10 18 60 18Q110 18 110 56Z" fill="#c97d36"/><rect x="10" y="48" width="100" height="10" fill="#7a461b"/></g><rect x="50" y="48" width="20" height="26" rx="5" fill="#ffc107" stroke="#c79100" stroke-width="3"/></svg>'
};
FX.icon = ICON;

/* ---------- particles (DOM, WAAPI transform + opacity only) ---------- */
FX.pt = function (node) {
  var L = layer(), fr = L.getBoundingClientRect(), r = node.getBoundingClientRect();
  var k = fr.width / (L.offsetWidth || fr.width) || 1;
  return { x: (r.left + r.width / 2 - fr.left) / k, y: (r.top + r.height / 2 - fr.top) / k };
};
function spawn(x, y, o) {
  var L = layer();
  if (!L || FX.parts.length >= FX.cap) return null;
  var size = o.size, p = document.createElement('i');
  p.className = 'fxp ' + (o.shape || 'dot');
  p.style.width = size + 'px'; p.style.height = (o.shape === 'conf' ? size * 0.55 : size) + 'px';
  p.style.left = (x - size / 2) + 'px'; p.style.top = (y - size / 2) + 'px'; p.style.background = o.color;
  L.appendChild(p); FX.parts.push(p); FX.spawned++;
  function end() { var i = FX.parts.indexOf(p); if (i >= 0) FX.parts.splice(i, 1); if (p.parentNode) p.parentNode.removeChild(p); }
  var dur = o.dur / Core.speed, delay = (o.delay || 0) / Core.speed;
  if (p.animate) {
    try { var a = p.animate(o.frames, { duration: dur, delay: delay, easing: o.ease || 'ease-out', fill: 'both' }); a.onfinish = end; a.oncancel = end; } catch (e) { /* fall through to timeout */ }
  }
  setTimeout(end, dur + delay + 600);
  return p;
}
/* radial burst of stars / confetti. Returns the number of particles actually made (cap respected). */
FX.burst = function (x, y, o) {
  o = o || {};
  var R = rem(), n = o.n || 14, power = o.power || 1, made = 0, shapes = o.shapes || ['star', 'star', 'conf', 'dot'];
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), d = rnd(7, 15) * R * power;
    var dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.85 - 3 * R, fall = rnd(5, 9) * R, rot = rnd(-360, 360), sz = rnd(1.7, 2.9) * R * (o.big ? 1.3 : 1);
    var q = spawn(x, y, {
      shape: shapes[i % shapes.length], size: sz, color: (o.colors || COL)[i % (o.colors || COL).length], dur: rnd(750, 1150), delay: o.delay || 0, ease: 'cubic-bezier(.15,.7,.3,1)',
      frames: [
        { transform: 'translate(0px,0px) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(' + (rot / 2) + 'deg)', opacity: 1, offset: 0.5 },
        { transform: 'translate(' + (dx * 1.12) + 'px,' + (dy + fall) + 'px) scale(.6) rotate(' + rot + 'deg)', opacity: 0 }
      ]
    });
    if (q) made++;
  }
  return made;
};
/* confetti shower from the top, bound to a flow (stops with the screen). ms = virtual duration, per = pieces per tick */
FX.rain = function (flow, ms, per) {
  var R = rem(), W = 136.6 * R, t = 0, h;
  FX.note('confetti');
  h = flow.every(110, function () {
    t += 110;
    if (t > ms) { clearInterval(h); return; }
    for (var k = 0; k < (per || 2); k++) {
      var sw = rnd(-6, 6) * R, r1 = rnd(-540, 540);
      spawn(rnd(0, W), -2 * R, {
        shape: Math.random() < 0.7 ? 'conf' : 'star', size: rnd(1.4, 2.4) * R, color: COL[Core.rnd(COL.length)], dur: rnd(2000, 3000), ease: 'linear',
        frames: [
          { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + sw + 'px,' + (40 * R) + 'px) rotate(' + (r1 / 2) + 'deg)', opacity: 1, offset: 0.6 },
          { transform: 'translate(' + (-sw) + 'px,' + (82 * R) + 'px) rotate(' + r1 + 'deg)', opacity: 0.9 }
        ]
      });
    }
  });
};
FX.clear = function () {
  var L = layer(); if (L) L.innerHTML = '';
  FX.parts = []; FX.activeHud = null;
};

/* ---------- HUD in the level top bar: combo flame + progress bar + XP counter. Same interface as the old dots: set(k) ---------- */
FX.hud = function (total) {
  var h = el('div', 'dots hud');
  h.innerHTML = '<div class="combo"><span class="flame">' + ICON.flame + '</span><b>0</b></div>' +
    '<div class="pbar"><span class="fill"></span><span class="shine"></span></div>' +
    '<div class="xpc"><span class="bolt">' + ICON.bolt + '</span><b>0</b></div>';
  var fill = Core.$('.fill', h), shine = Core.$('.shine', h), combo = Core.$('.combo', h), cb = Core.$('.combo b', h), xb = Core.$('.xpc b', h), xpc = Core.$('.xpc', h);
  h.total = total; h.val = 0; h.shown = 0; h.xpEl = xpc; h.comboEl = combo;
  h.set = function (k) {
    k = Core.clamp(k, 0, total);
    var inc = k > h.val; h.val = k;
    fill.style.transform = 'scaleX(' + (total ? k / total : 0) + ')';
    h.dataset.fill = String(k);
    if (inc) { shine.classList.remove('go'); void shine.offsetWidth; shine.classList.add('go'); }
  };
  h.setCombo = function (n, pop) {
    cb.textContent = n; h.dataset.combo = String(n);
    combo.classList.toggle('on', n >= 2);
    combo.classList.toggle('hot', n >= 5);
    if (pop) { combo.classList.remove('bump'); void combo.offsetWidth; combo.classList.add('bump'); }
  };
  h.addXP = function (n) {
    h.shown += n; xb.textContent = h.shown; h.dataset.xp = String(h.shown);
    xpc.classList.remove('bump'); void xpc.offsetWidth; xpc.classList.add('bump');
  };
  h.shown = FX.level.xp; xb.textContent = h.shown; h.dataset.xp = String(h.shown);
  h.setCombo(FX.combo, false); h.set(0);
  FX.activeHud = h;
  return h;
};
FX.levelStart = function () { FX.combo = 0; FX.level = { xp: 0, correct: 0 }; FX.activeHud = null; };

/* ---------- reward moments ---------- */
FX.chip = function (pos, n, hud) {
  var L = layer(); if (!L) return;
  var ch = el('div', 'xpchip', ICON.bolt + '<b>+' + n + '</b>'), R = rem();
  ch.style.left = pos.x + 'px'; ch.style.top = (pos.y - 4 * R) + 'px';
  L.appendChild(ch); FX.chips++;
  var tgt = null; try { if (hud && hud.xpEl && hud.isConnected) tgt = FX.pt(hud.xpEl); } catch (e) { tgt = null; }
  var dx = tgt ? tgt.x - pos.x : 0, dy = tgt ? tgt.y - (pos.y - 4 * R) : -14 * R, finished = false;
  function end() { if (finished) return; finished = true; if (ch.parentNode) ch.parentNode.removeChild(ch); if (hud) hud.addXP(n); }
  var dur = 1150 / Core.speed;
  if (ch.animate) {
    try {
      var a = ch.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
        { transform: 'translate(-50%,-80%) scale(1.3)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%,-80%) scale(1.05)', opacity: 1, offset: 0.46 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.55)', opacity: tgt ? 1 : 0 }
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = end; a.oncancel = end;
    } catch (e) { /* timeout below */ }
  }
  setTimeout(end, dur + 300);
};
/* a right answer. o: lisa (element or null), hud, first, helped. Returns {combo, milestone, xp, hold(virtual ms), reachedGoal} */
FX.correct = function (card, o) {
  o = o || {};
  var hud = o.hud || FX.activeHud, xp = (o.first && !o.helped) ? Core.XP.first : Core.XP.assisted;
  FX.combo++; if (FX.combo > FX.bestCombo) FX.bestCombo = FX.combo;
  var c = FX.combo, ms = (c === 3 || c === 5 || c === 8) ? c : 0;
  FX.corrects++; FX.level.correct++; FX.level.xp += xp;
  var r = Core.addXP(xp);
  Snd.sfx('ding', c);
  var pos = card ? FX.pt(card) : { x: 68 * rem(), y: 36 * rem() };
  FX.burst(pos.x, pos.y, { n: ms ? 22 : 16, power: ms ? 1.15 : 1, big: !!ms });
  FX.chip(pos, xp, hud);
  if (hud && hud.setCombo) hud.setCombo(c, true);
  if (o.lisa && o.lisa.react) o.lisa.react(ms ? 'flip' : 'jump');
  if (ms) FX.fireworks(ms);
  FX.lastCorrect = { combo: c, xp: xp, milestone: ms };
  return { combo: c, milestone: ms, xp: xp, hold: ms ? 1400 : 520, reachedGoal: r.reached };
};
/* a miss: quiet reset (no sound of its own). Returns a Lisa "oops" url at most every other miss, else null. */
FX.miss = function (o) {
  var hud = (o && o.hud) || FX.activeHud;
  FX.combo = 0; FX.misses++;
  if (hud && hud.setCombo) hud.setCombo(0, false);
  FX.oopsToggle = !FX.oopsToggle;
  return FX.oopsToggle ? Core.lisaLine('oops') : null;
};
/* voice for a right answer: the combo line on 3/5/8, otherwise a random "yes" line; null when Russian help is off or files are missing */
FX.voiceFor = function (group, milestone) {
  if (window.Path && Path.active && Path.active() && Path.voice) return Path.voice(milestone);   /* linear path: da / personality bag (PATH_SPEC 3) */
  return (milestone && Core.lisaLine('combo' + milestone)) || Core.lisaLine(group || 'yes');
};
/* fireworks overlay ~1.5 s with a big flame badge. m = 3 / 5 / 8 */
FX.fireworks = function (m) {
  var L = layer(); if (!L) return;
  var R = rem(), W = 136.6 * R, H = 76.8 * R, dur = 1500 / Core.speed;
  FX.note('combo' + m);
  var dim = el('div', 'fxdim'); L.appendChild(dim);
  var badge = el('div', 'combobadge', ICON.flame + '<b>' + m + '</b>'); L.appendChild(badge);
  function drop(n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, dur + 500); }
  /* short warm golden flash (peak ~20 % = 300 ms, gone by ~47 % = 700 ms); the badge must dominate */
  if (dim.animate) dim.animate([{ opacity: 0, easing: 'ease-out' }, { opacity: 0.5, offset: 0.2, easing: 'ease-in' }, { opacity: 0, offset: 0.47 }, { opacity: 0 }], { duration: dur, easing: 'linear', fill: 'both' });
  /* overall timing is LINEAR; easing lives per keyframe (a whole-iteration bezier raced through the final opacity:0 frame). Opacity 1 from 15 % to 80 %. */
  if (badge.animate) badge.animate([
    { transform: 'translate(-50%,-50%) scale(.1) rotate(-20deg)', opacity: 0, easing: 'cubic-bezier(.3,1.4,.5,1)' },
    { transform: 'translate(-50%,-50%) scale(1.35) rotate(6deg)', opacity: 1, offset: 0.15, easing: 'ease-in-out' },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-3deg)', opacity: 1, offset: 0.3, easing: 'ease-in-out' },
    { transform: 'translate(-50%,-50%) scale(1.14) rotate(3deg)', opacity: 1, offset: 0.45, easing: 'ease-in-out' },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-2deg)', opacity: 1, offset: 0.6, easing: 'ease-in-out' },
    { transform: 'translate(-50%,-50%) scale(1.06) rotate(0deg)', opacity: 1, offset: 0.8, easing: 'ease-in' },
    { transform: 'translate(-50%,-62%) scale(1.1) rotate(0deg)', opacity: 0 }
  ], { duration: dur, easing: 'linear', fill: 'both' });
  drop(dim); drop(badge);
  var n = m >= 8 ? 5 : m >= 5 ? 4 : 3;
  for (var i = 0; i < n; i++) {
    var x = rnd(0.2, 0.8) * W, y = rnd(0.2, 0.46) * H;
    FX.burst(x, y, { n: 14, power: 0.95, delay: i * 230, shapes: ['dot', 'star', 'dot'], big: true });
    var ring = el('div', 'fxring'); ring.style.left = x + 'px'; ring.style.top = y + 'px'; L.appendChild(ring);
    if (ring.animate) ring.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }], { duration: 650 / Core.speed, delay: i * 230 / Core.speed, easing: 'ease-out', fill: 'both' });
    drop(ring);
  }
  Snd.sfx('arp', m === 3 ? 4 : m === 5 ? 5 : 6);
  setTimeout(function () { Snd.sfx('sparkle'); }, 420 / Core.speed);
};

/* ---------- daily goal widgets ---------- */
FX.goalRing = function (cls) {
  var goal = Core.goalTarget(), xp = Core.dayXP(), frac = Math.min(1, xp / goal), met = Core.goalMet(), C = 2 * Math.PI * 45;
  var d = el('div', 'goalring' + (met ? ' met' : '') + (cls ? ' ' + cls : ''),
    '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="10"/>' +
    '<circle class="gfg" cx="50" cy="50" r="45" fill="none" stroke="' + (met ? '#ffb300' : '#7e57c2') + '" stroke-width="10.5" stroke-linecap="round" stroke-dasharray="' + (C * frac).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 50 50)"/></svg>' +
    '<span class="gic">' + (met ? ICON.trophy : ICON.sun) + '</span>');
  d.dataset.xp = String(xp); d.dataset.goal = String(goal); d.dataset.met = met ? '1' : '0';
  return d;
};
FX.suns = function () {
  var d = el('div', 'suns');
  Core.weekSuns().forEach(function (s) { var i = el('i', 'sun' + (s.met ? ' on' : '') + (s.today ? ' today' : ''), ICON.sun); i.dataset.day = String(s.day); d.appendChild(i); });
  return d;
};
FX.goalPill = function () {
  var d = el('div', 'goalpill'); d.appendChild(FX.goalRing()); d.appendChild(FX.suns()); return d;
};
FX.crown = function (level) { /* 1 = finished world, 2 = finished with 3 stars everywhere */
  return el('span', 'crown c' + level, ICON.crown + '<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>');
};

/* ---------- big overlays ---------- */
function overlay() { return document.getElementById('overlay'); }
/* daily goal reached: trophy + Lisa + confetti + lisa_goal */
FX.popGoal = async function (flow) {
  var o = el('div', 'pop popgoal'); o.innerHTML = '<div class="rays"></div>';
  var row = el('div', 'goalrow'); o.appendChild(row);
  row.appendChild(el('div', 'bigtrophy', ICON.trophy));
  var l = Lisa.make({ cls: 'goal-lisa' }); l.pose('dance'); l.classList.add('nopoke'); row.appendChild(l);
  overlay().appendChild(o);
  FX.note('goal'); FX.goals = (FX.goals || 0) + 1; Snd.sfx('fanfare');
  FX.rain(flow, 2200, 3);
  var line = Core.lisaLine('goal');
  await flow.say([line]);
  await flow.wait(1300);
  o.classList.add('out'); await flow.wait(350); o.remove();
};
/* a world got its crown */
FX.popCrown = async function (flow, level) {
  var o = el('div', 'pop popcrown'); o.innerHTML = '<div class="rays"></div>';
  o.appendChild(el('div', 'bigcrown', ICON.crown));
  overlay().appendChild(o);
  FX.note('crown'); Snd.sfx('fanfare'); FX.burst(68 * rem(), 36 * rem(), { n: 24, power: 1.5, big: true });
  await flow.wait(1500);
  o.classList.add('out'); await flow.wait(350); o.remove();
  void level;
};
/* review chest: shake, lid pops, stars fly out. btn = the map chest button. Resolves when the animation is done. */
FX.openChest = async function (flow, btn) {
  var L = layer(), R = rem(), pos = FX.pt(btn);
  btn.style.visibility = 'hidden';
  var c = el('div', 'chestfx', ICON.chest); c.style.left = pos.x + 'px'; c.style.top = pos.y + 'px'; L.appendChild(c);
  FX.note('chest');
  var lid = Core.$('.clid', c), glow = Core.$('.cglow', c);
  if (c.animate) {
    c.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-62%) scale(1.5)', offset: 0.35 }, { transform: 'translate(-50%,-62%) scale(1.6)' }], { duration: 900 / Core.speed, easing: 'ease-out', fill: 'forwards' });
    var sh = c.querySelector('svg'); if (sh && sh.animate) sh.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0deg)' }], { duration: 650 / Core.speed, easing: 'ease-in-out' });
  }
  Snd.sfx('tick', 2);
  await flow.wait(680);
  Snd.sfx('pop'); Snd.sfx('sparkle');
  if (lid && lid.animate) { lid.style.transformOrigin = '10px 56px'; lid.style.transformBox = 'view-box'; lid.animate([{ transform: 'rotate(0deg) translateY(0px)' }, { transform: 'rotate(-62deg) translateY(-6px)', offset: 0.7 }, { transform: 'rotate(-55deg) translateY(-4px)' }], { duration: 420 / Core.speed, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' }); }
  if (glow && glow.animate) glow.animate([{ opacity: 0 }, { opacity: 0.95 }], { duration: 300 / Core.speed, fill: 'forwards' });
  FX.burst(pos.x, pos.y - 5 * R, { n: 26, power: 1.4, shapes: ['star', 'star', 'dot'], big: true });
  await flow.wait(900);
  if (c.animate) c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 / Core.speed, fill: 'forwards' });
  await flow.wait(320);
  if (c.parentNode) c.parentNode.removeChild(c);
};
/* high five at the end of a level: Lisa raises a paw, a big glowing hand invites a tap; no tap = continues on its own. */
FX.highFive = async function (flow, root, lisa, ms) {
  lisa.pose('five');
  var tapped = false, resolve, b = el('div', 'btn hifive', '<span class="ic">' + Lisa.ico.hand + '</span>');
  var wait = new Promise(function (r) { resolve = r; });
  Core.tap(b, function () {
    if (tapped) return; tapped = true;
    Snd.sfx('clap');
    var p = FX.pt(b);
    FX.burst(p.x, p.y, { n: 18, power: 1.1, big: true });
    lisa.react('jump'); FX.fives++; FX.note('highfive');
    b.classList.add('done'); resolve(true);
  }, { silent: true, nopress: true });
  root.appendChild(b);
  flow.after(ms || 5000, function () { resolve(false); });
  var did = await flow.guard(wait);
  if (did) await flow.wait(900);
  b.classList.add('gone');
  await flow.wait(250);
  if (b.parentNode) b.parentNode.removeChild(b);
  return did;
};

/* ---------- Lisa poke: tap her anywhere for a giggle; her line at most once per 4 s and never over other speech ---------- */
document.addEventListener('pointerdown', function (e) {
  var t = e.target, l = t && t.closest && t.closest('.lisa');
  if (!l || l.classList.contains('nopoke') || l.classList.contains('rest-lisa') || l.classList.contains('pop-lisa')) return;
  FX.poke(l);
}, true);
FX.poke = function (l) {
  if (l.react) l.react(Math.random() < 0.5 ? 'giggle' : 'jump');
  FX.pokes++;
  var now = Date.now();
  if (now - FX.lastPoke < 4000 / Core.speed) return false;
  FX.lastPoke = now;
  Snd.sfx('pop');
  if (!Snd.busy()) { var line = Core.lisaLine('poke'); if (line) { Snd.say([line]); FX.voiced++; } FX.lastVoice = now; }
  return true;
};

FX.state = function () {
  return { combo: FX.combo, best: FX.bestCombo, levelXP: FX.level.xp, levelCorrect: FX.level.correct, dayXP: Core.dayXP(), totalXP: Core.save.xp, goal: Core.goalTarget(), goalMet: Core.goalMet(),
    live: FX.parts.length, spawned: FX.spawned, chips: FX.chips, celebrations: FX.celebrations, last: FX.lastCelebration, log: FX.log.slice(), misses: FX.misses, corrects: FX.corrects, fives: FX.fives, pokes: FX.pokes, lastPoke: FX.lastPoke, oops: FX.oopsToggle, voiced: FX.voiced, goals: FX.goals || 0 };
};
})();
