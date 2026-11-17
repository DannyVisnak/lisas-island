/* Lisa's Island - end-to-end smoke test (Node Playwright, Firefox, touch, file://).
   Run: node tools/smoke.js */
const path = require('path');
const fs = require('fs');
const pw = require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }));
const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const SHOTS = path.join(__dirname, 'shots');
const URL = 'file://' + path.join(APP, 'index.html');

const problems = [];      // hard failures
const warnings = [];      // soft (missing audio etc.)
const tiny = [];          // targets below 110 px
const errors = [];        // console errors / page errors
let shotN = 0, page, browser, sawGoalTrophy = false;

function fail(msg) { problems.push(msg); console.log('  FAIL: ' + msg); }
let phase = '';
function log(msg) { phase = String(msg).slice(0, 40); console.log(msg); }
function expect(cond, msg) { if (!cond) fail(msg); return !!cond; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  shotN++;
  const f = path.join(SHOTS, String(shotN).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: f });
}
async function screen() { return page.evaluate(() => __test.screen()); }
async function waitScreen(name, timeout = 25000) {
  try { await page.waitForFunction((n) => __test.screen() === n, name, { timeout }); }
  catch (e) { fail('timeout waiting for screen "' + name + '" (now "' + (await screen()) + '")'); throw new Error('stop'); }
}
async function waitFor(fn, arg, timeout = 15000, what = 'condition') {
  try { await page.waitForFunction(fn, arg, { timeout }); return true; }
  catch (e) { fail('timeout: ' + what); return false; }
}
/* check every tappable thing on the current screen is at least 110 px (layout size, scaled to the viewport) */
async function checkTargets(label) {
  const r = await page.evaluate(() => {
    const fr = document.getElementById('frame'), fs = fr.getBoundingClientRect().width / fr.offsetWidth, thr = 109.5 * Math.min(1, innerWidth / 1366, innerHeight / 768);
    const out = [];
    document.querySelectorAll('.btn,.flag-btn,.node,.lvnode,.card,.mcard,.hatbtn,.gearbtn,.gcard,.slot').forEach((e) => {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return;
      if (e.closest('.hidden')) return;
      const w = e.offsetWidth * fs, h = e.offsetHeight * fs;
      if (w === 0 || h === 0) return;
      if (Math.min(w, h) < thr) out.push({ cls: e.className, w: Math.round(w), h: Math.round(h) });
    });
    return out;
  });
  r.forEach((t) => tiny.push(label + ': ' + t.cls + ' ' + t.w + 'x' + t.h));
}
/* all visible interactive elements must lie inside the frame */
async function checkInside(label) {
  const r = await page.evaluate(() => {
    const fr = document.getElementById('frame').getBoundingClientRect(), out = [];
    document.querySelectorAll('.btn,.flag-btn,.node,.lvnode,.card,.mcard,.hatbtn,.gcard,.slot,.starbadge,.starrow,.jar').forEach((e) => {
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (b.left < fr.left - 3 || b.top < fr.top - 3 || b.right > fr.right + 3 || b.bottom > fr.bottom + 3) out.push(e.className + ' [' + Math.round(b.left - fr.left) + ',' + Math.round(b.top - fr.top) + ',' + Math.round(b.right - fr.left) + ',' + Math.round(b.bottom - fr.top) + ']');
    });
    return out;
  });
  r.forEach((t) => fail(label + ' outside frame: ' + t));
}
/* overlaps between interactive items (cards must not overlap each other or buttons) */
async function checkOverlap(label) {
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.btn,.flag-btn,.node,.lvnode,.card,.mcard,.hatbtn,.gcard,.slot,.starbadge')].filter((e) => {
      const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && e.offsetParent !== null && getComputedStyle(e).opacity !== '0' && !e.classList.contains('gone');
    });
    const out = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
      const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
      const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left), oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if (ox > 14 && oy > 14) out.push(a.className.split(' ').slice(0, 2).join('.') + ' x ' + b.className.split(' ').slice(0, 2).join('.') + ' (' + Math.round(ox) + 'x' + Math.round(oy) + ')');
    }
    return out;
  });
  r.forEach((t) => fail(label + ' overlap: ' + t));
}
async function checkRunBar(label) {
  const r = await page.evaluate(() => {
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
    const els = [...document.querySelectorAll('.topbar > *, .topbar .hud > *')].filter(vis);
    const out = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
      const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
      if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 1 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 1) out.push(a.className + ' x ' + b.className);
    }
    const sp = [...document.querySelectorAll('.b-speaker')].filter(vis).length;
    return { out, sp, gate: !!document.querySelector('.gatebar') };
  });
  r.out.forEach((t) => fail(label + ' run top-bar overlap: ' + t));
  if (r.gate) { if (r.sp !== 1) fail(label + ' expected exactly 1 visible speaker during gate, got ' + r.sp); } else if (r.sp < 1) fail(label + ' no speaker visible');
}
async function tapSel(sel, idx = 0) {
  const r = await page.evaluate(({ sel, idx }) => {
    const els = [...document.querySelectorAll(sel)].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
    const e = els[idx]; if (!e) return null;
    const b = e.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2, top = document.elementFromPoint(cx, cy);
    return { cx, cy, hit: !!top && (e === top || e.contains(top)) };
  }, { sel, idx });
  if (!r) { fail('tap target not found: ' + sel); throw new Error('stop'); }
  if (!r.hit) fail('tap target covered by something else: ' + sel);
  await page.touchscreen.tap(r.cx, r.cy);
  return r;
}
/* answer listening questions until the screen changes; wrongFirst: tap one wrong card once at the first question */
async function answerAll(screens, opts = {}) {
  let answered = 0, shotDone = false, wrongDone = false;
  for (let g = 0; g < 1500; g++) {
    const st = await page.evaluate(() => {
      const wrap = document.querySelector('.choices:not([data-seen])');
      return { s: __test.screen(), id: __test.correctId(), ch: __test.choiceIds(), has: !!wrap, cards: wrap ? wrap.querySelectorAll('.card').length : 0 };
    });
    if (!screens.includes(st.s)) return answered;
    if (!st.id || !st.has || st.cards < st.ch.length) { await sleep(70); continue; }
    if (opts.shot && !shotDone && answered === (opts.shotAt || 0)) { await sleep(700); await shot(opts.shot); await checkTargets(opts.shot); await checkOverlap(opts.shot); await checkInside(opts.shot); shotDone = true; }
    if (opts.wrongFirst && !wrongDone && st.ch.length > 1) {
      wrongDone = true;
      const wrongId = st.ch.find((x) => x !== st.id);
      await tapSel('.choices:not([data-seen]) .card[data-id="' + wrongId + '"]');
      await sleep(250);
      const w = await page.evaluate((id) => { const c = document.querySelector('.choices:not([data-seen]) .card[data-id="' + id + '"]'); return c ? c.className : null; }, wrongId);
      expect(w && /wrong/.test(w), 'wrong card did not wobble (class: ' + w + ')');
      if (opts.shotWrong) await shot(opts.shotWrong);
      await sleep(900);
      const still = await page.evaluate(() => __test.screen());
      expect(screens.includes(still), 'a wrong answer must not leave the question screen');
      continue;
    }
    await page.evaluate(() => { document.querySelector('.choices:not([data-seen])').dataset.seen = '1'; });
    await tapSel('.choices .card[data-id="' + st.id + '"]:not(.gone)');
    answered++;
    await sleep(60);
  }
  fail('answerAll did not finish for ' + screens.join('/'));
  return answered;
}
async function waitResultToPath(world) {
  await waitScreen('result');
  await sleep(220);
  await shot('result');
  await checkTargets('result'); await checkInside('result');
  await waitScreenAfterCelebrations(world);
}
/* result screen auto-advances after celebrations; capture the first overlay if any */
async function waitScreenAfterCelebrations(want) {
  let popShot = false;
  for (let g = 0; g < 400; g++) {
    const s = await screen();
    if (s !== 'result') break;
    if (await page.evaluate(() => !!document.querySelector('#overlay .pop .bigtrophy'))) sawGoalTrophy = true;
    if (!popShot) { const hasPop = await page.evaluate(() => !!document.querySelector('#overlay .pop .bigsticker, #overlay .pop .pop-lisa, #overlay .pop .bigworld, #overlay .pop .bigtrophy')); if (hasPop) { await sleep(450); await shot('celebration'); popShot = true; } }
    await sleep(100);
  }
  if (want) await waitScreen(want);
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.readdirSync(SHOTS).forEach((f) => { if (/\.png$/.test(f)) fs.unlinkSync(path.join(SHOTS, f)); });

  /* ---- asset check from data.js ---- */
  global.window = {}; require(path.join(APP, 'js', 'data.js'));
  const D = window.GAME_DATA;
  const need = (rel, hard) => { const p = path.join(APP, rel); if (!fs.existsSync(p) || fs.statSync(p).size < 100) (hard ? problems : warnings).push('missing ' + rel); };
  Object.values(D.items).forEach((it) => {
    if (it.pic.type === 'emoji') need(it.pic.src, true);
    D.langs.forEach((l) => { need(D.audioPath.word.replace('{lang}', l).replace('{id}', it.id)); need(D.audioPath.q.replace('{lang}', l).replace('{id}', it.id)); });
    need(D.audioPath.gloss.replace('{id}', it.id));
  });
  Object.keys(D.ui).forEach((l) => Object.keys(D.ui[l]).forEach((k) => need(D.audioPath.ui.replace('{lang}', l).replace('{key}', k))));
  Object.values(D.uiImg).forEach((p) => need(p, true));
  need('icon/lisa.png', true);
  log('worlds in data.js: ' + D.worlds.length + ', items: ' + Object.keys(D.items).length);

  const ffDirs = process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH) ? fs.readdirSync(process.env.PLAYWRIGHT_BROWSERS_PATH).filter((d) => /^firefox-/.test(d)) : [];
  const ffExe = ffDirs.length ? process.env.PLAYWRIGHT_BROWSERS_PATH + '/' + ffDirs[ffDirs.length - 1] + '/firefox/firefox' : null;
  const engine = process.env.SMOKE_BROWSER || 'firefox';
  try { browser = engine === 'chromium' ? await pw.chromium.launch() : await pw.firefox.launch(); }
  catch (e) { log('default ' + engine + ' launch failed, trying installed build ' + ffExe); browser = engine === 'chromium' ? await pw.chromium.launch() : await pw.firefox.launch({ executablePath: ffExe }); }
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text() + ' [after: ' + phase + '] ' + JSON.stringify(m.location())); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const externalRequests = [];
  page.on('request', (r) => { if (/^https?:/.test(r.url())) externalRequests.push(r.url()); });

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__test && __test.screen() === 'home');
    await page.evaluate(() => __test.speedUp(8));
    const fontState = await page.evaluate(async () => {
      const faces = await document.fonts.load('700 16px Andika');
      const label = document.createElement('span'); label.className = 'vocab-label'; document.body.appendChild(label);
      const family = getComputedStyle(label).fontFamily; label.remove();
      return { loaded: faces.some((f) => f.family === 'Andika' && f.status === 'loaded'), check: document.fonts.check('700 16px Andika'), family };
    });
    expect(fontState.loaded && fontState.check, 'bundled Andika TTF loads from the local file:// stylesheet');
    expect(/Andika/.test(fontState.family) && /system-ui/.test(fontState.family) && /sans-serif/.test(fontState.family), 'subtitle CSS retains readable system sans-serif fallbacks if Andika is unavailable');
    expect(externalRequests.length === 0, 'app boot makes no HTTP requests');
    const subtitles = await page.evaluate(() => {
      const label = (lang, word) => Core.vocabLabel(lang, { [lang]: { word } });
      return {
        de: ['der Hund', 'die Katze', 'das Pferd', 'die Freunde'].map((w) => label('de', w)),
        pt: ['o gato', 'os amigos', 'a casa', 'as meias'].map((w) => label('pt', w)),
        en: label('en', 'The dog!'), neutral: label('de', 'Apfel'),
        token: label('de', 'dermal')
      };
    });
    expect(await page.evaluate(() => Core.save.settings.subtitles) === true, 'subtitles default on');
    expect(subtitles.de.map((x) => x.color).join() === '#1565c0,#c62828,#2e7d32,#c62828', 'German article colours use complete leading tokens');
    expect(subtitles.pt.map((x) => x.color).join() === '#1565c0,#1565c0,#c62828,#c62828', 'Portuguese article colours include plurals');
    expect(subtitles.en.text === 'The dog!' && subtitles.en.color === '#263238', 'English label remains verbatim and neutral');
    expect(subtitles.neutral.text === 'Apfel' && subtitles.neutral.color === '#263238' && subtitles.token.color === '#263238', 'article-free words and partial tokens remain neutral');
    /* count every speech call (Snd.say) so idle behaviour can be asserted */
    await page.evaluate(() => { window.__says = 0; window.__saylog = []; const S = Core.Snd, o = S.say; S.say = function (l) { window.__says++; window.__saylog.push(Math.round(performance.now()) + ' ' + JSON.stringify(l).slice(0, 80) + ' @' + (Core.screen || '')); return o.apply(this, arguments); }; });
    expect(await page.evaluate(() => __test.worlds()) === D.worlds.length, 'world count mismatch');

    /* ---- HOME ---- */
    log('home');
    await sleep(900);
    await shot('home'); await checkTargets('home'); await checkOverlap('home'); await checkInside('home');
    expect(await page.evaluate(() => document.querySelectorAll('.path-langs .b-flag').length) === 2, 'home should show 2 language flags (pt, en) by default');
    expect(await page.evaluate(() => document.querySelectorAll('.path-play').length) === 1, 'home has exactly one Play button');
    /* a headless profile blocks autoplay: the home greeting is then replayed on the first touch. Touch empty sky first so that replay is not counted as map speech. */
    await page.touchscreen.tap(800, 60); await sleep(700);
    await page.evaluate(() => { window.__says = 0; window.__saylog = []; });
    /* The linear home routes legacy levels through Parent > Free play. Keep this suite on that supported route. */
    await page.evaluate(() => { Core.lang = 'pt'; __test.go('parent'); });
    await waitScreen('parent');
    await page.evaluate(() => document.querySelector('[data-act="freeplay"]').scrollIntoView({ block: 'center' }));
    await sleep(300);
    await tapSel('[data-act="freeplay"]');
    await waitScreen('map');
    await sleep(700);
    /* idle on the map: ~70 s of simulated idle time (speed 8) must stay (almost) silent: entry + at most one repeat */
    await sleep(9000);
    const mapSays = await page.evaluate(() => window.__says);
    expect(mapSays <= 2, 'map: at most 2 speech calls in >=60 s idle, got ' + mapSays);
    log('  map speech calls during ~70 s idle: ' + mapSays);
    if (mapSays > 2) log('  say log: ' + JSON.stringify(await page.evaluate(() => window.__saylog)));

    /* ---- MAP ---- */
    log('map');
    await shot('map-pt'); await checkTargets('map'); await checkOverlap('map'); await checkInside('map');
    expect(await page.evaluate(() => document.querySelectorAll('.node').length) === D.worlds.length, 'map must show every world');
    expect(await page.evaluate(() => document.querySelectorAll('.node.locked').length) === D.worlds.length - 1, 'only world 1 is unlocked at the start');
    await tapSel('.node.locked'); await sleep(150);
    expect(await screen() === 'map', 'locked world must not open');
    await tapSel('.node[data-world="animals"]');
    await waitScreen('path'); await sleep(700);

    /* ---- PATH ---- */
    log('path');
    await shot('path-start'); await checkTargets('path'); await checkOverlap('path'); await checkInside('path');
    await tapSel('.lvnode.locked'); await sleep(150);
    expect(await screen() === 'path', 'locked level must not open');

    /* ---- L1 meet ---- */
    log('L1 meet');
    await tapSel('.lvnode.lv0');
    await waitScreen('meet'); await sleep(900);
    expect(await page.evaluate(() => { const e = document.querySelector('.meet-label'); return e && getComputedStyle(e).visibility === 'hidden'; }), 'free-play Meet label is hidden before first word playback');
    await shot('meet'); await checkTargets('meet'); await checkOverlap('meet'); await checkInside('meet');
    const nm = await page.evaluate(() => document.querySelectorAll('.meetgrid .card').length);
    for (let rep = 0; rep < 2; rep++) for (let i = 0; i < nm; i++) { await tapSel('.meetgrid .card', i); if (rep === 0 && i === 0) expect(await page.evaluate(() => { const c = document.querySelector('.meetgrid .card'), e = c.querySelector('.meet-label'), it = Core.item(c.dataset.id); return e.classList.contains('revealed') && e.querySelector('.vocab-word').textContent === it[Core.curLang()].word && e.querySelector('.vocab-gloss') && e.querySelector('.vocab-gloss').textContent === it.ru && getComputedStyle(e).visibility === 'visible'; }), 'free-play Meet reveals exact vocabulary and first-exposure Russian gloss on first word playback'); await sleep(rep === 0 && i === 0 ? 350 : 120); if (rep === 0 && i === 0) await shot('meet-tapped'); }
    await sleep(300);
    await shot('meet-seen');
    await waitFor(() => !document.querySelector('.meetgrid'), null, 15000, 'meet grid replaced by questions');
    await answerAll(['meet'], { shot: 'question-2', wrongFirst: true, shotWrong: 'question-wrong' });
    await waitResultToPath('path');
    expect(await page.evaluate(() => document.querySelectorAll('.lvnode.done').length) >= 1, 'level 1 should be marked done');

    /* ---- L2 tap ---- */
    log('L2 tap');
    await tapSel('.lvnode.lv1');
    await waitScreen('tap');
    await waitFor(() => __test.correctId() && document.querySelectorAll('.choices .card').length >= 2, null, 15000, 'first tap question');
    await sleep(1800);
    const q1 = await page.evaluate(() => __test.correctId());
    expect(await page.evaluate(() => !!document.querySelector('.top-help')), 'help button on listen-tap');
    await shot('help-listen-tap'); await checkTargets('help-listen'); await checkOverlap('help-listen'); await checkInside('help-listen');
    /* idle: ~70 s simulated, no taps. After entry: at most ONE spoken repeat (the automatic help). */
    await page.evaluate(() => { window.__says = 0; });
    await sleep(9000);
    const tapSays = await page.evaluate(() => window.__says);
    expect(tapSays <= 1, 'listen-tap: at most 1 speech call after entry in >=60 s idle, got ' + tapSays);
    log('  listen-tap speech calls after entry during ~70 s idle: ' + tapSays);
    expect(await page.evaluate(() => !!document.querySelector('.choices .card.hint')), 'automatic help glows the correct card after ~25 s idle');
    await tapSel('.choices .card[data-id="' + q1 + '"]:not(.gone)');
    await waitFor((prev) => __test.correctId() !== prev && document.querySelectorAll('.choices .card').length >= 2, q1, 15000, 'second tap question');
    await sleep(700);
    /* manual help: hint on the correct card, helped answer does not promote the word */
    const q2 = await page.evaluate(() => __test.correctId());
    const boxBefore = await page.evaluate((id) => Core.L('pt').words[id] ? Core.L('pt').words[id].box : 0, q2);
    await tapSel('.top-help'); await sleep(250);
    expect(await page.evaluate((id) => !!document.querySelector('.choices .card[data-id="' + id + '"].hint'), q2), 'help button must glow the correct card');
    await tapSel('.choices .card[data-id="' + q2 + '"]:not(.gone)'); await sleep(250);
    const boxAfter = await page.evaluate((id) => Core.L('pt').words[id].box, q2);
    expect(boxAfter === Math.max(boxBefore, 1), 'helped answer must not promote the word (box ' + boxBefore + ' -> ' + boxAfter + ')');
    await waitFor((prev) => __test.correctId() !== prev, q2, 15000, 'third tap question');
    await answerAll(['tap'], { shot: 'question-tap', shotAt: 3 });
    await waitResultToPath('path');

    /* ---- L3 meet again + questions ---- */
    log('L3 meet part 2');
    await tapSel('.lvnode.lv2');
    await waitScreen('meet'); await sleep(900);
    const nm2 = await page.evaluate(() => document.querySelectorAll('.meetgrid .card').length);
    await shot('meet2'); await checkTargets('meet2'); await checkOverlap('meet2');
    for (let rep = 0; rep < 2; rep++) for (let i = 0; i < nm2; i++) { await tapSel('.meetgrid .card', i); await sleep(110); }
    await waitFor(() => !document.querySelector('.meetgrid'), null, 15000, 'meet2 grid replaced');
    await answerAll(['meet'], { shot: 'question-3choices', shotAt: 3 });
    await waitResultToPath('path');

    /* ---- L4 memory ---- */
    log('L4 memory');
    await tapSel('.lvnode.lv3');
    await waitScreen('memory'); await sleep(900);
    expect(await page.evaluate(() => !!document.querySelector('.top-help')), 'help button on memory');
    await tapSel('.top-help'); await sleep(40);
    const peek = await page.evaluate(() => [...document.querySelectorAll('.mcard.flipped')].map((c) => c.dataset.id));
    expect(peek.length === 2 && peek[0] === peek[1], 'memory help flips one matching pair (' + peek.join(',') + ')');
    await waitFor(() => !document.querySelector('.mcard.flipped'), null, 8000, 'memory help pair flips back');
    await shot('memory-start'); await checkTargets('memory'); await checkOverlap('memory'); await checkInside('memory');
    const ids = await page.evaluate(() => [...document.querySelectorAll('.mcard')].map((c) => c.dataset.id));
    const uniq = [...new Set(ids)];
    expect(ids.length === uniq.length * 2, 'memory deck must have pairs');
    /* one mismatch first */
    const a = ids.indexOf(uniq[0]), b = ids.indexOf(uniq[1]);
    await tapSel('.mcard', a); await sleep(150); await tapSel('.mcard', b); await sleep(600);
    await shot('memory-mismatch');
    await waitFor(() => !document.querySelector('.mcard.flipped'), null, 8000, 'mismatched cards flip back');
    for (const id of uniq) {
      const idx = ids.map((x, i) => (x === id ? i : -1)).filter((i) => i >= 0);
      await tapSel('.mcard', idx[0]); await sleep(120); await tapSel('.mcard', idx[1]);
      await waitFor((i) => document.querySelectorAll('.mcard.matched[data-id="' + i + '"]').length === 2 || !document.querySelector('.mcard'), id, 8000, 'pair matched ' + id);
      if (id === uniq[0]) await shot('memory-matched');
    }
    await waitResultToPath('path');

    /* ---- L5 run ---- */
    log('L5 run');
    await page.evaluate(() => __test.speedUp(1));
    await tapSel('.lvnode.lv4');
    await waitScreen('run');
    await waitFor(() => __runState.state === 'ready', null, 1000, 'fresh Run ready state');
    await shot('run-ready'); await checkTargets('run'); await checkInside('run'); await checkRunBar('ready');
    /* Keyboard input must start Run from ready and produce a physics jump. */
    await page.evaluate(() => {
      window.__kbAudit = null;
      /* Keep the event: a remounted Run's handler may run after this observer.
         Read defaultPrevented only after the complete dispatch has returned. */
      window.__kbAuditListener = (e) => { if (e.code === 'Space') window.__kbAudit = e; };
      window.addEventListener('keydown', window.__kbAuditListener);
      window.__kbGroundY = __runState.lisa.y;
    });
    await page.keyboard.press('Space');
    await waitFor(() => __runState.state === 'run' && !__runState.lisa.onGround && __runState.lisa.vy < 0, null, 1500, 'Space starts Run and initiates a jump');
    const keyboardStart = await page.evaluate(() => ({ state: __runState.state, y: __runState.lisa.y, vy: __runState.lisa.vy, groundY: __kbGroundY, prevented: __kbAudit && __kbAudit.defaultPrevented }));
    expect(keyboardStart.state === 'run' && keyboardStart.vy < 0 && keyboardStart.y < keyboardStart.groundY, 'Space on ready starts a real jump (' + JSON.stringify(keyboardStart) + ')');
    expect(keyboardStart.prevented, 'Space default is prevented while Run is active');
    await shot('run-keyboard-jump');
    async function groundRunForKeyTest() {
      await page.evaluate(() => {
        const s = __runState, l = s.lisa;
        s.state = 'run'; s.over = false; s.gi = 0; l.x = 220; l.y = __kbGroundY; l.vy = 0; l.onGround = true; l.coyote = 0; l.jumpBuf = 0; s.cam = 0;
      });
    }
    async function assertKeyboardJump(key, label) {
      await groundRunForKeyTest();
      await page.keyboard.press(key);
      const ok = await waitFor(() => !__runState.lisa.onGround && __runState.lisa.vy < 0 && __runState.lisa.y < __kbGroundY, null, 1200, label + ' initiates a real jump');
      expect(ok, label + ' should jump from grounded Run');
      await page.waitForFunction(() => __runState.lisa.onGround, null, { timeout: 2500 }).catch(() => {});
      expect(await page.evaluate(() => __runState.lisa.onGround), label + ' test returns to grounded state');
    }
    await assertKeyboardJump('ArrowUp', 'ArrowUp');
    await assertKeyboardJump('w', 'lowercase W');
    await assertKeyboardJump('W', 'uppercase W');
    /* Physical W must work when a Russian keyboard layout reports Cyrillic ц. */
    await groundRunForKeyTest();
    await page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: 'ц', code: 'KeyW', bubbles: true, cancelable: true });
      window.dispatchEvent(e);
    });
    expect(await waitFor(() => !__runState.lisa.onGround && __runState.lisa.vy < 0 && __runState.lisa.y < __kbGroundY, null, 1200, 'Russian-layout physical W initiates a real jump'), 'key ц with code KeyW should produce upward motion');
    await page.waitForFunction(() => __runState.lisa.onGround, null, { timeout: 2500 }).catch(() => {});
    /* Space hold/repeat cannot queue another jump; a fresh press after release can. */
    await groundRunForKeyTest();
    await page.keyboard.down('Space');
    await waitFor(() => !__runState.lisa.onGround && __runState.lisa.vy < 0, null, 1200, 'held Space first jump');
    await page.waitForFunction(() => __runState.lisa.onGround, null, { timeout: 2500 }).catch(() => {});
    await page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true, repeat: true });
      window.__kbRepeatAudit = null;
      window.__kbRepeatListener = (ev) => { if (ev === e) window.__kbRepeatAudit = { prevented: ev.defaultPrevented, repeat: ev.repeat }; };
      window.addEventListener('keydown', window.__kbRepeatListener);
      window.dispatchEvent(e);
      window.removeEventListener('keydown', window.__kbRepeatListener);
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(await page.evaluate(() => __runState.lisa.onGround && __runState.lisa.jumpBuf === 0), 'held/repeated Space does not trigger or buffer another jump after landing');
    expect(await page.evaluate(() => __kbRepeatAudit && __kbRepeatAudit.prevented && __kbRepeatAudit.repeat), 'repeated Space remains default-prevented without requesting a jump');
    await page.keyboard.up('Space');
    await page.keyboard.press('Space');
    expect(await waitFor(() => !__runState.lisa.onGround && __runState.lisa.vy < 0, null, 1200, 'Space after release jumps again'), 'released Space can jump again');
    await page.waitForFunction(() => __runState.lisa.onGround, null, { timeout: 2500 }).catch(() => {});
    /* Prove the fixture scrolls with the Run listener removed, then prove Run prevents it. */
    await page.evaluate(() => __test.go('map')); await waitScreen('map');
    const scrollStyles = await page.evaluate(async () => {
      const html = document.documentElement, body = document.body;
      const old = { htmlStyle: html.getAttribute('style'), bodyStyle: body.getAttribute('style'), htmlTabIndex: html.getAttribute('tabindex') };
      html.style.height = '220vh'; html.style.overflow = 'auto'; body.style.height = '220vh'; body.style.minHeight = '220vh'; body.style.overflow = 'visible'; window.scrollTo(0, 0);
      /* Choose the viewport scroll target instead of inheriting touch focus.
         Flush layout and allow a paint before testing native Space scrolling. */
      html.setAttribute('tabindex', '-1'); html.focus({ preventScroll: true });
      html.getBoundingClientRect();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return old;
    });
    try {
      expect(await page.evaluate(() => document.activeElement === document.documentElement && document.scrollingElement.scrollHeight > innerHeight), 'temporary fixture has a focused, scrollable viewport');
      await page.keyboard.press('Space');
      expect(await page.evaluate(() => __kbAudit && __kbAudit.target === document.documentElement && !__kbAudit.defaultPrevented), 'outside Run, fixture Space reaches the viewport without default prevention');
      expect(await waitFor(() => scrollY > 0, null, 1000, 'unhandled Space scrolls the temporary fixture'), 'temporary fixture must scroll for unhandled Space');
      /* Let the native smooth Space scroll finish before resetting the fixture. */
      await page.evaluate(() => { window.__kbScrollSettle = { y: scrollY, since: performance.now() }; });
      await waitFor(() => {
        const s = __kbScrollSettle, now = performance.now();
        if (s.y !== scrollY) { s.y = scrollY; s.since = now; }
        return scrollY > 0 && now - s.since >= 150;
      }, null, 2000, 'unhandled Space scrolling settles');
      await page.evaluate(() => window.scrollTo(0, 0));
      await waitFor(() => scrollY === 0, null, 1000, 'scroll fixture resets to the top');
      await page.evaluate(() => __test.go('run', { lang: 'pt', world: 'animals' })); await waitScreen('run');
      await waitFor(() => __runState.state === 'ready', null, 1000, 'Run ready for handled Space scroll check');
      await page.evaluate(() => {
        document.documentElement.style.height = '220vh'; document.documentElement.style.overflow = 'auto';
        document.body.style.height = '220vh'; document.body.style.minHeight = '220vh'; document.body.style.overflow = 'visible'; window.scrollTo(0, 0);
        window.__kbAudit = null;
      });
      await page.keyboard.press('Space');
      await waitFor(() => __runState.state === 'run' && !__runState.lisa.onGround && __runState.lisa.vy < 0, null, 1200, 'handled Space starts and jumps without scrolling');
      await page.evaluate(() => { window.__kbScrollProbe = { until: performance.now() + 500, moved: scrollY !== 0 }; });
      await waitFor(() => {
        __kbScrollProbe.moved = __kbScrollProbe.moved || scrollY !== 0;
        return performance.now() >= __kbScrollProbe.until;
      }, null, 1500, 'handled Space scroll observation window');
      const scrollCheck = await page.evaluate(() => ({ y: scrollY, moved: __kbScrollProbe.moved, prevented: __kbAudit && __kbAudit.defaultPrevented }));
      expect(!scrollCheck.moved && scrollCheck.y === 0, 'Space does not scroll the page during Run');
      expect(scrollCheck.prevented, 'scroll fixture observes Space default prevention');
    } finally {
      await page.evaluate((old) => {
        const html = document.documentElement, body = document.body;
        if (old.htmlStyle === null) html.removeAttribute('style'); else html.setAttribute('style', old.htmlStyle);
        if (old.bodyStyle === null) body.removeAttribute('style'); else body.setAttribute('style', old.bodyStyle);
        html.blur();
        if (old.htmlTabIndex === null) html.removeAttribute('tabindex'); else html.setAttribute('tabindex', old.htmlTabIndex);
        window.scrollTo(0, 0);
      }, scrollStyles);
    }
    /* Non-game keys, editable targets and modified shortcuts leave jump state alone. */
    await groundRunForKeyTest();
    await page.keyboard.press('x');
    await page.keyboard.down('Control'); await page.keyboard.press('Space'); await page.keyboard.up('Control');
    const modifiedKeyAudit = await page.evaluate(() => __kbAudit && __kbAudit.defaultPrevented);
    await page.evaluate(() => { const i = document.createElement('input'); i.id = 'kb-editable-test'; document.body.appendChild(i); i.focus(); });
    await page.keyboard.press('ArrowUp');
    const ignoredInput = await page.evaluate(() => ({ buf: __runState.lisa.jumpBuf, ground: __runState.lisa.onGround }));
    expect(ignoredInput.buf === 0 && ignoredInput.ground && modifiedKeyAudit === false, 'unrelated keys, editable targets and modified shortcuts do not request jumps or suppress modified Space');
    await page.evaluate(() => { document.getElementById('kb-editable-test').remove(); document.activeElement.blur(); });
    /* Finish still belongs to the mounted Run; keep Lisa away from the house
       so this isolated input check cannot complete the level and kill its flow. */
    await groundRunForKeyTest();
    await page.evaluate(() => { __runState.state = 'finish'; __runState.finishT = 0; window.__kbAudit = null; });
    await page.keyboard.press('Space');
    const finishKey = await page.evaluate(() => ({ mounted: __test.screen() === 'run' && !UI.flow.dead && !!document.querySelector('.s-run .runcv'), state: __runState.state, buf: __runState.lisa.jumpBuf, prevented: __kbAudit && __kbAudit.defaultPrevented }));
    expect(finishKey.mounted && finishKey.state === 'finish' && finishKey.buf === 0 && finishKey.prevented, 'Space in mounted Run finish state suppresses scrolling without requesting a jump');
    await page.evaluate(() => { __runState.state = 'run'; __runState.lisa.jumpBuf = 0; });
    await page.evaluate(() => { window.removeEventListener('keydown', window.__kbAuditListener); __test.go('map'); }); await waitScreen('map');
    await page.evaluate(() => {
      __test.speedUp(1);
      window.__touchOldRun = __runState;
      window.scrollTo(0, 0);
      __test.go('run', { lang: 'pt', world: 'animals', level: 4 });
    });
    await waitScreen('run');
    /* The screen hook is synchronous; wait for the entrance paint and a usable
       canvas hit target before sending native touch input to the new screen. */
    await waitFor(() => {
      const cv = document.querySelector('.s-run .runcv');
      if (!cv || __runState === __touchOldRun || __runState.state !== 'ready' || UI.flow.dead || getComputedStyle(cv.parentElement).opacity !== '1') return false;
      const b = cv.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
      return b.width > 0 && b.height > 0 && x > 0 && x < innerWidth && y > 0 && y < innerHeight && document.elementFromPoint(x, y) === cv;
    }, null, 1500, 'fresh painted Run ready with a hittable touch canvas');
    /* Touch starts a newly mounted ready Run and initiates its physics jump. */
    await page.evaluate(() => {
      const cv = document.querySelector('.s-run .runcv');
      window.__touchRun = __runState;
      window.__touchGroundY = __runState.lisa.y;
      window.__touchStartAudit = null;
      cv.addEventListener('pointerdown', (e) => {
        window.__touchStartAudit = { state: __runState.state, touch: e.pointerType === 'touch', trusted: e.isTrusted };
      }, { capture: true, once: true });
    });
    await tapSel('.s-run .runcv');
    expect(await page.evaluate(() => __touchStartAudit && __touchStartAudit.state === 'ready' && __touchStartAudit.touch && __touchStartAudit.trusted), 'real touch reaches the fresh ready Run canvas');
    expect(await waitFor(() => __runState === __touchRun && __runState.state === 'run' && !__runState.lisa.onGround && __runState.lisa.vy < 0 && __runState.lisa.y < __touchGroundY, null, 1200, 'touch starts Run and initiates a physics jump'), 'tap on fresh ready Run starts and jumps');
    const st1 = await page.evaluate(() => ({ state: __runState.state, y: __runState.lisa.y, x: __runState.lisa.x }));
    await shot('run-jump');
    await page.evaluate(() => __test.speedUp(8));
    /* watch her run for a while without jumping: states must stay friendly (no fail state) */
    const seen = new Set();
    for (let i = 0; i < 40; i++) { seen.add(await page.evaluate(() => __runState.state)); await sleep(150); }
    log('  run states seen: ' + [...seen].join(','));
    expect(!seen.has('dead') && !seen.has('over'), 'run must have no fail state');
    const xNow = await page.evaluate(() => __runState.lisa.x);
    expect(xNow > st1.x + 300, 'Lisa should keep running by herself (x ' + st1.x + ' -> ' + xNow + ')');
    await shot('run-mid');
    const nG = await page.evaluate(() => __runState.gates.length);
    log('  gates: ' + nG);
    for (let gi = 0; gi < nG; gi++) {
      /* wait until she can be teleported */
      await waitFor(() => {
        const s = __runState;
        if (s.state === 'gate') return true;
        /* skipToGate changes only x: never carry a fall below the new ground.
           Check and teleport in one dispatch, before physics can advance. */
        if (s.state !== 'run' || !s.lisa.onGround) return false;
        s.skipToGate(); return true;
      }, null, 12000, 'grounded Run approach or existing gate');
      await waitFor(() => __runState.state === 'gate' && !!document.querySelector('.gatechoices .card') && __test.correctId(), null, 15000, 'gate ' + gi + ' question');
      await sleep(700);
      if (gi === 0) {
        const beforeKey = await page.evaluate(() => ({ gi: __runState.gi, buf: __runState.lisa.jumpBuf, target: __test.correctId(), mistakes: __runState.mistakes, gate: __runState.gates[__runState.gi].state }));
        await page.keyboard.press('Space');
        const afterKey = await page.evaluate(() => ({ state: __runState.state, gi: __runState.gi, buf: __runState.lisa.jumpBuf, target: __test.correctId(), mistakes: __runState.mistakes, gate: __runState.gates[__runState.gi].state }));
        expect(afterKey.state === 'gate' && afterKey.gi === beforeKey.gi && afterKey.buf === 0 && afterKey.target === beforeKey.target && afterKey.mistakes === beforeKey.mistakes && afterKey.gate === beforeKey.gate, 'Space at a gate only suppresses scrolling; it neither jumps nor answers');
      }
      if (gi === 0) { await shot('run-gate'); await checkTargets('gate'); await checkOverlap('gate'); await checkInside('gate'); await checkRunBar('gate'); }
      let gBefore = null, gId = null;
      if (gi === 0) {
        gId = await page.evaluate(() => __test.correctId());
        expect(await page.evaluate(() => !!document.querySelector('.gate-help')), 'help button on the gate');
        gBefore = await page.evaluate((id) => Core.L('pt').words[id] ? Core.L('pt').words[id].box : 0, gId);
        await tapSel('.gate-help'); await sleep(250);
        expect(await page.evaluate((id) => !!document.querySelector('.gatechoices .card[data-id="' + id + '"].hint'), gId), 'gate help must glow the correct card');
        await shot('run-gate-help');
      }
      await answerGate(gi);
      if (gi === 0) {
        await sleep(250);
        const gAfter = await page.evaluate((id) => Core.L('pt').words[id].box, gId);
        expect(gAfter === Math.max(gBefore, 1), 'helped gate answer must not promote the word (box ' + gBefore + ' -> ' + gAfter + ')');
      }
      await waitFor((n) => __runState.gi >= n, gi + 1, 12000, 'gate ' + gi + ' opens');
      if (gi === 1) await shot('run-after-gate');
    }
    await page.evaluate(() => __runState.skipToEnd());
    await sleep(900);
    await shot('run-finish');
    await waitResultToPath('path');
    expect(await page.evaluate(() => document.querySelectorAll('.lvnode.done').length) === 5, 'all 5 levels done after the run');
    await shot('path-complete');
    /* A killed Run releases its keyboard listener; mounting Run again restores it. */
    await page.evaluate(() => { window.__oldRunState = __runState; __test.go('map'); }); await waitScreen('map');
    await page.evaluate(() => {
      window.__outsideKeyAudit = null;
      window.__outsideKeyListener = (e) => { if (e.code === 'Space') window.__outsideKeyAudit = e.defaultPrevented; };
      window.addEventListener('keydown', window.__outsideKeyListener);
    });
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => __outsideKeyAudit === false && __oldRunState.lisa.jumpBuf === 0), 'after leaving Run, Space is not intercepted and the old jump buffer is unchanged');
    await page.evaluate(() => { window.removeEventListener('keydown', window.__outsideKeyListener); __test.go('run', { lang: 'pt', world: 'animals' }); });
    await waitScreen('run');
    await waitFor(() => __runState.state === 'ready', null, 1000, 're-entered Run ready state');
    await page.keyboard.press('ArrowUp');
    expect(await waitFor(() => !__runState.lisa.onGround && __runState.lisa.vy < 0, null, 1200, 're-entered Run keyboard jump'), 're-entering Run restores keyboard jumping');
    await tapSel('.b-back'); await waitScreen('path');

    /* ---- review round (chest) when box-2 words are due ----
       PATH_SPEC §4: box 2 is due after 3 days. At +1 only box-1 words are due;
       reviewing those reaches box 2, so it cannot exercise the box-3 sticker award. */
    log('review');
    await tapSel('.b-back'); await waitScreen('map'); await sleep(300);
    expect(await page.evaluate(() => document.querySelectorAll('.node:not(.locked)').length) === 2, 'world 2 should be unlocked after world 1');
    expect(sawGoalTrophy || (await page.evaluate(() => __test.fx().goals)) >= 1, 'the daily goal trophy celebration appeared when the goal was reached during the levels');
    await rewards();
    await page.evaluate(() => { __test.dayShift(3); __test.go('map'); });
    await waitScreen('map'); await sleep(900);
    const stickerTargets = await page.evaluate(() => Core.SRS.dueList('pt').slice(0, 8).filter((id) => {
      const w = Core.SRS.peek('pt', id);
      return w.box === 2 && !w.sticker;
    }));
    expect(stickerTargets.length > 0, 'review setup must include due box-2 words without stickers in its first 8 targets');
    const hasChest = await page.evaluate(() => !!document.querySelector('.chest'));
    expect(hasChest, 'treasure chest should appear when 4+ words are due');
    await shot('map-chest'); await checkOverlap('map-chest'); await checkTargets('map-chest');
    if (hasChest) {
      await page.evaluate(() => __test.realTime());
      await tapSel('.chest');
      await sleep(520); await shot('fx-chest-shaking');
      await waitFor(() => __test.fx().log.indexOf('chest') >= 0, null, 5000, 'chest opening animation started');
      await sleep(560); await shot('fx-chest-open');
      await page.evaluate(() => __test.speedUp(8));
      await waitScreen('review');
      await answerAll(['review'], { shot: 'review', shotAt: 2 });
      await waitScreen('result'); await sleep(900); await shot('result-review');
      expect(await page.evaluate((ids) => ids.every((id) => {
        const w = Core.SRS.peek('pt', id);
        return w.box === 3 && w.sticker && w.due === Core.today() + 7;
      }), stickerTargets), 'first-try review answers must promote the due box-2 targets to box 3, award stickers and schedule +7 days');
      expect(await page.evaluate(() => Core.save.house.reviewDay === Core.today()), 'the review chest should hand out its (silent) house gift once a day');
      await waitScreenAfterCelebrations('map');
    }

    /* ---- sticker book ---- */
    log('stickers');
    await tapSel('.b-album');
    await waitScreen('stickers'); await sleep(800);
    const got = await page.evaluate(() => document.querySelectorAll('.slot.got').length);
    expect(got > 0, 'sticker book should contain stickers after the review round (got ' + got + ')');
    await shot('stickers'); await checkTargets('stickers'); await checkOverlap('stickers'); await checkInside('stickers');
    if (got) await tapSel('.slot.got');
    await tapSel('.b-nav.next'); await sleep(900); await shot('stickers-page2'); await checkOverlap('stickers2');
    await tapSel('.b-back'); await waitScreen('map');

    /* ---- wardrobe ---- */
    log('wardrobe');
    await tapSel('.b-ward'); await waitScreen('wardrobe'); await sleep(700);
    const unl = await page.evaluate(() => __test.save().hats.unlocked.slice());
    log('  unlocked hats: ' + unl.join(','));
    expect(unl.indexOf('cap') >= 0, 'cap should be unlocked after >= 10 stars (stars ' + (await page.evaluate(() => __test.save().stars)) + ')');
    await shot('wardrobe'); await checkTargets('wardrobe'); await checkOverlap('wardrobe'); await checkInside('wardrobe');
    await tapSel('.hatbtn.locked'); await sleep(200);
    const capWornBefore = await page.evaluate(() => document.querySelector('.ward-lisa').classList.contains('w-cap'));
    await tapSel('.hatbtn[data-hat="cap"]'); await sleep(300);
    const capWornAfter = await page.evaluate(() => document.querySelector('.ward-lisa').classList.contains('w-cap'));
    expect(capWornBefore !== capWornAfter, 'tapping the cap should toggle it on Lisa');
    if (!(await page.evaluate(() => document.querySelector('.ward-lisa').classList.contains('w-cap')))) await tapSel('.hatbtn[data-hat="cap"]');
    await sleep(1800);
    await shot('wardrobe-cap');
    await tapSel('.b-back'); await waitScreen('map');

    /* ---- garden ---- */
    log('garden');
    await tapSel('.b-garden'); await waitScreen('garden'); await sleep(900);
    const gc = await page.evaluate(() => document.querySelectorAll('.gcard').length);
    expect(gc > 0, 'picture garden shows introduced words');
    await shot('garden'); await checkTargets('garden'); await checkOverlap('garden'); await checkInside('garden');
    if (gc) { await tapSel('.gcard'); await sleep(300); }
    await tapSel('.b-back'); await waitScreen('map');

    /* ---- free run list ---- */
    log('free run list');
    await tapSel('.b-run'); await waitScreen('freerun'); await sleep(600);
    await shot('freerun'); await checkTargets('freerun');
    await tapSel('.b-back'); await waitScreen('map');

    /* ---- parent gate ---- */
    log('parent gate');
    await tapSel('.b-home'); await waitScreen('home'); await sleep(800);
    const gear = await page.evaluate(() => { const b = document.querySelector('.home-gear').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await page.mouse.move(gear.x, gear.y); await page.mouse.down(); await sleep(120); await page.mouse.up(); await sleep(500);
    expect(await screen() === 'home', 'a short press must not open the parent area');
    await page.mouse.move(gear.x, gear.y); await page.mouse.down(); await sleep(150);
    await shot('gate-hold');
    await sleep(1200); await page.mouse.up();
    await waitScreen('parent'); await sleep(600);
    await shot('parent-top'); await checkInside('parent');
    /* toggle German on, 15 min, scroll */
    const toggles = await page.evaluate(() => document.querySelectorAll('.ptoggle').length);
    expect(toggles >= 4, 'parent area shows toggles');
    await page.evaluate(() => document.querySelector('[data-setting="subtitles"] .ptoggle').click());
    await page.evaluate(() => Core.flushNow());
    expect(await page.evaluate(() => __test.save().settings.subtitles === false), 'parent Subtitles toggle saves off before reload');
    await page.reload(); await page.waitForFunction(() => window.__test && __test.screen() === 'home'); await page.evaluate(() => __test.speedUp(8));
    await page.evaluate(() => __test.go('parent')); await waitScreen('parent');
    expect(await page.evaluate(() => __test.save().settings.subtitles === false && !document.querySelector('[data-setting="subtitles"] .ptoggle').classList.contains('on')), 'Subtitles OFF survives reload and Parent reopen');
    await page.evaluate(() => __test.go('meet', { lang: 'pt', world: 'animals', level: 1, part: 0 })); await waitScreen('meet');
    const meetCardOff = await page.evaluate(() => { const b = document.querySelector('.meetgrid .card').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await page.touchscreen.tap(meetCardOff.x, meetCardOff.y);
    await page.waitForFunction(() => { const e = document.querySelector('.meet-label'); return e && e.classList.contains('revealed'); }, null, { timeout: 5000 });
    expect(await page.evaluate(() => { const es = [...document.querySelectorAll('.meet-label')]; return es.length > 0 && es[0].classList.contains('revealed') && es.every((e) => getComputedStyle(e).visibility === 'hidden'); }), 'Subtitles OFF keeps a revealed free-play Meet label hidden');
    await page.evaluate(() => __test.go('memory', { lang: 'pt', world: 'animals', level: 3 })); await waitScreen('memory');
    const memIds = await page.evaluate(() => [...document.querySelectorAll('.mcard')].map((e) => e.dataset.id));
    const pairId = memIds[0], pairIdx = memIds.map((id, i) => id === pairId ? i : -1).filter((i) => i >= 0);
    for (const i of pairIdx) { const r = await page.evaluate((n) => { const b = document.querySelectorAll('.mcard')[n].getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, i); await page.touchscreen.tap(r.x, r.y); await sleep(120); }
    await page.waitForFunction((id) => document.querySelectorAll('.mcard.matched[data-id="' + id + '"]').length === 2, pairId, { timeout: 5000 });
    expect(await page.evaluate(() => { const es = [...document.querySelectorAll('.memory-label')]; return es.length > 0 && document.querySelectorAll('.mcard.matched').length > 0 && es.every((e) => getComputedStyle(e).visibility === 'hidden'); }), 'Subtitles OFF keeps labels hidden on a completed memory match');
    await page.evaluate(() => __test.go('parent')); await waitScreen('parent');
    await page.evaluate(() => document.querySelector('[data-setting="subtitles"] .ptoggle').click());
    await page.evaluate(() => Core.flushNow());
    await page.reload(); await page.waitForFunction(() => window.__test && __test.screen() === 'home'); await page.evaluate(() => __test.speedUp(8));
    await page.evaluate(() => __test.go('parent')); await waitScreen('parent');
    expect(await page.evaluate(() => __test.save().settings.subtitles === true && document.querySelector('[data-setting="subtitles"] .ptoggle').classList.contains('on')), 'Subtitles ON survives reload and Parent reopen');
    await page.evaluate(() => __test.go('meet', { lang: 'pt', world: 'animals', level: 1, part: 0 })); await waitScreen('meet');
    const meetCardOn = await page.evaluate(() => { const b = document.querySelector('.meetgrid .card').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await page.touchscreen.tap(meetCardOn.x, meetCardOn.y);
    await page.waitForFunction(() => { const e = document.querySelector('.meet-label'); return e && e.classList.contains('revealed'); }, null, { timeout: 5000 });
    expect(await page.evaluate(() => { const e = document.querySelector('.meet-label'); return document.querySelectorAll('.meet-label').length > 0 && e.classList.contains('revealed') && getComputedStyle(e).visibility === 'visible'; }), 'Subtitles ON shows a revealed free-play Meet label');
    await page.evaluate(() => __test.go('parent')); await waitScreen('parent');
    await page.evaluate(() => { const t = [...document.querySelectorAll('.ptoggle')][2]; t.click(); });
    await page.evaluate(() => { [...document.querySelectorAll('.pseg-b')].find((b) => b.dataset.v === '15').click(); });
    expect(await page.evaluate(() => __test.save().settings.enabled.de === true && __test.save().settings.sessionMin === 15), 'parent settings persist (de on, 15 min)');
    expect(await page.evaluate(() => !!document.querySelector('[data-setting="dailyGoal"] .pseg-b.sel')), 'parent area has a daily goal control');
    await page.evaluate(() => { document.querySelector('.pscroll').scrollTop = 900; }); await sleep(300);
    await shot('parent-mid');
    await page.evaluate(() => { document.querySelector('.pcard .pmore').click(); }); await sleep(300);
    await page.evaluate(() => { document.querySelector('.pscroll').scrollTop = 700; }); await sleep(300);
    await shot('parent-words');
    await page.evaluate(() => { document.querySelector('.pscroll').scrollTop = 99999; }); await sleep(300);
    await shot('parent-bottom');
    /* hold-reset on German (empty, harmless) */
    const hb = await page.evaluate(() => { const b = document.querySelector('.phold[data-reset="de"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (hb) { await page.mouse.move(hb.x, hb.y); await page.mouse.down(); await sleep(900); await page.mouse.up(); await sleep(400); }
    expect(await screen() === 'parent', 'reset keeps the parent area open');
    await page.evaluate(() => { document.querySelector('.pscroll').scrollTop = 0; });
    await tapSel('.pclose'); await waitScreen('home'); await sleep(700);
    expect(await page.evaluate(() => document.querySelectorAll('.path-langs .b-flag').length) === 3, 'three flags after enabling German');
    await shot('home-3flags'); await checkOverlap('home3'); await checkInside('home3'); await checkTargets('home3');

    /* ---- language switch to en ---- */
    log('language switch');
    await tapSel('.path-langs .b-flag[data-lang="en"]'); await waitScreen('home'); await page.evaluate(() => __test.go('map')); await waitScreen('map'); await sleep(800);
    expect(await page.evaluate(() => __test.lang()) === 'en', 'language is en');
    expect(await page.evaluate(() => document.querySelector('.curflag img').getAttribute('src').indexOf('flag_en') >= 0), 'map shows the English flag');
    expect(await page.evaluate(() => document.querySelectorAll('.node:not(.locked)').length) === 1, 'English progress starts at world 1');
    await shot('map-en');
    await tapSel('.node[data-world="animals"]'); await waitScreen('path'); await sleep(500);
    await tapSel('.lvnode.lv0'); await waitScreen('meet'); await sleep(700);
    await shot('meet-en');
    const w0 = await page.evaluate(() => { const c = document.querySelector('.meetgrid .card'); return c.dataset.id; });
    expect(!!w0, 'English meet screen loaded');
    await tapSel('.b-back'); await waitScreen('path');

    /* ---- rest scene via session timer ---- */
    log('rest');
    await page.evaluate(() => { __test.restDue(); UI.afterLevel({ world: 'animals' }); });
    await waitScreen('rest'); await sleep(2400);
    await shot('rest'); await checkTargets('rest'); await checkInside('rest');
    await tapSel('.b-home'); await waitScreen('home');

    /* ---- other viewports ---- */
    for (const vp of [{ w: 1920, h: 1080 }, { w: 1280, h: 800 }]) {
      log('viewport ' + vp.w + 'x' + vp.h);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await sleep(500);
      const tag = vp.w + 'x' + vp.h;
      if (vp.w === 1920) { await celebrationShots(tag); await page.evaluate(() => __test.speedUp(8)); }
      await page.evaluate(() => __test.go('home')); await sleep(900); await shot('vp-' + tag + '-home');
      await checkTargets('home@' + tag); await checkInside('home@' + tag);
      await page.evaluate(() => __test.go('map')); await sleep(900); await shot('vp-' + tag + '-map'); await checkTargets('map@' + tag); await checkInside('map@' + tag);
      await page.evaluate(() => __test.go('path', { world: 'animals' })); await sleep(700); await shot('vp-' + tag + '-path');
      await page.evaluate(() => __test.go('stickers', { lang: 'pt', page: 0, from: 'map' })); await sleep(900); await shot('vp-' + tag + '-stickers'); await checkInside('stickers@' + tag);
      await page.evaluate(() => __test.go('memory', { lang: 'pt', world: 'animals', level: 3 })); await sleep(1000); await shot('vp-' + tag + '-memory'); await checkInside('memory@' + tag);
      await page.evaluate(() => __test.go('run', { lang: 'pt', world: 'animals', level: 4 })); await sleep(900);
      await page.touchscreen.tap(vp.w / 2, vp.h / 3); await sleep(1500); await shot('vp-' + tag + '-run');
      await page.evaluate(() => __test.go('tap', { lang: 'pt', world: 'animals', level: 1 }));
      await waitFor(() => __test.correctId() && document.querySelectorAll('.choices .card').length >= 2, null, 15000, 'vp tap question'); await sleep(1500);
      await shot('vp-' + tag + '-help-tap'); await checkOverlap('help-tap@' + tag); await checkTargets('help-tap@' + tag); await checkInside('help-tap@' + tag);
      await page.evaluate(() => __test.go('run', { lang: 'pt', world: 'animals', level: 4 })); await sleep(700);
      await page.touchscreen.tap(vp.w / 2, vp.h / 3);
      await page.waitForFunction(() => __runState.state === 'run' && __runState.lisa.onGround, null, { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => __runState.skipToGate());
      await waitFor(() => __runState.state === 'gate' && !!document.querySelector('.gatechoices .card') && __test.correctId(), null, 15000, 'vp gate');
      await sleep(900);
      await shot('vp-' + tag + '-help-gate'); await checkOverlap('help-gate@' + tag); await checkTargets('help-gate@' + tag); await checkInside('help-gate@' + tag); await checkRunBar('help-gate@' + tag);
      await page.evaluate(() => __test.go('parent')); await sleep(600); await shot('vp-' + tag + '-parent');
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth, document.documentElement.scrollHeight, innerHeight]);
      expect(sw[0] <= sw[1] && sw[2] <= sw[3], 'page must not scroll at ' + tag + ' ' + sw.join(','));
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await celebrationShots('1366x768'); await page.evaluate(() => __test.speedUp(8));
  } catch (e) {
    if (e.message !== 'stop') { fail('exception: ' + e.message); }
    try { await shot('FAILURE'); } catch (x) {}
  }

  errors.forEach((e) => fail(e));
  await browser.close();
  const uniqTiny = [...new Set(tiny)];
  uniqTiny.forEach((t) => fail('target below 110px: ' + t));
  console.log('\nscreenshots: ' + fs.readdirSync(SHOTS).filter((f) => /\.png$/.test(f)).length);
  if (warnings.length) console.log('warnings (missing assets, not failures): ' + warnings.length + ' e.g. ' + warnings.slice(0, 4).join(', '));
  if (problems.length) { console.log('\nSMOKE FAILED (' + problems.length + ')'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
  console.log('\nSMOKE PASSED');
})();

async function answerGate(gi) {
  const st = await page.evaluate(() => ({ id: __test.correctId(), ch: __test.choiceIds() }));
  if (gi === 2 && st.ch.length > 1) {
    const wrong = st.ch.find((x) => x !== st.id);
    await tapSel('.gatechoices .card[data-id="' + wrong + '"]'); await sleep(300);
    const cls = await page.evaluate((id) => document.querySelector('.gatechoices .card[data-id="' + id + '"]').className, wrong);
    expect(/wrong/.test(cls), 'wrong gate answer wobbles');
    expect(await page.evaluate(() => __runState.state === 'gate'), 'wrong gate answer keeps the gate closed');
    await sleep(900);
  }
  await tapSel('.gatechoices .card[data-id="' + st.id + '"]:not(.gone)');
}

async function tapCorrectNow() {
  const id = await page.evaluate(() => { const w = document.querySelector('.choices:not([data-seen])'); if (w) w.dataset.seen = '1'; return __test.correctId(); });
  await tapSel('.choices .card[data-id="' + id + '"]:not(.gone)');
  return id;
}
async function nextQuestion(prev, what) {
  return waitFor((p) => __test.correctId() && __test.correctId() !== p && document.querySelectorAll('.choices:not([data-seen]) .card').length >= 2, prev, 15000, what);
}
async function overlapPair(label, a, b) {
  const r = await page.evaluate(({ a, b }) => {
    const A = document.querySelector(a), out = [];
    if (!A) return ['missing ' + a];
    const ra = A.getBoundingClientRect();
    document.querySelectorAll(b).forEach((e) => { const rb = e.getBoundingClientRect(); if (rb.width && Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 4 && Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 4) out.push(a + ' x ' + (e.className || e.tagName)); });
    return out;
  }, { a, b });
  r.forEach((t) => fail(label + ' overlap: ' + t));
}

/* reward layer: XP, combo, progress bar, level celebration, high five, daily goal, persistence, migration, missing audio */
async function rewards() {
  log('rewards');
  await page.evaluate(() => { window.__sfx = []; const S = Core.Snd, o = S.sfx; S.sfx = function (n) { window.__sfx.push(n); return o.apply(this, arguments); }; });
  phase = 'rw: map: crown on the finishe';
  /* map: crown on the finished world, daily goal ring */
  expect(await page.evaluate(() => document.querySelectorAll('.node.done .crown').length) >= 1, 'finished world shows a crown on the map');
  expect(await page.evaluate(() => document.querySelectorAll('.goalring.solo').length) === 1, 'map shows the daily goal ring');
  expect(await page.evaluate(() => __test.crown('pt', 'animals')) >= 1, 'crown stored for the finished world');
  await overlapPair('map-ring', '.goalring.solo', '.starbadge,.curflag,.b-home,.b-speaker,.map-speaker');
  phase = 'rw: home: goal pill with 7 su';
  /* home: goal pill with 7 suns, no overlap */
  await page.evaluate(() => __test.go('home')); await sleep(900);
  expect(await page.evaluate(() => document.querySelectorAll('.goalpill .sun').length) === 7, 'home shows 7 suns for the week');
  expect(await page.evaluate(() => document.querySelectorAll('.goalpill .sun.on').length) >= 1, 'a sun is lit for the day the goal was met');
  await overlapPair('home-pill', '.goalpill', '.starbadge,.home-speaker,.path-langs .b-flag,.path-play,.homebtns .btn');
  await shot('home-goal-pill');
  phase = 'rw: poke Lisa: giggle/jump ev';
  /* poke Lisa: giggle/jump every time, her voice at most once per cooldown */
  const pk0 = await page.evaluate(() => __test.fx());
  await page.evaluate(() => { window.__posed = false; const e = document.querySelector('.home-lisa'); new MutationObserver(() => { if (/p-(giggle|jump)/.test(e.className)) window.__posed = true; }).observe(e, { attributes: true, attributeFilter: ['class'] }); });
  await tapSel('.home-lisa'); await sleep(60);
  expect(await page.evaluate(() => window.__posed), 'tapping Lisa makes her giggle or jump');
  const pk1 = await page.evaluate(() => __test.fx());
  await tapSel('.home-lisa'); await sleep(60);
  const pk2 = await page.evaluate(() => __test.fx());
  expect(pk1.pokes === pk0.pokes + 1 && pk2.pokes === pk0.pokes + 2, 'Lisa reacts to every tap (pokes ' + pk0.pokes + ' -> ' + pk2.pokes + ')');
  expect(pk2.lastPoke === pk1.lastPoke, 'poke voice has a cooldown (second quick tap does not re-trigger it)');

  phase = 'rw: correct answers: particle';
  /* ---- correct answers: particles, XP, combo ---- */
  await page.evaluate(() => __test.go('tap', { lang: 'pt', world: 'animals', level: 1 }));
  await waitFor(() => __test.correctId() && document.querySelectorAll('.choices .card').length >= 2, null, 15000, 'reward question 1');
  await sleep(700);
  expect(await page.evaluate(() => !!document.querySelector('.hud .pbar') && !!document.querySelector('.hud .combo') && !!document.querySelector('.hud .xpc')), 'level top bar shows progress bar, combo and XP counter');
  const a0 = await page.evaluate(() => ({ fx: __test.fx(), xp: __test.xp() }));
  expect(a0.fx.combo === 0, 'combo starts at 0 in a new level');
  let q = await tapCorrectNow();
  await sleep(90);
  const a1 = await page.evaluate(() => ({ fx: __test.fx(), xp: __test.xp(), hud: __test.hud(), right: !!document.querySelector('.card.right') }));
  expect(a1.fx.spawned - a0.fx.spawned >= 10, 'a correct answer creates particles (' + (a1.fx.spawned - a0.fx.spawned) + ')');
  expect(a1.fx.live <= 80, 'particle cap 80 respected (' + a1.fx.live + ')');
  expect(a1.xp.total === a0.xp.total + 5, 'a first-try answer gives 5 XP (' + a0.xp.total + ' -> ' + a1.xp.total + ')');
  expect(a1.fx.combo === 1 && a1.hud && a1.hud.combo === '1', 'combo is 1 after the first correct answer');
  expect(a1.hud && a1.hud.fill === '1', 'progress bar filled one step');
  expect(a1.right, 'the tapped card pops (.card.right)');
  expect(a1.fx.chips === a0.fx.chips + 1, 'a +XP chip flies up');
  await sleep(250);
  expect(await page.evaluate(() => document.querySelector('.hud .xpc b').textContent === '5'), 'XP chip arrives in the top-bar XP counter');
  await shot('fx-fast-correct');
  await nextQuestion(q, 'reward question 2');
  q = await tapCorrectNow(); await sleep(90);
  expect((await page.evaluate(() => __test.fx())).combo === 2, 'combo is 2 after two in a row');
  expect(await page.evaluate(() => !!document.querySelector('.hud .combo.on')), 'combo flame lights up from 2');
  await nextQuestion(q, 'reward question 3');
  const c3a = await page.evaluate(() => __test.fx().celebrations);
  q = await tapCorrectNow(); await sleep(60);
  await waitFor(() => __test.fx().log.indexOf('combo3') >= 0, null, 3000, 'combo 3 celebration');
  const c3 = await page.evaluate(() => __test.fx());
  expect(c3.combo === 3 && c3.celebrations > c3a && c3.live <= 80, 'three in a row triggers the combo celebration (combo ' + c3.combo + ', live ' + c3.live + ')');
  await nextQuestion(q, 'reward question 4');
  phase = 'rw: a miss: combo resets quie';
  /* a miss: combo resets quietly, only the usual soft boop */
  const wrongs = await page.evaluate(() => { const id = __test.correctId(); return __test.choiceIds().filter((x) => x !== id); });
  const sfxMark = await page.evaluate(() => window.__sfx.length);
  const o0 = (await page.evaluate(() => __test.fx())).oops;
  await tapSel('.choices:not([data-seen]) .card[data-id="' + wrongs[0] + '"]'); await sleep(200);
  const m1 = await page.evaluate(() => ({ fx: __test.fx(), hud: __test.hud(), sfx: window.__sfx.slice() }));
  expect(m1.fx.combo === 0 && m1.hud.combo === '0', 'a miss resets the combo');
  expect(m1.sfx.slice(sfxMark).every((n) => n === 'boop'), 'a miss makes no new negative sound (only the usual soft boop): ' + m1.sfx.slice(sfxMark).join(','));
  expect(m1.fx.oops !== o0, 'oops line alternates (1st miss)');
  expect(m1.fx.best >= 3, 'best combo remembered');
  await sleep(500);
  q = await tapCorrectNow(); await sleep(90);
  expect((await page.evaluate(() => __test.fx())).combo === 1, 'combo restarts at 1 after a miss');
  await nextQuestion(q, 'reward question 5');
  const wrongs2 = await page.evaluate(() => { const id = __test.correctId(); return __test.choiceIds().filter((x) => x !== id); });
  await tapSel('.choices:not([data-seen]) .card[data-id="' + wrongs2[0] + '"]'); await sleep(200);
  const m2 = await page.evaluate(() => __test.fx());
  expect(m2.oops === o0, 'oops line only on every other miss (toggle back after the 2nd miss)');
  await sleep(500);
  phase = 'rw: finish the level; result';
  /* finish the level; result screen: stars, XP tally, high five */
  await tapCorrectNow();
  await answerAll(['tap']);
  await page.evaluate(() => __test.speedUp(3));
  await waitScreen('result');
  const rp = await page.evaluate(() => __test.params());
  expect(rp.xp > 10, 'result carries the XP of the level (' + rp.xp + ')');
  await waitFor((n) => document.querySelectorAll('.rstar.lit').length === n, rp.stars, 12000, 'result stars lit one by one');
  await waitFor(() => !!document.querySelector('.xptally.full'), null, 12000, 'XP tally counted up');
  expect(await page.evaluate(() => document.querySelector('.xptally').dataset.xp) === String(rp.xp), 'XP tally shows the level XP');
  await waitFor(() => !!document.querySelector('.btn.hifive:not(.gone)'), null, 20000, 'high five hand appears');
  const f0 = (await page.evaluate(() => __test.fx())).fives;
  await tapSel('.btn.hifive'); await sleep(150);
  const rf = await page.evaluate(() => __test.fx());
  expect(rf.fives === f0 + 1, 'tapping the high five claps');
  expect(rf.log.indexOf('levelcomplete') >= 0 && rf.log.indexOf('confetti') >= 0 && rf.log.indexOf('highfive') >= 0, 'level celebration logged (levelcomplete, confetti, highfive)');
  await waitFor(() => __test.screen() !== 'result', null, 20000, 'result continues after the high five');
  await page.evaluate(() => __test.speedUp(8));

  phase = 'rw: parent daily goal + persi';
  /* ---- parent daily goal + persistence + migration ---- */
  await page.evaluate(() => __test.go('parent')); await sleep(500);
  await page.evaluate(() => { document.querySelector('[data-setting="dailyGoal"] .pseg-b[data-v="45"]').click(); });
  expect(await page.evaluate(() => __test.save().settings.dailyGoal) === 45, 'parent can set the daily goal');
  const before = await page.evaluate(() => ({ xp: __test.xp(), crown: __test.crown('pt', 'animals'), stars: __test.save().stars }));
  expect(before.xp.day >= 30 && before.xp.met, 'the day collected enough XP for the default goal');
  await page.evaluate(() => Core.flushNow());
  await page.reload();
  await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  await page.evaluate(() => __test.speedUp(8));
  const after = await page.evaluate(() => ({ xp: __test.xp(), crown: __test.crown('pt', 'animals'), goal: __test.save().settings.dailyGoal, stars: __test.save().stars }));
  expect(after.xp.total === before.xp.total && after.xp.day === before.xp.day && after.goal === 45 && after.crown === before.crown && after.stars === before.stars, 'XP, daily goal, crowns persist across reload: ' + JSON.stringify(before.xp) + ' -> ' + JSON.stringify(after.xp));
  expect(after.xp.days.length >= 1 && after.xp.met === (after.xp.day >= 45), 'goal days kept; goal met flag consistent with the new target');
  phase = 'rw: an old save (no XP fields';
  /* an old save (no XP fields) loads safely */
  await page.evaluate(() => { Core.persist = Core.flushNow = function () {}; const k = 'lisa-island-v1', s = JSON.parse(localStorage.getItem(k)); delete s.xp; delete s.daily; delete s.goalDays; delete s.crowns; delete s.settings.dailyGoal; delete s.settings.subtitles; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload();
  await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  await page.evaluate(() => __test.speedUp(8));
  const mig = await page.evaluate(() => ({ xp: __test.xp(), crown: __test.crown('pt', 'animals'), stars: __test.save().stars }));
  expect(mig.xp.total === 0 && mig.xp.goal === 30 && mig.xp.day === 0 && mig.stars === before.stars, 'old save without XP fields migrates (goal 30, xp 0, stars kept): ' + JSON.stringify(mig));
  expect(mig.crown >= 1, 'crown is derived from finished levels for old saves');
  expect(await page.evaluate(() => __test.save().settings.subtitles === true), 'old save without subtitles setting migrates to on');
  await page.evaluate(() => { Core.save.settings.subtitles = 'invalid'; Core.flushNow(); });
  await page.reload(); await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  expect(await page.evaluate(() => __test.save().settings.subtitles === true), 'invalid saved subtitle value migrates to on');
  await page.evaluate(() => { Core.save.settings.subtitles = false; Core.flushNow(); });
  await page.reload(); await page.waitForFunction(() => window.__test && __test.screen() === 'home');
  expect(await page.evaluate(() => __test.save().settings.subtitles === false), 'explicitly saved subtitle OFF survives reload');
  await page.evaluate(() => { Core.save.settings.subtitles = true; Core.flushNow(); }); /* restore default so later Parent toggle tests start from ON */
  await page.evaluate(() => { window.__says = 0; const S = Core.Snd, o = S.say; S.say = function () { window.__says++; return o.apply(this, arguments); }; });
  await shot('home-after-reload');
  await page.evaluate(() => { Core.lang = 'pt'; __test.go('map'); }); await waitScreen('map'); await sleep(500);

  phase = 'rw: missing Lisa audio never';
  /* ---- missing Lisa audio never stalls the flow (real time) ---- */
  await page.evaluate(() => { __test.realTime(); window.__bad0 = Core.lisaBad; Core.lisaBad = function () { return false; }; });
  expect(!!(await page.evaluate(() => Core.lisaLine('yes') && Core.lisaLine('combo3') && Core.lisaLine('oops'))), 'test setup: Lisa lines resolve to (possibly missing) files');
  const chain = await page.evaluate(async () => { const t0 = performance.now(); const r = await Core.Snd.say(['audio/ui/nope_missing1.ogg', 100, 'audio/ui/nope_missing2.ogg']); return { ms: performance.now() - t0, r }; });
  expect(chain.ms < 4000 && chain.r === false, 'a chain of missing files finishes quickly and reports false (' + Math.round(chain.ms) + ' ms)');
  await page.evaluate(() => __test.go('tap', { lang: 'pt', world: 'animals', level: 1 }));
  await waitFor(() => __test.correctId() && document.querySelectorAll('.choices .card').length >= 2, null, 20000, 'missing-audio question 1');
  await sleep(1200);
  const wr = await page.evaluate(() => { const id = __test.correctId(); return __test.choiceIds().filter((x) => x !== id)[0]; });
  await tapSel('.choices:not([data-seen]) .card[data-id="' + wr + '"]'); await sleep(1100);
  const t0 = Date.now();
  q = await tapCorrectNow();
  await nextQuestion(q, 'next question after an answer whose Lisa audio is missing');
  const dt = Date.now() - t0;
  expect(dt < 9000, 'missing Lisa audio does not stall the question flow (' + dt + ' ms)');
  log('  missing-audio answer -> next question: ' + dt + ' ms');
  await page.evaluate(() => { Core.lisaBad = window.__bad0; __test.speedUp(8); });
  await page.evaluate(() => __test.go('map')); await waitScreen('map'); await sleep(300);
}

/* mid-animation screenshots in real time: correct-answer burst, combo celebration, level complete, daily goal trophy, high five */
async function celebrationShots(tag) {
  log('celebration shots ' + tag);
  await page.evaluate(() => { __test.realTime(); Core.pending.goal = false; });
  await page.evaluate(() => __test.go('tap', { lang: 'pt', world: 'animals', level: 1 }));
  await waitFor(() => __test.correctId() && document.querySelectorAll('.choices .card').length >= 2, null, 20000, 'celebration question');
  await sleep(1400);
  await shot('fx-' + tag + '-question');
  /* combo badge must stay clearly visible ~1.2 s and the dim must stay light (in-page sampling, no screenshot timing) */
  const fxs = await page.evaluate(() => new Promise((res) => {
    FX.fireworks(5); const t0 = performance.now(), out = [];
    const iv = setInterval(() => {
      const b = document.querySelector('.combobadge'), d = document.querySelector('.fxdim');
      out.push({ t: Math.round(performance.now() - t0), badge: b ? +getComputedStyle(b).opacity : 0, dim: d ? +getComputedStyle(d).opacity : 0 });
      if (performance.now() - t0 > 1600) { clearInterval(iv); res(out); }
    }, 100);
  }));
  log('  fireworks samples (ms,badge,dim): ' + fxs.map((x) => x.t + ',' + x.badge.toFixed(2) + ',' + x.dim.toFixed(2)).join(' | '));
  const near = (ms) => fxs.reduce((a, x) => Math.abs(x.t - ms) < Math.abs(a.t - ms) ? x : a);
  expect(near(300).badge >= 0.9, 'combo badge opacity at ~300 ms is ' + near(300).badge);
  expect(near(900).badge >= 0.9, 'combo badge opacity at ~900 ms is ' + near(900).badge);
  expect(fxs.every((x) => x.dim <= 0.55), 'fxdim opacity above 0.55 (pink veil)');
  await sleep(700);
  for (let k = 0; k < 3; k++) {
    const q = await tapCorrectNow();
    if (k === 0) { await sleep(300); await shot('fx-' + tag + '-correct-burst'); }
    if (k === 2) { await sleep(480); await shot('fx-' + tag + '-combo3'); await sleep(450); await shot('fx-' + tag + '-combo3-b'); }
    if (k < 2) await nextQuestion(q, 'celebration question ' + (k + 2));
  }
  await page.evaluate(() => { Core.pending.goal = true; __test.go('result', { lang: 'pt', world: 'animals', level: 1, stars: 3, gain: 3, mistakes: 0, xp: 45, crownNew: 1 }); });
  await waitFor(() => document.querySelectorAll('.rstar.lit').length >= 2, null, 12000, 'celebration stars');
  await sleep(250); await shot('fx-' + tag + '-result-stars');
  await waitFor(() => !!document.querySelector('.xptally.full'), null, 12000, 'celebration xp tally');
  await sleep(150); await shot('fx-' + tag + '-result-xp');
  await waitFor(() => !!document.querySelector('#overlay .popgoal .bigtrophy'), null, 25000, 'goal trophy');
  await sleep(1000); await shot('fx-' + tag + '-goal-trophy');
  await waitFor(() => !!document.querySelector('#overlay .popcrown .bigcrown'), null, 12000, 'crown pop');
  await sleep(800); await shot('fx-' + tag + '-crown-pop');
  await waitFor(() => !!document.querySelector('.btn.hifive:not(.gone)'), null, 25000, 'high five hand');
  await sleep(450); await shot('fx-' + tag + '-highfive');
  await checkTargets('highfive@' + tag); await checkInside('highfive@' + tag);
  await tapSel('.btn.hifive'); await sleep(260); await shot('fx-' + tag + '-highfive-tapped');
  await waitFor(() => __test.screen() !== 'result', null, 20000, 'celebration ends');
}
