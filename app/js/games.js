/* Lisa's Island - question engine and the tap / meet / memory / review levels. */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap, SRS = Core.SRS;
var Q = window.Q = { cur: null };
function sayInstruction(flow, key) {
  (async function () {
    while (!flow.dead && (flow.promptActive() || (flow._promptPlaybackToken === Snd.chainTok && Snd.busy()))) {
      var pending = flow._promptPromise;
      if (flow.promptActive() && pending) await pending; else await flow.wait(100);
    }
    if (!flow.dead) await Core.sayRu(flow, key);
  })();
}

/* ---------- one listening question ---------- */
/* o: lang, target, choices[], host, speaker, lisa, srs(bool), gate(bool), onCorrect(fn) -> resolves {first, wrongs} */
Q.ask = function (flow, host, o) {
  return new Promise(function (resolve) {
    var lang = o.lang, tid = o.target, wrongs = 0, locked = false, done = false, cards = {}, helped = false, prompting = false, inPath = !!(window.Path && Path.active && Path.active());
    var wrap = el('div', 'choices n' + o.choices.length + (o.cls ? ' ' + o.cls : ''));
    host.appendChild(wrap);
    var promptGeneration = 0, replayGeneration = 0;
    function prompt(list) { if (done) return Promise.resolve(false); replayGeneration++; prompting = true; var gen = ++promptGeneration; return flow.prompt(host, list, Object.keys(cards).map(function (k) { return cards[k]; })).then(function (r) { if (gen === promptGeneration) prompting = flow.promptActive(); return r; }); }
    function playQ() { return prompt([Core.url.q(lang, tid)]); }
    Q.cur = { target: tid, lang: lang, choices: o.choices.slice(), wrongs: function () { return wrongs; }, busy: function () { return !done && (prompting || locked); }, replay: function () { if (!done && !prompting) { playQ(); if (o.speaker) UI.pulse(o.speaker); } },
      helped: function () { return helped; },
      /* silent cue: pulse speaker + help button, Lisa looks at the cards */
      nudge: function () { if (done) return; if (o.speaker) UI.pulse(o.speaker); if (o.helpBtn) UI.pulse(o.helpBtn); if (o.lisa) o.lisa.react('point'); },
      /* help: word, then Russian gloss (if on), correct card glows, Lisa points. Answer will not count (no SRS promotion). */
      help: function () {
        if (done || prompting) return; helped = true;
        var list = [Core.url.w(lang, tid)], hl = Core.lisaLine('help');
        if (Core.save.settings.ruHelp) list.push(250, Core.url.gloss(tid));
        if (hl) list = [hl, 150].concat(list);
        prompt(list);
        cards[tid].classList.add('hint');
        if (o.lisa) o.lisa.react('point');
        if (o.helpBtn) UI.pulse(o.helpBtn);
      } };
    UI.idleReset(flow);
    flow.onKill(function () { if (Q.cur && Q.cur.target === tid) Q.cur = null; });
    o.choices.forEach(function (id, i) {
      var c = el('div', 'card'); c.dataset.id = id; c.style.animationDelay = (i * 100) + 'ms';
      c.appendChild(Core.Pic.el(Core.item(id)));
      cards[id] = c; wrap.appendChild(c);
      tap(c, function () { pick(id, c); }, { silent: true, nopress: true });
    });
    Snd.preload(Core.url.w(lang, tid));
    prompting = true; /* close the scheduled-prompt gap before its timer can fire */
    flow.after(450, function () { if (!done) playQ(); else prompting = false; });
    async function pick(id, c) {
      if (locked || done || prompting) return;
      if (id === tid) {
        locked = true; done = true;
        var first = wrongs === 0, t0 = Date.now();
        c.classList.add('right'); Object.keys(cards).forEach(function (k) { if (k !== id) cards[k].classList.add('dim'); });
        /* reward: pop, burst, ding (pitch rises with the combo), +XP chip, Lisa jumps */
        var fxr = FX.correct(c, { hud: o.hud, lisa: o.lisa, first: first, helped: helped });
        if (o.onCorrect) o.onCorrect();
        if (o.srs !== false) { if (helped) SRS.touch(lang, tid); else SRS.answer(lang, tid, first); }
        /* word first, then Lisa (a random line; the old target-language praise is the fallback). Never blocks: missing audio just moves on. */
        var voice = FX.voiceFor(o.voiceGroup || 'yes', fxr.milestone) || Core.praiseUrl(lang);
        if (helped && inPath) voice = Core.lisaLine('afterhelp') || voice;   /* path: a helped answer gets the gentle "together" line */
        await flow.say([Core.url.w(lang, tid), 150, voice]);
        await flow.wait(Math.max(150, fxr.hold - (Date.now() - t0) * Core.speed));
        resolve({ first: first, wrongs: wrongs, helped: helped });
      } else {
        wrongs++;
        /* path (PATH_SPEC 3): no failure sound, the target word again within 1 s, the right picture lit at once */
        if (!inPath) Snd.sfx('boop');
        c.classList.add('wrong');
        var oops = inPath ? (FX.miss({ hud: o.hud }), null) : FX.miss({ hud: o.hud });
        if (o.lisa) o.lisa.react('tilt');
        setTimeout(function () { c.classList.add('gone'); }, 650 / Core.speed);
        if (wrongs >= 2 || inPath) cards[tid].classList.add('hint');
        locked = true;
        var replayTicket = ++replayGeneration;
        await flow.wait(inPath ? 600 : 850);
        locked = false;
        if (!done && replayTicket === replayGeneration) { if (inPath) prompt([Core.url.w(lang, tid)]); else if (oops) prompt([oops, 200, Core.url.q(lang, tid)]); else playQ(); }
      }
    }
  });
};

