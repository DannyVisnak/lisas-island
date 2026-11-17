/* Lisa's Island - core: helpers, storage, audio, flow control, spaced repetition, progress. */
(function () {
'use strict';
var D = window.GAME_DATA;
var NEVER = new Promise(function () {});
var Core = window.Core = { D: D, speed: 1, fast: false, dayShift: 0, lang: null, lastInput: Date.now(), inputSeq: 0, NEVER: NEVER };

/* ---------- small helpers ---------- */
Core.$ = function (s, r) { return (r || document).querySelector(s); };
Core.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
Core.el = function (tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
Core.rnd = function (n) { return Math.floor(Math.random() * n); };
Core.shuffle = function (a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Core.rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
Core.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
Core.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms / Core.speed); }); };

/* ---------- data helpers ---------- */
Core.worlds = D.worlds;
Core.item = function (id) { return D.items[id]; };
Core.worldIdx = function (wid) { for (var i = 0; i < D.worlds.length; i++) if (D.worlds[i].id === wid) return i; return -1; };
Core.worldItems = function (wid) { return D.worlds[Core.worldIdx(wid)].items; };
Core.picKey = function (it) {
  var p = it.pic;
  return p.type === 'emoji' ? 'e:' + p.src : p.type === 'color' ? 'c:' + String(p.hex).toLowerCase() : 'n:' + p.n;
};
Core.vocabLabel = function (lang, item) {
  var text = item && item[lang] && item[lang].word || '', color = '#263238';
  if (lang === 'de') {
    var de = /^(der|die|das)\s+/i.exec(text);
    if (de) color = de[1].toLowerCase() === 'der' ? '#1565c0' : de[1].toLowerCase() === 'die' ? '#c62828' : '#2e7d32';
  } else if (lang === 'pt') {
    var pt = /^(o|os|a|as)\s+/i.exec(text);
    if (pt) color = /^(o|os)$/i.test(pt[1]) ? '#1565c0' : '#c62828';
  }
  return { text: text, color: color };
};
Core.vocabLabelEl = function (lang, item, gloss, cls) {
  var info = Core.vocabLabel(lang, item), wrap = document.createElement('span');
  wrap.className = (cls || 'vocab-label') + (Core.save.settings.subtitles ? '' : ' subtitles-off');
  var word = document.createElement('span'); word.className = 'vocab-word'; word.textContent = info.text; word.style.color = info.color; wrap.appendChild(word);
  if (gloss) { var ru = document.createElement('span'); ru.className = 'vocab-gloss'; ru.textContent = gloss; wrap.appendChild(ru); }
  return wrap;
};
function norm(s) { return String(s || '').toLowerCase().replace(/[.!?,]/g, '').trim(); }
Core.url = {
  w: function (lang, id) { return D.audioPath.word.replace('{lang}', lang).replace('{id}', id); },
  q: function (lang, id) { return D.audioPath.q.replace('{lang}', lang).replace('{id}', id); },
  gloss: function (id) { return D.audioPath.gloss.replace('{id}', id); },
  ui: function (lang, key) { return D.audioPath.ui.replace('{lang}', lang).replace('{key}', key); }
};
/* distractor choice: never two items with the same picture or the same target-language word */
Core.choices = function (lang, targetId, n, pool) {
  var t = D.items[targetId], usedPic = {}, usedWord = {}, out = [targetId];
  usedPic[Core.picKey(t)] = 1; usedWord[norm(t[lang].word)] = 1;
  function tryAdd(id) {
    if (out.length >= n || id === targetId) return;
    var it = D.items[id]; if (!it) return;
    var pk = Core.picKey(it), w = norm(it[lang].word);
    if (usedPic[pk] || usedWord[w]) return;
    usedPic[pk] = 1; usedWord[w] = 1; out.push(id);
  }
  Core.shuffle(pool || []).forEach(tryAdd);
  if (out.length < n) {
    var same = D.worlds[Core.worldIdx(t.world)].items;
    Core.shuffle(same).forEach(tryAdd);
  }
  if (out.length < n) Core.shuffle(Object.keys(D.items)).forEach(tryAdd);
  return Core.shuffle(out);
};
var lastPos = [];
Core.placeCorrect = function (ids, target) { /* avoid the correct card sitting in the same slot 3x in a row */
  var pos = ids.indexOf(target);
  if (lastPos.length >= 2 && lastPos[0] === pos && lastPos[1] === pos && ids.length > 1) {
    var other = (pos + 1) % ids.length; var t = ids[pos]; ids[pos] = ids[other]; ids[other] = t; pos = other;
  }
  lastPos.unshift(pos); lastPos.length = Math.min(lastPos.length, 2);
  return ids;
};

