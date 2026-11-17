/* Lisa's Island - screen manager and non-game screens. */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap;
var UI = window.UI = { cur: null, p: {}, flow: null, root: null, screens: {}, mapVoiced: false };
UI.stage = document.getElementById('stage');
UI.overlay = document.getElementById('overlay');

/* ---------- screen manager ---------- */
UI.go = function (name, p) {
  if (UI.flow) UI.flow.kill();
  Snd.stop();
  UI.stage.innerHTML = ''; UI.overlay.innerHTML = '';
  FX.clear();
  var flow = UI.flow = new Core.Flow();
  UI.cur = name; UI.p = p || {};
  var root = el('section', 'screen s-' + name);
  UI.stage.appendChild(root); UI.root = root;
  UI.screens[name](flow, root, UI.p);
  return flow;
};

/* ---------- scenery ---------- */
var SC = {
  meadow: { edge: 'linear-gradient(#8fd3ff,#7ed957)', svg:
    '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset=".72" stop-color="#e2f6ff"/></linearGradient></defs>' +
    '<rect width="1366" height="768" fill="url(#g1)"/><circle cx="1180" cy="120" r="100" fill="#fff3b0" opacity=".5"/><circle cx="1180" cy="120" r="66" fill="#ffe27a"/>' +
    '<g class="cloud c1"><ellipse cx="220" cy="130" rx="90" ry="36" fill="#fff"/><ellipse cx="290" cy="112" rx="60" ry="34" fill="#fff"/><ellipse cx="170" cy="118" rx="52" ry="28" fill="#fff"/></g>' +
    '<g class="cloud c2"><ellipse cx="760" cy="80" rx="80" ry="30" fill="#fff"/><ellipse cx="820" cy="64" rx="50" ry="28" fill="#fff"/></g>' +
    '<path d="M0 560 Q200 470 420 540 T860 520 T1366 540 V768 H0Z" fill="#a9e58f"/><path d="M0 640 Q260 570 560 630 T1100 620 T1366 640 V768 H0Z" fill="#7ed957"/>' +
    '<g fill="#ff8a65"><circle cx="120" cy="690" r="9"/><circle cx="480" cy="720" r="9"/><circle cx="900" cy="700" r="9"/><circle cx="1240" cy="720" r="9"/></g><g fill="#fff59d"><circle cx="260" cy="730" r="8"/><circle cx="700" cy="740" r="8"/><circle cx="1100" cy="738" r="8"/></g>' },
  sea: { edge: 'linear-gradient(#5ec8f2,#3ba9e0)', svg:
    '<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd3f7"/><stop offset="1" stop-color="#2f9fe0"/></linearGradient></defs>' +
    '<rect width="1366" height="768" fill="url(#g2)"/>' +
    '<g class="wave w1" fill="none" stroke="#fff" stroke-width="5" opacity=".45" stroke-linecap="round"><path d="M40 60 q20 -14 40 0 t40 0"/><path d="M1160 90 q20 -14 40 0 t40 0"/><path d="M600 40 q20 -14 40 0 t40 0"/></g>' +
    '<g class="wave w2" fill="none" stroke="#fff" stroke-width="5" opacity=".4" stroke-linecap="round"><path d="M80 720 q20 -14 40 0 t40 0"/><path d="M1180 700 q20 -14 40 0 t40 0"/><path d="M640 740 q20 -14 40 0 t40 0"/></g>' +
    '<path d="M70 150 Q60 60 300 60 Q700 20 1100 56 Q1320 70 1300 300 Q1330 520 1250 650 Q1100 740 700 725 Q300 744 150 660 Q40 580 70 400 Z" fill="#fff3c4"/>' +
    '<path d="M100 170 Q90 90 310 88 Q700 52 1090 86 Q1290 98 1272 300 Q1300 510 1226 626 Q1090 706 700 692 Q320 710 180 636 Q76 566 100 400 Z" fill="#9be36c"/>' +
    '<g fill="#7fcf55"><circle cx="220" cy="170" r="40"/><circle cx="1180" cy="620" r="46"/><circle cx="1240" cy="170" r="34"/></g>' },
  night: { edge: 'linear-gradient(#2a2a6e,#3a2f7a)', svg:
    '<defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c5e"/><stop offset="1" stop-color="#4a3a8e"/></linearGradient></defs>' +
    '<rect width="1366" height="768" fill="url(#g3)"/>' +
    '<g fill="#fff59d"><circle cx="160" cy="110" r="4"/><circle cx="420" cy="70" r="3"/><circle cx="640" cy="150" r="4"/><circle cx="930" cy="90" r="3"/><circle cx="1250" cy="220" r="4"/><circle cx="300" cy="260" r="3"/><circle cx="1100" cy="60" r="3"/><circle cx="780" cy="260" r="3"/></g>' +
    '<g class="twinkle"><circle cx="520" cy="210" r="5" fill="#fff"/><circle cx="1010" cy="180" r="5" fill="#fff"/><circle cx="90" cy="300" r="5" fill="#fff"/></g>' +
    '<circle cx="1120" cy="170" r="110" fill="#fff9c4" opacity=".16"/><circle cx="1120" cy="170" r="76" fill="#fff59d"/><circle cx="1148" cy="150" r="70" fill="#2a2a6e" opacity=".0"/>' +
    '<path d="M0 640 Q300 580 640 630 T1366 620 V768 H0Z" fill="#33407a"/><path d="M0 700 Q400 660 800 700 T1366 690 V768 H0Z" fill="#26306a"/>' },
  paper: { edge: '#fff4dc', svg:
    '<rect width="1366" height="768" fill="#fff4dc"/><g fill="#ffe9bd">' + (function () { var s = ''; for (var i = 0; i < 40; i++) s += '<circle cx="' + ((i * 137) % 1366) + '" cy="' + ((i * 89) % 768) + '" r="' + (6 + (i % 4) * 3) + '"/>'; return s; })() + '</g>' },
  garden: { edge: 'linear-gradient(#bfe9ff,#8fdc6a)', svg:
    '<defs><linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset=".6" stop-color="#eaf9ff"/></linearGradient></defs>' +
    '<rect width="1366" height="768" fill="url(#g4)"/><g class="cloud c1"><ellipse cx="240" cy="90" rx="80" ry="30" fill="#fff"/><ellipse cx="300" cy="74" rx="50" ry="28" fill="#fff"/></g>' +
    '<path d="M0 600 Q300 540 640 590 T1366 580 V768 H0Z" fill="#a9e58f"/><path d="M0 690 Q400 640 800 690 T1366 680 V768 H0Z" fill="#7ed957"/>' +
    (function () { var s = '', cols = ['#f48fb1', '#fff176', '#ce93d8', '#ffb74d', '#90caf9']; for (var i = 0; i < 18; i++) { var x = 40 + i * 77, y = 640 + (i % 3) * 40; s += '<path d="M' + x + ' ' + (y + 30) + ' V' + y + '" stroke="#43a047" stroke-width="4"/><circle cx="' + x + '" cy="' + y + '" r="10" fill="' + cols[i % 5] + '"/><circle cx="' + x + '" cy="' + y + '" r="4" fill="#fff59d"/>'; } return s; })() }
};
UI.scene = function (root, kind) {
  var s = SC[kind] || SC.meadow;
  var d = el('div', 'scene sc-' + kind, '<svg viewBox="0 0 1366 768" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' + s.svg + '</svg>');
  root.insertBefore(d, root.firstChild);
  document.body.style.background = s.edge;
};

