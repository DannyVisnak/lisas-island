/* Lisa's Island - the linear daily path ("one Play button"). Contract: content/PATH_SPEC.md. Reference: SPEC.md "Linear path".
   One session per calendar day: warm-up, Block A (Meet, Memory, mini-game), lesson + movement break, Block B (Meet, Listen&tap, game Z), ritual.
   The game screens (memory, minigame, scene, run, lesson, listen&tap via UI.runQuestions) are REUSED: every screen of the path carries p.path = true,
   p.words (today's words) and calls Path.finishStep(flow) instead of awarding level stars / showing a result screen.
   Save: Core.L(lang).path = { day, step, newA, newB, startedAt, playedMs, done, lessonsSeen, ...helpers }. Old map / levels stay in the parent area (free play). */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap, SRS = Core.SRS;
var Path = window.Path = {};
Lisa.ico.play = '<svg viewBox="0 0 100 100"><path d="M32 16 L84 50 L32 84 Z" fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>';

/* world order of new words (PATH_SPEC 2); worlds that do not exist are skipped, unknown extra worlds come last */
var ORDER = ['animals', 'food', 'colors', 'numbers', 'body', 'family', 'clothes', 'toys', 'home', 'transport', 'nature', 'actions', 'phrases', 'school'];
var STAR_STEP = { LETTER: 1, warm: 1, A1: 1, A2: 1, A3: 1, L: 1, B1: 1, B2: 1, B3: 1, rv1: 1, rv2: 1, rv3: 1 };   /* +1 star per finished step; the movement break and the ritual are separate */
var BLOCK_END = { A3: 1, B3: 1, rv3: 1 };
var GAME_STEP = { A2: 1, A3: 1, B2: 1, B3: 1, rv2: 1, rv3: 1 };
var BLOCK_WORDS = 4, DUE_REVIEW_DAY = 12;

function worldOrder() {
  var ids = D.worlds.map(function (w) { return w.id; }), out = [];
  ORDER.forEach(function (w) { if (ids.indexOf(w) >= 0) out.push(w); });
  ids.forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); });
  return out;
}
Path.worldOrder = worldOrder;
function worldOf(id) { return D.items[id] && D.items[id].world; }
function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }
function dayStr() { return new Date(Core.today() * 864e5).toISOString().slice(0, 10); }
function norm(s) { return String(s || '').toLowerCase().replace(/[.!?,]/g, '').trim(); }

/* ================= state ================= */
Path.lang = function () { return (UI.p && UI.p.lang) || Core.curLang(); };
Path.session = function (lang) { lang = lang || Path.lang(); var S = Core.L(lang).path; return S && typeof S === 'object' ? S : null; };
/* the path is running when the current screen carries p.path (every path screen and every reused game does) */
Path.active = function () { return !!(UI.p && UI.p.path); };
/* asleep until the next calendar day: any language finished a session today (one session per day across languages) */
Path.sleeping = function () {
  var t = dayStr();
  return D.langs.some(function (l) { var S = Core.save.langs[l] && Core.save.langs[l].path; return !!(S && S.day === t && S.done); });
};
/* parent: another session today. The finished record keeps its carry-over fields (lessonsSeen, queue, rot) for the next plan. */
Path.unlockExtra = function () {
  var t = dayStr(), n = 0;
  D.langs.forEach(function (l) { var S = Core.save.langs[l] && Core.save.langs[l].path; if (S && S.day === t && S.done) { S.day = 'unlocked'; n++; } });
  Core.persist(); return n;
};
Path.capMs = function () { var m = Number(Core.save.settings.sessionMin); if ([10, 15, 20].indexOf(m) < 0) m = 15; return m * 60000; };
Path.shouldStop = function (S) {
  S = S || Path.session(); if (!S) return false;
  var cap = Path.capMs();
  return !!(S.early || (cap && S.playedMs >= cap));
};

/* ----- active play time: whole seconds while a path screen is up, the page is visible and the child touched something in the last 90 s ----- */
var tickN = 0;
setInterval(function () {
  if (document.hidden || !Path.active()) return;
  if (Date.now() - Core.lastInput > 90000) return;
  var S = Path.session(); if (!S || S.done) return;
  S.playedMs += 1000;
  if (++tickN % 5 === 0) Core.persist();
}, 1000);