/* ---------- storage ---------- */
var KEY = 'lisa-island-v1';
function defaults() {
  return {
    v: 1, firstRun: true,
    settings: { enabled: { pt: true, en: true, de: false }, ruHelp: true, subtitles: true, sessionMin: 15, pathSmall: false, hard: false, volume: 0.9, dailyGoal: 30 },
    stars: 0, hats: { unlocked: [], worn: [] }, hardStop: null, langs: {},
    /* rewards (added with the Duolingo-style layer; old saves get these defaults through merge()) */
    xp: 0, daily: { day: -1, xp: 0, met: false }, goalDays: [], crowns: {},
    /* Lisa's house (house.js): stage = build stages shown so far (0-5, milestones of the lifetime star total), gifts = unopened furniture gifts, owned = furniture ids, placed = id -> slot.
       Nothing is ever paid: stars only grow. */
    house: { stage: 0, gifts: 0, owned: [], placed: {}, reviewDay: -1 }
  };
}
/* repair odd values after loading so a hand-edited or older save can never break the reward layer */
function sanitize(s) {
  if (typeof s.xp !== 'number' || !isFinite(s.xp) || s.xp < 0) s.xp = 0;
  if (!s.daily || typeof s.daily !== 'object') s.daily = { day: -1, xp: 0, met: false };
  if (typeof s.daily.xp !== 'number' || !isFinite(s.daily.xp) || s.daily.xp < 0) s.daily.xp = 0;
  if (typeof s.daily.day !== 'number') s.daily.day = -1;
  s.daily.met = !!s.daily.met;
  if (!Array.isArray(s.goalDays)) s.goalDays = [];
  s.goalDays = s.goalDays.filter(function (d) { return typeof d === 'number' && isFinite(d); });
  if (!s.crowns || typeof s.crowns !== 'object' || Array.isArray(s.crowns)) s.crowns = {};
  var g = Number(s.settings.dailyGoal);
  if (typeof s.settings.subtitles !== 'boolean') s.settings.subtitles = true;
  s.settings.dailyGoal = (g >= 10 && g <= 300) ? Math.round(g) : 30;
  var h = s.house;
  if (!h || typeof h !== 'object' || Array.isArray(h)) h = s.house = { stage: 0, gifts: 0, owned: [], placed: {}, reviewDay: -1 };
  if (typeof h.built === 'number' && isFinite(h.built)) h.stage = Math.max(Number(h.stage) || 0, h.built);   /* migrate the first (purse) draft: nothing is lost, nothing is paid back */
  delete h.built; delete h.spent;
  if (typeof h.stage !== 'number' || !isFinite(h.stage)) h.stage = 0;
  h.stage = Core.clamp(Math.round(h.stage), 0, 5);
  if (typeof h.gifts !== 'number' || !isFinite(h.gifts)) h.gifts = 0;
  h.gifts = Core.clamp(Math.round(h.gifts), 0, 3);
  if (typeof h.reviewDay !== 'number' || !isFinite(h.reviewDay)) h.reviewDay = -1;
  if (!Array.isArray(h.owned)) h.owned = [];
  h.owned = h.owned.filter(function (id, i) { return typeof id === 'string' && h.owned.indexOf(id) === i; });
  if (!h.placed || typeof h.placed !== 'object' || Array.isArray(h.placed)) h.placed = {};
  /* linear path (path.js): per-language session record. A broken record is dropped (a new session simply starts); words/boxes are never touched here. */
  if (s.langs && typeof s.langs === 'object') Object.keys(s.langs).forEach(function (l) {
    var L = s.langs[l]; if (!L || typeof L !== 'object') { delete s.langs[l]; return; }
    if (L.path != null && (typeof L.path !== 'object' || Array.isArray(L.path) || typeof L.path.day !== 'string')) delete L.path;
  });
  if (typeof s.settings.pathSmall !== 'boolean') s.settings.pathSmall = false;
  return s;
}
function merge(a, b) {
  for (var k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}
function load() {
  try { var s = window.localStorage.getItem(KEY); if (s) return sanitize(merge(defaults(), JSON.parse(s))); } catch (e) {}
  return defaults();
}
Core.save = load();
var persistTimer = null;
function flush() {
  try { window.localStorage.setItem(KEY, JSON.stringify(Core.save)); } catch (e) { /* memory fallback: Core.save stays in RAM */ }
}
Core.persist = function () { clearTimeout(persistTimer); persistTimer = setTimeout(flush, 150); };
Core.flushNow = flush;
Core.L = function (lang) {
  var L = Core.save.langs[lang];
  if (!L) L = Core.save.langs[lang] = { words: {}, levels: {}, last: 0 };
  return L;
};
Core.enabledLangs = function () {
  var e = Core.save.settings.enabled, out = D.langs.filter(function (l) { return e[l]; });
  return out.length ? out : [D.langs[0]];
};
Core.curLang = function () {
  var en = Core.enabledLangs();
  return (Core.lang && en.indexOf(Core.lang) >= 0) ? Core.lang : en[0];
};

/* ---------- WebAudio sound effects + voice playback ---------- */
var Snd = Core.Snd = { ctx: null, master: null, token: 0, chainTok: -1, cache: {}, active: [], pendingList: null, vol: 0.9 };
Snd.setVolume = function (v) {
  Snd.vol = v;
  if (Snd.master) Snd.master.gain.value = v;
  for (var u in Snd.cache) { try { Snd.cache[u].volume = v; } catch (e) {} }
};
Snd.unlock = function () {
  if (!Snd.ctx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { Snd.ctx = new AC(); Snd.master = Snd.ctx.createGain(); Snd.master.gain.value = Snd.vol * 0.8; Snd.master.connect(Snd.ctx.destination); }
    } catch (e) { Snd.ctx = null; }
  }
  if (Snd.ctx && Snd.ctx.state === 'suspended') { try { var rp = Snd.ctx.resume(); if (rp && rp.catch) rp.catch(function () {}); } catch (e) {} }
};
Snd.tone = function (f, d, o) {
  var c = Snd.ctx; if (!c || c.state !== 'running' || Core.fast) return;
  o = o || {};
  try {
    var t = c.currentTime + (o.at || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
    var v = o.v == null ? 0.22 : o.v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g); g.connect(Snd.master);
    osc.start(t); osc.stop(t + d + 0.05);
  } catch (e) {}
};
var NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
Snd.sfx = function (name, n) {
  var T = Snd.tone;
  switch (name) {
    case 'tap': T(740, 0.07, { type: 'triangle', v: 0.12 }); break;
    case 'good': T(NOTE.C5, 0.18, { type: 'triangle' }); T(NOTE.E5, 0.18, { at: 0.09, type: 'triangle' }); T(NOTE.G5, 0.3, { at: 0.18, type: 'triangle' }); break;
    case 'boop': T(330, 0.22, { to: 210, v: 0.2 }); break;
    case 'jump': T(360, 0.14, { to: 760, type: 'triangle', v: 0.18 }); break;
    case 'land': T(180, 0.08, { to: 120, v: 0.12 }); break;
    case 'collect': T(NOTE.G6, 0.09, { type: 'triangle', v: 0.14 }); T(NOTE.E6, 0.12, { at: 0.06, type: 'triangle', v: 0.12 }); break;
    case 'flip': T(520, 0.09, { to: 780, type: 'triangle', v: 0.14 }); break;
    case 'match': T(NOTE.E5, 0.14, { type: 'triangle' }); T(NOTE.A5, 0.14, { at: 0.1, type: 'triangle' }); T(NOTE.E6, 0.3, { at: 0.2, type: 'triangle' }); break;
    case 'star': T(NOTE.A5, 0.14, { type: 'triangle', v: 0.2 }); T(NOTE.C6, 0.26, { at: 0.08, type: 'triangle', v: 0.2 }); break;
    case 'whoosh': T(220, 0.28, { to: 900, type: 'sine', v: 0.1 }); break;
    case 'door': T(110, 0.3, { to: 70, type: 'triangle', v: 0.3 }); T(NOTE.C6, 0.2, { at: 0.12, type: 'triangle', v: 0.12 }); break;
    case 'unlock': T(NOTE.G5, 0.1, { type: 'square', v: 0.08 }); T(NOTE.C6, 0.22, { at: 0.08, type: 'triangle', v: 0.2 }); break;
    case 'bounce': T(200, 0.3, { to: 720, type: 'sine', v: 0.2 }); break;
    case 'fanfare':
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach(function (f, i) { T(f, 0.28, { at: i * 0.13, type: 'triangle', v: 0.22 }); });
      T(NOTE.E6, 0.5, { at: 0.55, type: 'triangle', v: 0.2 }); break;
    case 'yawn': T(420, 0.9, { to: 210, v: 0.12 }); break;
    case 'pop': T(600, 0.08, { to: 1000, type: 'triangle', v: 0.15 }); break;
    /* reward sounds. All short and soft; Core.fast / volume handling is inside tone() and the master gain. */
    case 'ding': { /* bright bell, pitch climbs a pentatonic ladder with the combo (n = combo count) */
      var st = [0, 2, 4, 7, 9, 12, 14, 16, 19][Core.clamp((n || 1) - 1, 0, 8)], f = NOTE.C5 * Math.pow(2, st / 12);
      T(f, 0.42, { type: 'sine', v: 0.2 }); T(f * 2, 0.3, { type: 'sine', v: 0.07 }); T(f * 3, 0.16, { type: 'sine', v: 0.03 });
      T(f * 1.5, 0.3, { at: 0.07, type: 'triangle', v: 0.08 }); break;
    }
    case 'arp': { /* rising arpeggio of n notes (n = 3..6) */
      var ladder = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6], cnt = Core.clamp(n || 4, 2, 6);
      for (var i = 0; i < cnt; i++) T(ladder[i], 0.3, { at: i * 0.085, type: 'triangle', v: 0.17 });
      T(ladder[cnt - 1] * 2, 0.45, { at: cnt * 0.085, type: 'sine', v: 0.06 }); break;
    }
    case 'rise': { /* star i of the level result: each one a step higher (n = 0,1,2) */
      var base = [NOTE.G5, NOTE.C6, NOTE.E6][Core.clamp(n || 0, 0, 2)];
      T(base, 0.24, { type: 'triangle', v: 0.2 }); T(base * 1.5, 0.3, { at: 0.07, type: 'triangle', v: 0.14 }); T(base * 2, 0.34, { at: 0.14, type: 'sine', v: 0.07 }); break;
    }
    case 'clap': Snd.noise(0.07, { f: 1900, v: 0.34 }); Snd.noise(0.07, { f: 1500, at: 0.1, v: 0.3 }); Snd.noise(0.12, { f: 1700, at: 0.2, v: 0.26 }); T(190, 0.06, { v: 0.08 }); break;
    case 'tick': T(880 + (n || 0) * 40, 0.04, { type: 'triangle', v: 0.08 }); break;
    case 'sparkle': T(NOTE.E6, 0.1, { type: 'triangle', v: 0.1 }); T(NOTE.G6, 0.12, { at: 0.05, type: 'triangle', v: 0.1 }); T(NOTE.C6 * 2, 0.16, { at: 0.1, type: 'sine', v: 0.07 }); break;
  }
};
/* soft noise burst (clap): needs the AudioContext, silent in test fast mode like tone() */
Snd.noise = function (d, o) {
  var c = Snd.ctx; if (!c || c.state !== 'running' || Core.fast) return;
  o = o || {};
  try {
    var len = Math.max(64, Math.floor(c.sampleRate * d)), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf; flt.type = 'bandpass'; flt.frequency.value = o.f || 1800; flt.Q.value = 0.9; g.gain.value = o.v == null ? 0.3 : o.v;
    src.connect(flt); flt.connect(g); g.connect(Snd.master); src.start(c.currentTime + (o.at || 0));
  } catch (e) {}
};