/* ---------- shared widgets ---------- */
UI.btn = function (cls, html, fn, o) { var b = el('div', 'btn ' + cls, html); tap(b, fn, o); return b; };
UI.homeBtn = function (fn) { return UI.btn('b-home', '<span class="ic">' + Lisa.ico.home + '</span>', fn); };
UI.backBtn = function (fn) { return UI.btn('b-back', '<span class="ic">' + Lisa.ico.back + '</span>', fn); };
UI.speakerBtn = function (fn) { return UI.btn('b-speaker', '<span class="ic">' + Lisa.ico.speaker + '</span>', fn, { nopress: true }); };
UI.pulse = function (b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); setTimeout(function () { b.classList.remove('pulse'); }, 1400); };
UI.starBadge = function () {
  return el('div', 'starbadge', '<span class="ic">' + Lisa.ico.star + '</span><b>' + Core.save.stars + '</b>');
};
/* level progress: Duolingo-style bar (fills with a shine) + combo flame + XP counter; same set(k) interface as the old dots */
UI.dots = function (n) { return FX.hud(n); };
/* idle cues. Time is counted in virtual ms (ticks of 500 ms scaled by Core.speed) and reset by any tap.
   o.visual() runs silently after o.visualMs of no input (and again every visualMs): pulse / nudge only.
   o.speak() runs at most ONCE per input epoch, after o.speakMs (about 20 s) of no input; a tap re-arms it.
   o.active() (optional) false = screen not waiting for the child (counter held at 0). Returns {reset()}. */