/* word sequence of `count` questions, no immediate repeats, every word about equally often */
function makeSeq(words, count) {
  var out = [], bag = [];
  while (out.length < count) {
    if (!bag.length) {
      bag = Core.shuffle(words);
      if (out.length && bag.length > 1 && bag[0] === out[out.length - 1]) { var t = bag[0]; bag[0] = bag[1]; bag[1] = t; }
    }
    out.push(bag.shift());
  }
  return out;
}

/* run a list of questions with adaptive choice count; returns number of questions with a wrong first try */
async function runQuestions(flow, ctx, o) {
  var lang = o.lang, seq = o.seq, ad = { n: o.fixed || 2, recent: [], streak: 0 }, mistakes = 0;
  var intro = SRS.introduced(lang), pool = o.pool || intro;
  var maxN = o.fixed ? o.fixed : (o.worldIdx >= 3 ? 4 : 3), inPath = !!(window.Path && Path.active && Path.active());
  /* answer screens: silent cue after 8 s, automatic help (the one spoken repeat) after 25 s without a tap */
  UI.idle(flow, { visualMs: 8000, visual: function () { if (Q.cur) Q.cur.nudge(); },
    speakMs: 25000, speak: function () { if (Q.cur) Q.cur.help(); } });
  ctx.speaker.onclick = null;
  for (var i = 0; i < seq.length; i++) {
    if (inPath && i > 0 && Path.shouldStop()) break;   /* hard stop / early end: finish at an item boundary */
    ctx.dots.set(i);
    ctx.area.innerHTML = '';
    var n = Math.min(o.fixed || ad.n, maxN), tid = seq[i];
    if (o.choiceFor) n = o.choiceFor(tid, i);   /* path: per-word choice count, fixed for the whole block */
    var ids = Core.placeCorrect(Core.choices(lang, tid, n, pool), tid);
    var qi = i;
    var res = await Q.ask(flow, ctx.area, { lang: lang, target: tid, choices: ids, speaker: ctx.speaker, lisa: ctx.lisa, srs: o.srs, helpBtn: ctx.help, hud: ctx.dots,
      onCorrect: function () { ctx.dots.set(qi + 1); } });
    if (!res.first) mistakes++;
    if (!o.fixed && !o.choiceFor && !res.helped) {
      ad.recent.push(res.first);
      ad.streak = res.first ? 0 : ad.streak + 1;
      if (ad.streak >= 2) { ad.n = 2; ad.recent = []; ad.streak = 0; }
      else {
        var r = ad.recent.slice(-5), acc = r.filter(Boolean).length / r.length;
        if (ad.n < maxN && r.length >= 3 && acc >= 0.8) { ad.n++; ad.recent = []; }
      }
    }
  }
  ctx.dots.set(ctx.dots.total != null ? Math.min(seq.length, ctx.dots.total) : seq.length);
  return mistakes;
}

