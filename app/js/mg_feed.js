/* Lisa's Island - mini-game "feed" (world food). Lisa sits big at the left with a hungry mouth; six foods lie on a picnic cloth.
   A voice asks for one food, the child drags it into Lisa's mouth (chomp, her belly grows). Errorless: another food is eaten happily,
   named, and magically refilled, then the question repeats. Everything for this game stays in THIS file and css/mg_feed.css. */
(function () {
'use strict';
var el = Core.el, D = Core.D;
var ROUND = 6;
/* stage = the 136.6 x 76.8 rem frame, centred; positions in rem */
var LISA = { left: 6, top: 15, w: 50 };           /* height = w * 1.127 */
var MOUTH = { x: 31, y: 46.3, d: 28 };
var SLOTS = [[76, 46], [98, 46], [120, 46], [76, 65], [98, 65], [120, 65]];
var TILT = [-4, 3, -2, 3, -3, 4];

MG.register({
  id: 'feed', worlds: ['food'], title: 'Feed Lisa', color: '#ff7043', scene: 'meadow',
  icon: '<svg viewBox="0 0 100 100"><path d="M14 50 H86 Q86 84 50 84 Q14 84 14 50Z" fill="#fff"/><rect x="8" y="44" width="84" height="9" rx="4.5" fill="#fff"/><circle cx="36" cy="30" r="13" fill="#fff"/><rect x="34" y="12" width="4" height="9" rx="2" fill="#fff"/><path d="M62 22 q10 -10 18 -2 q-6 12 -18 2z" fill="#fff"/><path d="M26 62 q24 10 48 0" stroke="#000" stroke-opacity=".18" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  start: async function (root, ctx) {
    var targets = ctx.pickTargets('food', ROUND);
    ctx.chrome({ total: targets.length, lisa: false });
    var flow = ctx.flow, remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;

    var st = el('div', 'mgf-stage'); root.appendChild(st);
    var cloth = el('div', 'mgf-cloth'); st.appendChild(cloth);
    var lisa = ctx.placeLisa({ left: LISA.left * 10, top: LISA.top * 10, width: LISA.w * 10, cls: 'mgf-lisa', pose: 'tilt' });
    st.appendChild(lisa);
    var mouth = el('div', 'mgf-mouth'); st.appendChild(mouth);
    mouth.style.left = (MOUTH.x - MOUTH.d / 2) + 'rem'; mouth.style.top = (MOUTH.y - MOUTH.d / 2) + 'rem'; mouth.style.width = MOUTH.d + 'rem'; mouth.style.height = MOUTH.d + 'rem';

    var nodes = {}, handles = [], fat = 0, busy = false, resolveRound = null;
    function setBusy(on) { busy = on; handles.forEach(function (h) { h.disable(on); }); }

    targets.forEach(function (id, i) {
      var n = el('div', 'mgf-food'); n.dataset.id = id;
      n.style.left = (SLOTS[i][0] - 9) + 'rem'; n.style.top = (SLOTS[i][1] - 9) + 'rem'; n.style.setProperty('--tilt', TILT[i] + 'deg');
      n.appendChild(el('div', 'mgf-plate')); var inner = el('div', 'mgf-pic'); inner.appendChild(Core.Pic.el(D.items[id])); n.appendChild(inner);
      st.appendChild(n); nodes[id] = n;
      var h = MG.drag(n, {
        targets: [mouth], pad: 3 * remPx, lift: .72,
        onStart: function () { lisa.classList.add('mgf-open'); root.classList.add('mgf-dragging'); },
        onTap: function () { if (!busy && !ctx.prompting()) ctx.prompt([ctx.wordUrl(id)]); },
        onDrop: function (t) {
          lisa.classList.remove('mgf-open'); root.classList.remove('mgf-dragging');
          if (!t || busy || ctx.prompting()) return false;
          return eat(id, n, h);
        }
      });
      handles.push(h);
    });

    /* chomp: mouth open -> closed, chewing, happy eyes */
    async function chomp() {
      lisa.classList.add('mgf-open'); await flow.wait(260);
      lisa.classList.remove('mgf-open'); lisa.classList.add('mgf-chew', 'mgf-happy');
      await flow.wait(700);
      lisa.classList.remove('mgf-chew', 'mgf-happy');
    }
    function gulp(n) { n.style.transition = 'scale .26s ease-in, opacity .26s ease-in'; n.style.scale = '.12'; n.style.opacity = '0'; }
    function fatten() { fat++; lisa.className = lisa.className.replace(/\bmgf-f\d\b/g, '').trim() + ' mgf-f' + Math.min(fat, 6); }

    async function eat(id, n, h) {
      setBusy(true); gulp(n);
      if (id === ctx.target) {
        fatten(); chomp();
        await ctx.correct(n, id);
        n.style.display = 'none';
        setBusy(false); if (resolveRound) { var r = resolveRound; resolveRound = null; r(); }
      } else {
        chomp();
        await ctx.other(lisa, id, { ru: 'other', after: 2, replay: false });
        n.style.transition = ''; h.reset(); n.style.opacity = ''; n.classList.remove('mgf-pop'); void n.offsetWidth; n.classList.add('mgf-pop');
        setBusy(false);
        if (ctx.target && !ctx.finished) ctx.ask(ctx.target);
      }
      return false;
    }

    ctx.expose({ state: function () { return { fat: fat, busy: busy, left: Object.keys(nodes).filter(function (k) { return nodes[k].style.display !== 'none'; }) }; } });

    await ctx.intro();
    if (D.items.hungry && D.items.hungry[ctx.lang]) { lisa.react('tilt'); await ctx.say('hungry'); }
    return ctx.run({ targets: targets, intro: false, play: function (id) {
      ctx.setPromptTargets(Object.keys(nodes).filter(function (k) { return nodes[k].style.display !== 'none'; }).map(function (k) { return nodes[k]; }));
      ctx.setTargetNode(nodes[id]);
      return new Promise(function (res) { resolveRound = res; });
    } });
  }
});
})();