UI.idle = function (flow, o) {
  var idleMs = 0, seq = Core.inputSeq, spoke = false, lastVis = 0, TICK = 500;
  var h = { reset: function () { idleMs = 0; spoke = false; lastVis = 0; seq = Core.inputSeq; } };
  (flow.idles = flow.idles || []).push(h);
  flow.every(TICK, function () {
    if (seq !== Core.inputSeq) { h.reset(); return; }
    if (o.active && !o.active()) { idleMs = 0; return; }
    idleMs += TICK;
    if (o.visual && idleMs - lastVis >= (o.visualMs || 8000)) { lastVis = idleMs; o.visual(); }
    if (o.speak && !spoke && idleMs >= (o.speakMs || 20000)) { spoke = true; o.speak(); }
  });
  return h;
};
UI.idleReset = function (flow) { (flow.idles || []).forEach(function (h) { h.reset(); }); };
/* help button: round light bulb, icon only */
UI.helpBtn = function (fn) { var b = UI.btn('b-help', '<span class="ic">' + Lisa.ico.bulb + '</span>', fn, { nopress: true }); return b; };
UI.prompt = function (flow, host, list, targets) { return flow.prompt(host, list, targets); };
/* parental gate: press and hold 3 seconds */
UI.holdGate = function (host, onOpen, o) {
  o = o || {}; var ms = o.ms || 3000;
  var b = el('div', 'gearbtn' + (o.cls ? ' ' + o.cls : ''),
    '<svg class="gring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="8"/><circle class="gprog" cx="50" cy="50" r="44" fill="none" stroke="#7e57c2" stroke-width="9" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="276.5" transform="rotate(-90 50 50)"/></svg>' +
    '<span class="ic">' + (o.icon || Lisa.ico.gear) + '</span>');
  b.classList.add('small');
  var prog = b.querySelector('.gprog'), start = 0, raf = 0, active = false;
  function step() {
    if (!active) return;
    var f = Math.min(1, (performance.now() - start) / (ms / (Core.fast ? 8 : 1)));
    prog.style.strokeDashoffset = String(276.5 * (1 - f));
    if (f >= 1) { active = false; prog.style.strokeDashoffset = '276.5'; onOpen(); return; }
    raf = requestAnimationFrame(step);
  }
  function stop() { active = false; cancelAnimationFrame(raf); prog.style.strokeDashoffset = '276.5'; }
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); active = true; start = performance.now(); raf = requestAnimationFrame(step); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, stop); });
  host.appendChild(b);
  return b;
};
UI.langTabs = function (cur, onChange) {
  var d = el('div', 'langtabs');
  Core.enabledLangs().forEach(function (l) {
    var b = el('div', 'btn b-flag' + (l === cur ? ' sel' : ''), '<img src="' + D.uiImg['flag_' + l] + '" alt="">'); b.dataset.lang = l;
    tap(b, function () { onChange(l); });
    d.appendChild(b);
  });
  return d;
};
UI.worldPic = function (wid, cls) { return Core.Pic.el(Core.item(D.worlds[Core.worldIdx(wid)].items[0]), cls || ''); };

/* ---------- HOME ---------- */
UI.screens.home = function (flow, root) {
  UI.scene(root, 'meadow');
  var busy = false, lang = Core.curLang(); Core.lang = lang;
  var asleep = Path.sleeping();
  var lisa = Lisa.make({ cls: 'home-lisa' + (asleep ? ' path-sleeplisa' : '') }); root.appendChild(lisa);
  if (asleep) {
    lisa.pose('sleep');
    tap(lisa, function () { var l = Core.lisaLine('sleep'); if (l) Snd.say([l]); }, { nopress: true });
  } else flow.after(900, function () { lisa.react('wave'); });
  /* ONE big Play button: today's session (resumes where it stopped). Asleep: no button until the next calendar day. */
  var play = null;
  if (!asleep) {
    play = UI.btn('path-play', '<span class="ic">' + Lisa.ico.play + '</span>', function () {
      if (busy) return; busy = true; play.classList.add('chosen'); Snd.sfx('whoosh'); Path.play();
    });
    root.appendChild(play);
  }
  if (Core.enabledLangs().length > 1) {
    var tabs = UI.langTabs(lang, function (l) { Core.lang = l; UI.go('home'); });
    tabs.classList.add('path-langs'); root.appendChild(tabs);
  }
  var low = el('div', 'homebtns'); root.appendChild(low);
  var bAlbum = UI.btn('b-big b-album', '<span class="ic">' + Lisa.ico.album + '</span>', function () { UI.go('stickers', { from: 'home' }); });
  var bWard = UI.btn('b-big b-ward', '<span class="ic">' + Lisa.ico.wardrobe + '</span>', function () { UI.go('wardrobe', { from: 'home' }); });
  var bGar = UI.btn('b-big b-garden', '<span class="ic">' + Lisa.ico.garden + '</span>', function () { UI.go('garden', { from: 'home' }); });
  var bHouse = House.mapBtn('home'); bHouse.classList.add('b-big');
  [bHouse, bGar, bAlbum, bWard].forEach(function (b) { low.appendChild(b); });
  root.appendChild(UI.starBadge());
  root.appendChild(FX.goalPill());
  var sp = UI.speakerBtn(function () { var u = Core.lisaLine(asleep ? 'sleep' : 'play'); if (u) Snd.say([u], {}); });
  sp.classList.add('home-speaker'); root.appendChild(sp);
  UI.holdGate(root, function () { UI.go('parent'); }, { cls: 'home-gear' });

  var first = Core.save.firstRun;
  if (first) { Core.save.firstRun = false; Core.persist(); }
  /* the first home entry: Lisa invites to play (welcome once on the very first run); asleep: silent until a tap */
  if (!asleep) flow.after(500, function () {
    var inv = Core.lisaLine('play');
    Snd.say((first ? [Core.ruUrl('welcome'), 300, inv] : [inv]).filter(function (x) { return x; }), { retry: true });
  });
  UI.idle(flow, { visualMs: 9000, visual: function () { if (play) { play.classList.remove('nudge'); void play.offsetWidth; play.classList.add('nudge'); } else UI.pulse(sp); } });
};

