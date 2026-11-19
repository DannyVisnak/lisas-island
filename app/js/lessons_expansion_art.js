/* Lisa's Island - expansion lesson art (x_shadow, x_sprout, x_halves, x_rainbow). Original inline SVG, Opus 5.5 authored.
   Uses the LessonArt.stage kit (S.layer, S.place, S.anim, S.fade, S.pop, S.loop, S.T, S.lisaBox, S.edge, S.edgeTo). Only transform + opacity animate.
   A scene = function (S) -> { act, tile, promptBox }. Load after lessons_art.js. Units: frame px 1366 x 768. */
(function () {
'use strict';
var A = window.LessonArt;
if (!A || !A.scenes) return;
var NS = 'xmlns="http://www.w3.org/2000/svg"';
var PROMPT = { x: 1050, y: 455, size: 220, gap: 30 };
function svg(vb, inner, par) { return '<svg viewBox="' + vb + '" ' + (par ? 'preserveAspectRatio="' + par + '" ' : '') + NS + '>' + inner + '</svg>'; }
function node(S, parent, cls, x, y, w, h, vb, inner) {
  var n = S.el('div', 'ls-x-node ' + cls, svg(vb, inner)); S.place(n, x, y, w, h); n.style.opacity = '0'; parent.appendChild(n); return n;
}
function full(S, parent, cls, inner) { var n = S.el('div', 'ls-x-full ' + cls, svg('0 0 1366 768', inner, 'none')); n.style.opacity = '0'; parent.appendChild(n); return n; }
function tile(S, inner) { return S.el('div', 'ls-tile-in ls-x-tile', svg('0 0 300 300', '<rect width="300" height="300" rx="28" fill="#fff5dc"/>' + inner)); }
function show(S, n, ms, d) { return S.fade(n, 1, ms || 400, d); }
function hide(S, n, ms, d) { return S.fade(n, 0, ms || 400, d); }
function move(S, n, frames, ms) { return S.anim(n, frames.map(function (t, i) { var f = { transform: t }; if (i < frames.length - 1) f.easing = 'ease-in-out'; return f; }), ms); }
function pulse(S, n) { return S.anim(n, [{ opacity: 1 }, { opacity: 0.35, offset: 0.5 }, { opacity: 1 }], 800); }

/* shared pictures */
var SUN = '<g stroke="#f2a516" stroke-width="8" stroke-linecap="round"><path d="M70 6v14M70 120v14M6 70h14M120 70h14M25 25l10 10M105 105l10 10M115 25l-10 10M35 105l-10 10"/></g><circle cx="70" cy="70" r="38" fill="#ffd23f" stroke="#f2a516" stroke-width="6"/><circle cx="58" cy="64" r="4" fill="#9a5a12"/><circle cx="82" cy="64" r="4" fill="#9a5a12"/><path d="M58 80q12 9 24 0" fill="none" stroke="#9a5a12" stroke-width="4" stroke-linecap="round"/>';
var CLOUD = '<g fill="#e9eef3" stroke="#9aa8b6" stroke-width="7"><ellipse cx="120" cy="110" rx="90" ry="55"/><ellipse cx="220" cy="80" rx="100" ry="70"/><ellipse cx="315" cy="112" rx="85" ry="52"/></g><rect x="64" y="104" width="292" height="58" rx="28" fill="#e9eef3"/>';
var APPLE = '<path d="M100 48C70 30 22 40 22 98C22 150 60 186 100 178C140 186 178 150 178 98C178 40 130 30 100 48Z" fill="#e8463f" stroke="#a52a26" stroke-width="7"/><path d="M100 50Q98 26 112 12" stroke="#6b4630" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M110 28Q140 10 154 30Q130 44 110 28Z" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="5"/><ellipse cx="62" cy="86" rx="14" ry="22" fill="#fff" opacity=".35"/>';
function skyBg(sky, ground, extra) {
  return svg('0 0 1366 768', '<rect width="1366" height="600" fill="' + sky + '"/>' +
    '<path d="M0 520Q240 440 520 520T1060 500T1366 520V600H0Z" fill="#b6e09a"/>' +
    '<rect y="600" width="1366" height="168" fill="' + ground + '"/>' +
    '<g stroke="#6fae4f" stroke-width="5" stroke-linecap="round" fill="none"><path d="M140 650l8-18 8 18M420 700l8-18 8 18M960 690l8-18 8 18M1220 650l8-18 8 18M700 730l8-18 8 18"/></g>' + (extra || ''), 'none');
}

/* =====================================================================================================================
   12. Shadow: the sun moves across the sky, the tree's shadow runs to the other side and changes length
   ===================================================================================================================== */
var TREE = '<rect x="88" y="150" width="34" height="132" rx="10" fill="#9a6a45" stroke="#6b4630" stroke-width="6"/><circle cx="105" cy="100" r="78" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="8"/><circle cx="62" cy="128" r="40" fill="#7cca66" stroke="#3f8a3a" stroke-width="7"/><circle cx="150" cy="124" r="42" fill="#7cca66" stroke="#3f8a3a" stroke-width="7"/><circle cx="80" cy="80" r="8" fill="#e8504a"/><circle cx="132" cy="70" r="8" fill="#e8504a"/><circle cx="112" cy="132" r="8" fill="#e8504a"/>';
var SHADOW = '<path d="M0 12H210Q250 -2 320 4Q380 10 378 20Q380 30 320 36Q250 42 210 28H0Z" fill="#2f4a25" opacity=".42"/>';
function miniTree(dir) { /* dir: 'left' | 'right' - where the shadow lies; the sun sits top-right in both tiles */
  var sh = '<path d="M150 230H60Q34 228 36 238Q34 248 60 246H150Z" fill="#2f4a25" opacity=".45"/>';
  return '<path d="M20 238H280" stroke="#9fd67a" stroke-width="16" stroke-linecap="round"/>' +
    (dir === 'right' ? '<g transform="translate(300 0) scale(-1 1)">' + sh + '</g>' : sh) +
    '<rect x="141" y="150" width="18" height="84" rx="6" fill="#9a6a45" stroke="#6b4630" stroke-width="4"/><circle cx="150" cy="122" r="46" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="6"/>' +
    '<circle cx="246" cy="58" r="26" fill="#ffd23f" stroke="#f2a516" stroke-width="5"/>';
}
A.scenes.x_shadow = function (S) {
  var bg = S.layer('ls-x-bg');
  bg.innerHTML = skyBg('#bfe8ff', '#9fd67a', '<g fill="#fff" opacity=".9"><ellipse cx="260" cy="150" rx="70" ry="26"/><ellipse cx="310" cy="132" rx="46" ry="30"/><ellipse cx="1180" cy="120" rx="64" ry="22"/></g>');
  var warm = full(S, bg, 'ls-x-warm', '<rect width="1366" height="768" fill="#ffb066" opacity=".3"/>');
  var acts = S.layer('ls-x-acts');
  var POS = { L: S.T(-430, 170), TOP: S.T(0, -10), H: S.T(140, -10), R: S.T(430, 170), RL: S.T(450, 360) };
  var sun = node(S, acts, 'ls-x-sun', 613, 40, 140, 140, '0 0 140 140', SUN);
  var shadow = node(S, acts, 'ls-x-shadow', 683, 582, 380, 40, '0 0 380 40', SHADOW);
  var tree = node(S, acts, 'ls-x-tree', 578, 318, 210, 285, '0 0 210 285', TREE);
  shadow.style.transformOrigin = '0 50%';
  var cur = { sun: POS.L, sh: 1 };
  sun.style.transform = cur.sun; shadow.style.transform = 'scaleX(1)';
  S.lisaBox(80, 480, 190); S.edge('#bfe8ff', '#9fd67a');
  /* move the sun (optionally through a waypoint) and stretch/flip the shadow in the same time */
  function go(pos, k, ms, via, viaK) {
    var sf = via ? [cur.sun, POS[via], POS[pos]] : [cur.sun, POS[pos]];
    var hf = via ? ['scaleX(' + cur.sh + ')', 'scaleX(' + viaK + ')', 'scaleX(' + k + ')'] : ['scaleX(' + cur.sh + ')', 'scaleX(' + k + ')'];
    cur.sun = POS[pos]; cur.sh = k;
    return Promise.all([move(S, sun, sf, ms), move(S, shadow, hf, ms)]);
  }
  return { promptBox: PROMPT, act: {
    intro: function () { return Promise.all([show(S, sun, 500), show(S, tree, 500, 150)]).then(function () { return show(S, shadow, 700); }); },
    point: function () { return pulse(S, shadow); },
    sunRight: function () { return go('R', -1, 2200, 'TOP', 0.05); },
    sunHigh: function () {
      var k0 = cur.sh; cur.sun = POS.H; cur.sh = -0.35;
      return Promise.all([
        hide(S, sun, 450).then(function () { sun.style.transform = POS.H; return show(S, sun, 450); }),
        move(S, shadow, ['scaleX(' + k0 + ')', 'scaleX(-0.35)'], 1100)
      ]);
    },
    sunLow: function () { return Promise.all([go('RL', -1.25, 1600), show(S, warm, 1200), S.edgeTo('#f4cfa0', '#9fd67a', 1200)]); },
    recap: function () { return S.pop(tree, 1.06).then(function () { return pulse(S, shadow); }); }
  }, tile: function (spec) {
    return tile(S, miniTree(spec.kind === 'shadowRight' ? 'right' : 'left'));
  } };
};

/* =====================================================================================================================
   13. Sprout: seed into soil, water + sun, days pass, sprout, taller stem, flower
   ===================================================================================================================== */
var POT = '<path d="M14 30H246L222 166H38Z" fill="#d9774a" stroke="#9a4a2c" stroke-width="8"/><rect x="2" y="12" width="256" height="34" rx="10" fill="#e88b5c" stroke="#9a4a2c" stroke-width="8"/><ellipse cx="130" cy="20" rx="116" ry="11" fill="#6b4630"/>';
function petals(cx, cy, d, r) {
  var s = '';
  for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; s += '<circle cx="' + (cx + d * Math.cos(a)).toFixed(1) + '" cy="' + (cy + d * Math.sin(a)).toFixed(1) + '" r="' + r + '" fill="#ff8fb1" stroke="#d4537c" stroke-width="4"/>'; }
  return s + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.8).toFixed(1) + '" fill="#ffd23f" stroke="#e0a416" stroke-width="4"/>';
}
var LEAF2 = function (w, h) { var c = w / 2; return '<path d="M' + c + ' ' + (h - 4) + 'Q' + (w * 0.2) + ' ' + (h - 4) + ' 6 ' + (h * 0.3) + 'Q' + (w * 0.34) + ' 6 ' + c + ' ' + (h - 4) + 'ZM' + c + ' ' + (h - 4) + 'Q' + (w * 0.8) + ' ' + (h - 4) + ' ' + (w - 6) + ' ' + (h * 0.3) + 'Q' + (w * 0.66) + ' 6 ' + c + ' ' + (h - 4) + 'Z" fill="#7cca66" stroke="#3f8a3a" stroke-width="4"/>'; };
function miniPot(top) { return '<g transform="translate(70 176) scale(.62)">' + POT + '</g>' + top; }
A.scenes.x_sprout = function (S) {
  var bg = S.layer('ls-x-bg');
  bg.innerHTML = skyBg('#cdeefc', '#c9a27a', '<rect x="90" y="560" width="1190" height="40" rx="10" fill="#b98a5e"/>');
  var acts = S.layer('ls-x-acts');
  var sun = node(S, acts, 'ls-x-sun', 1080, 50, 140, 140, '0 0 140 140', SUN);
  var stem = node(S, acts, 'ls-x-stem', 628, 200, 24, 262, '0 0 24 262', '<rect x="6" y="0" width="12" height="262" rx="6" fill="#58a845" stroke="#3f8a3a" stroke-width="3"/>');
  var leavesS = node(S, acts, 'ls-x-leaves-s', 590, 352, 100, 50, '0 0 100 50', LEAF2(100, 50));
  var leavesB = node(S, acts, 'ls-x-leaves-b', 560, 262, 160, 74, '0 0 160 74', LEAF2(160, 74));
  var flower = node(S, acts, 'ls-x-flower', 580, 140, 120, 120, '0 0 120 120', petals(60, 60, 32, 22));
  var seed = node(S, acts, 'ls-x-seed', 628, 180, 24, 30, '0 0 24 30', '<ellipse cx="12" cy="15" rx="9" ry="13" fill="#b07a46" stroke="#6b4630" stroke-width="3"/>');
  var pot = node(S, acts, 'ls-x-pot', 510, 440, 260, 170, '0 0 260 170', POT);
  var can = node(S, acts, 'ls-x-can', 770, 230, 190, 130, '0 0 190 130', '<rect x="60" y="30" width="110" height="90" rx="16" fill="#5aa9e6" stroke="#2f6f9e" stroke-width="7"/><path d="M60 62L12 30" stroke="#2f6f9e" stroke-width="12" stroke-linecap="round"/><ellipse cx="10" cy="30" rx="12" ry="8" fill="#2f6f9e"/><path d="M120 30Q120 0 160 10Q180 22 170 50" fill="none" stroke="#2f6f9e" stroke-width="9"/>');
  var drops = node(S, acts, 'ls-x-drops', 650, 290, 80, 140, '0 0 80 140', '<g fill="#5aa9e6"><path d="M16 10q8 12 0 18q-8-6 0-18Z"/><path d="M40 50q8 12 0 18q-8-6 0-18Z"/><path d="M62 20q8 12 0 18q-8-6 0-18Z"/><path d="M28 92q8 12 0 18q-8-6 0-18Z"/><path d="M56 104q8 12 0 18q-8-6 0-18Z"/></g>');
  var night = full(S, S.layer('ls-x-fx'), 'ls-x-night', '<rect width="1366" height="768" fill="#1d2a55"/>');
  stem.style.transformOrigin = '50% 100%'; stem.style.transform = 'scaleY(0)'; stem.style.opacity = '1';
  flower.style.transformOrigin = '50% 50%';
  S.lisaBox(80, 480, 190); S.edge('#cdeefc', '#c9a27a');
  function pour() { return S.anim(drops, [{ opacity: 0, transform: S.T(0, -10) }, { opacity: 1, transform: S.T(0, 8), offset: 0.3 }, { opacity: 0, transform: S.T(0, 40) }], 800); }
  return { promptBox: PROMPT, act: {
    intro: function () { return show(S, pot, 500); },
    seedShow: function () { return S.anim(seed, [{ opacity: 0, transform: S.T(0, -20) }, { opacity: 1, transform: S.T(0, 0) }], 500, { delay: 300 }); },
    seedIn: function () { return move(S, seed, [S.T(0, 0), S.T(0, 268)], 700).then(function () { return S.anim(seed, [{ opacity: 1, transform: S.T(0, 268) }, { opacity: 0, transform: S.T(0, 284) }], 500); }); },
    water: function () {
      return show(S, can, 400).then(function () { return move(S, can, [S.T(0, 0, 0), S.T(-20, 0, -28)], 500); })
        .then(pour).then(pour).then(function () { return move(S, can, [S.T(-20, 0, -28), S.T(0, 0, 0)], 400); }).then(function () { return hide(S, can, 400); });
    },
    sunOn: function () { return S.anim(sun, [{ opacity: 0, transform: S.T(0, 0, 0, 0.6) }, { opacity: 1, transform: S.T(0, 0, 0, 1) }], 700, { delay: 600 }); },
    sprout: function () {
      return S.anim(night, [{ opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }, { opacity: 0.5 }, { opacity: 0 }], 2200).then(function () {
        return Promise.all([S.anim(stem, [{ transform: 'scaleY(0)', easing: 'ease-out' }, { transform: 'scaleY(.3)' }], 1000), show(S, leavesS, 500, 600)]);
      });
    },
    grow: function () { return Promise.all([S.anim(stem, [{ transform: 'scaleY(.3)', easing: 'ease-in-out' }, { transform: 'scaleY(1)' }], 1500), show(S, leavesB, 600, 900)]); },
    bloom: function () { return S.anim(flower, [{ opacity: 0, transform: 'scale(.3) rotate(-30deg)', easing: 'ease-out' }, { opacity: 1, transform: 'scale(1) rotate(0deg)' }], 900); },
    recap: function () { return S.pop(pot, 1.06).then(function () { return S.pop(leavesS, 1.15); }).then(function () { return S.pop(flower, 1.15); }); }
  }, tile: function (spec) {
    if (spec.kind === 'flower') return tile(S, miniPot('<rect x="145" y="96" width="10" height="92" rx="5" fill="#58a845"/><g transform="translate(108 52) scale(.7)">' + petals(60, 60, 32, 22) + '</g>'));
    return tile(S, miniPot('<rect x="145" y="150" width="10" height="38" rx="5" fill="#58a845"/><g transform="translate(115 128)">' + LEAF2(70, 36) + '</g>'));
  } };
};