/* ----- retrieval bookkeeping (called by SRS.answer / SRS.touch and the memory game) -----
   ret[id] = how many times the word was completed in a game today; helped answers feed the early-end rule (3 helped in a row, twice) */
Path.note = function (lang, id, kind) {
  if (!Path.active()) return;
  var S = Path.session(lang); if (!S || S.done) return;
  S.ret[id] = (S.ret[id] || 0) + 1;
  if (kind === 'first') {
    if (!S.rok || typeof S.rok !== 'object' || Array.isArray(S.rok)) S.rok = {};
    Object.defineProperty(S.rok, id, { value: successful(S, id) + 1, writable: true, enumerable: true, configurable: true });
  }
  if (kind === 'helped') {
    S.hs = (S.hs || 0) + 1;
    if (S.hs >= 3) { S.hs = 0; S.strikes = (S.strikes || 0) + 1; if (S.strikes >= 2) S.early = true; }
  } else S.hs = 0;
  Core.persist();
};
/* per-tap voice (PATH_SPEC 3): a "da" line; every 3rd correct of the session a personality line (combo line on a milestone, else yes) */
Path.voice = function (milestone) {
  var S = Path.session(); if (!S) return null;
  S.cor = (S.cor || 0) + 1;
  if (S.cor % 3 === 0) return (milestone && Core.lisaLine('combo' + milestone)) || Core.lisaLine('yes');
  return Core.lisaLine('da');
};
/* choice count per word, fixed for the whole session once first asked, so it never changes inside a block after an error (PATH_SPEC 4) */
Path.choices = function (lang, id) {
  var S = Path.session(lang); if (!S) return SRS.choiceCount(lang, id);
  S.cc = S.cc || {};
  if (!S.cc[id]) S.cc[id] = SRS.choiceCount(lang, id);
  return S.cc[id];
};