function getAudio(url) {
  var a = Snd.cache[url];
  if (!a) {
    a = new Audio(); a.preload = 'auto'; a.src = url; a.volume = Snd.vol;
    a.addEventListener('error', function () { a._bad = true; });
    Snd.cache[url] = a;
  }
  return a;
}
Snd.preload = function (url) { if (!Core.fast) try { getAudio(url); } catch (e) {} };
function playOne(url, tok) {
  return new Promise(function (res) {
    if (Core.fast) { setTimeout(function () { res(true); }, 40); return; }
    var a;
    try { a = getAudio(url); } catch (e) { setTimeout(function () { res(false); }, 300); return; }
    if (a._bad) { setTimeout(function () { res(false); }, 350); return; }
    var done = false, safety = null, rec;
    function fin(ok) {
      if (done) return; done = true;
      clearTimeout(safety);
      a.removeEventListener('ended', onEnd); a.removeEventListener('error', onErr);
      var i = Snd.active.indexOf(rec); if (i >= 0) Snd.active.splice(i, 1);
      res(ok);
    }
    function onEnd() { fin(true); }
    function onErr() { a._bad = true; fin(false); }
    rec = { a: a, fin: fin };
    Snd.active.push(rec);
    a.addEventListener('ended', onEnd); a.addEventListener('error', onErr);
    try { a.currentTime = 0; } catch (e) {}
    a.volume = Snd.vol;
    var p;
    try { p = a.play(); } catch (e) { fin(false); return; }
    if (p && p.catch) p.catch(function (err) {
      if (err && err.name === 'NotAllowedError') Snd._blocked = true;
      fin(false);
    });
    safety = setTimeout(function () { fin(true); }, ((isFinite(a.duration) && a.duration > 0) ? a.duration * 1000 : 5000) + 1500);
  });
}
Snd.stop = function () {
  Snd.token++;
  var act = Snd.active.slice();
  act.forEach(function (r) { try { r.a.pause(); } catch (e) {} r.fin(false); });
};
/* list: urls and numbers (silence in ms). Resolves true when played completely, false when cancelled/missing. */
Snd.say = function (list, opts) {
  Snd.stop();
  var tok = Snd.token;
  list = [].concat(list).filter(function (x) { return x != null && x !== ''; });
  Snd.pendingList = null;
  Snd.chainTok = tok;
  return (async function () {
    var allOk = true;
    try {
      for (var i = 0; i < list.length; i++) {
        if (tok !== Snd.token) return false;
        var it = list[i];
        if (typeof it === 'number') { await Core.sleep(it); continue; }
        /* a missing or failing file only costs its short timeout; the chain always carries on with the next item */
        var ok = await playOne(it, tok);
        if (!ok) allOk = false;
      }
      if (tok !== Snd.token) return false;
      if (Snd._blocked) { Snd._blocked = false; if (opts && opts.retry) Snd.pendingList = list; }
      return allOk;
    } finally { if (Snd.chainTok === tok) Snd.chainTok = -1; }
  })();
};
/* true while a say() chain (audio or pause between items) is still running */
Snd.busy = function () { return Snd.chainTok === Snd.token; };
Snd.retryBlocked = function () {
  if (Snd.pendingList) { var l = Snd.pendingList; Snd.pendingList = null; Snd.say(l); }
};