/* ---------- common screen chrome for levels ---------- */
function chrome(flow, root, p, total, speakKey) {
  UI.scene(root, 'meadow');
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { if (p.path) Path.home(); else UI.go(p.kind === 'review' ? 'map' : 'path', { world: p.world }); }));
  FX.levelStart();
  var dots = UI.dots(total || 6); bar.appendChild(dots);
  var sp = UI.speakerBtn(function () {
    if (Q.cur) Q.cur.replay(); else if (speakKey) flow.sayAfterPrompt([Core.ruUrl(speakKey)]);
  });
  bar.appendChild(sp);
  var hb = UI.helpBtn(function () { if (p.kind === 'memory') { if (UI.memory) UI.memory.help(); } else if (Q.cur) Q.cur.help(); });
  hb.classList.add('top-help'); bar.appendChild(hb);
  var lisa = Lisa.make({ cls: 'corner-lisa' }); root.appendChild(lisa);
  var area = el('div', 'area'); root.appendChild(area);
  return { bar: bar, dots: dots, speaker: sp, help: hb, lisa: lisa, area: area };
}
function wordsOf(p) {
  var W = Core.worldItems(p.world), half = Math.min(6, Math.ceil(W.length / 2));
  return { all: W, first: W.slice(0, half), second: W.slice(half, half + 6).length ? W.slice(half, half + 6) : W.slice(0, half) };
}
/* Lisa's question intro, once per level start (not per question) */
var askedFor = null;
function askExtra() {
  if (askedFor === FX.level) return [];
  askedFor = FX.level;
  var l = Core.lisaLine('ask');
  return l ? [150, l] : [];
}
function finish(flow, p, mistakes, extra) {
  var stars = Core.starsFor(mistakes);
  var r = Core.completeLevel(p.lang, p.world, p.level, stars);
  Core.addXP(Core.XP.level);
  UI.go('result', Object.assign({ lang: p.lang, world: p.world, level: p.level, stars: stars, gain: r.gain, mistakes: mistakes,
    xp: FX.level.xp + Core.XP.level, crownNew: r.crownNew ? r.crown : 0 }, extra || {}));
}