/* ================= planning ================= */
function validNew(lang, id) { var it = D.items[id]; return !!(it && it.world !== 'countries' && it[lang] && SRS.peek(lang, id).box < 1); }
/* n unseen words: the queue (lesson end words) first, then the current world's unseen items, then the next world's */
Path.pickNew = function (lang, n, taken, queue) {
  var out = [], pics = {}, words = {};
  function add(id) {
    if (out.length >= n || out.indexOf(id) >= 0 || (taken || []).indexOf(id) >= 0 || !validNew(lang, id)) return;
    var it = D.items[id], pk = Core.picKey(it), w = norm(it[lang].word);
    if (pics[pk] || words[w]) return;
    pics[pk] = words[w] = 1; out.push(id);
  }
  (queue || []).forEach(add);
  worldOrder().forEach(function (w) { Core.worldItems(w).forEach(add); });
  return out;
};
function topWorld(ids) {
  var c = {}, best = null;
  ids.forEach(function (id) { var w = worldOf(id); c[w] = (c[w] || 0) + 1; if (best === null || c[w] > c[best]) best = w; });
  return best;
}
/* Country UI is supplied only after the exact Opus assets/copy/audio contract is ready. */
Path.countryReady = function (lang, id) {
  var c = window.CountryRules && CountryRules.catalog.find(function(x){return x.id === id;});
  return !!(c && window.Countries && typeof Countries.ready === 'function' && Countries.ready(lang,id) === true && typeof Countries.journey === 'function' && typeof Countries.postcard === 'function' && c.ids.every(function(x){return D.items[x] && D.items[x][lang];}));
};
Path.selectCountry = function (lang, id) {
  if (D.langs.indexOf(lang) < 0) return false;
  var L = Core.L(lang), next = CountryRules.select(L,id); L.countries = next.countries; Core.persist(); return true;
};
Path.completeCountry = function (lang, token) {
  if (lang !== Core.curLang() || Path.lang() !== lang) return false;
  var L = Core.L(lang), S = L.path;
  if (!S || !S.country || !Path.countryReady(lang,S.country.id)) return false;
  var result = CountryRules.complete(L,S,token,lang);
  if (!result.rewardStep) return false;
  L.countries = result.language.countries; L.path = result.session;
  Core.addStars(1); Core.persist(); Core.flushNow(); return true;
};
/* Fault recovery only: preserve the existing remainder, never award an unavailable country block. */
Path.countryUnavailable = function (lang,S,token,expectedStep) {
  if (!S || S !== Path.session(lang) || S.done || S.day !== dayStr() || Path.sleeping() || Core.curLang() !== lang || Path.lang() !== lang) return false;
  var trip=S.country, canonical=trip && window.CountryRules && CountryRules.catalog.find(function(c){return c.id===trip.id;});
  if (!canonical || trip.lang !== lang || typeof token !== 'string' || !token || token !== trip.token || !Array.isArray(trip.ids) || !Array.isArray(S.newA) || trip.ids.length!==4 || S.newA.length!==4 || !trip.ids.every(function(id,i){return id===canonical.ids[i] && id===S.newA[i];})) return false;
  if (!Array.isArray(S.plan) || !Number.isSafeInteger(S.step) || S.step<0 || ['CF','A1','A2','CP'].indexOf(expectedStep)<0 || S.plan[S.step]!==expectedStep || Path.countryReady(lang,trip.id)) return false;
  var cp=S.plan.indexOf('CP');
  if (cp<S.step || cp+1>=S.plan.length || S.plan.lastIndexOf('CP')!==cp || S.paid && S.paid[cp]) return false;
  Core.L(lang).countries=CountryRules.restore(Core.L(lang),S).countries;
  S.countryUnavailable={token:trip.token};
  S.step=cp+1; Core.persist(); return true;
};
Path.newSession = function (lang) {
  if (Path.sleeping()) return null;
  var prior = Core.L(lang);
  if (prior.path && prior.path.day === dayStr() && !prior.path.done) return prior.path;
  if (window.CountryRules && prior.path && prior.path.country) prior.countries = CountryRules.restore(prior,prior.path).countries;

  var old = Core.L(lang).path || {}, due = SRS.dueList(lang), small = !!Core.save.settings.pathSmall;
  var S = { day: dayStr(), step: 0, plan: [], newA: [], newB: [], startedAt: Date.now(), playedMs: 0, done: false,
    lessonsSeen: old.lessonsSeen || {}, queue: (old.queue || []).slice(), rot: (old.rot || 0) + 1,
    lastLessonDomain: old.lastLessonDomain || null, lessonId: old.lessonId || null,
    ret: {}, rok: {}, cc: {}, paid: {}, hs: 0, strikes: 0, early: false, cor: 0, warm: [], rv: [], dueN: due.length, said: false };
  var pendingCountry = Core.L(lang).countries && Core.L(lang).countries.pending;
  var tripReady = Path.countryReady(lang,pendingCountry);
  var review = due.length > DUE_REVIEW_DAY;
  if (!review) {
    S.newA = Path.pickNew(lang, BLOCK_WORDS, [], S.queue);
    S.queue = S.queue.filter(function (id) { return S.newA.indexOf(id) < 0; });
    if (!S.newA.length && !tripReady) review = true;   /* nothing left to learn: a review day */
  }
  if (review) {
    var pool = due.length ? due : SRS.introduced(lang);
    S.rv = Core.shuffle(pool.slice(0, 12)).slice(0, 8);
    S.review = true;
    S.plan = ['rv1', 'rv2', 'L', 'MV', 'rv3', 'R'];
  } else {
    S.warm = due.slice(0, 3);
    S.plan = (small ? ['warm', 'A1', 'A2', 'A3', 'R'] : ['warm', 'A1', 'A2', 'A3', 'L', 'MV', 'B1', 'B2', 'B3', 'R']);
  }
  if (window.Letters) Letters.planSession(S, lang, Path.capMs());
  if (tripReady && !review) {
    var serial = Core.L(lang).countrySerial;
    serial = Number.isSafeInteger(serial) && serial >= 0 && serial < Number.MAX_SAFE_INTEGER ? serial + 1 : 1;
    Core.L(lang).countrySerial = serial;
    var applied = CountryRules.plan(Core.L(lang),S,{lang:lang,token:lang+':'+S.day+':'+serial,sleeping:false,reviewOnly:false,freshPlan:true});
    if (applied.applied) { S = applied.session; Core.L(lang).countries = applied.language.countries; }
  }
  Core.L(lang).path = S; Core.persist();
  return S;
};
/* today's record: resume the open one, otherwise plan a new session (new day, or after the parent unlocked another one) */
Path.ensure = function (lang) {
  var S = Path.session(lang);
  if (S && S.day === dayStr() && !S.done) return S;
  return Path.newSession(lang);
};