/* ---------- flows: cancellable async sequences bound to a screen ---------- */
function Flow() { this.dead = false; this.timers = []; this.cbs = []; }
Flow.prototype.kill = function () {
  this.dead = true;
  this.timers.forEach(clearTimeout); this.timers = [];
  this.cbs.forEach(function (f) { try { f(); } catch (e) {} }); this.cbs = [];
};
Flow.prototype.onKill = function (f) { this.cbs.push(f); };
Flow.prototype.wait = function (ms) {
  var self = this;
  return new Promise(function (res) {
    var t = setTimeout(function () { if (!self.dead) res(); }, ms / Core.speed);
    self.timers.push(t);
  });
};
Flow.prototype.after = function (ms, fn) {
  var self = this;
  var t = setTimeout(function () { if (!self.dead) fn(); }, ms / Core.speed);
  this.timers.push(t); return t;
};
Flow.prototype.every = function (ms, fn) {
  var self = this;
  var t = setInterval(function () { if (!self.dead) fn(); }, ms / Core.speed);
  this.timers.push(t); return t;
};
Flow.prototype.say = async function (list, opts) {
  var r = await Snd.say(list, opts);
  if (this.dead) await NEVER;
  return r;
};
Flow.prototype.guard = async function (p) { var r = await p; if (this.dead) await NEVER; return r; };
Core.Flow = Flow;

/* Russian instruction voice (respects the parent setting) */
Core.sayRu = function (flow, key, extra) {
  var list = [];
  if (Core.save.settings.ruHelp) list.push(Core.url.ui('ru', key));
  if (extra) list = list.concat(extra);
  return list.length ? flow.say(list) : flow.wait(200);
};
Core.ruUrl = function (key) { return Core.save.settings.ruHelp ? Core.url.ui('ru', key) : null; };
var praiseN = 0;
Core.praiseUrl = function (lang) { praiseN = (praiseN % 3) + 1; return Core.url.ui(lang, 'praise' + praiseN); };

/* ---------- calendar day (can be shifted for tests) ---------- */
Core.today = function () {
  var d = new Date(Date.now() + Core.dayShift * 864e5);
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5);
};
Core.dayLabel = function (ts) {
  if (!ts) return '-';
  var d = new Date(ts);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
};