/* ---------- MAP ---------- */
function nodePos(i, N) {
  var rows = 3, per = Math.ceil(N / rows), r = Math.floor(i / per), c = i % per;
  var x0 = 9, x1 = 91, step = (x1 - x0) / (per - 1);
  var x = (r % 2 === 1) ? x1 - step * c : x0 + step * c;
  var y = [31, 57, 83][Math.min(r, 2)] + (c % 2 ? -3 : 3);
  return { x: x, y: y };
}
UI.pathD = function (pts) {
  var d = 'M' + (pts[0].x * 13.66).toFixed(1) + ' ' + (pts[0].y * 7.68).toFixed(1);
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i - 1], b = pts[i], ax = a.x * 13.66, ay = a.y * 7.68, bx = b.x * 13.66, by = b.y * 7.68, dx = (bx - ax) / 2;
    d += ' C' + (ax + dx).toFixed(1) + ' ' + ay.toFixed(1) + ' ' + (bx - dx).toFixed(1) + ' ' + by.toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
  }
  return d;
};
UI.screens.map = function (flow, root) {
  var lang = Core.curLang(); Core.lang = lang;
  UI.scene(root, 'sea');
  var N = D.worlds.length, pts = [];
  for (var i = 0; i < N; i++) pts.push(nodePos(i, N));
  var pathSvg = el('div', 'pathsvg', '<svg viewBox="0 0 1366 768" preserveAspectRatio="xMidYMid slice"><path d="' + UI.pathD(pts) + '" fill="none" stroke="#f3d28b" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/><path d="' + UI.pathD(pts) + '" fill="none" stroke="#fff3c4" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 22"/></svg>');
  root.appendChild(pathSvg);
  var cur = Core.currentWorld(lang), busy = false;
  D.worlds.forEach(function (w, i) {
    var unl = Core.worldUnlocked(lang, i), done = Core.worldDone(lang, i);
    var n = el('div', 'node' + (unl ? '' : ' locked') + (i === cur ? ' current' : '') + (done ? ' done' : ''));
    n.style.left = pts[i].x + '%'; n.style.top = pts[i].y + '%';
    n.dataset.world = w.id;
    n.appendChild(UI.worldPic(w.id));
    if (!unl) n.appendChild(el('span', 'lockic', Lisa.ico.lock));
    if (done) n.appendChild(FX.crown(Core.crownOf(lang, w.id) || 1));
    tap(n, function () {
      if (busy) return;
      if (!unl) { Snd.sfx('boop'); n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); return; }
      busy = true;
      flow.say([Core.url.ui('ru', 'w_' + w.id), 200, Core.url.ui(lang, 'w_' + w.id)]).then(function () { UI.go('path', { world: w.id }); });
    }, { nopress: true });
    root.appendChild(n);
  });
  /* top bar */
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.homeBtn(function () { UI.go('home'); }));
  var right = el('div', 'right'); bar.appendChild(right);
  var anyDone = D.worlds.some(function (w, i) { return Core.worldDone(lang, i); });
  if (window.House) right.appendChild(House.mapBtn());
  if (anyDone) right.appendChild(UI.btn('b-run', '<span class="ic">' + Lisa.ico.run + '</span>', function () { UI.go('freerun', { lang: lang }); }));
  right.appendChild(UI.btn('b-garden', '<span class="ic">' + Lisa.ico.garden + '</span>', function () { UI.go('garden', { from: 'map' }); }));
  right.appendChild(UI.btn('b-ward', '<span class="ic">' + Lisa.ico.wardrobe + '</span>', function () { UI.go('wardrobe', { from: 'map' }); }));
  right.appendChild(UI.btn('b-album', '<span class="ic">' + Lisa.ico.album + '</span>', function () { UI.go('stickers', { from: 'map' }); }));
  var sb = UI.starBadge(); sb.classList.add('map-stars'); root.appendChild(sb);
  var ring = FX.goalRing('solo'); root.appendChild(ring);
  var lflag = el('div', 'curflag', '<img src="' + D.uiImg['flag_' + lang] + '" alt="">'); root.appendChild(lflag);
  /* treasure chest when >= 4 words due */
  var due = Core.SRS.dueList(lang);
  if (due.length >= 4) {
    var chest = UI.btn('chest', '<span class="ic">' + Lisa.ico.chest + '</span>', function () {
      if (busy) return; busy = true;
      var say = [Core.ruUrl('review'), 150, Core.lisaLine('chest')].filter(Boolean);
      /* the chest shakes and pops open while Lisa talks; then the review round starts */
      Promise.all([FX.openChest(flow, chest), flow.say(say)]).then(function () { UI.go('review', { lang: lang }); });
    }, { nopress: true });
    chest.style.left = '88%'; chest.style.top = '83%';
    root.appendChild(chest);
  }
  var lisa = Lisa.make({ cls: 'map-lisa' });
  lisa.style.left = pts[cur].x < 20 ? 'calc(' + pts[cur].x + '% + 8rem)' : 'calc(' + pts[cur].x + '% - 17rem)'; lisa.style.top = 'calc(' + pts[cur].y + '% - 4rem)';
  root.appendChild(lisa);
  var sp = UI.speakerBtn(function () { Snd.say([Core.ruUrl('map')]); });
  sp.classList.add('map-speaker'); root.appendChild(sp);
  if (!UI.mapVoiced) { UI.mapVoiced = true; flow.after(500, function () { Snd.say([Core.ruUrl('map')]); }); }
  UI.idle(flow, { visualMs: 15000, visual: function () { UI.pulse(sp); } });
};