/* ================= running the steps ================= */
Path.play = function () { Core.lang = Core.curLang(); Path.go(); };
Path.home = function () { Core.persist(); UI.go('home'); };
function P(S, id, o) { return Object.assign({ path: true, lang: Core.curLang(), step: id }, o || {}); }
function ret(S, id) { return S.ret[id] || 0; }
function successful(S, id) {
  var counts = S.rok, n = counts && typeof counts === 'object' && !Array.isArray(counts) && Object.prototype.hasOwnProperty.call(counts, id) ? counts[id] : 0;
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}
function unavailableCountryIds(S) { return S && S.country && S.countryUnavailable && S.countryUnavailable.token===S.country.token ? S.country.ids : []; }
function remainderA(S) { return unavailableCountryIds(S).length ? [] : S.newA; }
function dueOld(lang, exclude, n) { var blocked=unavailableCountryIds(Path.session(lang)); return Core.shuffle(SRS.dueList(lang).filter(function (i) { return exclude.indexOf(i) < 0 && blocked.indexOf(i) < 0; })).slice(0, n); }
function seqTwice(words) { var s = UI.makeSeq(words, words.length * 2); return s; }

/* the mini-game of a word's world, or null */
Path.chooseGame = function(S, lang, step, candidates) {
  if (!candidates.length) return null;
  var choices = S.gameChoices || (S.gameChoices = {}), cached = choices[step];
  if (cached) { var found = candidates.find(function(c){return c.g.id === cached.game && c.world === cached.world;}); if (found) return found; }
  var L = Core.L(lang), cursors = L.gameRotation || (L.gameRotation = {}), group = candidates.map(function(c){return c.world+':'+c.g.id;}).join('|');
  var cursor = Number.isSafeInteger(cursors[group]) && cursors[group] >= 0 ? cursors[group] : 0, selected = candidates[cursor % candidates.length];
  choices[step] = {game:selected.g.id,world:selected.world}; cursors[group] = cursor < Number.MAX_SAFE_INTEGER ? cursor + 1 : 0; Core.persist(); return selected;
};
function gameFor(S, lang, step, world) { var c = Path.chooseGame(S,lang,step,window.MG ? MG.forWorld(world).map(function(g){return {g:g,world:world};}) : []); return c && c.g; }