/* ---------- spaced repetition (Leitner boxes 0-5) ---------- */
var INTERVAL = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };   /* linear path (PATH_SPEC 4): box1 +1d, box2 +3d, box3 +7d, box4 +14d, box5 +30d */
var SRS = Core.SRS = {};
SRS.w = function (lang, id) {
  var W = Core.L(lang).words;
  return W[id] || (W[id] = { box: 0, last: -1, due: 0, sticker: false, heard: 0 });
};
SRS.peek = function (lang, id) { return Core.L(lang).words[id] || { box: 0, sticker: false, heard: 0, due: 0 }; };
SRS.intro = function (lang, id) {
  var w = SRS.w(lang, id);
  if (w.box < 1) { w.box = 1; w.due = Core.today() + 1; }
  w.heard = (w.heard || 0) + 1;
  Core.L(lang).last = Date.now();
  Core.persist();
};
SRS.answer = function (lang, id, first) {
  var w = SRS.w(lang, id), t = Core.today(), gotSticker = false;
  if (w.box < 1) { w.box = 1; w.due = t + 1; }
  if (first) {
    if (w.box < 5 && w.last !== t) {
      w.box++; w.last = t;
      if (w.box >= 3 && !w.sticker) { w.sticker = true; gotSticker = true; Core.pending.stickers.push({ lang: lang, id: id }); }
    }
    w.due = t + INTERVAL[w.box];
    SRS.noteFirst(w, t);
    if (window.Path && Path.note) Path.note(lang, id, 'first');
  } else {
    /* lapse (PATH_SPEC 4): box >= 3 drops ONE box, boxes 1-2 go to box 1; due tomorrow */
    w.box = w.box >= 3 ? w.box - 1 : 1; w.due = t + 1;
    if (window.Path && Path.note) Path.note(lang, id, 'lapse');
  }
  Core.L(lang).last = Date.now();
  Core.persist();
  return gotSticker;
};
/* first-try-correct record: w.fc = number of DIFFERENT days with a first-try-correct answer, w.fcDay = the last day counted (one count per calendar day).
   Words saved before the path existed are seeded from their box on first use (a box reached by first-try answers on different days). */
SRS.noteFirst = function (w, t) {
  if (typeof w.fc !== 'number') w.fc = Math.max(0, (w.box || 1) - 2);
  if (w.fcDay !== t) { w.fc++; w.fcDay = t; }
};
/* number of answer cards a word earns (PATH_SPEC 4): 2 until 3 first-try days, 3 until 6, then 4 */
SRS.choiceCount = function (lang, id) {
  var w = SRS.peek(lang, id), fc = (typeof w.fc === 'number') ? w.fc : Math.max(0, (w.box || 0) - 1);
  return fc >= 6 ? 4 : fc >= 3 ? 3 : 2;
};
/* helped answer: make sure the word is known (box >= 1) but never promote or demote it */
SRS.touch = function (lang, id) {
  var w = SRS.w(lang, id), t = Core.today();
  if (w.box < 1) { w.box = 1; w.due = t + 1; }
  Core.L(lang).last = Date.now();
  Core.persist();
  if (window.Path && Path.note) Path.note(lang, id, 'helped');
};
SRS.dueList = function (lang) {
  var t = Core.today(), W = Core.L(lang).words, out = [];
  for (var id in W) if (W[id].box >= 1 && W[id].due <= t && D.items[id]) out.push(id);
  out.sort(function (a, b) { return W[a].due - W[b].due; });
  return out;
};
SRS.introduced = function (lang) {
  var W = Core.L(lang).words, out = [];
  D.worlds.forEach(function (w) { w.items.forEach(function (id) { if (W[id] && W[id].box >= 1) out.push(id); }); });
  return out;
};
SRS.stickerCount = function (lang) {
  var W = Core.L(lang).words, n = 0;
  for (var id in W) if (W[id].sticker && D.items[id]) n++;
  return n;
};
Core.totalWords = D.worlds.reduce(function (n, w) { return n + w.items.length; }, 0);
Core.pending = { stickers: [], hats: [], opened: [], goal: false };

/* ---------- progress: worlds / levels / stars / hats ---------- */
Core.HATS = [
  { id: 'cap', at: 10, slot: 'head' }, { id: 'sunglasses', at: 25, slot: 'face' }, { id: 'scarf', at: 45, slot: 'neck' },
  { id: 'cape', at: 70, slot: 'back' }, { id: 'crown', at: 100, slot: 'head' }, { id: 'guitar', at: 140, slot: 'hand' },
  { id: 'helmet', at: 190, slot: 'head' }
];
Core.lv = function (lang, wid) {
  var L = Core.L(lang);
  if (!L.levels[wid]) { L.levels[wid] = []; for (var i = 0; i < 5; i++) L.levels[wid].push({ done: false, stars: 0 }); }
  return L.levels[wid];
};
Core.worldDone = function (lang, i) { return Core.lv(lang, D.worlds[i].id)[4].done; };
Core.worldUnlocked = function (lang, i) { return i === 0 || Core.worldDone(lang, i - 1); };
Core.levelUnlocked = function (lang, wid, k) { return k === 0 || Core.lv(lang, wid)[k - 1].done; };
Core.currentWorld = function (lang) {
  for (var i = 0; i < D.worlds.length; i++) if (!Core.worldDone(lang, i)) return i;
  return D.worlds.length - 1;
};
Core.addStars = function (n) {
  var S = Core.save, before = S.stars;
  S.stars += n;
  Core.HATS.forEach(function (h) {
    if (before < h.at && S.stars >= h.at && S.hats.unlocked.indexOf(h.id) < 0) {
      S.hats.unlocked.push(h.id); Core.pending.hats.push(h.id);
      Core.wear(h.id, true);
    }
  });
  Core.persist();
};
Core.wear = function (id, on) {
  var H = Core.save.hats, def = Core.HATS.filter(function (h) { return h.id === id; })[0];
  if (!def) return;
  H.worn = H.worn.filter(function (w) { return w !== id; });
  if (on) {
    H.worn = H.worn.filter(function (w) { var d = Core.HATS.filter(function (h) { return h.id === w; })[0]; return !d || d.slot !== def.slot; });
    H.worn.push(id);
  }
  Core.persist();
};
/* ---------- Lisa's house: milestones + gifts (no spending, no purse; Core.save.stars only ever grows) ----------
   Build stages follow the lifetime star total (thresholds: House.STAGE_AT in house.js). Furniture arrives as GIFTS: houseGift() is called once from
   each activity completion (first completion of a level / mini-game / scene, and the review chest once a day). It is silent there, the surprise is found in the house.
   At most 3 gifts wait at once; with the catalog exhausted nothing is added. */