/* ---------- L1 / L3: meet the words (then questions) ---------- */
UI.screens.meet = function (flow, root, p) {
  var lang = p.lang, wd = wordsOf(p), words = p.part === 0 ? wd.first : wd.second;
  var wi = Core.worldIdx(p.world);
  var ctx = chrome(flow, root, p, p.part === 0 ? 3 : 6, 'explore');
  ctx.dots.classList.add('hidden'); ctx.help.classList.add('hidden');
  var grid = el('div', 'meetgrid n' + words.length); ctx.area.appendChild(grid);
  var counts = {}, cards = {}, labels = {}, firstExposure = {}, finished = false;
  words.forEach(function (id, i) {
    var c = el('div', 'card meet'); c.dataset.id = id; c.style.animationDelay = (i * 90) + 'ms';
    c.appendChild(Core.Pic.el(Core.item(id)));
    firstExposure[id] = SRS.peek(lang, id).box < 1;
    labels[id] = Core.vocabLabelEl(lang, Core.item(id), firstExposure[id] && Core.save.settings.ruHelp ? Core.item(id).ru : '', 'vocab-label meet-label'); c.appendChild(labels[id]);
    c.appendChild(el('span', 'check', Lisa.ico.check));
    cards[id] = c; counts[id] = 0;
    tap(c, function () {
      if (finished || flow.promptActive()) return;
      c.classList.remove('zoom'); void c.offsetWidth; c.classList.add('zoom');
      counts[id]++; labels[id].classList.add('revealed'); SRS.intro(lang, id);
      if (counts[id] >= 2) c.classList.add('seen');
      ctx.lisa.react('cheer');
      var list = [Core.url.w(lang, id)];
      if (Core.save.settings.ruHelp) list.push(250, Core.url.gloss(id));
      flow.prompt(ctx.area, list, Object.keys(cards).map(function (k) { return cards[k]; })).then(check);
    }, { silent: true, nopress: true });
    grid.appendChild(c);
  });
  function check() {
    if (finished) return;
    if (!words.every(function (id) { return counts[id] >= 2; })) return;
    finished = true;
    after();
  }
  async function after() {
    await flow.wait(500);
    Snd.sfx('good'); ctx.lisa.pose('cheer', 1500);
    await Core.sayRu(flow, 'great');
    var seq, fixed = null;
    ctx.area.innerHTML = '';
    ctx.dots.classList.remove('hidden'); ctx.help.classList.remove('hidden');
    var intro = SRS.introduced(lang);
    if (p.part === 0) { seq = Core.shuffle(words).slice(0, 3); fixed = 2; ctx.dots = rebuildDots(ctx, 3); }
    else {
      var nw = Core.shuffle(words).slice(0, 4), old = Core.shuffle(wd.first), s = nw.slice();
      while (s.length < 6) s.push(old[s.length % old.length]);
      seq = Core.shuffle(s); for (var k = 1; k < seq.length; k++) if (seq[k] === seq[k - 1]) { var j = (k + 1) % seq.length; var t = seq[k]; seq[k] = seq[j]; seq[j] = t; }
      ctx.dots = rebuildDots(ctx, 6);
    }
    await Core.sayRu(flow, 'listen_tap', askExtra());
    var m = await runQuestions(flow, ctx, { lang: lang, seq: seq, fixed: fixed, worldIdx: wi, pool: intro.length >= 3 ? intro : wd.all });
    finish(flow, p, m);
  }
  function rebuildDots(c, n) { var d = UI.dots(n); c.bar.replaceChild(d, c.dots); return d; }
  flow.after(500, function () { sayInstruction(flow, 'explore'); });
  /* explore: silent nudge on the next unheard card; one spoken repeat of the instruction after ~20 s */
  UI.idle(flow, { visualMs: 7000, speakMs: 20000, active: function () { return !finished; },
    visual: function () {
      UI.pulse(ctx.speaker);
      var next = words.filter(function (id) { return counts[id] < 2; })[0];
      if (next) { cards[next].classList.remove('nudge'); void cards[next].offsetWidth; cards[next].classList.add('nudge'); }
    },
    speak: function () { flow.sayAfterPrompt([Core.ruUrl('explore')]); } });
};

/* ---------- L2: listen and tap ---------- */
UI.screens.tap = function (flow, root, p) {
  var lang = p.lang, wd = wordsOf(p), wi = Core.worldIdx(p.world);
  var ctx = chrome(flow, root, p, 8, 'listen_tap');
  (async function () {
    await flow.wait(300);
    await Core.sayRu(flow, 'listen_tap', askExtra());
    var intro = SRS.introduced(lang);
    var m = await runQuestions(flow, ctx, { lang: lang, seq: makeSeq(wd.first, 8), worldIdx: wi, pool: intro.length >= 4 ? intro : wd.all });
    finish(flow, p, m);
  })();
};

