/* Lisa's Island - expansion v2 lesson art (x_teremok, x_balance, x_stars, x_frog). Original inline SVG, Opus 5.5 authored.
   Uses the LessonArt.stage kit (S.layer, S.place, S.el, S.anim, S.fade, S.pop, S.loop, S.T, S.wait, S.splash, S.lisaBox, S.edge, S.edgeTo).
   Only transform + opacity animate. A scene = function (S) -> { act, tile, promptBox }. Load after lessons_art.js. Frame px 1366 x 768. */
(function () {
'use strict';
var A = window.LessonArt;
if (!A || !A.scenes) return;
var NS = 'xmlns="http://www.w3.org/2000/svg"';
var PROMPT = { x: 1050, y: 455, size: 220, gap: 30 };
function svg(vb, inner, par) { return '<svg viewBox="' + vb + '" ' + (par ? 'preserveAspectRatio="' + par + '" ' : '') + NS + '>' + inner + '</svg>'; }
function node(S, parent, cls, x, y, w, h, vb, inner) {
  var n = S.el('div', 'ls-x2-node ' + cls, svg(vb, inner)); S.place(n, x, y, w, h); n.style.opacity = '0'; parent.appendChild(n); return n;
}
function group(S, parent, cls, x, y, w, h) { var c = S.el('div', 'ls-x2-node ' + cls); S.place(c, x, y, w, h); c.style.opacity = '0'; parent.appendChild(c); return c; }
function full(S, parent, cls, inner) { var n = S.el('div', 'ls-x2-full ' + cls, svg('0 0 1366 768', inner, 'none')); n.style.opacity = '0'; parent.appendChild(n); return n; }
function tile(S, inner) { return S.el('div', 'ls-tile-in ls-x2-tile', svg('0 0 300 300', '<rect width="300" height="300" rx="28" fill="#fff5dc"/>' + inner)); }
function show(S, n, ms, d) { return S.fade(n, 1, ms || 400, d); }
function hide(S, n, ms, d) { return S.fade(n, 0, ms || 400, d); }
function move(S, n, frames, ms) { return S.anim(n, frames.map(function (t, i) { var f = { transform: t }; if (i < frames.length - 1) f.easing = 'ease-in-out'; return f; }), ms); }
function seq(fns) { return fns.reduce(function (p, f) { return p.then(f); }, Promise.resolve()); }
function wiggle(S, n, ms) { return S.loop(n.firstChild, [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-5deg)' }], ms || 700); }

var SUN = '<g stroke="#f2a516" stroke-width="8" stroke-linecap="round"><path d="M70 6v14M70 120v14M6 70h14M120 70h14M25 25l10 10M105 105l10 10M115 25l-10 10M35 105l-10 10"/></g><circle cx="70" cy="70" r="38" fill="#ffd23f" stroke="#f2a516" stroke-width="6"/><circle cx="58" cy="64" r="4" fill="#9a5a12"/><circle cx="82" cy="64" r="4" fill="#9a5a12"/><path d="M58 80q12 9 24 0" fill="none" stroke="#9a5a12" stroke-width="4" stroke-linecap="round"/>';
var APPLE = '<path d="M100 48C70 30 22 40 22 98C22 150 60 186 100 178C140 186 178 150 178 98C178 40 130 30 100 48Z" fill="#e8463f" stroke="#a52a26" stroke-width="7"/><path d="M100 50Q98 26 112 12" stroke="#6b4630" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M110 28Q140 10 154 30Q130 44 110 28Z" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="5"/><ellipse cx="62" cy="86" rx="14" ry="22" fill="#fff" opacity=".35"/>';

/* =====================================================================================================================
   16. Teremok: animals move in one by one; the bear is too big; the house breaks; everyone builds a bigger one together
   ===================================================================================================================== */
function foxHead(c, s, ch) { return '<path d="M10 8L22 26L8 30ZM50 8L38 26L52 30Z" fill="' + c + '" stroke="' + s + '" stroke-width="3" stroke-linejoin="round"/><path d="M8 28Q30 14 52 28L30 54Z" fill="' + c + '" stroke="' + s + '" stroke-width="3" stroke-linejoin="round"/><path d="M14 32Q22 40 30 54Q38 40 46 32Q30 40 14 32Z" fill="' + ch + '"/><circle cx="22" cy="31" r="2.5" fill="#222"/><circle cx="38" cy="31" r="2.5" fill="#222"/><circle cx="30" cy="52" r="3" fill="#222"/>'; }
var HEAD = {
  mouse: '<circle cx="14" cy="18" r="12" fill="#b9b9c6" stroke="#6d6d80" stroke-width="3"/><circle cx="46" cy="18" r="12" fill="#b9b9c6" stroke="#6d6d80" stroke-width="3"/><circle cx="14" cy="18" r="6" fill="#f0b8c4"/><circle cx="46" cy="18" r="6" fill="#f0b8c4"/><ellipse cx="30" cy="36" rx="18" ry="16" fill="#c9c9d6" stroke="#6d6d80" stroke-width="3"/><circle cx="24" cy="33" r="2.5" fill="#222"/><circle cx="36" cy="33" r="2.5" fill="#222"/><circle cx="30" cy="42" r="3" fill="#e88aa0"/>',
  frog: '<ellipse cx="30" cy="38" rx="24" ry="16" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="3"/><circle cx="18" cy="22" r="9" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="3"/><circle cx="42" cy="22" r="9" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="3"/><circle cx="18" cy="22" r="3.5" fill="#222"/><circle cx="42" cy="22" r="3.5" fill="#222"/><path d="M18 42q12 8 24 0" fill="none" stroke="#2f6a2a" stroke-width="3" stroke-linecap="round"/>',
  hare: '<ellipse cx="22" cy="14" rx="6" ry="14" fill="#e6dccb" stroke="#8a7a66" stroke-width="3"/><ellipse cx="38" cy="14" rx="6" ry="14" fill="#e6dccb" stroke="#8a7a66" stroke-width="3"/><circle cx="30" cy="38" r="17" fill="#ece3d3" stroke="#8a7a66" stroke-width="3"/><circle cx="24" cy="35" r="2.5" fill="#222"/><circle cx="36" cy="35" r="2.5" fill="#222"/><path d="M27 43q3 3 6 0" stroke="#8a7a66" stroke-width="2.5" fill="none"/>',
  fox: foxHead('#e8823a', '#9a4a1c', '#fff4e6'),
  wolf: foxHead('#8d939c', '#4f555d', '#d9dde2'),
  bear: '<circle cx="12" cy="14" r="10" fill="#8a5a3a" stroke="#4e3020" stroke-width="3"/><circle cx="48" cy="14" r="10" fill="#8a5a3a" stroke="#4e3020" stroke-width="3"/><circle cx="30" cy="34" r="22" fill="#9a6640" stroke="#4e3020" stroke-width="3"/><ellipse cx="30" cy="42" rx="10" ry="7" fill="#d9b48a"/><circle cx="22" cy="30" r="3" fill="#222"/><circle cx="38" cy="30" r="3" fill="#222"/><ellipse cx="30" cy="39" rx="4" ry="3" fill="#222"/>'
};
var BEAR = '<ellipse cx="50" cy="246" rx="26" ry="12" fill="#6e4528"/><ellipse cx="120" cy="246" rx="26" ry="12" fill="#6e4528"/><ellipse cx="85" cy="180" rx="70" ry="74" fill="#8a5a3a" stroke="#4e3020" stroke-width="6"/><ellipse cx="85" cy="190" rx="40" ry="46" fill="#c99a6a"/><g transform="translate(25 0) scale(2)">' + HEAD.bear + '</g>';
var W1 = [[80, 190], [170, 190], [260, 190], [80, 290], [260, 290]], W2 = [[110, 210], [250, 210], [390, 210], [110, 330], [390, 330]];
function wins(list) { return list.map(function (w) { return '<rect x="' + w[0] + '" y="' + w[1] + '" width="60" height="60" rx="6" fill="#fff2b0" stroke="#7a3328" stroke-width="6"/>'; }).join(''); }
var HOUSE = '<rect x="50" y="150" width="300" height="262" fill="#d9a35f" stroke="#8a5a2c" stroke-width="8"/><g stroke="#b7803f" stroke-width="5"><path d="M54 180H346M54 230H346M54 280H346M54 330H346M54 380H346"/></g>' +
  '<path d="M14 156L200 24L386 156Z" fill="#c9533f" stroke="#7a3328" stroke-width="10" stroke-linejoin="round"/><path d="M70 140L200 50L330 140" fill="none" stroke="#f2c07a" stroke-width="6" stroke-dasharray="14 10"/><circle cx="200" cy="100" r="18" fill="#fff2b0" stroke="#7a3328" stroke-width="5"/>' +
  wins(W1) + '<path d="M170 412V318Q200 292 230 318V412Z" fill="#7a4a2c" stroke="#4e2e1a" stroke-width="6"/>';
var HOUSE2 = '<rect x="60" y="170" width="440" height="292" fill="#d9a35f" stroke="#8a5a2c" stroke-width="8"/><g stroke="#b7803f" stroke-width="5"><path d="M64 200H496M64 248H496M64 296H496M64 344H496M64 392H496M64 440H496"/></g>' +
  '<path d="M14 176L280 26L546 176Z" fill="#c9533f" stroke="#7a3328" stroke-width="10" stroke-linejoin="round"/><path d="M90 160L280 52L470 160" fill="none" stroke="#f2c07a" stroke-width="6" stroke-dasharray="14 10"/><circle cx="280" cy="112" r="22" fill="#fff2b0" stroke="#7a3328" stroke-width="5"/>' +
  wins(W2) + '<path d="M235 462V350Q280 314 325 350V462Z" fill="#7a4a2c" stroke="#4e2e1a" stroke-width="6"/>';
var LOGS = '<g fill="#d9a35f" stroke="#8a5a2c" stroke-width="6"><rect x="20" y="62" width="400" height="40" rx="20"/><rect x="60" y="26" width="330" height="38" rx="19" transform="rotate(-4 225 45)"/></g><g fill="#f2c07a" stroke="#8a5a2c" stroke-width="5"><circle cx="40" cy="82" r="17"/><circle cx="400" cy="82" r="17"/></g><path d="M150 28L210 4L270 28Z" fill="#c9533f" stroke="#7a3328" stroke-width="6" stroke-linejoin="round"/>';
var KEYS = ['mouse', 'frog', 'hare', 'fox', 'wolf'];
A.scenes.x_teremok = function (S) {
  var bg = S.layer('ls-x2-bg');
  bg.innerHTML = svg('0 0 1366 768', '<rect width="1366" height="600" fill="#bfe8ff"/><circle cx="1180" cy="110" r="52" fill="#fff1ae"/>' +
    '<path d="M0 470Q180 380 360 470T760 450T1366 470V600H0Z" fill="#8ccf74"/><g fill="#4f9a48"><path d="M90 470L130 330L170 470Z"/><path d="M180 480L215 360L250 480Z"/><path d="M1120 470L1160 340L1200 470Z"/><path d="M1220 480L1255 370L1290 480Z"/></g>' +
    '<rect y="600" width="1366" height="168" fill="#a9dd8b"/><g fill="#fff"><circle cx="160" cy="680" r="7"/><circle cx="520" cy="720" r="7"/><circle cx="980" cy="690" r="7"/><circle cx="1240" cy="730" r="7"/></g><g fill="#f6d23a"><circle cx="160" cy="680" r="3"/><circle cx="520" cy="720" r="3"/><circle cx="980" cy="690" r="3"/><circle cx="1240" cy="730" r="3"/></g>', 'none');
  var acts = S.layer('ls-x2-acts');
  var house = node(S, acts, 'ls-x2-house', 483, 182, 400, 420, '0 0 400 420', HOUSE); house.style.transformOrigin = '50% 100%';
  var faces = {}, faces2 = {}, walkers = {}, outs = {};
  KEYS.forEach(function (k, i) { faces[k] = node(S, acts, 'ls-x2-face', 483 + W1[i][0] + 4, 182 + W1[i][1] + 4, 52, 52, '0 0 60 60', HEAD[k]); });
  var logs = node(S, acts, 'ls-x2-logs', 463, 500, 440, 110, '0 0 440 110', LOGS);
  var house2 = node(S, acts, 'ls-x2-house2', 403, 132, 560, 470, '0 0 560 470', HOUSE2); house2.style.transformOrigin = '50% 100%';
  KEYS.forEach(function (k, i) { faces2[k] = node(S, acts, 'ls-x2-face', 403 + W2[i][0] + 4, 132 + W2[i][1] + 4, 52, 52, '0 0 60 60', HEAD[k]); });
  faces2.bear = node(S, acts, 'ls-x2-face', 653, 490, 60, 60, '0 0 60 60', HEAD.bear);
  var OUT = [[290, 520], [372, 548], [454, 520], [536, 548], [618, 520]];
  KEYS.forEach(function (k, i) {
    walkers[k] = node(S, acts, 'ls-x2-walker', 638, 500, 90, 90, '0 0 60 60', HEAD[k]);
    outs[k] = node(S, acts, 'ls-x2-out', OUT[i][0], OUT[i][1], 80, 80, '0 0 60 60', HEAD[k]);
  });
  var bear = node(S, acts, 'ls-x2-bear', 870, 340, 170, 260, '0 0 170 260', BEAR);
  S.lisaBox(80, 480, 190); S.edge('#bfe8ff', '#a9dd8b');
  /* an animal hops in from the right, slips through the door, then looks out of its window */
  function arrive(k) {
    var w = walkers[k];
    return S.anim(w, [{ transform: S.T(420, 0), opacity: 0 }, { transform: S.T(300, -34), opacity: 1 }, { transform: S.T(180, 0), opacity: 1 }, { transform: S.T(80, -34), opacity: 1 }, { transform: S.T(0, 0), opacity: 1 }], 1300)
      .then(function () { return hide(S, w, 300); }).then(function () { return show(S, faces[k], 250); }).then(function () { return S.pop(faces[k], 1.2); });
  }
  var ROOF = S.T(-272, -330);
  return { promptBox: { x: 1133, y: 175, size: 200, gap: 26 }, act: {
    intro: function () { return show(S, house, 600); },
    mouse: function () { return arrive('mouse'); },
    frogHare: function () { return arrive('frog').then(function () { return arrive('hare'); }); },
    foxWolf: function () { return arrive('fox').then(function () { return arrive('wolf'); }); },
    bear: function () { return S.anim(bear, [{ opacity: 0, transform: S.T(240, 0) }, { opacity: 1, transform: S.T(0, 0) }], 1300).then(function () { return S.pop(bear, 1.06); }); },
    crash: function () {
      return S.anim(bear, [{ transform: S.T(0, 0), easing: 'ease-out' }, { transform: S.T(-150, -380), offset: 0.55, easing: 'ease-in' }, { transform: ROOF }], 1100)
        .then(function () {
          return Promise.all([S.anim(house, [{ transform: 'scaleY(1)', opacity: 1 }, { transform: 'scaleY(.2)', opacity: 0 }], 500), show(S, logs, 300, 200)]
            .concat(KEYS.map(function (k) { return hide(S, faces[k], 200); })));
        })
        .then(function () {
          return Promise.all([S.anim(bear, [{ transform: ROOF }, { transform: S.T(-180, -40) }, { transform: S.T(0, 0) }], 900)]
            .concat(KEYS.map(function (k, i) { return S.anim(outs[k], [{ opacity: 0, transform: S.T(0, -60, 0, 0.5) }, { opacity: 1, transform: S.T(0, 0, 0, 1) }], 500, { delay: i * 120 }); })));
        });
    },
    build: function () {
      return Promise.all([hide(S, logs, 500), hide(S, bear, 500)].concat(KEYS.map(function (k) { return hide(S, outs[k], 400); })))
        .then(function () { return S.anim(house2, [{ opacity: 0, transform: 'scale(.5)', easing: 'ease-out' }, { opacity: 1, transform: 'scale(1)' }], 900); })
        .then(function () { return Promise.all(KEYS.concat(['bear']).map(function (k, i) { return show(S, faces2[k], 300, i * 160); })); })
        .then(function () { return S.pop(faces2.bear, 1.25); });
    }
  }, tile: function (spec) {
    if (spec.kind === 'tooBig') return tile(S, '<path d="M10 272H290" stroke="#a9dd8b" stroke-width="12" stroke-linecap="round"/><g transform="translate(20 120) scale(.36)">' + HOUSE + '</g><g transform="translate(155 62) scale(.8)">' + BEAR + '</g>');
    return tile(S, '<path d="M10 262H290" stroke="#a9dd8b" stroke-width="12" stroke-linecap="round"/><g transform="translate(60 70) scale(.45)">' + HOUSE + '</g><g transform="translate(137 156) scale(.45)">' + HEAD.bear + '</g>');
  } };
};

/* =====================================================================================================================
   17. Balance: heavier goes down; apple vs key, apple vs big light balloon, apple vs the same apple = level
   ===================================================================================================================== */
var PAN = '<path d="M110 0L30 200M110 0L190 200" stroke="#7a5a3a" stroke-width="4"/><path d="M10 200Q110 270 210 200Z" fill="#e0b25a" stroke="#9a6a2a" stroke-width="6"/>';
var KEY = '<circle cx="22" cy="28" r="16" fill="none" stroke="#c9a23a" stroke-width="8"/><path d="M38 28H112M92 28V44M104 28V40" stroke="#c9a23a" stroke-width="8"/>';
var BALLOON = '<path d="M80 182Q76 196 84 206" fill="none" stroke="#7a5a3a" stroke-width="3"/><ellipse cx="80" cy="92" rx="72" ry="88" fill="#4fa3e0" stroke="#2f6f9e" stroke-width="6"/><path d="M72 178L80 190L88 178Z" fill="#2f6f9e"/><ellipse cx="54" cy="58" rx="14" ry="24" fill="#fff" opacity=".4"/>';
function miniItem(k, x, b) {
  if (k === 'apple') return '<circle cx="' + x + '" cy="' + (b - 20) + '" r="20" fill="#e8463f" stroke="#a52a26" stroke-width="4"/><path d="M' + x + ' ' + (b - 40) + 'q2-10 10-14" stroke="#6b4630" stroke-width="4" fill="none"/>';
  if (k === 'key') return '<circle cx="' + (x - 18) + '" cy="' + (b - 10) + '" r="8" fill="none" stroke="#c9a23a" stroke-width="5"/><path d="M' + (x - 10) + ' ' + (b - 10) + 'H' + (x + 24) + 'M' + (x + 16) + ' ' + (b - 10) + 'v8" stroke="#c9a23a" stroke-width="5"/>';
  return '<ellipse cx="' + x + '" cy="' + (b - 38) + '" rx="30" ry="36" fill="#4fa3e0" stroke="#2f6f9e" stroke-width="4"/>';
}
function miniScale(a, L, R) {
  var s = Math.sin(a * Math.PI / 180) * 100, ly = (110 - s).toFixed(1), ry = (110 + s).toFixed(1);
  function pan(x, y, k) { y = Number(y); return '<path d="M' + x + ' ' + y + 'L' + (x - 38) + ' ' + (y + 70) + 'M' + x + ' ' + y + 'L' + (x + 38) + ' ' + (y + 70) + '" stroke="#7a5a3a" stroke-width="3"/><path d="M' + (x - 46) + ' ' + (y + 70) + 'Q' + x + ' ' + (y + 100) + ' ' + (x + 46) + ' ' + (y + 70) + 'Z" fill="#e0b25a" stroke="#9a6a2a" stroke-width="4"/>' + miniItem(k, x, y + 70); }
  return '<path d="M150 110V266" stroke="#a86f34" stroke-width="10"/><path d="M118 272Q150 254 182 272Z" fill="#a86f34"/><path d="M50 ' + ly + 'L250 ' + ry + '" stroke="#e0b25a" stroke-width="10" stroke-linecap="round"/><circle cx="150" cy="110" r="7" fill="#9a6a2a"/>' + pan(50, ly, L) + pan(250, ry, R);
}
A.scenes.x_balance = function (S) {
  var bg = S.layer('ls-x2-bg');
  bg.innerHTML = svg('0 0 1366 768', '<rect width="1366" height="600" fill="#e9f3e1"/><g fill="#d6e8c8"><circle cx="140" cy="120" r="12"/><circle cx="330" cy="220" r="12"/><circle cx="1000" cy="110" r="12"/><circle cx="1220" cy="240" r="12"/></g>' +
    '<rect y="600" width="1366" height="168" fill="#c98d4d"/><path d="M0 640H1366M0 700H1366" stroke="#b07a3e" stroke-width="4"/>' +
    '<rect x="671" y="260" width="24" height="330" rx="8" fill="#a86f34" stroke="#6b4630" stroke-width="5"/><path d="M603 604Q683 560 763 604Z" fill="#a86f34" stroke="#6b4630" stroke-width="5"/><path d="M663 268L683 236L703 268Z" fill="#e0b25a" stroke="#9a6a2a" stroke-width="5"/>', 'none');
  var acts = S.layer('ls-x2-acts');
  var beam = node(S, acts, 'ls-x2-beam', 453, 250, 460, 20, '0 0 460 20', '<rect x="0" y="3" width="460" height="14" rx="7" fill="#e0b25a" stroke="#9a6a2a" stroke-width="4"/><circle cx="230" cy="10" r="10" fill="#9a6a2a"/>');
  beam.style.transformOrigin = '50% 50%'; beam.style.transform = 'rotate(0deg)';
  function pan(x) { var c = group(S, acts, 'ls-x2-pan', x - 110, 260, 220, 270); node(S, c, 'ls-x2-dish', 0, 0, 220, 260, '0 0 220 260', PAN).style.opacity = '1'; c.style.transform = S.T(0, 0); return c; }
  var panL = pan(453), panR = pan(913);
  var apple = node(S, panL, 'ls-x2-apple', 60, 108, 100, 100, '0 0 200 200', APPLE);
  var key = node(S, panR, 'ls-x2-key', 50, 150, 120, 56, '0 0 120 56', KEY);
  var balloon = node(S, panR, 'ls-x2-balloon', 30, 0, 160, 208, '0 0 160 208', BALLOON);
  var apple2 = node(S, panR, 'ls-x2-apple', 60, 108, 100, 100, '0 0 200 200', APPLE);
  S.lisaBox(80, 480, 190); S.edge('#e9f3e1', '#c98d4d');
  var cur = 0;
  function dy(d) { return 230 * Math.sin(d * Math.PI / 180); }
  /* rotate the beam and move both pans so the strings stay on the beam ends (clockwise = right side down) */
  function tilt(a, ms) {
    ms = ms || 900;
    var p = [move(S, beam, ['rotate(' + cur + 'deg)', 'rotate(' + a + 'deg)'], ms), move(S, panL, [S.T(0, -dy(cur)), S.T(0, -dy(a))], ms), move(S, panR, [S.T(0, dy(cur)), S.T(0, dy(a))], ms)];
    cur = a; return Promise.all(p);
  }
  function drop(n) { return S.anim(n, [{ opacity: 0, transform: S.T(0, -120), easing: 'ease-in' }, { opacity: 1, transform: S.T(0, 0) }], 600); }
  function lift(n) { return S.anim(n, [{ opacity: 1, transform: S.T(0, 0), easing: 'ease-in' }, { opacity: 0, transform: S.T(0, -120) }], 500); }
  return { promptBox: { x: 1050, y: 650, size: 200, gap: 30 }, act: {
    intro: function () { return Promise.all([show(S, beam, 500), show(S, panL, 500), show(S, panR, 500)]); },
    appleIn: function () { return drop(apple).then(function () { return tilt(-12, 900); }); },
    keyIn: function () { return drop(key).then(function () { return tilt(-9, 700); }).then(function () { return S.pop(apple, 1.12); }); },
    keyOut: function () { return lift(key).then(function () { return tilt(-12, 500); }); },
    balloonIn: function () { return drop(balloon).then(function () { return tilt(-10.5, 700); }).then(function () { return S.pop(apple, 1.12); }); },
    equal: function () { return lift(balloon).then(function () { return tilt(-12, 500); }).then(function () { return drop(apple2); }).then(function () { return tilt(0, 1100); }); },
    recap: function () { return S.pop(apple, 1.12).then(function () { return S.pop(apple2, 1.12); }); }
  }, tile: function (spec) {
    var t = { tiltApple: [-12, 'apple', 'key'], tiltKey: [12, 'apple', 'key'], tiltApple2: [-12, 'apple', 'balloon'], tiltBalloon: [12, 'apple', 'balloon'] }[spec.kind] || [0, 'apple', 'apple'];
    return tile(S, miniScale(t[0], t[1], t[2]));
  } };
};

/* =====================================================================================================================
   18. Stars by day: stars stay in the sky; the bright day sky hides them; at sunset the same stars show; the sun is a star
   ===================================================================================================================== */
function starPath(cx, cy, r) {
  var p = '';
  for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); }
  return p + 'Z';
}
var SKY_STARS = [[120, 90, 10], [260, 200, 7], [380, 70, 12], [520, 160, 8], [640, 60, 9], [760, 190, 7], [820, 90, 11], [1010, 250, 8], [1140, 90, 10], [1260, 180, 8], [200, 330, 6], [460, 300, 7], [700, 320, 6], [1180, 320, 7]];
A.scenes.x_stars = function (S) {
  var night = S.layer('ls-x2-nightsky');
  night.innerHTML = svg('0 0 1366 768', '<rect width="1366" height="768" fill="#16224a"/>', 'none');
  var stars = full(S, night, 'ls-x2-stars', SKY_STARS.map(function (s) { return '<path d="' + starPath(s[0], s[1], s[2] * 1.6) + '" fill="#fff6c2"/>'; }).join(''));
  stars.style.opacity = '1';
  var skyL = S.layer('ls-x2-skyl');
  var veil = full(S, skyL, 'ls-x2-veil', '<rect width="1366" height="768" fill="#8fd2ff"/>'); veil.style.opacity = '1';
  var dusk = full(S, skyL, 'ls-x2-dusk', '<rect width="1366" height="768" fill="#f4a96b" opacity=".45"/>');
  var acts = S.layer('ls-x2-acts');
  var sun = node(S, acts, 'ls-x2-sun', 880, 70, 150, 150, '0 0 140 140', SUN);
  var ground = S.layer('ls-x2-ground');
  ground.innerHTML = svg('0 0 1366 768', '<path d="M0 560Q300 470 640 560T1366 540V768H0Z" fill="#7cc36a"/><path d="M0 640Q400 590 820 650T1366 630V768H0Z" fill="#5fae55"/>', 'none');
  var gNight = full(S, ground, 'ls-x2-gnight', '<path d="M0 560Q300 470 640 560T1366 540V768H0Z" fill="#0e1a30" opacity=".5"/>');
  var sunStar = node(S, ground, 'ls-x2-sunstar', 583, 170, 200, 200, '0 0 200 200', '<path d="' + starPath(100, 100, 98) + '" fill="#ffe27a" opacity=".6"/><g transform="translate(30 30)">' + SUN + '</g>');
  S.lisaBox(80, 480, 190); S.edge('#8fd2ff', '#5fae55');
  function twinkle() { return S.anim(stars, [{ opacity: 1 }, { opacity: 0.45, offset: 0.5 }, { opacity: 1 }], 900); }
  return { promptBox: PROMPT, act: {
    intro: function () { return S.anim(sun, [{ opacity: 0, transform: S.T(0, 0, 0, 0.6) }, { opacity: 1, transform: S.T(0, 0, 0, 1) }], 700); },
    peek: function () { return S.fade(veil, 0.12, 1400).then(twinkle); },
    veilBack: function () { return S.fade(veil, 1, 1200); },
    sunset: function () {
      return Promise.all([move(S, sun, [S.T(0, 0), S.T(120, 520)], 2400), S.fade(dusk, 1, 1600), S.fade(veil, 0.55, 2400), S.fade(gNight, 1, 2400), S.edgeTo('#3a3f78', '#2f5a35', 2400)]);
    },
    starsOut: function () { return Promise.all([S.fade(veil, 0, 1500), S.fade(dusk, 0, 1500), S.edgeTo('#16224a', '#2f5a35', 1500)]).then(twinkle); },
    recap: function () { return S.anim(sunStar, [{ opacity: 0, transform: 'scale(.4)', easing: 'ease-out' }, { opacity: 1, transform: 'scale(1)' }], 900).then(function () { return S.pop(sunStar, 1.08); }); }
  }, tile: function (spec) {
    var sky = '<rect x="20" y="20" width="260" height="260" rx="20" fill="#8fd2ff"/><g transform="translate(180 30) scale(.6)">' + SUN + '</g>';
    if (spec.kind === 'starsYes') sky += [[70, 80, 14], [130, 150, 10], [60, 210, 12], [200, 200, 14], [240, 150, 9]].map(function (s) { return '<path d="' + starPath(s[0], s[1], s[2]) + '" fill="#fff6c2" stroke="#e0a416" stroke-width="3"/>'; }).join('');
    return tile(S, sky);
  } };
};

/* =====================================================================================================================
   19. Frog: eggs -> legless tadpoles -> back legs -> front legs + shorter tail -> frog hops onto a lily pad
   ===================================================================================================================== */
var TAD = '<path d="M48 30Q66 14 82 30T116 30" fill="none" stroke="#5a5644" stroke-width="9" stroke-linecap="round"/><ellipse cx="30" cy="30" rx="24" ry="18" fill="#3d3a2e"/><circle cx="22" cy="24" r="5" fill="#fff"/><circle cx="23" cy="24" r="2.4" fill="#111"/>';
var BACKLEGS = '<g fill="none" stroke="#4f6a3a" stroke-width="7" stroke-linecap="round"><path d="M62 62q8 18 22 20M54 64q2 20 14 26"/></g>';
var STAGE0 = '<g transform="translate(10 20)">' + TAD + '</g>';
var STAGE1 = BACKLEGS + STAGE0;
var STAGE2 = '<path d="M64 50Q78 42 92 50" fill="none" stroke="#5a5644" stroke-width="8" stroke-linecap="round"/>' + BACKLEGS + '<path d="M30 64l-6 16M44 66l2 16" stroke="#4f6a3a" stroke-width="6" stroke-linecap="round"/><ellipse cx="40" cy="50" rx="26" ry="19" fill="#5f8a3e"/><circle cx="32" cy="42" r="6" fill="#fff"/><circle cx="33" cy="42" r="3" fill="#111"/>';
var FROG = '<path d="M34 96q-22 4-26 18h40M126 96q22 4 26 18h-40" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="5" stroke-linejoin="round"/><ellipse cx="80" cy="78" rx="52" ry="34" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="5"/><ellipse cx="80" cy="92" rx="22" ry="10" fill="#bfe3a8"/><circle cx="56" cy="46" r="16" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="5"/><circle cx="104" cy="46" r="16" fill="#6fbf5b" stroke="#3f8a3a" stroke-width="5"/><circle cx="56" cy="46" r="6" fill="#222"/><circle cx="104" cy="46" r="6" fill="#222"/><path d="M58 80q22 14 44 0" fill="none" stroke="#2f6a2a" stroke-width="5" stroke-linecap="round"/>';
var EGG_AT = [[30, 60], [60, 40], [60, 80], [90, 25], [90, 60], [90, 95], [120, 40], [120, 80], [150, 25], [150, 60], [150, 95], [180, 45], [180, 80], [205, 62]];
A.scenes.x_frog = function (S) {
  var bg = S.layer('ls-x2-bg');
  bg.innerHTML = svg('0 0 1366 768', '<rect width="1366" height="330" fill="#cdeefc"/><rect y="330" width="1366" height="438" fill="#4fa3d6"/><path d="M0 330H1366" stroke="#fff" stroke-width="6" opacity=".6"/>' +
    '<g fill="#6fae4f"><path d="M1240 330Q1250 200 1262 330Z"/><path d="M1280 330Q1290 220 1300 330Z"/><path d="M420 330Q428 236 438 330Z"/></g>' +
    '<path d="M0 330H300Q360 330 380 420Q400 560 340 768H0Z" fill="#c9a27a"/><path d="M0 330H300Q340 334 352 380" fill="none" stroke="#a87953" stroke-width="6"/>' +
    '<ellipse cx="860" cy="332" rx="100" ry="20" fill="#5fae55" stroke="#3f8a3a" stroke-width="5"/><path d="M860 332L948 322" stroke="#4fa3d6" stroke-width="8"/>' +
    '<g fill="#7fc2e6" opacity=".7"><ellipse cx="560" cy="380" rx="60" ry="6"/><ellipse cx="1080" cy="420" rx="70" ry="6"/></g>', 'none');
  var acts = S.layer('ls-x2-acts');
  var strip = node(S, acts, 'ls-x2-strip', 380, 50, 600, 130, '0 0 600 130', '<rect x="4" y="4" width="592" height="122" rx="24" fill="#fff8e6" stroke="#e0c08a" stroke-width="5"/>' +
    '<circle cx="80" cy="65" r="26" fill="#e8f6fb" stroke="#9fcfe0" stroke-width="4"/><circle cx="80" cy="65" r="8" fill="#1d1d1d"/>' +
    '<path d="M150 65h50m-14-12l14 12-14 12M390 65h40m-14-12l14 12-14 12" stroke="#a87953" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<g transform="translate(240 35)">' + TAD + '</g><g transform="translate(450 14) scale(.7)">' + FROG + '</g>');
  var eggs = node(S, acts, 'ls-x2-eggs', 520, 440, 220, 120, '0 0 220 120', EGG_AT.map(function (e) { return '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="17" fill="#e8f6fb" fill-opacity=".75" stroke="#9fcfe0" stroke-width="3"/>'; }).join(''));
  var dots = node(S, acts, 'ls-x2-dots', 520, 440, 220, 120, '0 0 220 120', EGG_AT.map(function (e) { return '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="5" fill="#1d1d1d"/>'; }).join(''));
  var tadA = node(S, acts, 'ls-x2-tad', 520, 450, 120, 60, '0 0 120 60', TAD);
  var tadB = node(S, acts, 'ls-x2-tad', 570, 470, 120, 60, '0 0 120 60', TAD);
  var tadC = node(S, acts, 'ls-x2-tad', 620, 460, 120, 60, '0 0 120 60', TAD);
  var st1 = node(S, acts, 'ls-x2-stage', 560, 450, 160, 100, '0 0 160 100', STAGE1);
  var st2 = node(S, acts, 'ls-x2-stage', 560, 450, 160, 100, '0 0 160 100', STAGE2);
  var frog = node(S, acts, 'ls-x2-frog', 560, 440, 160, 120, '0 0 160 120', FROG);
  var fx = S.layer('ls-x2-front');
  full(S, fx, 'ls-x2-tint', '<path d="M360 334H1366V768H340Q400 560 380 420Q366 360 344 334Z" fill="#2f7fb8" opacity=".28"/>').style.opacity = '1';
  S.lisaBox(80, 480, 190); S.edge('#cdeefc', '#4fa3d6');
  var loops = [];
  function swim(n) { var l = wiggle(S, n, 650); if (l) loops.push(l); }
  function popAt(n, x, y, k) { return S.anim(n, [{ transform: S.T(x, y) }, { transform: S.T(x, y, 0, k), offset: 0.4, easing: 'ease-out' }, { transform: S.T(x, y) }], 420); }
  return { promptBox: PROMPT, act: {
    intro: function () { return Promise.all([show(S, eggs, 600), show(S, dots, 600)]); },
    hatch: function () {
      [tadA, tadB, tadC].forEach(swim);
      return Promise.all([S.fade(dots, 0, 600), S.fade(eggs, 0.3, 900),
        S.anim(tadA, [{ opacity: 0, transform: S.T(0, 0) }, { opacity: 1, transform: S.T(-60, 30), offset: 0.3 }, { opacity: 1, transform: S.T(-120, 90) }], 1600),
        S.anim(tadB, [{ opacity: 0, transform: S.T(0, 0) }, { opacity: 1, transform: S.T(-40, 30), offset: 0.4 }, { opacity: 1, transform: S.T(0, 0) }], 1600),
        S.anim(tadC, [{ opacity: 0, transform: S.T(0, 0) }, { opacity: 1, transform: S.T(80, 40), offset: 0.3 }, { opacity: 1, transform: S.T(280, 70) }], 1600)]);
    },
    legs: function () { swim(st1); return Promise.all([hide(S, tadA, 500), hide(S, tadC, 500), hide(S, eggs, 500), hide(S, tadB, 400), show(S, st1, 400)]); },
    front: function () { swim(st2); return Promise.all([hide(S, st1, 500), show(S, st2, 500)]); },
    jump: function () {
      loops.forEach(function (l) { try { l.cancel(); } catch (e) { /* gone */ } }); loops = [];
      return Promise.all([hide(S, st2, 300), show(S, frog, 300)]).then(function () {
        S.splash(fx, 700, 330, true);
        return S.anim(frog, [{ transform: S.T(0, 0), easing: 'ease-out' }, { transform: S.T(110, -330), easing: 'ease-in' }, { transform: S.T(220, -230) }], 1000);
      }).then(function () { return popAt(frog, 220, -230, 1.1); });
    },
    recap: function () { return show(S, strip, 600).then(function () { return S.pop(strip, 1.05); }).then(function () { return popAt(frog, 220, -230, 1.12); }); }
  }, tile: function (spec) {
    var water = '<rect x="20" y="150" width="260" height="130" rx="20" fill="#4fa3d6"/>';
    if (spec.kind === 'tadpole') return tile(S, water + '<g transform="translate(60 120) scale(1.5)">' + TAD + '</g>');
    return tile(S, water + '<g transform="translate(70 80)">' + FROG + '</g>');
  } };
};
})();
