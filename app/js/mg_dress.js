/* Lisa's Island - mini-game "dress" (world clothes). Lisa stands big; six clothes hang on a line. A voice names one piece, the child drags it onto Lisa:
   it snaps to its body spot and stays on (the art is drawn INSIDE Lisa's svg, so it hops/dances with her), Lisa twirls. Errorless: a wrong piece says
   its own name and wiggles back to the line. End: Lisa fully dressed dances. Everything for this game stays in THIS file and css/mg_dress.css. */
(function () {
'use strict';
var el = Core.el, D = Core.D, NS = 'http://www.w3.org/2000/svg';
var ROUND = 6;
var LISA = { left: 12, top: 15, w: 50 };                 /* rem; box = w x w*1.127; svg viewBox 240 x 270 */
/* where each piece sits on Lisa, in her svg coordinates: [x, y, size, mirror]. layer: drawn before the head (body) or after it (head) */
var WEAR = {
  socks:  { layer: 'body', z: 1, parts: [[120, 246, 84]] },
  coat:   { layer: 'body', z: 2, parts: [[120, 208, 150]] },
  dress:  { layer: 'body', z: 3, parts: [[120, 228, 92]] },
  shoe:   { layer: 'body', z: 4, parts: [[90, 252, 56], [150, 252, 56, 1]] },
  gloves: { layer: 'body', z: 5, parts: [[58, 224, 50], [182, 224, 50, 1]] },
  scarf:  { layer: 'head', z: 6, parts: [[120, 196, 88]] },
  cap:    { layer: 'head', z: 7, parts: [[120, 46, 118]] }
};
/* two clothes lines, three pegs each: centre x/y of the hanging piece (rem) */
var SLOTS = [[82, 36], [101, 36], [120, 36], [82, 63], [101, 63], [120, 63]];

MG.register({
  id: 'dress', worlds: ['clothes'], title: 'Dress Lisa', color: '#ab47bc', scene: 'meadow',
  icon: '<svg viewBox="0 0 100 100"><path d="M34 14 L50 24 L66 14 L88 30 L76 46 L68 40 L68 86 H32 V40 L24 46 L12 30 Z" fill="#fff"/><path d="M42 14 Q50 30 58 14" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="52" r="3.5" fill="#000" fill-opacity=".2"/><circle cx="50" cy="66" r="3.5" fill="#000" fill-opacity=".2"/></svg>',
  start: async function (root, ctx) {
    var pool = Object.keys(WEAR);
    var targets = ctx.pickTargets('clothes', ROUND, { pool: pool });
    ctx.chrome({ total: targets.length, lisa: false });
    var flow = ctx.flow, remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;

    var st = el('div', 'mgd-stage'); root.appendChild(st);
    /* the clothes lines */
    [30, 57].forEach(function (y) {
      var r = el('div', 'mgd-rope'); r.style.top = y + 'rem'; st.appendChild(r);
    });
    ['mgd-pole l', 'mgd-pole r'].forEach(function (c) { st.appendChild(el('div', c)); });
    var lisa = ctx.placeLisa({ left: LISA.left * 10, top: LISA.top * 10, width: LISA.w * 10, cls: 'mgd-lisa', pose: 'tilt' });
    st.appendChild(lisa);

    /* worn layers inside Lisa's svg: body pieces go BEFORE the head (head stays on top of a coat), head pieces after it */
    var svg = lisa.querySelector('svg'), head = svg.querySelector('.head'), layers = {};
    Object.keys(WEAR).sort(function (a, b) { return WEAR[a].z - WEAR[b].z; }).forEach(function (k) {
      var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'mgd-wear mgd-wear-' + k);
      if (WEAR[k].layer === 'body') head.parentNode.insertBefore(g, head); else svg.appendChild(g);
      layers[k] = g;
    });
    function wear(id) {
      var w = WEAR[id], g = layers[id];
      w.parts.forEach(function (p) {
        var im = document.createElementNS(NS, 'image'), host = g;
        im.setAttribute('href', D.items[id].pic.src);
        im.setAttribute('x', p[0] - p[2] / 2); im.setAttribute('y', p[1] - p[2] / 2); im.setAttribute('width', p[2]); im.setAttribute('height', p[2]);
        im.setAttribute('class', 'mgd-on');
        if (p[3]) { host = document.createElementNS(NS, 'g'); host.setAttribute('transform', 'translate(' + (p[0] * 2) + ' 0) scale(-1 1)'); g.appendChild(host); }
        host.appendChild(im);
      });
    }
    /* screen centre of a body spot (for the snap) */
    function spotPx(id) {
      var r = lisa.getBoundingClientRect(), k = r.width / 240, p = WEAR[id].parts[0], q = WEAR[id].parts[1];
      var x = q ? (p[0] + q[0]) / 2 : p[0], y = q ? (p[1] + q[1]) / 2 : p[1];
      return { x: r.left + x * k, y: r.top + y * k };
    }

    var nodes = {}, handles = [], busy = false, resolveRound = null;
    function setBusy(on) { busy = on; handles.forEach(function (h) { h.disable(on); }); }

    targets.forEach(function (id, i) {
      var n = el('div', 'mgd-cloth'); n.dataset.id = id;
      n.style.left = (SLOTS[i][0] - 9.5) + 'rem'; n.style.top = (SLOTS[i][1] - 11) + 'rem';
      n.appendChild(el('div', 'mgd-peg')); var inner = el('div', 'mgd-pic'); inner.appendChild(Core.Pic.el(D.items[id])); n.appendChild(inner);
      st.appendChild(n); nodes[id] = n;
      var h = MG.drag(n, {
        targets: [lisa], pad: 2 * remPx, lift: 1.05,
        onTap: function () { if (!busy) ctx.say(id); },
        onDrop: function (t) {
          if (!t || busy) return false;
          return drop(id, n, h);
        }
      });
      handles.push(h);
    });

    async function drop(id, n, h) {
      setBusy(true);
      if (id === ctx.target) {
        /* snap to the body spot, then the real worn art takes over */
        var c = n.getBoundingClientRect(), s = spotPx(id), m = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(n.style.translate || '') || [0, 0, 0];
        n.style.transition = 'translate .28s ease-out, scale .28s ease-out, opacity .2s .1s';
        n.style.translate = (parseFloat(m[1]) + s.x - (c.left + c.width / 2)) + 'px ' + (parseFloat(m[2]) + s.y - (c.top + c.height / 2)) + 'px';
        n.style.scale = '.45';
        await flow.wait(300);
        wear(id); n.style.opacity = '0'; n.style.display = 'none';
        await ctx.correct(lisa, id);
        setBusy(false); if (resolveRound) { var r = resolveRound; resolveRound = null; r(); }
      } else {
        await ctx.other(n, id, { ru: 'other', after: 99, replay: false });
        setBusy(false);
        if (ctx.target && !ctx.finished) ctx.ask(ctx.target);
      }
      return false;                                       /* wrong piece: wiggles back to the line */
    }

    ctx.expose({ state: function () { return { busy: busy, left: Object.keys(nodes).filter(function (k) { return nodes[k].style.display !== 'none'; }), worn: svg.querySelectorAll('.mgd-on').length }; } });

    await ctx.intro();
    return ctx.run({ targets: targets, intro: false, play: async function (id, i) {
      ctx.setTargetNode(nodes[id]);
      await new Promise(function (res) { resolveRound = res; });
      if (i === targets.length - 1) { lisa.pose('dance'); await flow.wait(2400); lisa.pose('idle'); }
    } });
  }
});
})();