var STEP = {};
STEP.CF = function (S,lang) { if (!S.country || !Path.countryReady(lang,S.country.id)) { Path.home(); return true; } Countries.journey(S,lang); return true; };
STEP.CP = function (S,lang) { if (!S.country || !Path.countryReady(lang,S.country.id)) { Path.home(); return true; } Countries.postcard(S,lang); return true; };
STEP.warm = function (S, lang) {
  if (!S.warm.length) return 'skip';
  UI.go('plisten', P(S, 'warm', { lang: lang, words: S.warm, fixed: 2, lead: 'hi' })); return true;
};
STEP.A1 = function (S, lang) {
  if (!S.newA.length) return 'skip';
  UI.go('pmeet', P(S, 'A1', { lang: lang, words: S.newA })); return true;
};
STEP.A2 = function (S, lang) {
  if (S.newA.length < 2) return 'skip';
  UI.go('memory', P(S, 'A2', { lang: lang, world: worldOf(S.newA[0]), words: S.newA, kind: 'memory' })); return true;
};
function xStep(S, lang, id, words, world) {
  var g = gameFor(S, lang, id, world), all = words.concat(dueOld(lang, words, 3));
  if (g) UI.go('minigame', P(S, id, { lang: lang, game: g.id, world: world, words: all }));
  else UI.go('plisten', P(S, id, { lang: lang, words: all, seq: UI.makeSeq(all, Math.max(6, all.length)) }));
  return true;
}
STEP.A3 = function (S, lang) {
  if (!S.newA.length) return 'skip';
  return xStep(S, lang, 'A3', S.newA, worldOf(S.newA[0]));
};
Path.nextLesson = function (S, lang) {
  var list = window.Lesson ? Lesson.list() : [], next = null, available = list.filter(function(l){return !S.lessonsSeen[l.id] && !Lesson.seen(lang,l.id);});
  if (S.lessonId && list.some(function(l){return l.id===S.lessonId;})) next = S.lessonId;
  if (!next && available.length) {
    next = available[0].id;
    var nextDef=LESSON_DATA.lessons[next];
    if (nextDef.domain === 'history') {
      var previous=S.lastLessonDomain;
      if (!previous) {
        var records=Core.L(lang).lessons||{}, newest=null;
        Object.keys(records).forEach(function(id){var def=LESSON_DATA.lessons[id], rec=records[id]; if(def && rec && rec.seen && (!newest || (rec.last||0)>newest.last)) newest={domain:def.domain||'other',last:rec.last||0};});
        previous=newest && newest.domain;
      }
      if (previous === 'history') {
        var replay=list.filter(function(l){var def=LESSON_DATA.lessons[l.id];return def.domain!=='history' && (S.lessonsSeen[l.id]||Lesson.seen(lang,l.id));});
        replay.sort(function(a,b){var ra=(Core.L(lang).lessons||{})[a.id]||{}, rb=(Core.L(lang).lessons||{})[b.id]||{}; return (ra.last||0)-(rb.last||0) || a.id.localeCompare(b.id);});
        if (replay.length) next=replay[0].id;
      }
    }
  }
  return next;
};
STEP.L = function (S, lang) {
  var next = Path.nextLesson(S, lang);
  if (!next) return 'skip';
  S.lessonId = next; Core.persist();
  UI.go('lesson', P(S, 'L', { lang: lang, id: next,
    done: function () { Path.lessonDone(lang, next); },
    back: function () { Path.home(); } }));
  return true;
};
/* a lesson played to its end card: +1 star, the end word is queued first into the next Meet, then the movement break */
Path.lessonDone = function (lang, id) {
  var S = Path.session(lang); if (!S) return Path.home();
  S.lessonsSeen[id] = true;
  S.lastLessonDomain = (LESSON_DATA.lessons[id] && LESSON_DATA.lessons[id].domain) || 'other';
  S.lessonId = null;
  var w = Lesson.word(id);
  if (w && validNew(lang, w) && S.newA.indexOf(w) < 0 && S.newB.indexOf(w) < 0 && S.queue.indexOf(w) < 0) S.queue.push(w);
  Core.persist();
  Path.finishStep(UI.flow);
};
STEP.MV = function (S, lang) { UI.go('pmove', P(S, 'MV', { lang: lang })); return true; };
STEP.B1 = function (S, lang) {
  if (!S.newB.length) {
    S.newB = Path.pickNew(lang, BLOCK_WORDS, S.newA, S.queue);
    S.queue = S.queue.filter(function (id) { return S.newB.indexOf(id) < 0; });
    Core.persist();
  }
  if (!S.newB.length) return 'skip';
  /* never start Block B before every A word was retrieved once in a game (PATH_SPEC 2): a short catch-up first */
  var miss = remainderA(S).filter(function (id) { return !ret(S, id); });
  if (miss.length) { UI.go('plisten', P(S, 'B1', { lang: lang, words: miss, seq: miss, catchup: true })); return true; }
  UI.go('pmeet', P(S, 'B1', { lang: lang, words: S.newB })); return true;
};
STEP.B2 = function (S, lang) {
  if (!S.newB.length) return 'skip';
  var a = Core.shuffle(remainderA(S)).slice(0, 2), seq = UI.makeSeq(S.newB, S.newB.length * 2).concat(a);
  UI.go('plisten', P(S, 'B2', { lang: lang, words: S.newB.concat(a), seq: seq })); return true;
};
/* game Z: rotate Run -> seek-and-find -> a mini-game of an EARLIER world; Run/seek targets only use words retrieved >= 2 times today; review mini-games retain their met-word selection */
function zStep(S, lang, id, base) {
  var all = uniq(base.concat(S.warm || [], S.rv || [])), w2 = all.filter(function (i) { return successful(S, i) >= 2; });
  var mode = ['run', 'scene', 'mg'][S.rot % 3];
  if (w2.length < 3 && (mode !== 'mg' || all.filter(function (i) { return ret(S, i) >= 1; }).length < 3)) { UI.go('plisten', P(S, id, { lang: lang, words: all, seq: UI.makeSeq(all, Math.max(6, all.length)) })); return true; }
  if (base.every(function(id){return worldOf(id) === 'countries';})) { UI.go('plisten',P(S,id,{lang:lang,words:base,seq:UI.makeSeq(base,Math.max(6,base.length))})); return true; }
  var world = worldOf(base[0]), wi = worldOrder().indexOf(world);
  if (mode === 'scene') {
    var scn = window.Scene && Scene.forWorld(world);
    var met = scn ? scn.items.filter(function (it) { return D.items[it.id] && w2.indexOf(it.id) >= 0; }).length : 0;
    if (scn && met >= 3) { UI.go('scene', P(S, id, { lang: lang, world: world, scene: scn.id, words: w2 })); return true; }
    mode = 'run';
  }
  if (mode === 'mg') {
    var candidates = [];
    (window.MG ? MG.order : []).forEach(function (gid) {
      var g = MG.games[gid];
      (g.worlds || []).forEach(function (gw) {
        var gi = worldOrder().indexOf(gw);
        if (gi < 0 || gi >= wi) return;
        var have = Core.worldItems(gw).filter(function (i) { return SRS.peek(lang, i).box >= 1; });
        if (have.length >= 4) candidates.push({ g: g, world: gw, words: have });
      });
    });
    var cand = Path.chooseGame(S,lang,id,candidates);
    if (cand) { UI.go('minigame', P(S, id, { lang: lang, game: cand.g.id, world: cand.world, words: Core.shuffle(cand.words).slice(0, 6) })); return true; }
    mode = 'run';
  }
  if (w2.length < 3) { UI.go('plisten', P(S, id, { lang: lang, words: all, seq: UI.makeSeq(all, Math.max(6, all.length)) })); return true; }
  UI.go('run', P(S, id, { lang: lang, world: world, words: Core.shuffle(w2).slice(0, 6), level: 4 })); return true;
}
STEP.B3 = function (S, lang) {
  var base = remainderA(S).concat(S.newB);
  if (!base.length) return 'skip';
  base = base.concat(dueOld(lang, base, 5));
  return zStep(S, lang, 'B3', base);
};
STEP.rv1 = function (S, lang) {
  UI.go('plisten', P(S, 'rv1', { lang: lang, words: S.rv, seq: S.rv, lead: 'reviewday' })); return true;
};
STEP.rv2 = function (S, lang) {
  var world = topWorld(S.rv), ws = S.rv.filter(function (i) { return worldOf(i) === world; });
  return xStep(S, lang, 'rv2', ws, world);
};
STEP.rv3 = function (S, lang) { return zStep(S, lang, 'rv3', S.rv); };
STEP.LETTER = function (S, lang) { if (!S.letter || lang !== 'pt') return 'skip'; UI.go('letters', P(S, 'LETTER', {lang:lang})); return true; };
STEP.R = function (S, lang) { UI.go('pritual', P(S, 'R', { lang: lang })); return true; };