/* ---------- L4: memory ---------- */
UI.screens.memory = function (flow, root, p) {
  var lang = p.lang, wi = Core.worldIdx(p.world), wide = window.innerWidth / window.innerHeight >= 1.7;
  var pairs = p.path ? p.words.length : wi < 3 ? 3 : wi < 8 ? 4 : (wide ? 6 : 4);
  var ctx = chrome(flow, root, Object.assign({ kind: 'memory' }, p), pairs, 'memory');
  /* choose distinct pictures / words from this world */
  var chosen = [], usedPic = {}, usedWord = {};
  Core.shuffle(p.path ? p.words : Core.worldItems(p.world)).forEach(function (id) {
    if (chosen.length >= pairs) return;
    var it = Core.item(id), pk = Core.picKey(it), w = it[lang].word.toLowerCase();
    if (usedPic[pk] || usedWord[w]) return; usedPic[pk] = usedWord[w] = 1; chosen.push(id);
  });
  pairs = chosen.length;
  var cols = pairs <= 3 ? 3 : 4, cs = pairs <= 3 ? 24 : pairs === 4 ? 21 : 16.5;
  var grid = el('div', 'mgrid'); grid.style.setProperty('--cols', cols); grid.style.setProperty('--cs', cs + 'rem');
  ctx.area.appendChild(grid);
  var deck = Core.shuffle(chosen.concat(chosen)), open = [], closeTimer = null, matched = 0, flips = 0, wrongPairs = 0, finished = false;
  deck.forEach(function (id, i) {
    var c = el('div', 'mcard'); c.dataset.id = id; c.style.animationDelay = (i * 60) + 'ms';
    c.innerHTML = '<div class="in"><div class="mback"><svg viewBox="0 0 100 100"><circle cx="50" cy="64" r="20" fill="#fff" opacity=".85"/><circle cx="26" cy="40" r="9" fill="#fff" opacity=".85"/><circle cx="42" cy="26" r="9" fill="#fff" opacity=".85"/><circle cx="58" cy="26" r="9" fill="#fff" opacity=".85"/><circle cx="74" cy="40" r="9" fill="#fff" opacity=".85"/></svg></div><div class="mface"></div></div>';
    var face = c.querySelector('.mface');
    face.appendChild(Core.Pic.el(Core.item(id)));
    face.appendChild(Core.vocabLabelEl(lang, Core.item(id), '', 'vocab-label memory-label'));
    tap(c, function () { flip(c, id); }, { silent: true, nopress: true });
    grid.appendChild(c);
  });
  function closeOpen() {
    clearTimeout(closeTimer);
    open.forEach(function (o) { o.c.classList.remove('flipped'); }); open = [];
  }
  function flip(c, id) {
    if (finished || flow.promptActive() || c.classList.contains('flipped') || c.classList.contains('matched')) return;
    if (open.length >= 2) closeOpen();
    c.classList.add('flipped'); flips++; Snd.sfx('flip');
    var wordPrompt = flow.prompt(ctx.area, [Core.url.w(lang, id)], Array.prototype.slice.call(grid.children));
    SRS.intro(lang, id);
    open.push({ c: c, id: id });
    if (open.length === 2) {
      if (open[0].id === open[1].id) {
        var a = open[0].c, b = open[1].c; open = [];
        flow.after(650, async function () {
          await wordPrompt;
          if (flow.dead || finished) return;
          a.classList.add('matched'); b.classList.add('matched');
          matched++; ctx.dots.set(matched);
          var t0 = Date.now(), fr = FX.correct(b, { hud: ctx.dots, lisa: ctx.lisa, first: true });
          var vo = FX.voiceFor('yes', fr.milestone);
          if (matched >= pairs) { finished = true; await flow.say([vo || Core.url.ui(lang, 'praise1')]); await flow.wait(Math.max(400, fr.hold - (Date.now() - t0) * Core.speed)); end(); }
          else if (vo && !Snd.busy()) Snd.say([vo]);
        });
      } else {
        wrongPairs++;
        ctx.lisa.react('tilt'); /* turning over two different cards is how this game works: no combo reset here */
        closeTimer = setTimeout(function () { if (!flow.dead) closeOpen(); }, 1300 / Core.speed);
      }
    }
  }
  async function end() {
    var m = Math.max(0, wrongPairs - pairs); /* free mismatches: as many as pairs */
    var mistakes = m <= 0 ? 0 : m <= pairs ? 2 : 5;
    if (p.path) { chosen.forEach(function (id) { Path.note(lang, id, 'first', true); }); Path.finishStep(flow); return; }
    finish(flow, p, mistakes);
  }
  flow.after(400, function () { sayInstruction(flow, 'memory'); });
  UI.idle(flow, { visualMs: 9000, speakMs: 20000, active: function () { return !finished; },
    visual: function () { UI.pulse(ctx.speaker); UI.pulse(ctx.help); },
    speak: function () { flow.sayAfterPrompt([Core.ruUrl('memory')]); } });
  Core.$('.dots', root).classList.add('dots-memory');
  ctx.dots.set(0);
  /* help: briefly flip one still-hidden matching pair (silent), then flip it back */
  function memHelp() {
    if (finished || flow.promptActive()) return;
    closeOpen();
    var left = {};
    deck.forEach(function (id, i) { var c = grid.children[i]; if (!c.classList.contains('matched')) (left[id] = left[id] || []).push(c); });
    var ids = Object.keys(left); if (!ids.length) return;
    var pair = left[ids[0]];
    pair.forEach(function (c) { c.classList.add('flipped'); c.classList.add('peek'); });
    UI.pulse(ctx.help); ctx.lisa.react('point');
    flow.prompt(ctx.area, [Core.url.w(lang, ids[0])], pair);
    flow.after(1800, function () { pair.forEach(function (c) { c.classList.remove('peek'); if (!c.classList.contains('matched')) c.classList.remove('flipped'); }); });
  }
  UI.memory = { help: memHelp, pairsLeft: function () { return pairs - matched; } };
};