/* ---------- WORLD LEVEL PATH ---------- */
var LV_PTS = [{ x: 14, y: 66 }, { x: 32, y: 46 }, { x: 50, y: 66 }, { x: 68, y: 46 }, { x: 86, y: 66 }];
UI.startLevel = function (lang, wid, k) {
  var base = { lang: lang, world: wid, level: k };
  if (k === 0) UI.go('meet', Object.assign({ part: 0 }, base));
  else if (k === 1) UI.go('tap', base);
  else if (k === 2) UI.go('meet', Object.assign({ part: 1 }, base));
  else if (k === 3) UI.go('memory', base);
  else UI.go('run', base);
};
UI.screens.path = function (flow, root, p) {
  var lang = Core.curLang(), wid = p.world, lv = Core.lv(lang, wid), wi = Core.worldIdx(wid);
  UI.scene(root, 'meadow');
  root.appendChild(el('div', 'pathsvg', '<svg viewBox="0 0 1366 768" preserveAspectRatio="xMidYMid slice"><path d="' + UI.pathD(LV_PTS) + '" fill="none" stroke="#f3d28b" stroke-width="56" stroke-linecap="round"/><path d="' + UI.pathD(LV_PTS) + '" fill="none" stroke="#fff3c4" stroke-width="8" stroke-linecap="round" stroke-dasharray="2 22"/></svg>'));
  var first = -1; for (var k = 0; k < 5; k++) if (!lv[k].done) { first = k; break; }
  var busy = false;
  for (k = 0; k < 5; k++) (function (k) {
    var unl = Core.levelUnlocked(lang, wid, k);
    var n = el('div', 'lvnode lv' + k + (unl ? '' : ' locked') + (k === first ? ' current' : '') + (lv[k].done ? ' done' : ''));
    n.style.left = LV_PTS[k].x + '%'; n.style.top = LV_PTS[k].y + '%';
    n.dataset.level = k;
    n.innerHTML = '<span class="lvic">' + Lisa.levelIcon(k) + '</span><span class="lvstars">' +
      [0, 1, 2].map(function (s) { return '<i>' + (lv[k].stars > s ? Lisa.ico.star : Lisa.ico.starOff) + '</i>'; }).join('') + '</span>';
    if (!unl) n.appendChild(el('span', 'lockic', Lisa.ico.lock));
    tap(n, function () {
      if (busy) return;
      if (!unl) { Snd.sfx('boop'); n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); return; }
      busy = true; UI.startLevel(lang, wid, k);
    }, { nopress: true });
    root.appendChild(n);
  })(k);
  /* entry nodes (minigames.js): the seek-and-find scene (scene.js) and every mini-game registered for this world; open once level 1 is done */
  if (window.MG) MG.pathNodes(root, lang, wid, { busy: function () { return busy; }, take: function () { busy = true; } });
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { UI.go('map'); }));
  var med = el('div', 'medal'); med.appendChild(UI.worldPic(wid)); bar.appendChild(med);
  if (Core.crownOf(lang, wid)) med.appendChild(FX.crown(Core.crownOf(lang, wid)));
  var wsp = UI.speakerBtn(function () { Snd.say([Core.url.ui('ru', 'w_' + wid), 200, Core.url.ui(lang, 'w_' + wid)]); });
  bar.appendChild(wsp);
  var sb = UI.starBadge(); sb.classList.add('path-stars'); root.appendChild(sb);
  var lisa = Lisa.make({ cls: 'path-lisa' });
  var cp = LV_PTS[first < 0 ? 4 : first];
  lisa.style.left = (cp.x - 5) + '%'; lisa.style.top = (cp.y - 30) + '%';
  root.appendChild(lisa);
  UI.idle(flow, { visualMs: 15000, visual: function () { UI.pulse(wsp); } });
  void wi;
};