Path.go = function () {
  var lang = Core.curLang(), S = Path.ensure(lang), guard = 0;
  Core.lang = lang;
  if (!S) { Path.home(); return; }
  while (guard++ < 24) {
    if (Path.shouldStop(S) && S.plan[S.step] !== 'R') { if (S.country) Core.L(lang).countries = CountryRules.restore(Core.L(lang),S).countries; S.step = S.plan.length - 1; }
    var id = S.plan[S.step];
    if (S.country && Path.countryUnavailable(lang,S,S.country.token,id)) continue;
    var r = STEP[id] ? STEP[id](S, lang) : 'skip';
    if (r === 'skip') { S.step++; continue; }
    Core.persist(); return;
  }
  Path.home();
};

/* ----- hand over to the next step: +1 star, one line, a whoosh (no result screen, no "continue?") ----- */
function starPop() {
  var n = el('div', 'path-starpop', '<span>' + Lisa.ico.star + '</span><b>+1</b>');
  UI.overlay.appendChild(n); setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 1100 / Core.speed + 200);
}
function burstAt() {
  var rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
  try { FX.burst(68 * rem, 36 * rem, { n: 26, power: 1.1, big: true }); } catch (e) { /* none */ }
}
function nextUrl(nxt) {
  if (!Core.save.settings.ruHelp) return null;
  if (nxt === 'A1' || nxt === 'B1') return Core.lisaUrl('lisa_next7');
  var ok = GAME_STEP[nxt] ? function (k) { return k !== 'lisa_next7'; } : function (k) { return k === 'lisa_next3' || k === 'lisa_next6'; };
  var u = null, t = 0;
  do { u = Core.lisaLine('next'); t++; } while (u && t < 12 && !ok(Core.lisaLast.key));
  return u;
}
Path.finishStep = async function (flow, o) {
  var lang = Path.lang(), S = Path.session(lang);
  if (!S) { UI.go('home'); return; }
  if (UI.p && UI.p.catchup) { Snd.sfx('whoosh'); await flow.wait(300); Path.go(); return; }
  var id = S.plan[S.step];
  if (id === 'CP') {
    if (!o || !Path.completeCountry(lang,o.countryToken)) return;
    S = Path.session(lang); starPop();
  }
  if (STAR_STEP[id] && !S.paid[S.step]) { S.paid[S.step] = 1; Core.addStars(1); starPop(); }
  if (id !== 'CP') S.step++;
  var nxt = S.plan[S.step];
  if (Path.shouldStop(S) && nxt && nxt !== 'R') { S.step = S.plan.length - 1; nxt = 'R'; }
  Core.persist();
  var list = [];
  if (BLOCK_END[id] || id === 'CP') { Snd.sfx('good'); burstAt(); list.push(Core.lisaLine('blockend')); }
  else if (nxt && nxt !== 'R' && nxt !== 'MV') list.push(nextUrl(nxt));
  list = list.filter(Boolean);
  if (list.length) await flow.say(list); else await flow.wait(500);
  Snd.sfx('whoosh');
  await flow.wait(250);
  Path.go();
};

