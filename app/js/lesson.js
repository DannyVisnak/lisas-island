/* Lisa's Island - "little lessons" engine (short illustrated cutscenes narrated by Lisa).
   Data: js/lessons_data.js (beats), art + animations: js/lessons_art.js, looks: css/lesson.css. API reference: SPEC.md "Lessons".
   Lesson.list() -> [{id, word, scene, beats}]      Lesson.word(id) -> vocab id of the end word card
   Lesson.play(id, root, onDone, opts) -> handle {stop(), replay(), state(), flow}    onDone(true) after the word card, onDone(false) when stopped early / unknown id
   Lesson.seen(lang, id) -> how many times it was played to the end
   Screen: UI.screens.lesson (flow, root, {id, lang?, done?: fn, back?: fn}).  Save: Core.L(lang).lessons[id] = {seen, last}. */
(function () {
'use strict';
var Lesson = window.Lesson = { PEEK_MS: 8000, AUTO_MS: 15000, MS_PER_CHAR: 70 };
var DATA = function () { return window.LESSON_DATA || { order: [], lessons: {} }; };
var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
var Snd = function () { return window.Core && Core.Snd; };

Lesson.list = function () {
  var d = DATA();
  return d.order.map(function (id) { var l = d.lessons[id]; return { id: id, word: l.word, scene: l.scene, beats: l.beats.length }; });
};
Lesson.word = function (id) { var l = DATA().lessons[id]; return l ? l.word : null; };
Lesson.seen = function (lang, id) {
  try { var r = Core.L(lang).lessons; return (r && r[id] && r[id].seen) || 0; } catch (e) { return 0; }
};

/* ---------- small helpers ---------- */
function uiText(key) { var u = window.Core && Core.D && Core.D.ui && Core.D.ui.ru; return (u && u[key]) || ''; }
function uiUrl(key) { return Core.url.ui('ru', key); }
/* wanted time of a cue inside a spoken line (0..1), from the position of its word in the text; TTS speed is roughly even */
function cueFrac(text, word) {
  var i = text.indexOf(word);
  if (i < 0 || !text.length) return 0.5;
  return Math.min(0.95, (i / text.length) * 0.92 + 0.04);
}
/* real duration (ms) of a voice file if the browser knows it, else null */
function knownDuration(url) {
  var a = Core.Snd.cache && Core.Snd.cache[url];
  return (a && !a._bad && isFinite(a.duration) && a.duration > 0) ? a.duration * 1000 : null;
}
function loadDuration(url) {
  return new Promise(function (res) {
    var d = knownDuration(url);
    if (d != null || Core.fast) { res(d); return; }
    var a = Core.Snd.cache && Core.Snd.cache[url];
    if (!a || a._bad) { res(null); return; }
    var t = setTimeout(function () { res(null); }, 500);
    a.addEventListener('loadedmetadata', function () { clearTimeout(t); res(knownDuration(url)); }, { once: true });
    a.addEventListener('error', function () { clearTimeout(t); res(null); }, { once: true });
  });
}

/* ---------- play ---------- */
Lesson.play = function (id, root, onDone, opts) {
  opts = opts || {};
  var def = DATA().lessons[id];
  if (!def || !window.LessonArt || !LessonArt.scenes[def.scene]) {
    try { console.error('Lesson.play: unknown lesson or scene ' + id); } catch (e) { /* none */ }
    if (onDone) onDone(false);
    return null;
  }
  var lang = opts.lang || Core.curLang();
  var ownFlow = !opts.flow, flow = opts.flow || new Core.Flow();
  var box = el('div', 'ls ls-' + id);
  root.appendChild(box);
  if (def.edge) document.body.style.background = def.edge;

  var st = { id: id, lang: lang, beat: -1, beats: def.beats.length, phase: 'start', picks: [], lineKey: null, promptKey: null, promptOpen: false,
             tiles: 0, pulsed: false, repeated: false, done: false, stopped: false, card: false, wordPlays: 0, cues: 0 };
  var S = LessonArt.stage(box, flow, st);
  var scene = LessonArt.scenes[def.scene](S);
  var finished = false;

  function stop(early) {
    if (st.stopped) return; st.stopped = true;
    if (ownFlow) flow.kill();
    if (S && S.dispose) S.dispose();
    if (box.parentNode) box.parentNode.removeChild(box);
    if (early && !finished && onDone) { finished = true; onDone(false); }
  }
  var handle = { flow: flow, stop: function () { stop(true); }, state: function () { return JSON.parse(JSON.stringify(st)); },
    replay: function () { if (st.promptOpen && st.promptKey && !flow.promptActive()) { flow.prompt(box, [uiUrl(st.promptKey)], box.querySelectorAll('.ls-tile')); } return st.promptOpen; }, S: S };
  if (ownFlow) flow.every(1000, function () { if (!box.isConnected) stop(true); });

  /* ----- voice: plays a line, schedules cues by word position, pads the time when the audio file is missing ----- */
  async function speak(key, cues) {
    var text = uiText(key), url = uiUrl(key), est = Math.max(900, text.length * Lesson.MS_PER_CHAR);
    st.lineKey = key;
    var real = await loadDuration(url), dur = real != null ? real : est;
    var waits = [];
    (cues || []).forEach(function (c) {
      var t = cueFrac(text, c.word) * dur;
      st.cues++;
      waits.push(new Promise(function (res) {
        flow.after(t, function () { runAnim(c.anim).then(res, res); });
      }));
    });
    var t0 = Date.now();
    var ok = await flow.say([url]);
    if (!ok && !Core.fast) await flow.wait(Math.max(0, est - (Date.now() - t0) * Core.speed));   /* missing/blocked audio: keep reading time */
    await Promise.all(waits);
  }
  function runAnim(name) {
    var list = [].concat(name || []);
    return Promise.all(list.map(function (n) {
      var f = scene.act && scene.act[n];
      if (!f) { try { console.warn('lesson ' + id + ': no animation ' + n); } catch (e) { /* none */ } return Promise.resolve(); }
      try { return Promise.resolve(f(S)).catch(function (e) { try { console.error('lesson anim ' + n + ': ' + (e && e.stack || e)); } catch (x) { /* none */ } }); }
      catch (e) { try { console.error('lesson anim ' + n + ': ' + (e && e.stack || e)); } catch (x) { /* none */ } return Promise.resolve(); }
    }));
  }

  /* ----- a prediction prompt: 2 big outcome pictures, ANY tap is accepted ----- */
  async function runPrompt(b, i) {
    var P = b.prompt, qkey = P.q || b.line;
    st.phase = 'ask'; st.promptKey = qkey;
    if (P.q) await flow.prompt(box, [uiUrl(P.q)], []);
    st.phase = 'prompt';
    var wrap = el('div', 'ls-prompt'), pos = (scene.promptBox || { x: 683, y: 540, size: 280, gap: 40 });
    var size = pos.size, gap = pos.gap, left = pos.x - size - gap / 2, top = pos.y - size / 2;
    wrap.style.left = left / 10 + 'rem'; wrap.style.top = top / 10 + 'rem'; wrap.style.width = (size * 2 + gap) / 10 + 'rem'; wrap.style.height = size / 10 + 'rem';
    var order = Core.shuffle(P.choices.map(function (c, k) { return k; }));
    var tiles = order.map(function (k, slot) {
      var ch = P.choices[k], t = el('div', 'ls-tile');
      t.dataset.choice = ch.id; t.dataset.slot = slot;
      t.style.left = (slot * (size + gap)) / 10 + 'rem'; t.style.width = size / 10 + 'rem'; t.style.height = size / 10 + 'rem';
      t.style.animationDelay = (slot * 140) + 'ms';
      t.appendChild(scene.tile(ch.tile, size));
      wrap.appendChild(t);
      return t;
    });
    box.appendChild(wrap);
    st.tiles = tiles.length; st.promptOpen = true; st.pulsed = false; st.repeated = false;
    var picked = null, auto = false, resolveFn, done = new Promise(function (r) { resolveFn = r; });
    tiles.forEach(function (t) {
      Core.tap(t, function () { if (picked || flow.promptActive()) return; picked = t.dataset.choice; resolveFn(); }, { nopress: true });
    });
    var idle = 0, seq = Core.inputSeq;
    var timer = flow.every(500, function () {
      if (picked) return;
      if (seq !== Core.inputSeq) { seq = Core.inputSeq; idle = 0; wrap.classList.remove('ls-pulse'); st.pulsed = false; return; }
      if (Snd().busy()) return;
      idle += 500;
      if (idle >= Lesson.PEEK_MS && !st.pulsed) {
        st.pulsed = true; wrap.classList.add('ls-pulse');
        if (!st.repeated && !flow.promptActive()) { st.repeated = true; flow.prompt(box, [uiUrl(qkey)], tiles); }
      }
      if (idle >= Lesson.AUTO_MS) { picked = 'auto'; auto = true; resolveFn(); }
    });
    await done;
    clearInterval(timer);
    st.promptOpen = false; st.phase = 'check';
    st.picks.push({ beat: i, choice: auto ? null : picked, auto: auto });
    wrap.classList.remove('ls-pulse');
    tiles.forEach(function (t) { if (!auto) t.classList.add(t.dataset.choice === picked ? 'ls-picked' : 'ls-dim'); });
    if (S.lisa && S.lisa.pose) S.lisa.pose('tilt', 900);
    await speak('cs_check');
    await flow.wait(250);
    wrap.classList.add('ls-out');
    await flow.wait(300);
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  /* ----- the end word card: picture + the target-language word audio (exposure only) ----- */
  async function wordCard() {
    var vid = def.word, it = Core.item(vid);
    st.phase = 'word'; st.card = true;
    if (!it) return;
    var card = el('div', 'ls-card'), rays = el('div', 'ls-rays'), pic = Core.Pic.el(it, 'ls-cardpic');
    card.appendChild(rays); card.appendChild(pic);
    if (it[lang]) card.appendChild(el('div', 'ls-cardword', String(it[lang].word)));
    box.appendChild(card);
    if (S.lisa && S.lisa.pose) S.lisa.pose('cheer', 1500);
    var url = Core.url.w(lang, vid);
    Core.Snd.sfx('good');
    await flow.wait(500);
    for (var k = 0; k < 2; k++) {
      st.wordPlays++;
      var t0 = Date.now(), ok = await flow.say([url]);
      if (!ok && !Core.fast) await flow.wait(Math.max(0, 900 - (Date.now() - t0) * Core.speed));
      if (k === 0) await flow.wait(700);
    }
    await flow.wait(1000);
  }

  function record() {
    try {
      if (!window.Core || !Core.L) return;
      var L = Core.L(lang); if (!L.lessons) L.lessons = {};
      var r = L.lessons[id] || (L.lessons[id] = { seen: 0, last: 0 });
      r.seen = (r.seen || 0) + 1; r.last = Date.now();
      if (Core.persist) Core.persist();
    } catch (e) { /* save is optional in a harness */ }
  }

  async function run() {
    var P = [];
    if (Core.Snd.preload) { def.beats.forEach(function (b) { Core.Snd.preload(uiUrl(b.line)); if (b.prompt && b.prompt.q) Core.Snd.preload(uiUrl(b.prompt.q)); }); Core.Snd.preload(uiUrl('cs_check')); Core.Snd.preload(Core.url.w(lang, def.word)); }
    await flow.wait(450);
    for (var i = 0; i < def.beats.length; i++) {
      var b = def.beats[i];
      st.beat = i; st.phase = 'beat';
      if (b.art) Object.keys(b.art).forEach(function (k) { S.set(k, b.art[k]); });
      if (b.pose && S.lisa && S.lisa.pose) S.lisa.pose(b.pose, b.poseMs || (b.pose === 'sleep' ? 0 : 1500));
      var anim = runAnim(b.anim);
      await speak(b.line, b.cues);
      await anim;
      if (b.prompt) await runPrompt(b, i);
      await flow.wait(b.pause == null ? 450 : b.pause);
    }
    await wordCard();
    record();
    st.phase = 'done'; st.done = true; finished = true;
    if (onDone) onDone(true);
  }
  window.__lessonTest = { id: id, state: handle.state, S: S, handle: handle, tapChoice: function (idx) {
    var t = box.querySelectorAll('.ls-tile')[idx || 0]; if (!t) return false;
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true })); return t.dataset.choice;
  } };
  flow.onKill(function () { if (window.__lessonTest && window.__lessonTest.id === id) window.__lessonTest = null; });
  run().catch(function (e) { try { console.error('lesson ' + id + ': ' + (e && e.stack || e)); } catch (x) { /* none */ } });
  return handle;
};

/* ---------- screen (the linear path builder calls Lesson.play directly; this is for tests and a lesson shelf) ---------- */
if (window.UI && UI.screens) {
  UI.screens.lesson = function (flow, root, p) {
    var h = null;
    var bar = el('div', 'topbar ls-bar');
    bar.appendChild(UI.backBtn(function () { if (h) h.stop(); if (p.back) p.back(); else UI.go('home'); }));
    var spk = UI.speakerBtn(function () { if (h && h.replay()) UI.pulse(spk); });
    bar.appendChild(spk);
    h = Lesson.play(p.id, root, function (ok) { if (!ok) return; if (p.done) p.done(); else UI.go('home'); }, { flow: flow, lang: p.lang });
    root.appendChild(bar);
    if (!h) UI.go('home');
  };
}
})();