/* ---------- celebrations (stickers, hats, new world) ---------- */
UI.popSticker = async function (flow, lang, id) {
  var it = Core.item(id);
  var o = el('div', 'pop popsticker'); o.innerHTML = '<div class="rays"></div>';
  var s = el('div', 'bigsticker'); s.appendChild(Core.Pic.el(it)); o.appendChild(s);
  UI.overlay.appendChild(o);
  Snd.sfx('star');
  await flow.say([Core.ruUrl('new_sticker'), 200, Core.url.w(lang, id)]);
  await flow.wait(500);
  o.classList.add('out'); await flow.wait(350); o.remove();
};
UI.popHat = async function (flow, id) {
  var o = el('div', 'pop pophat'); o.innerHTML = '<div class="rays"></div>';
  var l = Lisa.make({ cls: 'pop-lisa' }); l.pose('cheer'); o.appendChild(l);
  UI.overlay.appendChild(o);
  Snd.sfx('fanfare');
  await flow.say([Core.ruUrl('new_hat')]);
  await flow.wait(900);
  o.classList.add('out'); await flow.wait(350); o.remove();
};
UI.celebrate = async function (flow, lang, o) {
  if (Core.pending.goal) { Core.pending.goal = false; await FX.popGoal(flow); }
  if (o && o.crown) await FX.popCrown(flow, o.crown);
  while (Core.pending.hats.length) await UI.popHat(flow, Core.pending.hats.shift());
  var st = Core.pending.stickers.splice(0, 3); Core.pending.stickers.length = 0;
  for (var i = 0; i < st.length; i++) await UI.popSticker(flow, st[i].lang, st[i].id);
  if (Core.pending.opened.length) {
    var wi = Core.pending.opened.shift(); Core.pending.opened.length = 0;
    var o = el('div', 'pop popworld'); o.innerHTML = '<div class="rays"></div>';
    var b = el('div', 'bigworld'); b.appendChild(UI.worldPic(D.worlds[wi].id)); o.appendChild(b);
    UI.overlay.appendChild(o); Snd.sfx('unlock');
    await flow.say([Core.ruUrl('world_open')]);
    await flow.wait(500); o.classList.add('out'); await flow.wait(350); o.remove();
  }
};
UI.afterLevel = function (p) {
  var st = Core.save.settings;
  if (st.sessionMin > 0 && Core.sess.restDue) {
    if (st.hard) Core.markHardStop();
    UI.go('rest', { hard: !!st.hard });
    return;
  }
  if (p && p.world && p.kind !== 'review' && p.kind !== 'free') UI.go('path', { world: p.world });
  else UI.go('map');
};

/* ---------- RESULT (end of level): full-screen celebration ---------- */
UI.screens.result = function (flow, root, p) {
  UI.scene(root, 'meadow');
  var lisa = Lisa.make({ cls: 'result-lisa' }); root.appendChild(lisa); lisa.pose('dance');
  var row = el('div', 'starrow'); root.appendChild(row);
  var n = p.stars || 0, slots = [];
  for (var i = 0; i < 3; i++) { var s = el('div', 'rstar', '<span class="off">' + Lisa.ico.starOff + '</span><span class="on">' + Lisa.ico.star + '</span>'); row.appendChild(s); slots.push(s); }
  var jar = el('div', 'jar', Lisa.ico.jar + '<div class="jarfill" style="height:' + Math.round(8 + 70 * Math.min(1, (Core.save.stars - (p.gain || 0)) / 190)) + '%"></div>');
  root.appendChild(jar);
  var skip = UI.btn('b-skip', '<span class="ic">' + Lisa.ico.next + '</span>', function () { go(); });
  root.appendChild(skip);
  var going = false;
  function go() { if (going) return; going = true; UI.afterLevel(p); }
  (async function () {
    FX.note('levelcomplete'); Snd.sfx('fanfare');
    FX.rain(flow, 3600, 2);
    await flow.wait(700);
    for (var i = 0; i < n; i++) {
      slots[i].classList.add('lit'); Snd.sfx('rise', i);
      var sp = FX.pt(slots[i]); FX.burst(sp.x, sp.y, { n: 14, power: 1.1, big: true });
      await flow.wait(560);
    }
    /* XP tally counts up */
    var xp = p.xp || 0;
    if (xp > 0) {
      var tally = el('div', 'xptally', FX.icon.bolt + '<b>0</b>'); root.appendChild(tally);
      var tb = Core.$('b', tally), steps = Math.min(xp, 14);
      for (var k = 1; k <= steps; k++) { tb.textContent = Math.round(xp * k / steps); Snd.sfx('tick', k); await flow.wait(65); }
      tb.textContent = xp; tally.dataset.xp = String(xp); tally.classList.add('full');
      await flow.wait(300);
    }
    var gain = p.gain || 0;
    if (gain > 0) {
      var fr = jar.getBoundingClientRect();
      for (var j = 0; j < Math.min(gain, p.fly || n); j++) {
        var sr = slots[n - 1 - (j % n)].getBoundingClientRect(), fl = el('div', 'flystar', Lisa.ico.star);
        fl.style.left = sr.left + 'px'; fl.style.top = sr.top + 'px'; fl.style.width = sr.width + 'px'; fl.style.height = sr.height + 'px';
        fl.dataset.dx = (fr.left + fr.width / 2 - sr.left - sr.width / 2); fl.dataset.dy = (fr.top + fr.height * 0.4 - sr.top - sr.height / 2);
        document.body.appendChild(fl);
        flow.onKill((function (f) { return function () { f.remove(); }; })(fl));
        if (fl.animate) fl.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + fl.dataset.dx + 'px,' + fl.dataset.dy + 'px) scale(.4)', opacity: 0.2 }], { duration: 800 / Core.speed, easing: 'ease-in', fill: 'forwards' });
        Snd.sfx('whoosh');
        await flow.wait(260);
      }
      await flow.wait(700);
      jar.querySelector('.jarfill').style.height = Math.round(8 + 70 * Math.min(1, Core.save.stars / 190)) + '%';
      Snd.sfx('star');
    }
    await flow.say([Core.ruUrl('level_done'), 150, Core.lisaLine('level')].filter(Boolean));
    await UI.celebrate(flow, p.lang, { crown: p.crownNew });
    /* high five: Lisa raises a paw; a tap claps, no tap continues by itself */
    await FX.highFive(flow, root, lisa, 5000);
    await flow.wait(300);
    go();
  })();
};