/* ================= screens ================= */
/* Meet: three exposures per word - the word alone, the carrier phrase, the word again with a small child action (touch the picture).
   The target is lit, the others dimmed; the Russian gloss only on the very first exposure of a word (box 0); one fixed picture; no sound or particle over the word audio. */
UI.screens.pmeet = function (flow, root, p) {
  var lang = p.lang, words = p.words;
  var ctx = UI.chrome(flow, root, p, 1, 'explore');
  ctx.dots.classList.add('hidden'); ctx.help.classList.add('hidden');
  var grid = el('div', 'meetgrid n' + words.length); ctx.area.appendChild(grid);
  var cards = {}, labels = {}, armed = null;
  words.forEach(function (id) {
    var c = el('div', 'card meet dim'); c.dataset.id = id;
    c.appendChild(Core.Pic.el(Core.item(id)));
    var first = SRS.peek(lang, id).box < 1;
    var label = Core.vocabLabelEl(lang, Core.item(id), first ? Core.glossText(id, lang) : '', 'vocab-label meet-label');
    labels[id] = label; c.appendChild(label);
    c.appendChild(el('span', 'check', Lisa.ico.check));
    cards[id] = c; grid.appendChild(c);
    flow.after(700, function () { c.classList.add('path-still'); });
    tap(c, function () { if (!flow.promptActive() && armed && armed.id === id) armed.fire(); }, { silent: true, nopress: true });
  });
  ctx.speaker.onclick = null;
  function light(id) { words.forEach(function (w) { cards[w].classList.toggle('dim', w !== id); cards[w].classList.toggle('path-lit', w === id); }); }
  function waitTap(id, ms) {   /* exposure 3: the child touches the lit picture; without a touch it goes on by itself */
    return new Promise(function (res) {
      var c = cards[id]; c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge');
      var done = false, inactivity = null;
      function fin() { if (done) return; done = true; if (inactivity != null) clearTimeout(inactivity); armed = null; c.classList.add('seen'); res(); }
      armed = { id: id, fire: function () { if (done || flow.promptActive()) return; if (inactivity != null) clearTimeout(inactivity); inactivity = null; armed = null; c.classList.remove('zoom'); void c.offsetWidth; c.classList.add('zoom'); flow.prompt(ctx.area, [Core.url.w(lang, id)], [c]).then(fin); } };
      inactivity = flow.after(ms, fin);
    });
  }
  (async function () {
    await flow.wait(800);
    for (var i = 0; i < words.length; i++) {
      if (Path.shouldStop()) break;
      var id = words[i], first = SRS.peek(lang, id).box < 1;
      light(id);
      labels[id].classList.add('revealed');
      SRS.intro(lang, id);
      var l1 = [Core.url.w(lang, id)];
      if (first && Core.save.settings.ruHelp) l1.push(250, Core.url.gloss(id, lang));
      await flow.prompt(ctx.area, l1, [cards[id]]); await flow.wait(350);
      await flow.prompt(ctx.area, [Core.url.q(lang, id)], [cards[id]]); await flow.wait(350);
      if (i === 0) await Core.sayRu(flow, 'explore');
      await flow.prompt(ctx.area, [Core.url.w(lang, id)], [cards[id]]);
      await waitTap(id, 6500);
      await flow.wait(300);
    }
    words.forEach(function (w) { cards[w].classList.remove('dim', 'path-lit'); });
    ctx.lisa.react('cheer');
    await flow.wait(900);
    Path.finishStep(flow);
  })();
  UI.idle(flow, { visualMs: 9000, visual: function () { UI.pulse(ctx.speaker); } });
};