Core.house = function () { return Core.save.house; };
Core.houseGift = function (src) {
  var H = Core.save.house;
  if (window.House && House.exhausted && House.exhausted()) return false;
  if (src === 'review') { var t = Core.today(); if (H.reviewDay === t) return false; H.reviewDay = t; }
  if (H.gifts >= 3) { Core.persist(); return false; }
  H.gifts++; Core.persist(); return true;
};
/* the child picked an item for a gift: one gift is used, the item is owned and placed in its slot. Returns true when stored. */
Core.housePlace = function (id, slot) {
  var H = Core.save.house;
  if (!id || H.gifts < 1 || H.stage < 5 || H.owned.indexOf(id) >= 0) return false;
  H.gifts--; H.owned.push(id); H.placed[id] = slot == null ? 1 : slot; Core.persist(); return true;
};
Core.houseStage = function (n) { var H = Core.save.house; n = Core.clamp(Math.round(n), 0, 5); if (n > H.stage) { H.stage = n; Core.persist(); return true; } return false; };
Core.starsFor = function (mistakes) { return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1; };
Core.completeLevel = function (lang, wid, k, stars) {
  var lv = Core.lv(lang, wid), wasDone = lv[k].done, old = lv[k].stars || 0, crownBefore = Core.crownOf(lang, wid);
  var gain = Math.max(0, stars - old);
  var wi = Core.worldIdx(wid), opened = false;
  lv[k].done = true; lv[k].stars = Math.max(old, stars);
  if (k === 4 && !wasDone && wi + 1 < D.worlds.length) { opened = true; Core.pending.opened.push(wi + 1); }
  if (gain) Core.addStars(gain);
  if (!wasDone) Core.houseGift();
  Core.L(lang).last = Date.now();
  Core.updateCrown(lang, wid);
  Core.persist();
  return { gain: gain, opened: opened, crown: Core.crownOf(lang, wid), crownNew: Core.crownOf(lang, wid) > crownBefore };
};

/* ---------- XP, daily goal, crowns, Lisa lines ---------- */
/* Fixed amounts, never random. A helped or retried answer still earns something: nothing here ever takes anything away. */
Core.XP = { first: 5, assisted: 2, level: 10 };
Core.goalTarget = function () { var g = Number(Core.save.settings.dailyGoal); return (g >= 10 && g <= 300) ? Math.round(g) : 30; };
function dayRec() {
  var d = Core.save.daily, t = Core.today();
  if (!d || d.day !== t) d = Core.save.daily = { day: t, xp: 0, met: false };
  return d;
}
Core.dayXP = function () { return dayRec().xp; };
Core.goalMet = function () { return dayRec().met; };
/* returns { gain, reached } ; reached = this call made today's goal */
Core.addXP = function (n) {
  n = Math.max(0, Math.round(n) || 0);
  if (!n) return { gain: 0, reached: false };
  var S = Core.save, d = dayRec(), reached = false;
  S.xp = (S.xp || 0) + n; d.xp += n;
  if (!d.met && d.xp >= Core.goalTarget()) {
    d.met = true; reached = true; Core.pending.goal = true;
    if (S.goalDays.indexOf(d.day) < 0) { S.goalDays.push(d.day); S.goalDays.sort(function (a, b) { return a - b; }); if (S.goalDays.length > 60) S.goalDays = S.goalDays.slice(-60); }
  }
  Core.persist();
  return { gain: n, reached: reached };
};
/* last 7 days ending today: positive only (a day is either "sun" or just empty; nothing counts misses) */
Core.weekSuns = function () {
  var t = Core.today(), out = [], d = dayRec();
  for (var i = 6; i >= 0; i--) {
    var day = t - i;
    out.push({ day: day, today: i === 0, met: Core.save.goalDays.indexOf(day) >= 0 || (i === 0 && d.met) });
  }
  return out;
};
/* crowns: 1 = world finished, 2 = finished with 3 stars on every level */
Core.crownOf = function (lang, wid) {
  var C = Core.save.crowns[lang], v = C && C[wid];
  if (v) return v;
  var lv = Core.lv(lang, wid);
  if (!lv[4].done) return 0;
  return lv.every(function (l) { return l.stars >= 3; }) ? 2 : 1;
};
Core.updateCrown = function (lang, wid) {
  var lv = Core.lv(lang, wid), v = 0;
  if (lv[4].done) v = lv.every(function (l) { return l.stars >= 3; }) ? 2 : 1;
  var C = Core.save.crowns[lang] || (Core.save.crowns[lang] = {});
  if (v > (C[wid] || 0)) C[wid] = v;
  Core.persist();
  return C[wid] || 0;
};

/* Lisa's Russian lines. A line is random but never the same as the last one of its group (shuffle bag). Lines are Russian speech, so the
   parent's "Russian help" switch silences them. A line whose file is known to be missing is skipped, so callers can fall back. */
