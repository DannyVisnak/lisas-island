/* Lisa's Island - mini-game "body" (world body): "Touch Lisa". A big Lisa stands in the middle; the voice asks for a body part ("Onde esta o nariz?"),
   the child touches that spot on her and the part reacts (nose boops, ear twitches, eye winks, hand waves, foot stamps, mouth opens, ...).
   Errorless: a wrong spot reacts too and says its own name; every 3rd wrong spot Lisa giggles ("Hi-hi, schekotno"). 6 rounds, then a high five.
   Hit logic is "nearest part" over the whole Lisa picture (no dead spots); the parts are described in SVG units of the mascot (viewBox 240 x 270).
   Everything for this game lives in THIS file and css/mg_body.css. */
(function () {
'use strict';
var Snd = Core.Snd, el = Core.el, tap = Core.tap;

var ROUNDS = 6;
var PALM = '<svg viewBox="0 0 100 100"><g fill="#ff9b3d" stroke="#fff" stroke-width="3" stroke-linejoin="round"><rect x="14" y="34" width="14" height="34" rx="7" transform="rotate(-28 21 60)"/><rect x="28" y="10" width="14" height="48" rx="7"/><rect x="44" y="4" width="14" height="52" rx="7"/><rect x="60" y="10" width="14" height="48" rx="7"/><rect x="74" y="26" width="14" height="40" rx="7" transform="rotate(22 81 60)"/><path d="M22 52 Q20 90 52 92 Q82 90 80 52 Z"/></g><ellipse cx="52" cy="76" rx="14" ry="10" fill="#fff4e0"/></svg>';
/* part id (= item id) -> hit spots {x, y, r (svg units), side, bonus}. Score = distance - r - bonus; the lowest score wins. 1 svg unit = 0.225 rem at the placed size. */
var SPOTS = {
  hand:  [{ x: 62, y: 228, r: 20, side: 'l' }, { x: 178, y: 228, r: 20, side: 'r' }],
  foot:  [{ x: 92, y: 262, r: 15, side: 'l' }, { x: 148, y: 262, r: 15, side: 'r' }],
  leg:   [{ x: 84, y: 238, r: 14, side: 'l' }, { x: 156, y: 238, r: 14, side: 'r' }],
  eye:   [{ x: 90, y: 102, r: 16, side: 'l' }, { x: 150, y: 102, r: 16, side: 'r' }],
  ear:   [{ x: 66, y: 38, r: 18, side: 'l' }, { x: 174, y: 38, r: 18, side: 'r' }],
  nose:  [{ x: 120, y: 128, r: 12, side: 'c' }],
  mouth: [{ x: 110, y: 150, r: 22, side: 'c' }],
  tooth: [{ x: 132, y: 155, r: 14, bonus: 10, side: 'c' }],
  face:  [{ x: 120, y: 70, r: 16, side: 'c' }, { x: 58, y: 140, r: 14, side: 'l' }, { x: 182, y: 140, r: 14, side: 'r' }]
};
var VB_W = 240, VB_H = 270;
var NEUTRAL = 22;     /* a touch farther than this from every part = a tickle on the tummy (no name, no count) */

MG.register({
  id: 'body', worlds: ['body'], title: 'Touch Lisa', color: '#26a69a', scene: 'meadow',
  icon: '<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="38" fill="#fff"/><circle cx="36" cy="44" r="6" fill="#000" fill-opacity=".35"/><circle cx="64" cy="44" r="6" fill="#000" fill-opacity=".35"/><circle cx="50" cy="58" r="8" fill="#ef5350"/><path d="M34 72 Q50 84 66 72" stroke="#000" stroke-opacity=".3" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  start: function (root, ctx) {
    var flow = ctx.flow;
    ctx.chrome({ total: ROUNDS, lisa: false });
    var lisa = ctx.placeLisa({ left: 413, top: 135, width: 540, cls: 'mgb-lisa' });
    var svg = lisa.querySelector('svg');

    /* ---- tag the mascot's pieces so the CSS can animate them (mascot.js itself is untouched) ---- */
    function q(sel) { return svg.querySelector(sel); }
    function tag(n, cls) { if (n) n.classList.add(cls); return n; }
    var earL = tag(q('.ear-l'), 'mgb-earl'), earR = tag(q('.ear-r'), 'mgb-earr');
    if (earL) tag(earL.nextElementSibling, 'mgb-earl');
    if (earR) tag(earR.nextElementSibling, 'mgb-earr');
    tag(q('ellipse[cx="120"][cy="128"]'), 'mgb-nose'); tag(q('ellipse[cx="116"][cy="125"]'), 'mgb-nose');
    tag(q('ellipse[cx="70"][cy="132"]'), 'mgb-cheek'); tag(q('ellipse[cx="170"][cy="132"]'), 'mgb-cheek');
    tag(q('.body > ellipse[cx="92"][cy="258"]'), 'mgb-footl'); tag(q('.body > ellipse[cx="148"][cy="258"]'), 'mgb-footr');
    var eyes = svg.querySelectorAll('.eyes-open ellipse'), glints = svg.querySelectorAll('.eyes-open circle');
    if (eyes.length >= 2) { tag(eyes[0], 'mgb-eyel'); tag(eyes[1], 'mgb-eyer'); }
    if (glints.length >= 4) { tag(glints[0], 'mgb-eyel'); tag(glints[2], 'mgb-eyel'); tag(glints[1], 'mgb-eyer'); tag(glints[3], 'mgb-eyer'); }

    /* ---- overlay: one little tooth (always visible), hint rings, and the hit layer ---- */
    var tooth = el('div', 'mgb-tooth');
    tooth.style.left = (125 / VB_W * 100) + '%'; tooth.style.top = (145 / VB_H * 100) + '%'; tooth.style.width = (14 / VB_W * 100) + '%'; tooth.style.height = (17 / VB_H * 100) + '%';
    lisa.appendChild(tooth);
    var rings = {};      /* part -> [ring elements] */
    Object.keys(SPOTS).forEach(function (pid) {
      rings[pid] = SPOTS[pid].map(function (s) {
        var d = el('div', 'mgb-ring');
        d.style.left = ((s.x - s.r) / VB_W * 100) + '%'; d.style.top = ((s.y - s.r) / VB_H * 100) + '%';
        d.style.width = (2 * s.r / VB_W * 100) + '%'; d.style.height = (2 * s.r / VB_H * 100) + '%';
        d.dataset.part = pid; s.ring = d; lisa.appendChild(d); return d;
      });
    });
    var hit = el('div', 'mgb-hit'); lisa.appendChild(hit);

    /* ---- geometry ---- */
    function box() { return lisa.getBoundingClientRect(); }      /* the static wrapper, not the svg: the svg bobs / jumps / spins */
    function toSvg(cx, cy) { var r = box(); return { x: (cx - r.left) / r.width * VB_W, y: (cy - r.top) / r.height * VB_H }; }
    function toClient(x, y) { var r = box(); return { x: r.left + x / VB_W * r.width, y: r.top + y / VB_H * r.height }; }
    function nearest(p) {
      var best = null;
      Object.keys(SPOTS).forEach(function (pid) {
        SPOTS[pid].forEach(function (s) {
          var sc = Math.hypot(p.x - s.x, p.y - s.y) - s.r - (s.bonus || 0);
          if (!best || sc < best.score) best = { part: pid, spot: s, score: sc };
        });
      });
      return best;
    }

    /* ---- part reactions ---- */
    function react(part, spot) {
      var side = spot && spot.side !== 'c' ? spot.side : '', c = 'mgb-r-' + part + side;
      lisa.classList.remove(c); void lisa.offsetWidth; lisa.classList.add(c);
      Snd.sfx(part === 'nose' ? 'bounce' : part === 'foot' || part === 'leg' ? 'land' : part === 'ear' || part === 'eye' ? 'flip' : 'pop');
      setTimeout(function () { lisa.classList.remove(c); }, 1500);
    }
    function pulse(ring) { ring.classList.remove('mgb-pulse'); void ring.offsetWidth; ring.classList.add('mgb-pulse'); }
    function giggle() { lisa.react('giggle'); }

    /* ---- the game ---- */
    var wrongs = 0, waiter = null, solved = false, finishing = false;
    var targets = ctx.pickTargets('body', ROUNDS);
    function hintOff() { Object.keys(rings).forEach(function (k) { rings[k].forEach(function (r) { r.classList.remove('mgb-hint', 'mgb-peek'); }); }); }
    function hintOn(item, c) { hintOff(); (rings[item] || []).forEach(function (r) { r.classList.add(c); }); }
    ctx.onPeek(function (item) { hintOn(item, 'mgb-peek'); ctx.ask(item); flow.after(3500, function () { if (ctx.target === item) (rings[item] || []).forEach(function (r) { r.classList.remove('mgb-peek'); }); }); });
    ctx.onAssist(function (item) { hintOn(item, 'mgb-hint'); ctx.ask(item); });
    ctx.onHelp(function (n) { if (n === 1 && ctx.target) hintOn(ctx.target, 'mgb-peek'); });

    async function onTouch(e) {
      e.preventDefault(); e.stopPropagation();
      if (finishing) return;
      Snd.unlock();
      var n = nearest(toSvg(e.clientX, e.clientY));
      if (n.score > NEUTRAL) { giggle(); Snd.sfx('pop'); return; }       /* tummy: a tickle, nothing asked */
      react(n.part, n.spot); pulse(n.spot.ring);
      if (ctx.locked || !ctx.target) return;                              /* reaction only while the reward plays */
      var item = ctx.target;
      if (n.part === item) {
        hintOff();
        await ctx.correct(n.spot.ring, item);
        solved = true; if (waiter) { var w = waiter; waiter = null; w(); }
      } else {
        wrongs++;
        var after = ctx.other(n.spot.ring, n.part);                       /* the touched part says its own name */
        if (wrongs % 3 === 0) {
          giggle(); await after;
          if (ctx.target !== item) return;
          var u = ctx.ruUrl('tickle');
          await flow.say([u, 300, ctx.askUrl(item)].filter(function (x) { return x != null; }));
        }
      }
    }
    hit.addEventListener('pointerdown', onTouch);

    async function highFive() {
      finishing = true; ctx.setTarget(null); hintOff();
      lisa.pose('five');
      var b = el('div', 'mgb-five', PALM); root.appendChild(b);
      var done = false, resolve;
      var gate = new Promise(function (r) { resolve = r; });
      tap(b, function () {
        if (done) return; done = true; Snd.sfx('clap'); b.classList.add('hit'); giggle();
        var c = FX.pt ? FX.pt(b) : null; if (c && FX.burst) FX.burst(c.x, c.y, { n: 18, power: 1.1 });
        resolve();
      }, { nopress: true });
      flow.after(9000, function () { if (!done) { done = true; resolve(); } });
      await gate; await flow.wait(500);
    }

    ctx.expose({
      parts: function () { return Object.keys(SPOTS); },
      partPos: function (pid, i) { var l = SPOTS[pid], s = l[(i || 0) % l.length]; return toClient(s.x, s.y); },
      svgPos: function (x, y) { return toClient(x, y); },
      hitAt: function (cx, cy) { var n = nearest(toSvg(cx, cy)); return n.score > NEUTRAL ? null : n.part; },
      state: function () { return { wrongs: wrongs, finishing: finishing }; }
    });

    (async function () {
      await ctx.intro();
      for (var i = 0; i < targets.length; i++) {
        ctx.setTarget(targets[i], rings[targets[i]][0]); ctx.progress(i);
        hintOff(); solved = false;
        await ctx.quiet(7000);
        ctx.ask(targets[i]);
        if (!solved) await new Promise(function (r) { waiter = r; });
        ctx.lock(true);
      }
      await highFive();
      return ctx.finish();
    })();
  }
});
})();
