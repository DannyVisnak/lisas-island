/* Lisa's Island - mini-game "fish" (world colors). Six fish of different colours swim slowly in the sea (gentle loops, never faster than ~4 rem/s,
   they nearly stop when a finger is near). The voice names a colour -> tap that fish -> Lisa's rod line drops, hooks it and swings it into her bucket.
   Errorless: a wrong fish jumps and says its own colour, then swims on and the question repeats. Looks: css/mg_fish.css (every selector .mg-fish). */
(function () {
'use strict';
var D = Core.D, el = Core.el, Snd = Core.Snd, tap = Core.tap;
var ROUND = 6;
var TIP = { x: 370, y: 175 };            /* rod tip (units: 1 unit = 0.1 rem, frame 1366 x 768) */
var BUCKET = { x: 275, y: 560 };         /* where a caught fish drops in */
/* swim slots (centre of each fish's loop): 3 columns x 2 rows. The loop amplitudes keep the speed under ~4 rem/s. */
var SLOTS = [[560, 270], [860, 270], [1150, 270], [560, 480], [860, 480], [1150, 480]];
var FISH = '<svg viewBox="0 0 160 100"><path class="fi-tail" d="M30 50 L2 20 Q14 50 2 80Z"/><path class="fi-fin" d="M62 24 Q84 -4 104 20Z"/>' +
  '<path class="fi-body" d="M22 50 C40 12 96 8 128 40 Q140 50 128 60 C96 92 40 88 22 50Z"/>' +
  '<path d="M70 20 Q84 50 70 80 M88 22 Q100 50 88 78" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="6" stroke-linecap="round"/>' +
  '<ellipse cx="86" cy="68" rx="26" ry="9" fill="#fff" opacity=".28"/>' +
  '<circle cx="108" cy="42" r="10" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/><circle cx="111" cy="43" r="5" fill="#222"/><circle cx="113" cy="41" r="1.8" fill="#fff"/>' +
  '<path d="M126 55 Q132 58 136 53" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="3" stroke-linecap="round"/></svg>';

MG.register({
  id: 'fish', worlds: ['colors'], title: 'Fishing', color: '#039be5', scene: false,
  icon: '<svg viewBox="0 0 100 100"><path d="M10 50 C28 22 62 22 76 50 C62 78 28 78 10 50Z" fill="#fff"/><path d="M72 50 L94 30 L94 70Z" fill="#fff"/><circle cx="30" cy="44" r="5" fill="#000" fill-opacity=".4"/><path d="M44 36 Q52 50 44 64" stroke="#000" stroke-opacity=".16" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  start: function (root, ctx) {
    var flow = ctx.flow;
    var targets = ctx.pickTargets('colors', ROUND);
    var total = targets.length;
    ctx.chrome({ total: total });
    document.body.style.background = '#1e88c8';
    var water = el('div', 'fh-water', '<svg viewBox="0 0 1366 768" preserveAspectRatio="none"><defs><linearGradient id="fhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe3f7"/><stop offset=".45" stop-color="#3fb4ea"/><stop offset="1" stop-color="#1769b0"/></linearGradient></defs>' +
      '<rect width="1366" height="768" fill="url(#fhg)"/>' +
      '<g fill="#fff" opacity=".12"><polygon points="420,0 560,0 760,768 560,768"/><polygon points="800,0 900,0 1130,768 980,768"/><polygon points="1100,0 1170,0 1366,600 1366,768 1290,768"/></g>' +
      '<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".35"><path d="M470 150 q30 -16 60 0 t60 0 t60 0"/><path d="M980 200 q30 -16 60 0 t60 0 t60 0"/><path d="M620 640 q30 -16 60 0 t60 0"/><path d="M1180 600 q30 -16 60 0 t60 0"/></g>' +
      '<path d="M430 768 Q640 690 860 730 T1366 700 V768Z" fill="#f0d9a0"/><path d="M880 768 Q1120 700 1366 740 V768Z" fill="#e4c982"/>' +
      '<g fill="none" stroke="#2e9c5a" stroke-width="12" stroke-linecap="round"><path d="M700 740 q-20 -50 0 -90 q18 -30 0 -60"/><path d="M730 745 q22 -44 4 -80"/><path d="M1240 730 q-22 -50 0 -92 q16 -26 0 -54"/><path d="M1270 735 q20 -40 2 -76"/></g>' +
      '<g fill="#ffb74d"><circle cx="560" cy="742" r="9"/><circle cx="1010" cy="735" r="7"/></g>' +
      '<rect x="0" y="672" width="430" height="96" fill="#a1704c"/><g stroke="#6d4a2f" stroke-width="5"><path d="M0 700 H430 M0 730 H430 M0 758 H430 M140 672 V768 M290 672 V768"/></g><rect x="0" y="664" width="430" height="14" fill="#c08a5c"/></svg>');
    root.insertBefore(water, root.firstChild);
    function rem(u) { return u / 10 + 'rem'; }
    function tween(ms, fn) {
      return new Promise(function (res) {
        if (flow.dead) return res();
        var t0 = performance.now(), d = Math.max(30, ms / Core.speed);
        (function f(t) { if (flow.dead) return res(); var k = Math.min(1, (t - t0) / d); fn(k); if (k < 1) requestAnimationFrame(f); else res(); })(t0);
      });
    }
    function unitsOf(cx, cy) { var f = document.getElementById('frame').getBoundingClientRect(); return { x: (cx - f.left) / f.width * 1366, y: (cy - f.top) / f.height * 768 }; }

    /* ----- sea decor: a few rising bubbles ----- */
    for (var b = 0; b < 8; b++) { var bu = el('i', 'fh-bub'); bu.style.left = (36 + b * 12 + (b % 3) * 2) + 'rem'; bu.style.animationDelay = (-b * 1.7) + 's'; bu.style.animationDuration = (9 + (b % 4) * 2) + 's'; root.appendChild(bu); }

    /* ----- fish ----- */
    var order = Core.shuffle(SLOTS.slice()), fishes = [], byId = {};
    targets.forEach(function (id, i) {
      var hex = D.items[id].pic.hex, white = /^#f{3,6}$/i.test(hex);
      var wrap = el('div', 'fh-fish'); wrap.dataset.id = id;
      var inner = el('div', 'fh-in', FISH); inner.style.setProperty('--c', hex); if (white) inner.classList.add('fh-white');
      wrap.appendChild(inner); root.appendChild(wrap);
      var s = order[i];
      var f = { id: id, wrap: wrap, inner: inner, cx: s[0], cy: s[1], ax: 55 + Core.rnd(20), ay: 32 + Core.rnd(14), w1: .26 + Math.random() * .08, w2: .38 + Math.random() * .1,
        p1: Math.random() * 6.28, p2: Math.random() * 6.28, t: Math.random() * 20, x: s[0], y: s[1], sp: 1, held: false, caught: false, dir: 1 };
      fishes.push(f); byId[id] = f; place(f, 0);
    });
    function place(f, dt) {
      var a = f.w1 * f.t + f.p1, bb = f.w2 * f.t + f.p2;
      f.x = f.cx + f.ax * Math.sin(a); f.y = f.cy + f.ay * Math.sin(bb);
      var vx = f.ax * f.w1 * Math.cos(a), vy = f.ay * f.w2 * Math.cos(bb);
      if (Math.abs(vx) > 6) f.dir = vx >= 0 ? 1 : -1;
      f.wrap.style.transform = 'translate(' + rem(f.x - 90) + ',' + rem(f.y - 65) + ')';
      f.inner.style.scale = f.dir === 1 ? '1 1' : '-1 1';
      f.inner.style.rotate = Core.clamp(vy / Math.max(Math.abs(vx), 30) * 24, -16, 16) * f.dir + 'deg';
    }
    function restoreSwimmer(f) {
      f.held = false; f.caught = false; f.jumping = false; f.t = 0; f.x = f.cx; f.y = f.cy; f.dir = 1;
      f.wrap.style.display = '';
      f.inner.classList.remove('fh-hooked');
      f.wrap.style.transform = '';
      f.inner.style.scale = '1 1'; f.inner.style.rotate = '0deg';
      place(f, 0);
    }

    /* finger near -> fish slow down / almost stop; hover (mouse) does the same close to a fish */
    var down = false, ptr = null;
    root.addEventListener('pointerdown', function (e) { down = true; ptr = unitsOf(e.clientX, e.clientY); });
    root.addEventListener('pointermove', function (e) { ptr = unitsOf(e.clientX, e.clientY); });
    var up = function () { down = false; };
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    var last = 0, raf = 0;
    function frame(ts) {
      raf = 0; if (flow.dead) return;
      var dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
      fishes.forEach(function (f) {
        if (f.held || f.caught) return;
        var near = down || (ptr && Math.hypot(ptr.x - f.x, ptr.y - f.y) < 170);
        f.sp += ((near ? .1 : 1) - f.sp) * Math.min(1, dt * 5);
        f.t += dt * f.sp; place(f, dt);
      });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    flow.onKill(function () { if (raf) cancelAnimationFrame(raf); raf = 0; });

    /* ----- rod, line, hook (full-frame overlay) + Lisa's bucket ----- */
    var over = el('div', 'fh-over', '<svg viewBox="0 0 1366 768"><line x1="150" y1="665" x2="' + TIP.x + '" y2="' + TIP.y + '" stroke="#6d4c41" stroke-width="13" stroke-linecap="round"/>' +
      '<line x1="150" y1="665" x2="' + TIP.x + '" y2="' + TIP.y + '" stroke="#a1887f" stroke-width="5" stroke-linecap="round"/><circle cx="' + TIP.x + '" cy="' + TIP.y + '" r="9" fill="#ef5350"/>' +
      '<line class="fh-line" x1="' + TIP.x + '" y1="' + TIP.y + '" x2="' + TIP.x + '" y2="' + TIP.y + '" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0"/>' +
      '<path class="fh-hook" d="M0 0 V26 A11 11 0 0 1 -22 26" fill="none" stroke="#eceff1" stroke-width="6" stroke-linecap="round" opacity="0"/></svg>');
    root.appendChild(over);
    var line = over.querySelector('.fh-line'), hook = over.querySelector('.fh-hook');
    function hookAt(x, y, on) {
      line.setAttribute('x2', x); line.setAttribute('y2', y); hook.setAttribute('transform', 'translate(' + x + ',' + y + ')');
      var o = on === false ? 0 : 1; line.setAttribute('opacity', o); hook.setAttribute('opacity', o);
    }
    var bucket = el('div', 'fh-bucket', '<svg class="fb-back" viewBox="0 0 170 170"><path d="M20 62 Q85 -22 150 62" fill="none" stroke="#78909c" stroke-width="7" stroke-linecap="round"/><ellipse cx="85" cy="68" rx="62" ry="14" fill="#37474f"/></svg>' +
      '<div class="fb-fish"></div><svg class="fb-front" viewBox="0 0 170 170"><path d="M23 68 Q85 94 147 68 L134 160 Q85 172 36 160Z" fill="#90a4ae" stroke="#546e7a" stroke-width="4"/>' +
      '<path d="M32 88 Q85 108 138 88" fill="none" stroke="#cfd8dc" stroke-width="5" opacity=".7"/><ellipse cx="85" cy="68" rx="62" ry="14" fill="none" stroke="#cfd8dc" stroke-width="6"/></svg>');
    root.appendChild(bucket);
    var inBucket = bucket.querySelector('.fb-fish'), caughtN = 0;
    var MINI = [[2, 6], [34, 0], [64, 6], [16, 22], [48, 18], [72, 24]];
    function toBucket(f) {
      var m = el('div', 'fb-mini', FISH); m.firstChild.style.setProperty('--c', D.items[f.id].pic.hex); if (f.inner.classList.contains('fh-white')) m.classList.add('fh-white');
      var p = MINI[caughtN % MINI.length]; m.style.left = p[0] + '%'; m.style.top = p[1] + '%'; m.style.animationDelay = (-caughtN * .5) + 's';
      inBucket.appendChild(m); caughtN++;
    }
    function ring(x, y, cls) {
      var r = el('i', 'fh-ring ' + (cls || '')); r.style.left = rem(x - 60); r.style.top = rem(y - 20); root.appendChild(r);
      setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 1100);
    }
    function splash(node, colors) { var p = FX.pt(node); FX.burst(p.x, p.y, { n: 12, shapes: ['dot', 'dot', 'star'], colors: colors || ['#e1f5fe', '#81d4fa', '#ffffff'], power: .75 }); }

    /* ----- play ----- */
    var cur = null, busy = false, roundDone = null, askT = 0, stage = 'idle';
    function repeatAsk() {
      var my = ++askT;
      setTimeout(function () { if (my === askT && stage === 'ask' && cur && !busy && !flow.dead) ctx.ask(cur); }, 1000 / Core.speed);
    }
    async function onFish(f) {
      if (busy || stage !== 'ask' || f.caught || ctx.finished) return;
      if (f.id !== cur) {
        if (f.jumping) return; f.jumping = true; setTimeout(function () { f.jumping = false; }, 800 / Core.speed);
        if (f.wrap.animate) { try { f.wrap.animate([{ translate: '0 0' }, { translate: '0 -5.5rem', offset: .45 }, { translate: '0 0' }], { duration: 800 / Core.speed, easing: 'ease-in-out' }); } catch (x) { /* none */ } }
        splash(f.wrap, ['#e1f5fe', '#4fc3f7']); ring(f.x, f.y + 40);
        ctx.other(f.inner, f.id).then(repeatAsk);
        return;
      }
      busy = true; stage = 'catch'; askT++; f.held = true;
      var item = cur, say = null;
      ring(f.x, f.y + 40, 'fh-ring-big');
      /* hook drops from the rod tip to the fish */
      var mx = f.x + f.dir * 40, my = f.y - 24;
      await tween(520, function (k) { var e = 1 - Math.pow(1 - k, 2); hookAt(TIP.x + (mx - TIP.x) * e, TIP.y + (my - TIP.y) * e); });
      Snd.sfx('pop');
      f.inner.classList.add('fh-hooked');
      say = ctx.correct(f.inner, item);
      await flow.wait(180);
      /* swing: fish + hook fly in an arc over to the bucket */
      var x0 = f.x, y0 = f.y, ctlx = (x0 + BUCKET.x) / 2, cty = Math.min(y0, BUCKET.y) - 230;
      await tween(1100, function (k) {
        var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, u = 1 - e;
        var x = u * u * x0 + 2 * u * e * ctlx + e * e * BUCKET.x, y = u * u * y0 + 2 * u * e * cty + e * e * (BUCKET.y - 30);
        f.wrap.style.transform = 'translate(' + rem(x - 90) + ',' + rem(y - 65) + ')';
        f.inner.style.scale = x < x0 ? '-1 1' : '1 1'; f.inner.style.rotate = (Math.sin(e * 9) * 16 + 70 * e) + 'deg';
        hookAt(x + (x < x0 ? -1 : 1) * 38, y - 22);
      });
      /* drop into the bucket */
      await tween(380, function (k) {
        var y = BUCKET.y - 30 + 70 * k, s = 1 - .5 * k;
        f.wrap.style.transform = 'translate(' + rem(BUCKET.x - 90) + ',' + rem(y - 65) + ') scale(' + s + ')';
        hookAt(BUCKET.x + 38, y - 22);
      });
      f.caught = true; f.wrap.style.display = 'none';
      toBucket(f); Snd.sfx('good'); splash(bucket); ring(BUCKET.x, BUCKET.y + 40, 'fh-ring-big');
      bucket.classList.remove('fb-bounce'); void bucket.offsetWidth; bucket.classList.add('fb-bounce');
      /* line reels back to the rod tip */
      var hx = parseFloat(line.getAttribute('x2')), hy = parseFloat(line.getAttribute('y2'));
      await tween(420, function (k) { hookAt(hx + (TIP.x - hx) * k, hy + (TIP.y - hy) * k); });
      hookAt(TIP.x, TIP.y, false);
      await say;
      if (caughtN >= total) { await finale(); }
      restoreSwimmer(f);
      busy = false; stage = 'idle';
      if (roundDone) { var d = roundDone; roundDone = null; d(); }
    }
    async function finale() {
      bucket.classList.add('fb-full'); FX.rain(flow, 2400, 3);
      var p = FX.pt(bucket); FX.burst(p.x, p.y, { n: 24, big: true });
      Snd.sfx('fanfare');
      await flow.wait(2000);
    }
    fishes.forEach(function (f) { tap(f.wrap, function () { onFish(f); }, { nopress: true, silent: true }); });

    ctx.expose({ state: function () { return { stage: stage, caught: caughtN, ids: fishes.map(function (f) { return f.id; }), speeds: fishes.map(function (f) { return f.sp; }) }; } });

    ctx.run({
      targets: targets,
      play: function (item) {
        cur = item; stage = 'ask'; busy = false;
        ctx.setTarget(item, byId[item].inner);
        return new Promise(function (res) { roundDone = res; });
      }
    });
  }
});
})();
