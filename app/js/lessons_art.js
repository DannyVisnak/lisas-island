/* Lisa's Island - lesson art: the stage kit (layers, WAAPI helpers, Lisa) and one scene per lesson (backdrop, actors, animations, outcome tiles).
   Only transform + opacity are animated (old Intel iGPU); at most ~20 animated nodes alive at once. Original SVG art only, plus the shared app/img pictures.
   A scene = function (S) -> { act: { name: function (S) -> promise }, tile: function (spec, size) -> element, promptBox: {x, y, size, gap} }. Units: frame px 1366 x 768. */
(function () {
'use strict';
var LessonArt = window.LessonArt = { scenes: {} };
var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
var uid = 0;

/* ---------- the stage kit ---------- */
LessonArt.stage = function (box, flow, st) {
  var S = { box: box, flow: flow, st: st, actors: {}, lisa: null, lisaW: null };
  S.el = el;
  S.u = function (v) { return (v / 10) + 'rem'; };
  S.place = function (e, x, y, w, h) { e.style.left = S.u(x); e.style.top = S.u(y); if (w != null) e.style.width = S.u(w); if (h != null) e.style.height = S.u(h); return e; };
  S.T = function (x, y, r, s) { return 'translate(' + S.u(x || 0) + ',' + S.u(y || 0) + ')' + (r ? ' rotate(' + r + 'deg)' : '') + (s != null && s !== 1 ? ' scale(' + s + ')' : ''); };
  S.layer = function (cls, html) { var d = el('div', 'ls-layer ' + (cls || ''), html); box.appendChild(d); return d; };
  S.img = function (name) { return 'img/' + name + '.svg'; };
  /* one animation; resolves when done and then keeps the end state as inline style (commitStyles) so later animations start from it */
  S.anim = function (node, frames, ms, o) {
    o = o || {};
    try {
      var a = node.animate(frames, { duration: Math.max(1, ms / Core.speed), delay: (o.delay || 0) / Core.speed, fill: 'both', easing: 'linear' });
      return a.finished.then(function () { try { a.commitStyles(); a.cancel(); } catch (e) { /* node gone */ } }, function () { /* cancelled */ });
    } catch (e) { return Promise.resolve(); }
  };
  /* an endless loop (bob, wobble, twinkle). returns the Animation so the caller can cancel it */
  S.loop = function (node, frames, ms, delay) {
    try { return node.animate(frames, { duration: ms, delay: delay || 0, iterations: Infinity, easing: 'linear' }); } catch (e) { return null; }
  };
  /* the frame is letterboxed on screens that are not 16:9: two fixed halves behind #frame carry the backdrop colours into the bands (top = sky/wall, bottom = ground) */
  S.edgeEls = null; S.edgeCol = null;
  S.edge = function (top, bottom) {
    var d = el('div', 'ls-edge'), a = el('div', 'ls-edge-t'), b = el('div', 'ls-edge-b');
    a.style.backgroundColor = top; b.style.backgroundColor = bottom; d.appendChild(a); d.appendChild(b);
    document.body.insertBefore(d, document.body.firstChild);
    S.edgeEls = { root: d, t: a, b: b }; S.edgeCol = { t: top, b: bottom };
  };
  S.edgeTo = function (top, bottom, ms, delay) {
    if (!S.edgeEls) return Promise.resolve();
    var e = S.edgeEls, c = S.edgeCol; S.edgeCol = { t: top, b: bottom };
    return Promise.all([S.anim(e.t, [{ backgroundColor: c.t }, { backgroundColor: top }], ms, { delay: delay }), S.anim(e.b, [{ backgroundColor: c.b }, { backgroundColor: bottom }], ms, { delay: delay })]);
  };
  S.dispose = function () { if (S.edgeEls && S.edgeEls.root.parentNode) S.edgeEls.root.parentNode.removeChild(S.edgeEls.root); S.edgeEls = null; };
  flow.onKill(S.dispose);
  S.wait = function (ms) { return flow.wait(ms); };
  S.fade = function (node, to, ms, delay) { return S.anim(node, [{ opacity: node.style.opacity === '' ? (to ? 0 : 1) : Number(node.style.opacity) }, { opacity: to }], ms, { delay: delay }); };
  S.pop = function (node, k) { return S.anim(node, [{ transform: S.T(0, 0, 0, 1) }, { transform: S.T(0, 0, 0, k || 1.18), offset: 0.4, easing: 'ease-out' }, { transform: S.T(0, 0, 0, 1) }], 420); };
  S.actor = function (parent, name, src, cx, cy, w, h) {
    var a = el('div', 'ls-a'), inner = el('div', 'ls-ai', '<img src="' + S.img(src) + '" alt="" draggable="false">');
    S.place(a, cx - w / 2, cy - h / 2, w, h); a.style.opacity = '0'; a.appendChild(inner); a.inner = inner;
    parent.appendChild(a); S.actors[name] = a; return a;
  };
  S.set = function (name, state) { var a = S.actors[name]; if (a) a.dataset.state = state; };
  /* Lisa in a wrapper: the wrapper travels (hops), the .lisa inside does the poses and the hop arc */
  S.lisaBox = function (x, y, w) {
    var wr = el('div', 'ls-lisaw'), l = Lisa.make({ cls: 'ls-lisa' });
    S.place(wr, x, y, w, w * 1.127); wr.appendChild(l); box.appendChild(wr);
    S.lisa = l; S.lisaW = wr; return wr;
  };
  /* a short splash: ring + droplets (created on demand, removed after) */
  S.splash = function (parent, x, y, big) {
    var g = el('div', 'ls-splash'); S.place(g, x - 60, y - 40, 120, 80); parent.appendChild(g);
    var ring = el('div', 'ls-ring'); g.appendChild(ring);
    S.anim(ring, [{ transform: 'scale(.25)', opacity: 0.95 }, { transform: 'scale(' + (big ? 1.9 : 1.4) + ')', opacity: 0 }], big ? 900 : 650);
    var n = big ? 6 : 4;
    for (var i = 0; i < n; i++) {
      var d = el('div', 'ls-drop'), dx = (i - (n - 1) / 2) * (big ? 26 : 20), up = (big ? 90 : 60) - Math.abs(i - (n - 1) / 2) * 12;
      g.appendChild(d);
      S.anim(d, [{ transform: S.T(0, 0, 0, 1), opacity: 1 }, { transform: S.T(dx * 0.6, -up, 0, 1), opacity: 1, offset: 0.45, easing: 'ease-out' }, { transform: S.T(dx, 14, 0, 0.7), opacity: 0, easing: 'ease-in' }], big ? 800 : 600);
    }
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 1200 / Core.speed + 60);
  };
  return S;
};

/* sky-blue helper svgs */
function svgOpen(vb, cls) { return '<svg class="' + (cls || '') + '" viewBox="' + vb + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'; }
function imgTag(src, x, y, w, h) { return '<image href="img/' + src + '.svg" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>'; }

/* =====================================================================================================================
   1. Sink or float: a glass tub of water, a duck, a log, a key, an apple
   ===================================================================================================================== */
LessonArt.scenes.float = function (S) {
  var WATER = 452;                                   /* y of the water surface */
  var bg = S.layer('ls-bg');
  var bunt = ''; var cols = ['#ff8a80', '#ffd180', '#fff59d', '#a5d6a7', '#80d8ff', '#ce93d8'];
  for (var i = 0; i < 14; i++) { var bx = 40 + i * 98; bunt += '<path d="M' + bx + ' 38 L' + (bx + 44) + ' 38 L' + (bx + 22) + ' 86Z" fill="' + cols[i % 6] + '"/>'; }
  bg.innerHTML = svgOpen('0 0 1366 768') +
    '<defs><pattern id="lsdots" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="4" fill="#ffdca3"/><circle cx="45" cy="45" r="4" fill="#ffdca3"/></pattern></defs>' +
    '<rect width="1366" height="660" fill="#ffeccb"/><rect width="1366" height="660" fill="url(#lsdots)"/>' +
    '<path d="M0 38 Q683 90 1366 38" stroke="#b28b6a" stroke-width="4" fill="none"/>' + bunt +
    '<rect x="1080" y="70" width="220" height="210" rx="16" fill="#c98d4d"/><rect x="1094" y="84" width="192" height="182" rx="8" fill="#bfe9ff"/>' +
    '<circle cx="1230" cy="130" r="30" fill="#fff3b0"/><path d="M1190 84 V266 M1094 175 H1286" stroke="#c98d4d" stroke-width="8"/>' +
    '<rect y="660" width="1366" height="108" fill="#dca766"/><path d="M0 700 H1366 M0 740 H1366 M300 660 V700 M900 700 V740 M520 740 V768 M1200 660 V700" stroke="#c08a4d" stroke-width="4"/>' +
    '<ellipse cx="720" cy="702" rx="380" ry="28" fill="rgba(80,50,20,.18)"/></svg>';
  var back = S.layer('ls-tubback', svgOpen('0 0 1366 768') + '<rect x="390" y="380" width="660" height="310" rx="42" fill="#f1faff"/></svg>');
  var acts = S.layer('ls-actors');
  var wat = S.layer('ls-water', svgOpen('0 0 1366 768') +
    '<defs><linearGradient id="lswg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc4f2" stop-opacity=".55"/><stop offset="1" stop-color="#2c8fd6" stop-opacity=".78"/></linearGradient>' +
    '<clipPath id="lswc"><rect x="398" y="388" width="644" height="294" rx="36"/></clipPath></defs>' +
    '<g clip-path="url(#lswc)"><rect x="390" y="' + WATER + '" width="660" height="240" fill="url(#lswg)"/>' +
    '<g class="ls-wavea"><path d="M360 ' + WATER + ' q20 -9 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" stroke-width="5" fill="none" opacity=".8" stroke-linecap="round"/></g></g></svg>');
  var fx = S.layer('ls-fx');
  var glassL = S.layer('ls-glass', svgOpen('0 0 1366 768') + '<rect x="390" y="380" width="660" height="310" rx="42" fill="none" stroke="#9bd6f3" stroke-width="16"/>' +
    '<path d="M424 420 V620" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".55"/><path d="M424 640 V650" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".55"/>' +
    '<rect x="380" y="372" width="680" height="22" rx="11" fill="#bfe5f8"/></svg>');
  /* the whole tub (back, actors, water, fx, glass) lives in one group that is scaled and moved left, so the right side is free for the two cards */
  var grp = S.layer('ls-tubgrp');
  [back, acts, wat, fx, glassL].forEach(function (n) { grp.appendChild(n); });
  grp.style.transformOrigin = '72rem 69rem'; grp.style.transform = 'translate(-19rem,0) scale(.78)';
  S.edge('#ffeccb', '#dca766');
  S.lisaBox(24, 470, 190);
  var wave = S.loop(wat.querySelector('.ls-wavea'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-80px)' }], 3600);

  var HOVER = 200;                                    /* y of an object hovering above the tub */
  var duck = S.actor(acts, 'duck', 'duck', 505, 412, 150, 150);
  var log = S.actor(acts, 'log', 'log', 745, 446, 290, 116);
  var apple = S.actor(acts, 'apple', 'apple', 935, 414, 112, 112);
  var key = S.actor(acts, 'key', 'key', 600, 640, 104, 104);
  var home = { duck: 412, log: 446, apple: 414, key: 640 };
  function hoverUp(a, name) {                         /* appear above the tub, wobbling */
    var hy = HOVER - home[name];
    a.style.opacity = '0';
    var p = S.anim(a, [{ transform: S.T(0, hy - 70, 0, 0.3), opacity: 0 }, { transform: S.T(0, hy + 10, 0, 1.12), opacity: 1, offset: 0.6, easing: 'ease-out' }, { transform: S.T(0, hy, 0, 1), opacity: 1 }], 650);
    a.hov = S.loop(a.inner, [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-5deg)' }], 1500);
    return p;
  }
  function bobStart(a, amp, rot, ms) {
    if (a.hov) { a.hov.cancel(); a.hov = null; }
    a.bob = S.loop(a.inner, [{ transform: S.T(0, 0, -rot) }, { transform: S.T(0, -amp, rot) }, { transform: S.T(0, 0, -rot) }], ms || 2400, Math.random() * 600);
  }
  /* a drop: fall, dip into the water, settle at home; splash at the dip */
  function dropFloat(a, name, ms, dip, big, startHover) {
    var hy = startHover === false ? 0 : HOVER - home[name];
    if (a.hov) { a.hov.cancel(); a.hov = null; }
    var cx = a.offsetLeft ? 0 : 0;
    flow(function () { S.splash(fx, parseFloat(a.style.left) * 10 + parseFloat(a.style.width) * 5, WATER, big); }, ms * 0.58);
    return S.anim(a, [{ transform: S.T(0, hy, 0, 1), opacity: 1, easing: 'cubic-bezier(.5,0,.9,.6)' }, { transform: S.T(0, dip, 0, 1), opacity: 1, offset: 0.58, easing: 'ease-out' },
      { transform: S.T(0, -8, 0, 1), opacity: 1, offset: 0.8, easing: 'ease-in-out' }, { transform: S.T(0, 0, 0, 1), opacity: 1 }], ms);
  }
  function flow(fn, ms) { S.flow.after(ms, fn); }
  function bubbles(x, y0, y1, n, delay) {
    for (var i = 0; i < n; i++) {
      var b = el('div', 'ls-bubble'), sz = 14 + (i % 3) * 7; S.place(b, x - 30 + i * 14, y0, sz, sz); fx.appendChild(b);
      S.anim(b, [{ transform: S.T(0, 0, 0, 0.6), opacity: 0 }, { transform: S.T((i % 2 ? 10 : -10), -(y0 - y1) * 0.35, 0, 1), opacity: 0.95, offset: 0.2 }, { transform: S.T((i % 2 ? -8 : 8), -(y0 - y1), 0, 1), opacity: 0 }], 1500 + i * 120, { delay: delay + i * 260 });
      (function (bb) { S.flow.after(delay + 3200, function () { if (bb.parentNode) bb.parentNode.removeChild(bb); }); })(b);
    }
  }

  var act = {
    intro: function () { S.lisa.pose('wave', 1800); return S.wait(200); },
    duckShow: function () { return hoverUp(duck, 'duck'); },
    duckDrop: function () { var p = dropFloat(duck, 'duck', 950, 20, false); bobStart(duck, 7, 3, 2300); return p; },
    logShow: function () { return hoverUp(log, 'log'); },
    logDrop: function () { var p = dropFloat(log, 'log', 1350, 46, true); bobStart(log, 4, 1.6, 3000); S.flow.after(1500, function () { S.lisa.pose('cheer', 1500); }); return p; },
    keyShow: function () { return hoverUp(key, 'key'); },
    keyDrop: function () {
      var hy = HOVER - home.key, wy = WATER - home.key;
      if (key.hov) { key.hov.cancel(); key.hov = null; }
      flow(function () { S.splash(fx, 600, WATER, false); }, 2600 * 0.2);
      bubbles(600, 640, WATER + 20, 6, 700);
      return S.anim(key, [{ transform: S.T(0, hy, 0, 1), opacity: 1, easing: 'cubic-bezier(.5,0,.9,.6)' }, { transform: S.T(0, wy, 0, 1), opacity: 1, offset: 0.2, easing: 'ease-out' },
        { transform: S.T(16, wy + (-wy) * 0.35, 14, 1), offset: 0.5, easing: 'ease-in-out' }, { transform: S.T(-8, (-wy) * 0.1 + wy * 0.1, -12, 1), offset: 0.8, easing: 'ease-in-out' }, { transform: S.T(0, 0, 24, 1) }], 2600);
    },
    appleDrop: function () { hoverUpNoWait(); var p = S.anim(apple, [{ transform: S.T(0, HOVER - home.apple - 90, 0, 0.7), opacity: 0 }, { transform: S.T(0, HOVER - home.apple, 0, 1), opacity: 1, offset: 0.25 }, { transform: S.T(0, 16, 0, 1), opacity: 1, offset: 0.7, easing: 'ease-out' }, { transform: S.T(0, 0, 0, 1), opacity: 1 }], 1000);
      S.flow.after(620, function () { S.splash(fx, 935, WATER, false); }); S.flow.after(1000, function () { bobStart(apple, 6, 4, 2000); }); return p; },
    recap: function () { return S.pop(duck, 1.15); },
    popLog: function () { return S.pop(log, 1.1); },
    popKey: function () { return S.pop(key, 1.4); }
  };
  function hoverUpNoWait() { apple.style.opacity = '0'; }

  /* outcome pictures: the object floating on the water / lying on the bottom */
  function tile(spec) {
    var mode = spec.mode, o = spec.obj === 'log' ? { src: 'log', w: 210, h: 84 } : { src: 'key', w: 112, h: 112 }, id = 'lst' + (++uid);
    var cy = mode === 'float' ? 124 : 236;
    var bub = mode === 'sink' ? '<circle cx="118" cy="170" r="9" fill="#fff" opacity=".7"/><circle cx="188" cy="148" r="7" fill="#fff" opacity=".7"/><circle cx="150" cy="190" r="6" fill="#fff" opacity=".7"/>' : '';
    var d = el('div', 'ls-tile-in', svgOpen('0 0 300 300') +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc4f2" stop-opacity=".6"/><stop offset="1" stop-color="#2c8fd6" stop-opacity=".85"/></linearGradient></defs>' +
      '<rect width="300" height="300" fill="#f1faff"/>' + imgTag(o.src, 150 - o.w / 2, cy - o.h / 2, o.w, o.h) +
      '<rect y="132" width="300" height="168" fill="url(#' + id + ')"/><path d="M0 132 q18 -9 37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0 t37 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>' + bub + '</svg>');
    return d;
  }
  return { act: act, tile: tile, promptBox: { x: 1090, y: 440, size: 232, gap: 28 } };
};

/* =====================================================================================================================
   2. Day and night: morning -> midday -> evening -> night -> morning
   ===================================================================================================================== */
LessonArt.scenes.daynight = function (S) {
  function sky(cls, a, b) { var d = S.layer('ls-sky ' + cls); d.style.background = 'linear-gradient(' + a + ',' + b + ')'; return d; }
  var morning = sky('', '#8fd2ff 0%', '#ffe9b8 78%');
  var day = sky('', '#58b9ff 0%', '#cdeeff 78%'); day.style.opacity = '0';
  var eve = sky('', '#5d5aa6 0%', '#ff8e5c 62%'); eve.style.opacity = '0';
  var nite = sky('', '#0c1040 0%', '#2d2c78 80%'); nite.style.opacity = '0';
  var starL = S.layer('ls-stars');
  var pts = [[160, 90], [330, 200], [470, 80], [600, 250], [790, 120], [900, 270], [1180, 90], [1290, 230], [250, 330], [1050, 340]], sv = '';
  pts.forEach(function (p, i) { var r = 7 + (i % 3) * 3; sv += '<g class="ls-st' + (i < 3 ? ' ls-tw' : '') + '" style="transform-origin:' + p[0] + 'px ' + p[1] + 'px"><path d="M' + p[0] + ' ' + (p[1] - r * 2) + ' L' + (p[0] + r * 0.6) + ' ' + (p[1] - r * 0.6) + ' L' + (p[0] + r * 2) + ' ' + p[1] + ' L' + (p[0] + r * 0.6) + ' ' + (p[1] + r * 0.6) + ' L' + p[0] + ' ' + (p[1] + r * 2) + ' L' + (p[0] - r * 0.6) + ' ' + (p[1] + r * 0.6) + ' L' + (p[0] - r * 2) + ' ' + p[1] + ' L' + (p[0] - r * 0.6) + ' ' + (p[1] - r * 0.6) + 'Z" fill="#fff6b0"/></g>'; });
  starL.innerHTML = svgOpen('0 0 1366 768') + sv + '</svg>'; starL.style.opacity = '0';
  var acts = S.layer('ls-actors');
  var sun = S.el('div', 'ls-sun', '<div class="ls-halo"></div><img src="' + S.img('sun') + '" alt="">'); S.place(sun, 0, 0, 170, 170); acts.appendChild(sun);
  var moon = S.el('div', 'ls-moon', '<img src="' + S.img('moon') + '" alt="">'); S.place(moon, 0, 0, 150, 150); acts.appendChild(moon); moon.style.opacity = '0';
  function hills(night) {
    var c = night ? { far: '#2b3b7c', near: '#233567', fg: '#1b2a57', wall: '#6a6da3', roof: '#8e3f55', win: '#ffd54f', trunk: '#3b2d4d', crown: '#1d4570' }
                  : { far: '#a9dd8b', near: '#6dc25b', fg: '#52ad4a', wall: '#fff3e0', roof: '#e57373', win: '#bfe9ff', trunk: '#8d5a2b', crown: '#2e9e4f' };
    return svgOpen('0 0 1366 768') +
      '<path d="M0 560 Q180 440 400 520 T800 500 T1100 470 T1366 520 V768 H0Z" fill="' + c.far + '"/>' +
      '<path d="M0 640 Q250 540 560 620 T1100 600 T1366 630 V768 H0Z" fill="' + c.near + '"/>' +
      '<rect x="962" y="548" width="16" height="64" fill="' + c.trunk + '"/><circle cx="970" cy="528" r="42" fill="' + c.crown + '"/>' +
      '<rect x="1040" y="548" width="100" height="68" fill="' + c.wall + '"/><path d="M1028 550 L1090 498 L1152 550Z" fill="' + c.roof + '"/><rect x="1072" y="568" width="30" height="30" rx="4" fill="' + c.win + '"/><rect x="1112" y="580" width="20" height="36" fill="' + (night ? '#4a3d6e' : '#c98d4d') + '"/>' +
      (night ? '<circle cx="1087" cy="583" r="34" fill="#ffd54f" opacity=".25"/>' : '') +
      '<path d="M0 700 Q400 650 800 700 T1366 690 V768 H0Z" fill="' + c.fg + '"/></svg>';
  }
  S.edge('#8fd2ff', '#52ad4a');
  var hd = S.layer('ls-hills', hills(false));
  var hn = S.layer('ls-hills', hills(true)); hn.style.opacity = '0';
  var fxl = S.layer('ls-fx');
  S.lisaBox(60, 470, 210);
  var ball = S.actor(fxl, 'ball', 'ball', 340, 640, 96, 96);
  var sunHalo = sun.querySelector('.ls-halo');

  /* the sun travels on an ellipse: 180 deg = left, 90 deg = top, 0 deg = right (below the hills at both ends) */
  var CX = 690, CY = 700, RX = 470, RY = 550;
  function pos(deg) { var a = deg * Math.PI / 180; return { x: CX + RX * Math.cos(a) - 85, y: CY - RY * Math.sin(a) - 85 }; }
  var cur = 180;
  function sunTo(deg, ms) {
    var fr = [], n = 10;
    for (var i = 0; i <= n; i++) { var p = pos(cur + (deg - cur) * i / n); fr.push({ transform: S.T(p.x, p.y), opacity: 1 }); }
    cur = deg;
    return S.anim(sun, fr, ms);
  }
  var p0 = pos(180); sun.style.transform = S.T(p0.x, p0.y);
  sun.style.opacity = '1';
  var mp = { x: 935, y: 125 };
  moon.style.transform = S.T(mp.x, mp.y + 420);
  S.loop(sunHalo, [{ transform: 'scale(1)', opacity: 0.55 }, { transform: 'scale(1.12)', opacity: 0.8 }, { transform: 'scale(1)', opacity: 0.55 }], 3000);
  var badges = null, bl = [];

  var act = {
    sunrise: function () { S.lisa.pose('wave', 1800); return sunTo(148, 4600); },
    midday: function () {
      S.fade(day, 1, 3500); S.edgeTo('#58b9ff', '#52ad4a', 3500);
      ball.style.opacity = '0';
      S.anim(ball, [{ opacity: 0, transform: S.T(0, 0, 0, 0.4) }, { opacity: 1, transform: S.T(0, 0, 0, 1) }], 500, { delay: 800 });
      S.flow.after(1400, function () { ball.bob = S.loop(ball.inner, [{ transform: S.T(0, 0, 0, 1), easing: 'cubic-bezier(.3,0,.3,1)' }, { transform: S.T(0, -110, 0, 1), easing: 'cubic-bezier(.7,0,.7,1)' }, { transform: S.T(0, 0, 0, 1) }], 1000); });
      S.flow.after(900, function () { S.lisa.pose('giggle', 800); });
      return sunTo(90, 4200);
    },
    evening: function () {
      S.fade(eve, 1, 4200); S.edgeTo('#5d5aa6', '#52ad4a', 4200);
      S.fade(ball, 0, 700, 300).then(function () { if (ball.bob) ball.bob.cancel(); });
      return sunTo(27, 5200);
    },
    night: function () {
      S.fade(nite, 1, 3600, 400); S.fade(hn, 1, 3600, 400); S.edgeTo('#0c1040', '#1b2a57', 3600, 400);
      S.fade(starL, 1, 2600, 1800); starL.classList.add('ls-on');
      S.anim(moon, [{ transform: S.T(mp.x, mp.y + 420), opacity: 0 }, { transform: S.T(mp.x, mp.y), opacity: 1 }], 3400, { delay: 1600 });
      S.flow.after(300, function () { S.lisa.pose('yawn', 1800); });
      return sunTo(0, 3400);
    },
    dawn: function () {
      S.lisa.pose('wave', 1800);
      S.edgeTo('#8fd2ff', '#52ad4a', 3200);
      S.fade(nite, 0, 3200); S.fade(hn, 0, 3200); S.fade(eve, 0, 3200); S.fade(day, 0, 3200); S.fade(starL, 0, 2200);
      S.anim(moon, [{ transform: S.T(mp.x, mp.y), opacity: 1 }, { transform: S.T(mp.x, mp.y + 420), opacity: 0 }], 2600);
      cur = 180; var p = pos(180); sun.style.transform = S.T(p.x, p.y);
      return sunTo(148, 3200);
    },
    badges: function () {
      badges = S.layer('ls-badges'); var cols = [['#8fd2ff', '#ffe9b8', 'sun', 0.9], ['#58b9ff', '#cdeeff', 'sun', 1.1], ['#5d5aa6', '#ff8e5c', 'sun', 0.8], ['#0c1040', '#2d2c78', 'moon', 1]];
      cols.forEach(function (c, i) {
        var b = S.el('div', 'ls-badge', '<img src="' + S.img(c[2]) + '" alt="">'); b.style.background = 'linear-gradient(' + c[0] + ',' + c[1] + ')';
        S.place(b, 398 + i * 150, 40, 120, 120); b.style.opacity = '0.4'; b.style.transform = 'scale(.9)'; badges.appendChild(b); bl.push(b);
      });
      return S.wait(100);
    },
    badge1: function () { return lit(0); }, badge2: function () { return lit(1); }, badge3: function () { return lit(2); }, badge4: function () { return lit(3); }
  };
  function lit(i) { var b = bl[i]; if (!b) return Promise.resolve(); return S.anim(b, [{ opacity: 0.4, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1.22)', offset: 0.5, easing: 'ease-out' }, { opacity: 1, transform: 'scale(1.1)' }], 500); }
  ball.inner.style.transformOrigin = '50% 100%';

  function tile(spec) {
    var moonT = spec.kind === 'moon', id = 'lsd' + (++uid);
    var bgc = moonT ? ['#0c1040', '#343593'] : ['#58b9ff', '#cdeeff'];
    var body = moonT ?
      imgTag('moon', 70, 55, 170, 170) + '<circle cx="48" cy="60" r="6" fill="#fff6b0"/><circle cx="250" cy="48" r="8" fill="#fff6b0"/><circle cx="224" cy="248" r="6" fill="#fff6b0"/><circle cx="64" cy="240" r="7" fill="#fff6b0"/>' :
      '<ellipse cx="222" cy="232" rx="56" ry="24" fill="#fff"/><ellipse cx="258" cy="222" rx="34" ry="22" fill="#fff"/>' + imgTag('sun', 55, 45, 190, 190);
    return el('div', 'ls-tile-in', svgOpen('0 0 300 300') + '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + bgc[0] + '"/><stop offset="1" stop-color="' + bgc[1] + '"/></linearGradient></defs><rect width="300" height="300" fill="url(#' + id + ')"/>' + body + '</svg>');
  }
  return { act: act, tile: tile, promptBox: { x: 700, y: 540, size: 280, gap: 40 } };
};

/* =====================================================================================================================
   3. Number stones: ten numbered stepping stones across a stream
   ===================================================================================================================== */
LessonArt.scenes.stones = function (S) {
  var bg = S.layer('ls-bg'), rip = '';
  for (var i = 0; i < 26; i++) { var rx = 150 + (i * 137) % 1060, ry = 360 + (i * 71) % 320; rip += '<path d="M' + rx + ' ' + ry + ' q14 -8 28 0" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>'; }
  bg.innerHTML = svgOpen('0 0 1366 768') +
    '<defs><linearGradient id="lssk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd2ff"/><stop offset="1" stop-color="#e6f7ff"/></linearGradient><linearGradient id="lswa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6bcaf3"/><stop offset="1" stop-color="#2e93d6"/></linearGradient></defs>' +
    '<rect width="1366" height="340" fill="url(#lssk)"/><circle cx="1180" cy="110" r="52" fill="#fff3b0"/><g fill="#fff"><ellipse cx="260" cy="110" rx="80" ry="26"/><ellipse cx="320" cy="94" rx="50" ry="24"/><ellipse cx="760" cy="70" rx="70" ry="22"/></g>' +
    '<path d="M0 300 Q200 200 420 280 T860 270 T1366 290 V350 H0Z" fill="#a9dd8b"/><path d="M0 330 Q300 270 640 320 T1366 320 V360 H0Z" fill="#7ed957"/>' +
    '<rect y="330" width="1366" height="380" fill="url(#lswa)"/>' + rip +
    '<g class="ls-flow" fill="none" stroke="#fff" stroke-width="5" opacity=".4" stroke-linecap="round"><path d="M300 400 h90 M800 450 h110 M560 640 h90 M1040 600 h100 M180 590 h70"/></g>' +
    '<path d="M0 330 H110 Q160 420 124 520 Q96 620 140 712 H0Z" fill="#7ed957"/><path d="M110 330 Q160 420 124 520 Q96 620 140 712" stroke="#f2e2a8" stroke-width="12" fill="none"/>' +
    '<path d="M1366 330 H1256 Q1206 420 1242 520 Q1270 620 1226 712 H1366Z" fill="#7ed957"/><path d="M1256 330 Q1206 420 1242 520 Q1270 620 1226 712" stroke="#f2e2a8" stroke-width="12" fill="none"/>' +
    '<path d="M0 704 Q400 676 800 706 T1366 700 V768 H0Z" fill="#66c24e"/>' +
    '<g fill="#ff8a65"><circle cx="60" cy="740" r="9"/><circle cx="520" cy="736" r="9"/><circle cx="1000" cy="742" r="9"/></g><g fill="#fff59d"><circle cx="260" cy="748" r="8"/><circle cx="760" cy="744" r="8"/><circle cx="1300" cy="740" r="8"/></g></svg>';
  S.edge('#8fd2ff', '#66c24e');
  var flowEl = bg.querySelector('.ls-flow'); S.loop(flowEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(60px)' }], 4000);
  var stL = S.layer('ls-stones');
  var stones = [], P = [];
  function sx(k) { return 232 + k * 100; }
  function sy(k) { return 540 + Math.round(11 * Math.sin(k * 1.1)); }
  for (var k = 0; k < 10; k++) {
    var n = k + 1, s = S.el('div', 'ls-stone',
      '<div class="ls-lit"></div>' + svgOpen('0 0 100 76', 'ls-stonesvg') +
      '<ellipse cx="50" cy="66" rx="46" ry="9" fill="#fff" opacity=".35"/><path d="M8 46 Q4 20 32 11 Q56 3 80 13 Q98 24 92 48 Q88 66 56 69 Q14 72 8 46Z" fill="#a89f94"/>' +
      '<path d="M14 44 Q10 24 34 16 Q56 8 78 17 Q92 26 88 40 Q60 30 14 44Z" fill="#cfc7bc"/><text x="50" y="55" text-anchor="middle" font-size="40" font-weight="800" font-family="Nunito, Trebuchet MS, sans-serif" fill="#43382f">' + n + '</text></svg>');
    S.place(s, sx(k) - 50, sy(k) - 38, 100, 76); s.style.opacity = '0'; stL.appendChild(s); stones.push(s);
    P.push({ x: sx(k), y: sy(k) - 22 });                  /* where Lisa's feet touch the stone */
  }
  var bankL = { x: 66, y: 548 }, bankR = { x: 1302, y: 548 };
  var LW = 134, LH = LW * 1.127;
  S.lisaBox(bankL.x - LW / 2, bankL.y - LH * 0.95, LW);
  var at = bankL;                                        /* where Lisa stands now */
  function hop(to, ms, arc) {
    var dx = to.x - at.x, dy = to.y - at.y; at = to;
    S.anim(S.lisa, [{ transform: 'translateY(0)', easing: 'ease-out' }, { transform: 'translateY(-' + S.u(arc || 100) + ')', offset: 0.5, easing: 'ease-in' }, { transform: 'translateY(0)' }], ms);
    return S.anim(S.lisaW, [{ transform: S.T(0, 0) }, { transform: S.T(dx, dy) }], ms, { }).then(function () { /* wrapper keeps its offset via commitStyles: normalise to the new base */ });
  }
  /* the wrapper's translate accumulates: keep one running offset instead of re-basing */
  var off = { x: 0, y: 0 };
  function hopTo(to, ms, arc) {
    var fx0 = off.x, fy0 = off.y, nx = to.x - bankL.x, ny = to.y - bankL.y; off = { x: nx, y: ny };
    S.anim(S.lisa, [{ transform: 'translateY(0)', easing: 'ease-out' }, { transform: 'translateY(-' + S.u(arc || 100) + ')', offset: 0.5, easing: 'ease-in' }, { transform: 'translateY(0)' }], ms);
    return S.anim(S.lisaW, [{ transform: S.T(fx0, fy0) }, { transform: S.T(nx, ny) }], ms);
  }
  function light(k) {
    var s = stones[k], l = s.querySelector('.ls-lit');
    S.anim(l, [{ opacity: 0 }, { opacity: 1 }], 250);
    return S.anim(s, [{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.4, easing: 'ease-out' }, { transform: 'scale(1)' }], 420);
  }
  function go(k) { return hopTo(P[k - 1], 520, 100).then(function () { return light(k - 1); }); }
  var act = {
    stonesIn: function () {
      S.lisa.pose('wave', 1800);
      return Promise.all(stones.map(function (s, i) { return S.anim(s, [{ opacity: 0, transform: 'translateY(-4rem) scale(.5)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], 480, { delay: 200 + i * 130 }); }));
    },
    hop1: function () { return go(1); }, hop2: function () { return go(2); }, hop3: function () { return go(3); }, hop4: function () { return go(4); },
    hop5: function () { return go(5); }, hop6: function () { return go(6); }, hop7: function () { return go(7); }, hop8: function () { return go(8); },
    hop9: function () { return go(9); }, hop10: function () { return go(10); },
    cross: function () { return hopTo(bankR, 800, 130).then(function () { S.lisa.pose('cheer', 1500); }); }
  };
  function tile(spec) {
    var n = spec.n, id = 'lss' + (++uid), dots = '';
    for (var i = 0; i < n; i++) dots += '<circle cx="' + (150 + (i - (n - 1) / 2) * 58) + '" cy="252" r="21" fill="#ff7043"/><circle cx="' + (150 + (i - (n - 1) / 2) * 58 - 6) + '" cy="246" r="6" fill="#fff" opacity=".55"/>';
    return el('div', 'ls-tile-in', svgOpen('0 0 300 300') + '<rect width="300" height="300" fill="#fff8e7"/><g transform="translate(30 20) scale(2.4)">' +
      '<path d="M8 46 Q4 20 32 11 Q56 3 80 13 Q98 24 92 48 Q88 66 56 69 Q14 72 8 46Z" fill="#a89f94" transform="scale(.97)"/><path d="M14 44 Q10 24 34 16 Q56 8 78 17 Q92 26 88 40 Q60 30 14 44Z" fill="#cfc7bc"/>' +
      '<text x="50" y="57" text-anchor="middle" font-size="46" font-weight="800" font-family="Nunito, Trebuchet MS, sans-serif" fill="#43382f">' + n + '</text></g>' + dots + '</svg>');
  }
  return { act: act, tile: tile, promptBox: { x: 683, y: 168, size: 250, gap: 60 } };
};

/* =====================================================================================================================
   4. Repka: six helpers pull one enormous turnip from the garden
   ===================================================================================================================== */
LessonArt.scenes.repka = function (S) {
  var bg = S.layer('ls-bg', svgOpen('0 0 1366 768') + '<rect width="1366" height="768" fill="#d9f2ff"/><circle cx="1160" cy="110" r="54" fill="#fff3b0"/><path d="M0 430 Q250 360 520 430 T1050 420 T1366 400 V768 H0Z" fill="#9bdc75"/><path d="M0 580 Q300 520 720 585 T1366 550 V768 H0Z" fill="#72c44e"/><path d="M985 610 Q1135 530 1285 610" fill="none" stroke="#9a602f" stroke-width="44" stroke-linecap="round"/><path d="M0 690 Q400 650 800 695 T1366 680 V768 H0Z" fill="#5dac42"/></svg>');
  var actors = S.layer('ls-actors');
  var places = { grandpa:[960,500], grandma:[835,485], girl:[710,475], dog:[585,490], cat:[460,500], mouse:[365,500] };
  var cast = {};
  Object.keys(places).forEach(function (name) { cast[name] = S.actor(actors, name, name, places[name][0], places[name][1], name === 'mouse' ? 82 : 142, name === 'mouse' ? 82 : 150); cast[name].dataset.helper=name; });
  var root = el('div','ls-a ls-rp-turnip','<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg"><path d="M100 12 C22 4 12 87 36 150 C50 192 73 217 100 220 C127 217 150 192 164 150 C188 87 178 4 100 12Z" fill="#ffe36b" stroke="#c49a36" stroke-width="8"/><path d="M100 18 Q80 0 76 4 M100 18 Q116 -2 128 3" fill="none" stroke="#55a843" stroke-width="13" stroke-linecap="round"/></svg>');
  S.place(root,1020,440,230,260); root.style.opacity='0'; root.style.transform=S.T(0,150,0,.72); actors.appendChild(root); S.actors.turnip=root;
  var pullLine = S.layer('ls-pull-line', svgOpen('0 0 1366 768') + '<path class="ls-rp-rope" d="M1040 545 Q700 535 360 540" fill="none" stroke="#d29a59" stroke-width="13" stroke-linecap="round" opacity="0"/></svg>');
  var rope = pullLine.querySelector('.ls-rp-rope');
  S.edge('#d9f2ff', '#5dac42'); S.lisaBox(28, 500, 150);
  function show(name, delay) { var a = cast[name]; a.dataset.joined='true'; return S.anim(a, [{ opacity:0, transform:S.T(0, 35, 0, .65) }, { opacity:1, transform:S.T(0,0,0,1) }], 420, { delay: delay || 0 }); }
  function pull(names) { return Promise.all(names.map(function (name, i) { var a=cast[name]; return S.anim(a, [{transform:S.T(0,0)},{transform:S.T(-24,0)},{transform:S.T(0,0)}], 500, {delay:i*45}); })); }
  function count(name) { var a=cast[name]; a.classList.add('ls-rp-count'); return S.anim(a,[{transform:S.T(0,0,0,1)},{transform:S.T(0,-24,0,1.2),offset:.45,easing:'ease-out'},{transform:S.T(0,0,0,1)}],480); }
  var sequence = ['grandpa','grandma','girl','dog','cat','mouse'];
  var act = {
    plant: function () { return Promise.all([S.anim(root,[{opacity:0,transform:S.T(0,150,0,.7)},{opacity:1,transform:S.T(0,0,0,1)}],700), show('grandpa')]); },
    pullGrandpa: function () { return Promise.all([pull(['grandpa']),S.fade(rope,1,350)]); },
    joinGrandma: function () { return show('grandma').then(function(){return pull(['grandpa','grandma']);}); },
    joinGirlDog: function () { return Promise.all([show('girl',0),show('dog',160)]).then(function(){return pull(['grandpa','grandma','girl','dog']);}); },
    joinCat: function () { return show('cat'); },
    joinMouse: function () { return show('mouse'); },
    helpersPull: function () { return act.joinCat().then(function(){return act.joinMouse();}).then(function(){return act.extract();}); },
    extract: function () { return pull(sequence).then(function(){return S.anim(root,[{transform:S.T(0,0),opacity:1},{transform:S.T(0,-185),opacity:1}],900);}).then(function(){root.dataset.extracted='true';S.lisa.pose('cheer',1200);}); },
    countGrandpa:function(){return count('grandpa');}, countGrandma:function(){return count('grandma');}, countGirl:function(){return count('girl');},
    countDog:function(){return count('dog');}, countCat:function(){return count('cat');}, countMouse:function(){return count('mouse');}
  };
  function tile(spec) { return el('div','ls-tile-in',svgOpen('0 0 300 300')+'<rect width="300" height="300" rx="34" fill="#e5f7dc"/><image href="img/'+spec.helper+'.svg" x="55" y="38" width="190" height="220"/></svg>'); }
  return {act:act,tile:tile,promptBox:{x:683,y:195,size:245,gap:58},helpers:cast,turnip:root};
};

/* =====================================================================================================================
   5. More: two baskets, identical apples, and the progression 3–1 → 3–2 → 3–3
   ===================================================================================================================== */
LessonArt.scenes.more = function (S) {
  S.layer('ls-bg',svgOpen('0 0 1366 768')+'<rect width="1366" height="768" fill="#dff4ff"/><circle cx="1150" cy="100" r="52" fill="#fff2b0"/><path d="M0 540 Q300 470 600 535 T1366 515 V768 H0Z" fill="#9bdc75"/><rect y="650" width="1366" height="118" fill="#76c950"/></svg>');
  var art=S.layer('ls-basket-art',svgOpen('0 0 1366 768')+'<g class="ls-more-basket ls-more-left"><path d="M250 390 H610 L565 650 H300Z" fill="#c98343" stroke="#8f562d" stroke-width="20"/><path d="M230 390 H630" stroke="#f0b35f" stroke-width="34" stroke-linecap="round"/></g><g class="ls-more-basket ls-more-right"><path d="M760 390 H1120 L1075 650 H810Z" fill="#c98343" stroke="#8f562d" stroke-width="20"/><path d="M740 390 H1140" stroke="#f0b35f" stroke-width="34" stroke-linecap="round"/></g></svg>');
  var basketL=art.querySelector('.ls-more-left'), basketR=art.querySelector('.ls-more-right');
  var apples=S.layer('ls-apples'), left=[], right=[];
  function apple(name,x,y,parent,visible) { var a=S.actor(parent,name,'apple',x,y,92,92); a.style.opacity=visible?'1':'0'; return a; }
  [[340,345],[430,345],[520,345]].forEach(function(p,i){left.push(apple('left'+i,p[0],p[1],apples,true));});
  [[850,345]].forEach(function(p,i){right.push(apple('right'+i,p[0],p[1],apples,true));});
  var extra2=apple('right1',940,345,apples,false), extra3=apple('right2',1030,345,apples,false);
  S.edge('#dff4ff','#76c950'); S.lisaBox(28,500,150);
  var quantities={left:3,right:1};
  function setCounts(){basketL.dataset.count=String(quantities.left);basketR.dataset.count=String(quantities.right);}
  setCounts();
  function moveApple(a,x){return S.anim(a,[{opacity:0,transform:S.T(0,-100)},{opacity:1,transform:S.T(x,0)}],620);}
  function highlight(list){return Promise.all(list.map(function(a){a.classList.add('ls-more-lit');return S.anim(a,[{transform:S.T(0,0,0,1)},{transform:S.T(0,-20,0,1.17),offset:.45},{transform:S.T(0,0,0,1)}],420);}));}
  function countOne(list,index){var a=list[index];if(!a)return Promise.resolve();a.classList.add('ls-more-lit');return S.anim(a,[{transform:S.T(0,0,0,1)},{transform:S.T(0,-20,0,1.18),offset:.45},{transform:S.T(0,0,0,1)}],420);}
  var act={
    showBaskets:function(){return S.wait(100);}, apples31:function(){return S.wait(100);},
    countLeft1:function(){return countOne(left,0);},countLeft2:function(){return countOne(left,1);},countLeft3:function(){return countOne(left,2);},
    countRight1:function(){return countOne(right,0);},countRight2:function(){return countOne(right,1);},countRight3:function(){return countOne(right,2);},
    compare31:function(){return S.wait(160);},
    apples32:function(){quantities.right=2;setCounts();right.push(extra2);return moveApple(extra2,0);},
    compare32:function(){return S.wait(160);},
    apples33:function(){quantities.right=3;setCounts();right.push(extra3);return moveApple(extra3,0);},
    compare33:function(){return S.wait(160);},
    highlightLeft:function(){return highlight(left);},highlightRight:function(){return highlight(right);},highlightBoth:function(){return highlight(left.concat(right));}
  };
  function tile(spec){var n=spec.basket==='small'?1:3, apples='';for(var i=0;i<n;i++)apples+='<image href="img/apple.svg" x="'+(121+(i-(n-1)/2)*54)+'" y="34" width="58" height="58"/>';return el('div','ls-tile-in',svgOpen('0 0 300 300')+'<rect width="300" height="300" rx="32" fill="#e9f6df"/><path d="M72 100 H228 L206 250 H94Z" fill="#c98343" stroke="#8f562d" stroke-width="12"/><path d="M60 100 H240" stroke="#f0b35f" stroke-width="18" stroke-linecap="round"/>'+apples+'</svg>');}
  return {act:act,tile:tile,promptBox:{x:683,y:160,size:250,gap:56},quantities:quantities};
};
})();