/* Listen & tap: warm-up (2 choices), catch-up, B2, and the fallback of mini-game X / game Z. p.seq = the question order, p.fixed = fixed choice count (else per word) */
UI.screens.plisten = function (flow, root, p) {
  var lang = p.lang, S = Path.session(lang), words = p.words, seq = p.seq || words;
  var ctx = UI.chrome(flow, root, p, seq.length, 'listen_tap');
  var intro = SRS.introduced(lang), pool = intro.length >= 4 ? intro : words;
  (async function () {
    await flow.wait(300);
    var lead = p.lead ? Core.lisaLine(p.lead) : null, list = [];
    if (lead) list.push(lead);
    if (S && !S.said) { S.said = true; var r = Core.ruUrl('listen_tap'); if (r) list.push(list.length ? 200 : 0, r); }
    list = list.filter(function (x) { return x !== 0; });
    if (list.length) await flow.say(list);
    await UI.runQuestions(flow, ctx, { lang: lang, seq: seq, fixed: p.fixed || 0, choiceFor: p.fixed ? null : function (id) { return Path.choices(lang, id); }, worldIdx: 0, pool: pool });
    await flow.wait(300);
    Path.finishStep(flow);
  })();
};

/* movement break: the `move` line, about 35 s with Lisa doing a simple bounce, then `moveend` */
UI.screens.pmove = function (flow, root, p) {
  UI.scene(root, 'meadow');
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { Path.home(); }));
  var lisa = Lisa.make({ cls: 'path-movelisa path-bounce' }); root.appendChild(lisa);
  (async function () {
    await flow.wait(400);
    var t0 = Date.now(), m = Core.lisaLine('move');
    if (m) await flow.say([m]);
    var spent = (Date.now() - t0) * Core.speed;
    await flow.wait(Math.max(2000, 35000 - spent));
    lisa.classList.remove('path-bounce'); lisa.pose('cheer', 1500);
    var e = Core.lisaLine('moveend');
    if (e) await flow.say([e]); else await flow.wait(600);
    Path.finishStep(flow);
  })();
};

/* ritual: stars, the day's house gift, Lisa yawns, goodbye, sleepy fox. The record is closed first so a reload never repeats it. */
UI.screens.pritual = function (flow, root, p) {
  var lang = p.lang, S = Path.session(lang);
  UI.scene(root, 'night');
  var lisa = Lisa.make({ cls: 'rest-lisa' }); root.appendChild(lisa);
  if (!S) { flow.after(100, function () { UI.go('home'); }); return; }
  var first = !S.ritual;
  if (first) {
    S.ritual = true; S.done = true; S.finishedAt = Date.now();
    Core.addStars(3); Core.houseGift('path');
    Core.L(lang).last = Date.now(); Core.persist(); Core.flushNow();
  }
  var row = el('div', 'path-ritualstars');
  for (var i = 0; i < 3; i++) row.appendChild(el('span', 'path-rstar', Lisa.ico.star));
  root.appendChild(row);
  (async function () {
    if (first) { await flow.wait(500); Snd.sfx('star'); await flow.wait(900); }
    await UI.celebrate(flow, lang);
    lisa.pose('yawn'); Snd.sfx('yawn');
    var bye = Core.lisaLine('bye');
    if (bye) await flow.say([bye]); else await flow.wait(1200);
    lisa.pose('sleep');
    await flow.wait(2500);
    UI.go('home');
  })();
  root.appendChild(UI.homeBtn(function () { UI.go('home'); }));
};

/* ----- test hooks (harmless in production) ----- */
Path.test = {
  session: function (l) { return Path.session(l || Core.curLang()); },
  today: dayStr, sleeping: Path.sleeping,
  played: function (ms) { var S = Path.session(Core.curLang()); if (S) { S.playedMs = ms; Core.persist(); } },
  early: function () { var S = Path.session(Core.curLang()); if (S) { S.early = true; Core.persist(); } },
  go: Path.go, unlock: Path.unlockExtra
};
})();