/* ---------- STICKER BOOK ---------- */
UI.screens.stickers = function (flow, root, p) {
  var lang = p.lang || Core.curLang(), pg = p.page;
  if (pg == null) {
    /* open on the newest page that has a sticker, else the current world */
    pg = Core.currentWorld(lang);
    var Wd = Core.L(lang).words;
    for (var wi = Core.D.worlds.length - 1; wi >= 0; wi--) {
      if (Core.D.worlds[wi].items.some(function (id) { return Wd[id] && Wd[id].sticker; })) { pg = wi; break; }
    }
  }
  UI.scene(root, 'paper');
  var W = D.worlds[pg], L = Core.L(lang);
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { UI.go(p.from === 'map' ? 'map' : 'home'); }));
  var med = el('div', 'medal'); med.appendChild(UI.worldPic(W.id)); bar.appendChild(med);
  var wsp = UI.speakerBtn(function () { Snd.say([Core.ruUrl('stickers')]); }); bar.appendChild(wsp);
  var right = el('div', 'right'); bar.appendChild(right);
  right.appendChild(UI.langTabs(lang, function (l) { Core.lang = l; UI.go('stickers', { lang: l, page: pg, from: p.from }); }));
  var learned = W.items.filter(function (id) { return L.words[id] && L.words[id].sticker; }).length;
  var dots = el('div', 'dots big');
  for (var i = 0; i < W.items.length; i++) dots.appendChild(el('i', i < learned ? 'on' : ''));
  root.appendChild(dots);
  var book = el('div', 'book' + (Core.worldDone(lang, pg) ? ' complete' : '')); root.appendChild(book);
  var grid = el('div', 'sgrid n' + W.items.length); book.appendChild(grid);
  W.items.forEach(function (id, i) {
    var w = L.words[id], on = !!(w && w.sticker);
    var s = el('div', 'slot' + (on ? ' got' : ''));
    s.style.setProperty('--rot', ((i * 37) % 9 - 4) + 'deg');
    s.dataset.id = id;
    s.appendChild(Core.Pic.el(Core.item(id)));
    tap(s, function () {
      if (on) { s.classList.remove('boing'); void s.offsetWidth; s.classList.add('boing'); Snd.say([Core.url.w(lang, id)]); }
      else { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
    }, { nopress: true });
    grid.appendChild(s);
  });
  function nav(dir) {
    return UI.btn('b-nav ' + (dir < 0 ? 'prev' : 'next'), '<span class="ic">' + (dir < 0 ? Lisa.ico.back : Lisa.ico.next) + '</span>', function () {
      UI.go('stickers', { lang: lang, page: (pg + dir + D.worlds.length) % D.worlds.length, from: p.from });
    });
  }
  root.appendChild(nav(-1)); root.appendChild(nav(1));
  var pd = el('div', 'pagedots'); D.worlds.forEach(function (w, i) { pd.appendChild(el('i', i === pg ? 'on' : '')); }); root.appendChild(pd);
  void W;
};

