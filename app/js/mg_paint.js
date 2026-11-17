/* Lisa's Island - mini-game "paint" (world colors). A big line drawing with six blank white shapes and six paint pots.
   The voice names a colour -> the child taps that pot (brush dips, takes the colour) -> taps any blank shape -> it floods with that colour.
   Errorless: a wrong pot wiggles and says its own colour, then the question repeats. Looks: css/mg_paint.css (every selector .mg-paint). */
(function () {
'use strict';
var D = Core.D, el = Core.el, Snd = Core.Snd, tap = Core.tap;
var ROUND = 6;
/* the six blank shapes, drawn in a 1000 x 410 box (1 unit = 0.1 rem; every shape is wider than 9.6 rem) */
var SHAPES = [
  { k: 'sun', tag: 'circle', a: 'cx="860" cy="108" r="64"' },
  { k: 'wall', tag: 'rect', a: 'x="190" y="208" width="260" height="162" rx="8"' },
  { k: 'roof', tag: 'polygon', a: 'points="158,214 320,92 482,214"' },
  { k: 'crown', tag: 'circle', a: 'cx="650" cy="172" r="92"' },
  { k: 'ball', tag: 'circle', a: 'cx="790" cy="326" r="50"' },
  { k: 'flower', tag: 'circle', a: 'cx="925" cy="288" r="54"' }
];
function geo(s, extra) { return '<' + s.tag + ' ' + s.a + ' ' + (extra || '') + '/>'; }
function lighten(hex, f) {
  var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
  var n = parseInt(m[1], 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { return Math.round(v + (255 - v) * f); });
  return 'rgb(' + c.join(',') + ')';
}
var POT = '<svg viewBox="0 0 100 112"><ellipse cx="50" cy="104" rx="38" ry="7" fill="rgba(0,0,0,.16)"/>' +
  '<path d="M14 40 H86 V92 Q86 102 76 102 H24 Q14 102 14 92Z" fill="#fff" stroke="#90a4ae" stroke-width="3"/>' +
  '<path d="M21 56 H79 V90 Q79 96 72 96 H28 Q21 96 21 90Z" class="pp-fill"/>' +
  '<path d="M26 58 H40 V90 H30 Q26 90 26 86Z" fill="#fff" opacity=".28"/>' +
  '<ellipse cx="50" cy="40" rx="36" ry="11" fill="#eceff1" stroke="#90a4ae" stroke-width="3"/>' +
  '<ellipse cx="50" cy="40" rx="29" ry="7.5" class="pp-fill"/><ellipse cx="38" cy="38" rx="9" ry="2.6" fill="#fff" opacity=".45"/></svg>';
var BRUSH = '<svg viewBox="0 0 60 160"><rect x="23" y="2" width="14" height="90" rx="7" fill="#ffb74d" stroke="#e65100" stroke-width="2"/>' +
  '<rect x="18" y="88" width="24" height="26" rx="3" fill="#cfd8dc" stroke="#78909c" stroke-width="2"/>' +
  '<path d="M18 114 H42 C46 134 40 150 30 158 C20 150 14 134 18 114Z" class="pb-bristle"/><path d="M24 118 H29 C29 134 28 146 25 150 C22 140 22 128 24 118Z" fill="#fff" opacity=".35"/></svg>';

MG.register({
  id: 'paint', worlds: ['colors'], title: 'Paint', color: '#ab47bc', scene: 'meadow',
  icon: '<svg viewBox="0 0 100 100"><path d="M50 12 C20 12 6 36 10 58 C14 82 40 92 54 86 C66 80 56 70 64 64 C74 58 92 66 92 46 C92 24 76 12 50 12Z" fill="#fff"/><circle cx="30" cy="38" r="8" fill="#ef5350"/><circle cx="50" cy="28" r="8" fill="#ffee58"/><circle cx="72" cy="36" r="8" fill="#42a5f5"/><circle cx="28" cy="62" r="8" fill="#66bb6a"/></svg>',
  start: function (root, ctx) {
    var flow = ctx.flow;
    var targets = ctx.pickTargets('colors', ROUND, { exclude: ['white'] });   /* white paint is invisible on the white shapes */
    var total = targets.length;
    ctx.chrome({ total: total });
    var uid = 'ptc' + Math.floor(Math.random() * 1e6);

    /* ----- the picture ----- */
    var panel = el('div', 'pt-panel'); root.appendChild(panel);
    var defs = '', groups = '';
    SHAPES.forEach(function (s, i) {
      defs += '<clipPath id="' + uid + i + '">' + geo(s) + '</clipPath>';
      groups += '<g class="pt-shape" data-i="' + i + '">' + geo(s, 'class="pt-base" fill="#fff"') +
        '<g clip-path="url(#' + uid + i + ')" pointer-events="none"><circle class="pt-fa" cx="0" cy="0" r="0"/><circle class="pt-fb" cx="0" cy="0" r="0"/></g>' +
        geo(s, 'class="pt-line" fill="none" stroke="#5d4037" stroke-width="7" stroke-linejoin="round" pointer-events="none"') + '</g>';
    });
    var rays = '';
    for (var r = 0; r < 10; r++) { var an = r * Math.PI / 5; rays += '<line x1="' + (860 + Math.cos(an) * 80) + '" y1="' + (108 + Math.sin(an) * 80) + '" x2="' + (860 + Math.cos(an) * 104) + '" y2="' + (108 + Math.sin(an) * 104) + '"/>'; }
    panel.innerHTML = '<svg class="pt-svg" viewBox="0 0 1000 410" xmlns="http://www.w3.org/2000/svg"><defs>' + defs + '</defs>' +
      '<rect width="1000" height="410" fill="#e8f5ff"/>' +
      '<g fill="#fff" opacity=".9" pointer-events="none"><ellipse cx="90" cy="70" rx="60" ry="24" fill="#cfe9fb"/><ellipse cx="130" cy="56" rx="40" ry="22" fill="#cfe9fb"/><ellipse cx="560" cy="48" rx="56" ry="20" fill="#cfe9fb"/></g>' +
      '<g stroke="#ffb300" stroke-width="9" stroke-linecap="round" pointer-events="none">' + rays + '</g>' +
      '<path d="M0 372 Q250 346 500 372 T1000 372 V410 H0Z" fill="#9ccc65" pointer-events="none"/>' +
      '<rect x="620" y="250" width="60" height="126" fill="#8d6e63" stroke="#5d4037" stroke-width="6" pointer-events="none"/>' +
      '<rect x="918" y="338" width="14" height="40" fill="#66bb6a" pointer-events="none"/><ellipse cx="898" cy="360" rx="22" ry="9" fill="#66bb6a" pointer-events="none"/>' +
      groups +
      '<g pointer-events="none"><rect x="290" y="282" width="62" height="88" rx="6" fill="#a1887f" stroke="#5d4037" stroke-width="5"/><circle cx="337" cy="330" r="5" fill="#ffe082"/>' +
      '<rect x="378" y="246" width="46" height="46" rx="4" fill="#bbdefb" stroke="#5d4037" stroke-width="5"/><path d="M401 246 V292 M378 269 H424" stroke="#5d4037" stroke-width="4"/>' +
      '<circle cx="925" cy="288" r="19" fill="#ffeb3b" stroke="#5d4037" stroke-width="5"/>' +
      '<path d="M752 316 Q790 340 828 316 M768 290 Q790 326 812 362" stroke="#5d4037" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/></g></svg>';
    var svg = panel.querySelector('.pt-svg');
    var shapes = [].slice.call(panel.querySelectorAll('.pt-shape'));

    /* ----- pots + brush ----- */
    var row = el('div', 'pt-row'); root.appendChild(row);
    var potNode = {}, order = targets.slice(); Core.shuffle(order);
    order.forEach(function (id) {
      var it = D.items[id], hex = it.pic.hex;
      var p = el('div', 'pt-pot', '<span class="pt-pi">' + POT + '</span>'); p.dataset.id = id; p.style.setProperty('--c', hex);
      potNode[id] = p; row.appendChild(p);
    });
    var brush = el('div', 'pt-brush', BRUSH); root.appendChild(brush);

    var stage = 'idle', cur = null, painted = 0, loaded = null, busy = false, roundDone = null, askT = 0;
    function toRem(u) { return u / 10 + 'rem'; }
    function brushAt(x, y, anim) {   /* x,y = tip position in units (1366 x 768 frame) */
      brush.classList.toggle('pt-fly', !!anim);
      brush.style.left = toRem(x - 30); brush.style.top = toRem(y - 160);
    }
    var REST = { x: 1285, y: 520 };
    function unitsOf(cx, cy) { var f = document.getElementById('frame').getBoundingClientRect(); return { x: (cx - f.left) / f.width * 1366, y: (cy - f.top) / f.height * 768 }; }
    function tween(ms, fn) {
      return new Promise(function (res) {
        if (flow.dead) return res();
        var t0 = performance.now(), d = Math.max(30, ms / Core.speed);
        (function f(t) { if (flow.dead) return res(); var k = Math.min(1, (t - t0) / d); fn(k); if (k < 1) requestAnimationFrame(f); else res(); })(t0);
      });
    }

    /* ----- the question: wrong pot = wiggle + its own name, then the question again ----- */
    function repeatAsk() {
      var my = ++askT;
      var promptGen = ctx.promptGen();
      setTimeout(function () { if (my === askT && stage === 'pot' && cur && !busy && !flow.dead && !ctx.prompting() && ctx.promptGen() === promptGen) ctx.ask(cur); }, 900 / Core.speed);
    }
    async function onPot(id) {
      if (busy || ctx.prompting() || ctx.finished || stage === 'idle') return;
      var node = potNode[id];
      if (stage === 'paint') {    /* brush is loaded: other pots just say their name (errorless) */
        ctx.wiggle(node, 'mgwig'); Snd.say([ctx.wordUrl(id)]); return;
      }
      if (stage !== 'pot') return;
      if (id !== cur) { ctx.other(node, id).then(repeatAsk); return; }
      busy = true; stage = 'dip'; askT++;
      var item = cur, hex = D.items[item].pic.hex;
      var pr = ctx.correct(node, item);
      node.classList.add('dipped');
      var pr2 = dip(node, hex);
      await Promise.all([pr, pr2]);
      ctx.setTarget(null);
      stage = 'paint'; loaded = hex; busy = false; root.classList.add('pt-armed'); armedAt = Core.inputSeq;
    }
    async function dip(node, hex) {
      brush.style.setProperty('--c', hex);
      var f = document.getElementById('frame').getBoundingClientRect(), r = node.getBoundingClientRect();
      var u = unitsOf(r.left + r.width / 2, r.top + r.height * 0.28);
      brush.classList.remove('pt-on'); brushAt(u.x, u.y - 160, false); void brush.offsetWidth;
      brush.classList.add('pt-on', 'pt-fly'); brushAt(u.x, u.y + 10, true);
      Snd.sfx('pop');
      await flow.wait(420);
      brushAt(REST.x, REST.y, true);
      await flow.wait(420);
      brush.classList.add('pt-bob');
    }

    /* ----- a shape is tapped ----- */
    async function onShape(i, e) {
      if (busy || ctx.prompting() || ctx.finished) return;
      var g = shapes[i];
      if (g.classList.contains('painted')) { ctx.wiggle(g, 'mgwig'); return; }
      if (stage === 'pot') {      /* no paint yet: gently point back at the pots (no penalty) */
        ctx.wiggle(potNode[cur], 'mgpeek'); ctx.ask(cur); return;
      }
      if (stage !== 'paint') return;
      busy = true; stage = 'fill'; root.classList.remove('pt-armed'); brush.classList.remove('pt-bob');
      var hex = loaded, rect = svg.getBoundingClientRect();
      var sx = Core.clamp((e.clientX - rect.left) / rect.width * 1000, 0, 1000), sy = Core.clamp((e.clientY - rect.top) / rect.height * 410, 0, 410);
      var u = unitsOf(e.clientX, e.clientY);
      brushAt(u.x + 10, u.y + 6, true);
      await flow.wait(260);
      await flood(g, hex, sx, sy);
      brush.classList.remove('pt-on', 'pt-fly'); loaded = null;
      painted++;
      var last = painted >= total;
      if (last) await finale();
      busy = false; stage = 'idle';
      if (roundDone) { var d = roundDone; roundDone = null; d(); }
    }
    async function flood(g, hex, x, y) {
      var a = g.querySelector('.pt-fa'), b = g.querySelector('.pt-fb');
      [a, b].forEach(function (c) { c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 0); });
      a.style.fill = lighten(hex, .5); b.style.fill = hex;
      Snd.sfx('pop');
      g.classList.add('painted');
      var pos = FX.pt(g);
      FX.burst(pos.x, pos.y, { n: 16, shapes: ['dot', 'dot', 'star'], colors: [hex, lighten(hex, .45), '#ffffff'], power: .8 });
      if (g.animate) { try { g.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(.98)' }, { transform: 'scale(1)' }], { duration: 650 / Core.speed }); } catch (x2) { /* none */ } }
      await tween(700, function (k) {
        var ea = 1 - Math.pow(1 - k, 3), kb = Math.max(0, (k - .16) / .84), eb = 1 - Math.pow(1 - kb, 3);
        a.setAttribute('r', ea * 520); b.setAttribute('r', eb * 520);
      });
      Snd.sfx('good');
      await flow.wait(300);
    }
    async function finale() {
      FX.rain(flow, 2600, 3);
      panel.classList.add('pt-party');
      shapes.forEach(function (g, k) { setTimeout(function () { if (flow.dead) return; var p = FX.pt(g); FX.burst(p.x, p.y, { n: 12, big: true }); Snd.sfx('ding', k + 1); }, (k * 260) / Core.speed); });
      await flow.wait(2200);
    }

    /* idle hint in the painting stage: after 9 s without a touch, a blank shape wiggles */
    var armedAt = 0, still = 0;
    flow.every(1000, function () {
      if (stage !== 'paint' || busy) { still = 0; return; }
      if (armedAt !== Core.inputSeq) { armedAt = Core.inputSeq; still = 0; return; }
      if (Snd.busy()) return;
      still += 1000;
      if (still >= 9000) { still = 0; var blanks = shapes.filter(function (g) { return !g.classList.contains('painted'); }); if (blanks.length) ctx.wiggle(blanks[Core.rnd(blanks.length)], 'mgpeek'); }
    });

    /* brush follows a finger / mouse while it is loaded and idle */
    function follow(e) {
      if (stage !== 'paint' || busy) return;
      var u = unitsOf(e.clientX, e.clientY); brush.classList.remove('pt-bob', 'pt-fly'); brushAt(u.x + 10, u.y + 6, false);
    }
    root.addEventListener('pointermove', follow);

    Object.keys(potNode).forEach(function (id) { tap(potNode[id], function () { onPot(id); }, { nopress: true }); });
    shapes.forEach(function (g, i) { tap(g, function (e) { onShape(i, e); }, { nopress: true, silent: true }); });

    ctx.expose({ state: function () { return { stage: stage, painted: painted, loaded: loaded, pots: order.slice() }; } });

    ctx.run({
      targets: targets,
      play: function (item) {
        cur = item; stage = 'pot'; busy = false;
        ctx.setPromptTargets(Object.keys(potNode).map(function (id) { return potNode[id]; }));
        ctx.setTarget(item, potNode[item]);
        return new Promise(function (res) { roundDone = res; });
      }
    });
  }
});
})();