/* ---------- review round (treasure chest) ---------- */
UI.screens.review = function (flow, root, p) {
  var lang = p.lang, due = SRS.dueList(lang), intro = SRS.introduced(lang);
  var seq = []; var src = due.slice(0, 8);
  if (!src.length) src = intro.slice(0, 8);
  seq = makeSeq(src, 8);
  var ctx = chrome(flow, root, { kind: 'review', world: null }, 8, 'listen_tap');
  ctx.lisa.pose('cheer', 1200);
  (async function () {
    await flow.wait(300);
    await Core.sayRu(flow, 'listen_tap', askExtra());
    await runQuestions(flow, ctx, { lang: lang, seq: seq, fixed: 3, pool: intro });
    Core.addStars(5); Core.houseGift('review'); Core.L(lang).last = Date.now(); Core.persist();
    Core.addXP(Core.XP.level);
    UI.go('result', { kind: 'review', lang: lang, stars: 3, gain: 5, fly: 5, xp: FX.level.xp + Core.XP.level });
  })();
};

/* ---------- free run: pick a finished world ---------- */
UI.screens.freerun = function (flow, root, p) {
  var lang = p.lang || Core.curLang();
  UI.scene(root, 'meadow');
  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { UI.go('map'); }));
  var grid = el('div', 'freegrid'); root.appendChild(grid);
  D.worlds.forEach(function (w, i) {
    if (!Core.worldDone(lang, i)) return;
    var n = el('div', 'node static'); n.dataset.world = w.id; n.appendChild(UI.worldPic(w.id));
    tap(n, function () { UI.go('run', { lang: lang, world: w.id, level: 4, free: true }); }, { nopress: true });
    grid.appendChild(n);
  });
  flow.after(300, function () { Snd.say([Core.ruUrl('run_intro')]); });
};

UI.chrome = chrome;
UI.makeSeq = makeSeq;
UI.runQuestions = runQuestions;
UI.wordsOf = wordsOf;
})();