/* =====================================================================================================================
   14. Halves: one apple, two friends; edge cut = unequal, middle cut = two equal halves; halves rejoin into one whole
   ===================================================================================================================== */
function piece(id, x0, x1, faceX) {
  return '<defs><clipPath id="' + id + '"><rect x="' + x0 + '" y="0" width="' + (x1 - x0) + '" height="200"/></clipPath></defs><g clip-path="url(#' + id + ')">' + APPLE + '<rect x="' + faceX + '" y="56" width="8" height="116" rx="3" fill="#fff3c4"/></g>';
}
var TEDDY = '<circle cx="40" cy="40" r="24" fill="#b5835a" stroke="#7a5237" stroke-width="6"/><circle cx="130" cy="40" r="24" fill="#b5835a" stroke="#7a5237" stroke-width="6"/><ellipse cx="85" cy="176" rx="62" ry="40" fill="#c8956a" stroke="#7a5237" stroke-width="7"/><circle cx="85" cy="82" r="58" fill="#c8956a" stroke="#7a5237" stroke-width="7"/><ellipse cx="85" cy="102" rx="24" ry="18" fill="#f0d2b0"/><circle cx="64" cy="72" r="6" fill="#3a2a20"/><circle cx="106" cy="72" r="6" fill="#3a2a20"/><ellipse cx="85" cy="95" rx="8" ry="6" fill="#3a2a20"/><path d="M78 110q7 6 14 0" fill="none" stroke="#3a2a20" stroke-width="4" stroke-linecap="round"/>';
var GUIDE = '<path d="M6 4V256" stroke="#4f6578" stroke-width="6" stroke-dasharray="16 12" stroke-linecap="round"/>';
A.scenes.x_halves = function (S) {
  var bg = S.layer('ls-x-bg');
  bg.innerHTML = svg('0 0 1366 768', '<rect width="1366" height="520" fill="#ffe7c2"/><g fill="#ffd29a"><circle cx="120" cy="90" r="10"/><circle cx="300" cy="170" r="10"/><circle cx="1240" cy="110" r="10"/><circle cx="1100" cy="250" r="10"/></g>' +
    '<rect x="1040" y="70" width="230" height="200" rx="16" fill="#c98d4d"/><rect x="1054" y="84" width="202" height="172" rx="8" fill="#bfe9ff"/><path d="M1155 84V256M1054 170H1256" stroke="#c98d4d" stroke-width="8"/>' +
    '<rect y="520" width="1366" height="248" fill="#d9a066"/><path d="M0 560H1366M0 640H1366M0 720H1366" stroke="#c08a4d" stroke-width="4"/>' +
    '<rect x="500" y="560" width="280" height="22" rx="10" fill="#e9c38f" stroke="#a87953" stroke-width="5"/>' +
    '<ellipse cx="400" cy="600" rx="95" ry="24" fill="#fff" stroke="#c9cfd6" stroke-width="6"/><ellipse cx="880" cy="600" rx="95" ry="24" fill="#fff" stroke="#c9cfd6" stroke-width="6"/>', 'none');
  var acts = S.layer('ls-x-acts');
  var teddy = node(S, acts, 'ls-x-teddy', 840, 300, 170, 220, '0 0 170 220', TEDDY);
  var box = [540, 370, 200, 200];
  function apiece(cls, inner) { return node(S, acts, cls, box[0], box[1], box[2], box[3], '0 0 200 200', inner); }
  var whole = apiece('ls-x-apple', APPLE);
  var big = apiece('ls-x-big', piece('lsxBig', 0, 140, 132)), small = apiece('ls-x-small', piece('lsxSmall', 140, 200, 140));
  var halfL = apiece('ls-x-halfl', piece('lsxHalfL', 0, 100, 92)), halfR = apiece('ls-x-halfr', piece('lsxHalfR', 100, 200, 100));
  var sideLine = node(S, acts, 'ls-x-guide', 674, 330, 12, 260, '0 0 12 260', GUIDE);
  var midLine = node(S, acts, 'ls-x-guide', 634, 330, 12, 260, '0 0 12 260', GUIDE);
  S.lisaBox(80, 480, 190); S.edge('#ffe7c2', '#d9a066');
  var Z = S.T(0, 0);
  function popAt(n, dx) { return S.anim(n, [{ transform: S.T(dx, 0) }, { transform: S.T(dx, 0, 0, 1.08), offset: 0.4, easing: 'ease-out' }, { transform: S.T(dx, 0) }], 420); }
  function cut(line, a, b) {
    return show(S, line, 350).then(function () { return S.wait(350); }).then(function () {
      return Promise.all([hide(S, line, 250), hide(S, whole, 150), show(S, a, 150), show(S, b, 150)]);
    }).then(function () { return Promise.all([move(S, a, [Z, S.T(-40, 0)], 600), move(S, b, [Z, S.T(40, 0)], 600)]); });
  }
  return { promptBox: { x: 683, y: 190, size: 220, gap: 30 }, act: {
    intro: function () { return show(S, teddy, 500); },
    showWhole: function () { return show(S, whole, 400, 200).then(function () { return S.pop(whole, 1.12); }); },
    cutSide: function () { return cut(sideLine, big, small).then(function () { return popAt(big, -40); }).then(function () { return popAt(small, 40); }); },
    reset: function () {
      return Promise.all([move(S, big, [S.T(-40, 0), Z], 600), move(S, small, [S.T(40, 0), Z], 600)])
        .then(function () { return Promise.all([show(S, whole, 150), hide(S, big, 150), hide(S, small, 150)]); });
    },
    cutMiddle: function () { return cut(midLine, halfL, halfR); },
    compare: function () {
      return Promise.all([S.anim(halfL, [{ transform: S.T(-40, 0) }, { transform: S.T(-40, -30), offset: 0.5 }, { transform: S.T(-40, 0) }], 800),
        S.anim(halfR, [{ transform: S.T(40, 0) }, { transform: S.T(40, -30), offset: 0.5 }, { transform: S.T(40, 0) }], 800)]);
    },
    toPlates: function () { return move(S, halfL, [S.T(-40, 0), S.T(-200, 20)], 900).then(function () { return move(S, halfR, [S.T(40, 0), S.T(200, 20)], 900); }); },
    rejoin: function () {
      return Promise.all([move(S, halfL, [S.T(-200, 20), Z], 1000), move(S, halfR, [S.T(200, 20), Z], 1000)])
        .then(function () { return Promise.all([show(S, whole, 150), hide(S, halfL, 150), hide(S, halfR, 150)]); })
        .then(function () { return S.pop(whole, 1.12); });
    }
  }, tile: function (spec) {
    var x = spec.kind === 'cutEdge' ? 206 : 150;
    return tile(S, '<g transform="translate(50 50)">' + APPLE + '</g><path d="M' + x + ' 34V266" stroke="#4f6578" stroke-width="8" stroke-dasharray="18 12" stroke-linecap="round"/>');
  } };
};