var LISA_KEYS = {
  hi: ['lisa_hi1', 'lisa_hi2', 'lisa_hi3', 'lisa_hi4', 'lisa_hi5', 'lisa_hi6', 'lisa_hi7', 'lisa_hi8', 'lisa_hi9', 'lisa_hi10', 'lisa_hi11', 'lisa_hi12', 'lisa_hi13', 'lisa_hi14', 'lisa_hi15', 'lisa_hi16'],
  ask: ['lisa_ask1', 'lisa_ask2', 'lisa_ask3', 'lisa_ask4', 'lisa_ask5', 'lisa_ask6', 'lisa_ask7', 'lisa_ask8', 'lisa_ask9', 'lisa_ask10', 'lisa_ask11', 'lisa_ask12', 'lisa_ask13', 'lisa_ask14', 'lisa_ask15'],
  yes: ['lisa_yes1', 'lisa_yes3', 'lisa_yes4', 'lisa_yes5', 'lisa_yes6', 'lisa_yes8', 'lisa_yes9', 'lisa_yes10', 'lisa_yes11', 'lisa_yes12', 'lisa_yes13', 'lisa_yes14', 'lisa_yes15', 'lisa_yes16', 'lisa_yes17', 'lisa_yes18', 'lisa_yes19', 'lisa_yes20', 'lisa_yes21', 'lisa_yes22', 'lisa_yes23', 'lisa_yes24', 'lisa_yes25', 'lisa_yes26', 'lisa_yes27', 'lisa_yes28', 'lisa_yes29', 'lisa_yes30', 'lisa_yes31', 'lisa_yes32', 'lisa_yes33', 'lisa_yes34', 'lisa_yes35', 'lisa_yes36', 'lisa_yes37', 'lisa_yes38', 'lisa_yes39', 'lisa_yes40'],
  combo3: ['lisa_combo3_2', 'lisa_combo3_3', 'lisa_combo3_4', 'lisa_combo3_5'],
  combo5: ['lisa_combo5', 'lisa_combo5_2', 'lisa_combo5_3', 'lisa_combo5_4', 'lisa_combo5_5'],
  combo8: ['lisa_combo8_2', 'lisa_combo8_3', 'lisa_combo8_4'],
  oops: ['lisa_oops1', 'lisa_oops2', 'lisa_oops3', 'lisa_oops4', 'lisa_oops5', 'lisa_oops6', 'lisa_oops7', 'lisa_oops8', 'lisa_oops9', 'lisa_oops10', 'lisa_oops11', 'lisa_oops12', 'lisa_oops13'],
  help: ['lisa_help1', 'lisa_help2', 'lisa_help3', 'lisa_help4', 'lisa_help5', 'lisa_help6', 'lisa_help7', 'lisa_help8'],
  door: ['lisa_door1', 'lisa_door2', 'lisa_door3', 'lisa_door4', 'lisa_door5', 'lisa_door6', 'lisa_door7', 'lisa_door8'],
  level: ['lisa_level2', 'lisa_level3', 'lisa_level4', 'lisa_level5', 'lisa_level6', 'lisa_level7', 'lisa_level8', 'lisa_level9', 'lisa_level10', 'lisa_level11', 'lisa_level12', 'lisa_level13'],
  chest: ['lisa_chest', 'lisa_chest2', 'lisa_chest3', 'lisa_chest4', 'lisa_chest5'],
  goal: ['lisa_goal', 'lisa_goal2', 'lisa_goal3', 'lisa_goal4', 'lisa_goal5'],
  poke: ['lisa_poke1', 'lisa_poke2', 'lisa_poke3', 'lisa_poke4', 'lisa_poke5', 'lisa_poke6', 'lisa_poke7', 'lisa_poke8', 'lisa_poke9', 'lisa_poke10', 'lisa_poke11', 'lisa_poke12', 'lisa_poke13', 'lisa_poke14', 'lisa_poke15', 'lisa_poke16', 'lisa_poke17', 'lisa_poke18', 'lisa_poke19', 'lisa_poke20', 'lisa_poke21', 'lisa_poke22', 'lisa_poke23'],
  bye: ['lisa_bye1', 'lisa_bye2', 'lisa_bye3', 'lisa_bye4', 'lisa_bye5', 'lisa_bye6', 'lisa_bye7', 'lisa_bye8', 'lisa_bye9'],
  househi: ['lisa_househi1', 'lisa_househi2', 'lisa_househi3', 'lisa_househi4'],
  build: ['lisa_build1', 'lisa_build2', 'lisa_build3', 'lisa_build4'],
  builddone: ['lisa_builddone1'],
  buy: ['lisa_buy1', 'lisa_buy2', 'lisa_buy3', 'lisa_buy4', 'lisa_buy5', 'lisa_buy6'],
  gift: ['lisa_gift1', 'lisa_gift2', 'lisa_gift3', 'lisa_gift4'],
  next: ['lisa_next1', 'lisa_next2', 'lisa_next3', 'lisa_next4', 'lisa_next5', 'lisa_next6', 'lisa_next7'],
  afterhelp: ['lisa_afterhelp1', 'lisa_afterhelp2', 'lisa_afterhelp3', 'lisa_afterhelp4'],
  da: ['lisa_da1', 'lisa_da2', 'lisa_da3', 'lisa_da4', 'lisa_da5', 'lisa_da6', 'lisa_da7', 'lisa_da8'],
  blockend: ['lisa_blockend1', 'lisa_blockend2', 'lisa_blockend3', 'lisa_blockend4', 'lisa_blockend5', 'lisa_blockend6', 'lisa_blockend7', 'lisa_blockend8'],
  move: ['lisa_move1', 'lisa_move2', 'lisa_move3', 'lisa_move4', 'lisa_move5', 'lisa_move6', 'lisa_move7', 'lisa_move8'],
  moveend: ['lisa_moveend1', 'lisa_moveend2', 'lisa_moveend3'],
  reviewday: ['lisa_reviewday1', 'lisa_reviewday2', 'lisa_reviewday3'],
  sleep: ['lisa_sleep1', 'lisa_sleep2', 'lisa_sleep3'],
  play: ['lisa_play']
};
var lisaBag = {}, lisaLastKey = {};
Core.lisaLast = null;
Core.lisaUrl = function (key) { return Core.url.ui('ru', key); };
Core.lisaBad = function (key) { var a = Snd.cache[Core.lisaUrl(key)]; return !!(a && a._bad); };
Core.lisaLine = function (group) {
  if (!Core.save.settings.ruHelp) return null;
  var keys = (LISA_KEYS[group] || []).filter(function (k) { return D.ui && D.ui.ru && D.ui.ru[k] != null && !Core.lisaBad(k); });
  if (!keys.length) return null;
  var bag = (lisaBag[group] || []).filter(function (k) { return keys.indexOf(k) >= 0; });
  if (!bag.length) {
    bag = Core.shuffle(keys);
    if (bag.length > 1 && bag[0] === lisaLastKey[group]) { var t = bag[0]; bag[0] = bag[1]; bag[1] = t; }
  }
  var key = bag.shift(); lisaBag[group] = bag; lisaLastKey[group] = key;
  Core.lisaLast = { group: group, key: key };
  return Core.lisaUrl(key);
};
/* ask the browser which of Lisa's files exist (a failed load marks the cache entry bad); harmless when they are missing */
Core.lisaProbe = function () {
  if (Core.fast) return;
  Object.keys(LISA_KEYS).forEach(function (g) { LISA_KEYS[g].forEach(function (k) { Snd.preload(Core.lisaUrl(k)); }); });
};