/* ---------- PICTURE GARDEN (free play, no scoring) ---------- */
UI.screens.garden = function (flow, root, p) {
  var lang = p.lang || Core.curLang(); Core.lang = lang;
  var intro = Core.SRS.introduced(lang);
  var pages = D.worlds.map(function (w, i) { return { w: w, ids: w.items.filter(function (id) { return intro.indexOf(id) >= 0; }), i: i }; }).filter(function (x) { return x.ids.length; });
  var pg = p.page == null ? 0 : Math.min(p.page, Math.max(0, pages.length - 1));
  UI.scene(root, 'garden');
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { UI.go(p.from === 'map' ? 'map' : 'home'); }));
  var right = el('div', 'right'); bar.appendChild(right);
  right.appendChild(UI.langTabs(lang, function (l) { Core.lang = l; UI.go('garden', { lang: l, from: p.from }); }));
  if (!pages.length) {
    var lis = Lisa.make({ cls: 'garden-lisa' }); root.appendChild(lis);
    var seeds = el('div', 'seedrow'); for (var s = 0; s < 4; s++) seeds.appendChild(el('div', 'pot', '<i></i>')); root.appendChild(seeds);
    return;
  }
  var cur = pages[pg];
  var med = el('div', 'medal'); med.appendChild(UI.worldPic(cur.w.id)); bar.insertBefore(med, right);
  var grid = el('div', 'ggrid n' + cur.ids.length); root.appendChild(grid);
  cur.ids.forEach(function (id, i) {
    var c = el('div', 'gcard'); c.dataset.id = id;
    c.style.setProperty('--h', (i * 47) % 360);
    c.appendChild(Core.Pic.el(Core.item(id)));
    c.appendChild(el('span', 'bloom', '<svg viewBox="0 0 40 40"><g fill="#f8bbd0"><circle cx="20" cy="9" r="7"/><circle cx="31" cy="20" r="7"/><circle cx="20" cy="31" r="7"/><circle cx="9" cy="20" r="7"/></g><circle cx="20" cy="20" r="7" fill="#ffd54f"/></svg>'));
    tap(c, function () { c.classList.remove('boing'); void c.offsetWidth; c.classList.add('boing'); Snd.say([Core.url.w(lang, id)]); }, { nopress: true });
    grid.appendChild(c);
  });
  if (pages.length > 1) {
    [-1, 1].forEach(function (dir) {
      root.appendChild(UI.btn('b-nav ' + (dir < 0 ? 'prev' : 'next'), '<span class="ic">' + (dir < 0 ? Lisa.ico.back : Lisa.ico.next) + '</span>', function () {
        UI.go('garden', { lang: lang, page: (pg + dir + pages.length) % pages.length, from: p.from });
      }));
    });
    var pd = el('div', 'pagedots'); pages.forEach(function (x, i) { pd.appendChild(el('i', i === pg ? 'on' : '')); }); root.appendChild(pd);
  }
};

/* ---------- FOX WARDROBE ---------- */
UI.screens.wardrobe = function (flow, root, p) {
  UI.scene(root, 'meadow');
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { UI.go(p.from === 'map' ? 'map' : 'home'); }));
  var lisa = Lisa.make({ cls: 'ward-lisa' }); root.appendChild(lisa);
  var shelf = el('div', 'shelf'); root.appendChild(shelf);
  var sb = UI.starBadge(); sb.classList.add('ward-stars'); root.appendChild(sb);
  var H = Core.save.hats;
  function refresh() {
    Lisa.applyWorn(lisa);
    Core.$$('.hatbtn', shelf).forEach(function (b) { b.classList.toggle('worn', H.worn.indexOf(b.dataset.hat) >= 0); });
  }
  Core.HATS.forEach(function (h) {
    var unl = H.unlocked.indexOf(h.id) >= 0;
    var b = el('div', 'hatbtn' + (unl ? '' : ' locked'), '<span class="hicon">' + Lisa.icon(h.id) + '</span>' + (unl ? '' : '<span class="lockic">' + Lisa.ico.lock + '</span><b class="need">' + h.at + '</b>'));
    b.dataset.hat = h.id;
    tap(b, function () {
      if (!unl) { Snd.sfx('boop'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); lisa.react('tilt'); return; }
      Core.wear(h.id, H.worn.indexOf(h.id) < 0); Snd.sfx('pop'); lisa.react('cheer'); refresh();
    }, { nopress: true });
    shelf.appendChild(b);
  });
  refresh();
  var sp = UI.speakerBtn(function () { Snd.say([Core.ruUrl('new_hat')]); });
  sp.classList.add('ward-speaker'); root.appendChild(sp);
};

/* ---------- REST (end of session) ---------- */
UI.screens.rest = function (flow, root, p) {
  UI.scene(root, 'night');
  var lisa = Lisa.make({ cls: 'rest-lisa' }); root.appendChild(lisa); lisa.pose('yawn');
  flow.after(1500, function () { lisa.pose('sleep'); Snd.sfx('yawn'); });
  if (!p.hard) root.appendChild(UI.homeBtn(function () {
    Core.sess.restDue = false; Core.sess.active = Math.max(0, Core.save.settings.sessionMin * 60 - 180);
    UI.go('home');
  }));
  UI.holdGate(root, function () {
    Core.save.hardStop = null; Core.persist(); Core.sess.restDue = false; Core.sess.active = 0; UI.go('home');
  }, { cls: 'rest-gear' });
  flow.after(600, function () { Snd.say([Core.ruUrl('rest'), 150, Core.lisaLine('bye')].filter(Boolean)); });
};
})();