/* =====================================================================================================================
   15. Rainbow: rain alone shows no rainbow; the sun comes out behind Lisa; the rainbow appears opposite the sun
   ===================================================================================================================== */
function rainStreaks(w, h, n) {
  var s = '<g stroke="#5aa9e6" stroke-width="6" stroke-linecap="round">';
  for (var row = 0; row * 110 < h; row++) for (var i = 0; i < n; i++) { var x = 14 + i * (w - 28) / (n - 1) + (row % 2) * 10, y = row * 110 + (i % 3) * 34 + 6; s += '<path d="M' + x.toFixed(0) + ' ' + y + 'l-6 30"/>'; }
  return s + '</g>';
}
var ARCS = ['#e8463f', '#f39237', '#f6d23a', '#6fbf5b', '#3fa7e0', '#4a5fc1', '#8e5bc8'];
A.scenes.x_rainbow = function (S) {
  var bg = S.layer('ls-x-bg');
  bg.innerHTML = skyBg('#a9c4d8', '#9fd67a');
  var bright = full(S, bg, 'ls-x-bright', '<rect width="1366" height="600" fill="#bfe8ff"/><path d="M0 520Q240 440 520 520T1060 500T1366 520V600H0Z" fill="#b6e09a"/>');
  var arcs = S.layer('ls-x-arcs'), acts = S.layer('ls-x-acts');
  var bows = ARCS.map(function (c, i) {
    var r = 330 - i * 22;
    return full(S, arcs, 'ls-x-bow', '<path d="M' + (760 - r) + ' 600A' + r + ' ' + r + ' 0 0 1 ' + (760 + r) + ' 600" fill="none" stroke="' + c + '" stroke-width="23" opacity=".85"/>');
  });
  var sun = node(S, acts, 'ls-x-sun', 40, 230, 160, 160, '0 0 140 140', SUN);
  var rain = node(S, acts, 'ls-x-rain', 540, 220, 380, 340, '0 0 380 340', rainStreaks(380, 340, 12));
  var cloud = node(S, acts, 'ls-x-cloud', 520, 60, 420, 180, '0 0 420 180', CLOUD);
  S.lisaBox(80, 480, 190); S.edge('#a9c4d8', '#9fd67a');
  var fall = null;
  return { promptBox: { x: 1143, y: 455, size: 190, gap: 26 }, act: {
    intro: function () { return S.anim(cloud, [{ opacity: 0, transform: S.T(120, 0) }, { opacity: 1, transform: S.T(0, 0) }], 900); },
    rainOn: function () { if (!fall) fall = S.loop(rain.firstChild, [{ transform: 'translateY(-14px)' }, { transform: 'translateY(20px)' }], 520); return show(S, rain, 600, 700); },
    rainOnly: function () { return S.pop(cloud, 1.05).then(function () { return S.wait(700); }); },
    sunOut: function () {
      return Promise.all([S.anim(sun, [{ opacity: 0, transform: S.T(0, 60) }, { opacity: 1, transform: S.T(0, 0) }], 1000), show(S, bright, 1000), S.edgeTo('#bfe8ff', '#9fd67a', 1000)]);
    },
    rainbow: function () { return Promise.all(bows.map(function (b, i) { return show(S, b, 500, 200 + i * 160); })); },
    recap: function () {
      return S.pop(sun, 1.12).then(function () { return Promise.all(bows.map(function (b) { return S.anim(b, [{ opacity: 1 }, { opacity: 0.45, offset: 0.5 }, { opacity: 1 }], 900); })); });
    }
  }, tile: function (spec) {
    var art = '<g transform="translate(46 50) scale(.5)">' + CLOUD + '</g><g transform="translate(70 140) scale(.42)">' + rainStreaks(380, 300, 10) + '</g>';
    if (spec.kind === 'rainSun') art = '<g transform="translate(8 8) scale(.62)">' + SUN + '</g>' + art;
    return tile(S, art);
  } };
};
})();