/* ---------- session length (soft / hard stop) ---------- */
var sess = Core.sess = { active: 0, restDue: false };
setInterval(function () {
  if (document.hidden) return;
  if (Date.now() - Core.lastInput > 90000) return;
  sess.active += 1;
  var m = Core.save.settings.sessionMin;
  if (m > 0 && sess.active >= m * 60) sess.restDue = true;
}, 1000);
Core.markHardStop = function () { Core.save.hardStop = Core.today(); Core.persist(); };
Core.isHardStopped = function () { return Core.save.settings.hard && Core.save.hardStop === Core.today(); };

/* ---------- pictures ---------- */
var Pic = Core.Pic = {};
var DICE = {
  1: [[50, 50]], 2: [[30, 30], [70, 70]], 3: [[24, 26], [50, 50], [76, 74]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[30, 24], [70, 24], [30, 50], [70, 50], [30, 76], [70, 76]]
};
function dotsFor(n) {
  if (DICE[n]) return { pts: DICE[n], r: n <= 3 ? 14 : 12.5 };
  var pts = [], xs = [16, 33, 50, 67, 84];
  for (var i = 0; i < n; i++) pts.push([xs[i % 5], i < 5 ? 36 : 62]);
  return { pts: pts, r: 7.6 };
}
Pic.el = function (it, cls) {
  var d = Core.el('div', 'pic ' + (cls || '')), p = it.pic;
  if (p.type === 'emoji') {
    var img = new Image(); img.draggable = false; img.alt = ''; img.src = p.src;
    img.onerror = function () { img.style.display = 'none'; d.classList.add('missing'); };
    d.appendChild(img);
  } else if (p.type === 'color') {
    var hex = String(p.hex), white = /^#f{3,6}$/i.test(hex);
    d.innerHTML = '<svg viewBox="0 0 100 100"><path d="M50 7C72 3 93 20 92 46C97 71 76 95 50 93C23 97 5 75 9 48C6 24 27 9 50 7Z" fill="' + hex + '"' +
      (white ? ' stroke="#b0b7c0" stroke-width="3"' : ' stroke="rgba(0,0,0,.12)" stroke-width="2"') + '/>' +
      '<ellipse cx="33" cy="30" rx="14" ry="8" fill="#fff" opacity=".4" transform="rotate(-25 33 30)"/></svg>';
  } else {
    var dd = dotsFor(p.n), s = '<svg viewBox="0 0 100 100">';
    if (p.n > 6) s += '<rect x="5" y="22" width="90" height="56" rx="10" fill="#fff" opacity=".7"/>';
    dd.pts.forEach(function (c) {
      s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + dd.r + '" fill="#ff7043"/><circle cx="' + (c[0] - dd.r * 0.3) + '" cy="' + (c[1] - dd.r * 0.3) + '" r="' + dd.r * 0.3 + '" fill="#fff" opacity=".55"/>';
    });
    s += '<text x="94" y="96" text-anchor="end" font-size="15" font-weight="700" fill="#8d6e63" font-family="sans-serif">' + p.n + '</text></svg>';
    d.innerHTML = s;
  }
  return d;
};

/* ---------- global input bookkeeping ---------- */
document.addEventListener('pointerdown', function () {
  Core.lastInput = Date.now(); Core.inputSeq++;
  Snd.unlock();
  Snd.retryBlocked();
}, true);

Core.tap = function (el, fn, o) {
  o = o || {};
  el.classList.add('tap');
  el.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    if (el.classList.contains('off') || el.disabled) return;
    Snd.unlock();
    if (!o.silent) Snd.sfx('tap');
    if (!o.nopress && el.animate) { try { el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1)' }], { duration: 180 }); } catch (x) {} }
    fn(e, el);
  });
};
})();
