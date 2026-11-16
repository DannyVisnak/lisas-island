/* Lisa's Island - mini-game "bus" (world transport): "Drive the bus". A cute bus (own SVG, Lisa at the wheel) drives right along a road while the scenery scrolls.
   Three bus stops with big picture signs slide in; the voice names a place ("Onde esta a praia?"); the child taps the right stop, the bus pulls in, the
   doors open, a little animal hops out and waves, the bus drives on. Errorless: a wrong stop says its own name and the bus honks softly.
   5 stops per ride, then mg_bus_done. Everything for this game lives in THIS file and css/mg_bus.css. */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap;

var STOPS_PER_RIDE = 5;
var PLACES = ['beach', 'sea', 'tree', 'flower', 'shell', 'sun', 'house', 'bed', 'bath', 'tv', 'door', 'boat'];   /* items with a picture + clips (nature / home / transport) */
var PAX = ['cat', 'dog', 'rabbit', 'mouse', 'pig', 'duck', 'frog', 'horse', 'cow', 'lion', 'bird'];             /* passengers: animals with a picture */
var STOP_X = [62, 92, 122];       /* rem: sign centres */
var DOOR_X = 35;                  /* rem: the bus door */
var OFF_X = 112;                  /* rem: stops waiting off screen right */

function uri(svg) { return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")'; }
function svgWrap(w, h, body, none) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '"' + (none ? ' preserveAspectRatio="none"' : '') + '>' + body + '</svg>'; }
function tree(x, r, y) { return '<rect x="' + (x - 7) + '" y="' + (y + r * .6) + '" width="14" height="' + (200 - y - r * .6) + '" rx="5" fill="#8d6e63"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#4caf50"/><circle cx="' + (x - r * .35) + '" cy="' + (y - r * .25) + '" r="' + (r * .5) + '" fill="#66bb6a"/>'; }
var TILE = {
  far: svgWrap(1200, 240, '<path d="M0 150 Q150 50 300 150 T600 150 T900 150 T1200 150 V240 H0Z" fill="#b5e3a8"/><path d="M0 190 Q200 110 400 190 T800 190 T1200 190 V240H0Z" fill="#9bd98c"/>', true),
  mid: svgWrap(1000, 200, tree(80, 46, 96) + tree(230, 34, 118) +
    '<path d="M380 60 L420 150 H340Z M380 100 L428 188 H332Z" fill="#2e7d32"/><rect x="373" y="186" width="14" height="14" fill="#6d4c41"/>' +
    '<rect x="470" y="110" width="104" height="90" rx="8" fill="#ffe0b2"/><path d="M456 112 L522 56 L588 112Z" fill="#e57373"/><rect x="506" y="146" width="28" height="54" rx="6" fill="#8d6e63"/><rect x="484" y="128" width="20" height="20" rx="4" fill="#81d4fa"/><rect x="540" y="128" width="20" height="20" rx="4" fill="#81d4fa"/>' +
    tree(700, 50, 92) + '<circle cx="820" cy="170" r="30" fill="#66bb6a"/><circle cx="850" cy="176" r="24" fill="#4caf50"/>' + tree(930, 40, 104)),
  near: svgWrap(1000, 100, '<circle cx="70" cy="100" r="40" fill="#43a047"/><circle cx="130" cy="108" r="30" fill="#66bb6a"/><circle cx="330" cy="104" r="36" fill="#43a047"/><circle cx="560" cy="106" r="34" fill="#66bb6a"/><circle cx="610" cy="102" r="40" fill="#43a047"/><circle cx="850" cy="104" r="38" fill="#43a047"/><circle cx="910" cy="110" r="28" fill="#66bb6a"/>' +
    '<circle cx="220" cy="70" r="7" fill="#f48fb1"/><circle cx="250" cy="78" r="6" fill="#fff"/><circle cx="450" cy="72" r="7" fill="#fff59d"/><circle cx="740" cy="68" r="7" fill="#f48fb1"/><circle cx="780" cy="76" r="6" fill="#fff"/>'),
  dash: svgWrap(240, 40, '<rect x="40" y="14" width="120" height="12" rx="6" fill="#fff"/>'),
  walk: svgWrap(200, 60, '<path d="M100 0 V60" stroke="rgba(0,0,0,.14)" stroke-width="4"/>')
};
var BUS_MINI = '<svg viewBox="0 0 100 60"><rect x="8" y="8" width="84" height="38" rx="10" fill="#fff"/><rect x="16" y="15" width="16" height="13" rx="3" fill="#039be5"/><rect x="38" y="15" width="16" height="13" rx="3" fill="#039be5"/><rect x="60" y="15" width="24" height="13" rx="3" fill="#039be5"/><circle cx="28" cy="49" r="8" fill="#fff"/><circle cx="72" cy="49" r="8" fill="#fff"/></svg>';

/* the bus: viewBox 440 x 200, faces right, wheels at (92,158) and (330,158), door x 262..318 */
var BUS_SVG = '<svg viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg">' +
  '<ellipse cx="215" cy="190" rx="205" ry="9" fill="#000" opacity=".16"/>' +
  '<g class="mgbus-body">' +
  '<rect x="8" y="26" width="404" height="128" rx="34" fill="#ffa726"/>' +
  '<rect x="32" y="26" width="356" height="15" rx="7" fill="#ffcc80"/>' +
  '<rect x="9" y="104" width="402" height="18" fill="#fff"/><rect x="9" y="122" width="402" height="8" fill="#e53935"/>' +
  '<g fill="#b3e5fc" stroke="#fff" stroke-width="5"><rect x="34" y="54" width="62" height="46" rx="12"/><rect x="110" y="54" width="62" height="46" rx="12"/><rect x="186" y="54" width="62" height="46" rx="12"/></g>' +
  '<path d="M44 66 L70 62 M120 66 L146 62 M196 66 L222 62" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>' +
  '<rect x="262" y="50" width="56" height="86" rx="10" fill="#37474f"/>' +
  '<g class="mgbus-door"><rect x="262" y="50" width="56" height="86" rx="10" fill="#81d4fa" stroke="#fff" stroke-width="5"/><rect x="274" y="62" width="32" height="34" rx="7" fill="#b3e5fc"/><path d="M290 50 V136" stroke="#fff" stroke-width="4"/></g>' +
  '<rect x="334" y="52" width="62" height="56" rx="16" fill="#b3e5fc" stroke="#fff" stroke-width="5"/>' +
  '<g class="mgbus-driver"><path d="M352 66 L356 50 L366 62Z M384 66 L380 50 L370 62Z" fill="#ff9b3d"/><ellipse cx="368" cy="82" rx="19" ry="17" fill="#ff9b3d"/><ellipse cx="368" cy="90" rx="12" ry="8" fill="#fff4e0"/><circle cx="361" cy="79" r="3" fill="#6b3b1d"/><circle cx="375" cy="79" r="3" fill="#6b3b1d"/><ellipse cx="368" cy="86" rx="3.4" ry="2.4" fill="#6b3b1d"/></g>' +
  '<circle cx="398" cy="140" r="11" fill="#fff59d" stroke="#fff" stroke-width="4"/><circle cx="20" cy="134" r="8" fill="#ef5350"/>' +
  '<rect x="378" y="148" width="40" height="10" rx="5" fill="#546e7a"/>' +
  '</g>' +
  '<g class="mgbus-wheel"><circle cx="92" cy="158" r="33" fill="#263238"/><g class="wh"><circle cx="92" cy="158" r="27" fill="#455a64"/><circle cx="92" cy="158" r="12" fill="#cfd8dc"/><path d="M92 134 V182 M68 158 H116" stroke="#cfd8dc" stroke-width="5" stroke-linecap="round"/></g></g>' +
  '<g class="mgbus-wheel"><circle cx="330" cy="158" r="33" fill="#263238"/><g class="wh"><circle cx="330" cy="158" r="27" fill="#455a64"/><circle cx="330" cy="158" r="12" fill="#cfd8dc"/><path d="M330 134 V182 M306 158 H354" stroke="#cfd8dc" stroke-width="5" stroke-linecap="round"/></g></g>' +
  '</svg>';

MG.register({
  id: 'bus', worlds: ['transport'], title: 'Bus', color: '#ef6c00', scene: 'meadow',
  icon: '<svg viewBox="0 0 100 100"><rect x="8" y="22" width="84" height="52" rx="12" fill="#fff"/><rect x="16" y="30" width="16" height="16" rx="3" fill="#000" fill-opacity=".22"/><rect x="38" y="30" width="16" height="16" rx="3" fill="#000" fill-opacity=".22"/><rect x="60" y="30" width="24" height="16" rx="3" fill="#000" fill-opacity=".22"/><rect x="8" y="54" width="84" height="6" fill="#000" fill-opacity=".14"/><circle cx="28" cy="76" r="10" fill="#fff"/><circle cx="72" cy="76" r="10" fill="#fff"/><circle cx="28" cy="76" r="5" fill="#000" fill-opacity=".35"/><circle cx="72" cy="76" r="5" fill="#000" fill-opacity=".35"/></svg>',
  start: function (root, ctx) {
    var flow = ctx.flow, lang = ctx.lang;
    ctx.chrome({ total: STOPS_PER_RIDE, lisa: false });

    /* ---- the world: scrolling layers, road, sidewalk ---- */
    function layer(cls, tile, top, h, tw, dur) {
      var d = el('div', 'mgbus-l ' + cls); d.style.top = top + 'rem'; d.style.height = h + 'rem';
      d.style.backgroundImage = uri(tile); d.style.backgroundSize = tw + 'rem 100%'; d.style.setProperty('--tw', tw + 'rem'); d.style.animationDuration = dur + 's';
      root.appendChild(d); return d;
    }
    layer('mgbus-far', TILE.far, 27, 26, 120, 40);
    layer('mgbus-mid', TILE.mid, 33, 20, 100, 14);
    root.appendChild(el('div', 'mgbus-ground'));
    layer('mgbus-walk', TILE.walk, 47, 6, 20, .8);
    root.appendChild(el('div', 'mgbus-road'));
    layer('mgbus-dash', TILE.dash, 60, 4, 24, 1);
    var stopsBox = el('div', 'mgbus-stops'); root.appendChild(stopsBox);
    var bus = el('div', 'mgbus-bus', BUS_SVG); root.appendChild(bus);
    var paxBox = el('div', 'mgbus-paxbox'); root.appendChild(paxBox);
    layer('mgbus-near', TILE.near, 69.5, 10, 100, 4);

    /* ---- helpers ---- */
    function dur(ms) { return Math.max(40, ms / Core.speed); }
    function go(on) { root.classList.toggle('mgbus-go', !!on); }
    function slide(node, from, to, ms, easing) {
      return new Promise(function (res) {
        node.style.transform = 'translateX(' + to + 'rem)';
        if (!node.animate) { res(); return; }
        var a = node.animate([{ transform: 'translateX(' + from + 'rem)' }, { transform: 'translateX(' + to + 'rem)' }], { duration: dur(ms), easing: easing || 'ease-in-out' });
        a.onfinish = res; a.oncancel = res;
      });
    }
    function honk() { Snd.tone(392, .12, { type: 'square', v: .07 }); Snd.tone(330, .16, { type: 'square', v: .07, at: .16 }); }
    function bump(n) { bus.classList.remove('mgbus-bump'); void bus.offsetWidth; bus.classList.add('mgbus-bump'); }
    function makeStop(id, cx) {
      var s = el('div', 'mgbus-stop'); s.dataset.id = id; s.style.left = (cx - 11) + 'rem';
      s.innerHTML = '<div class="mgbus-sign"><div class="mgbus-band">' + BUS_MINI + '</div><div class="mgbus-pic"></div></div><div class="mgbus-pole"></div><div class="mgbus-base"></div>';
      s.querySelector('.mgbus-pic').appendChild(Core.Pic.el(Core.item(id)));
      return s;
    }

    /* ---- the ride ---- */
    var targets = ctx.pickTargets(['nature', 'home', 'transport'], STOPS_PER_RIDE, { pool: PLACES });
    var active = false, cur = null, onRight = null, wrongs = 0, shifted = 0;
    var paxIds = Core.shuffle(PAX.filter(function (p) { return D.items[p]; }));
    ctx.onHelp(function () { if (cur) ctx.wiggle(cur.nodes[cur.item], 'mgpeek'); });

    async function onTap(id, node) {
      if (!active || !cur) return;
      if (id === cur.item) { active = false; ctx.setTargetNode(null); if (onRight) onRight(node); return; }
      /* errorless: the sign says its own name, the bus honks softly */
      wrongs++;
      ctx.wiggle(node, 'mgwig'); honk(); bump();
      var other = ctx.other(node, id);
      await other;
      if (cur && active) { await flow.wait(250); if (active && cur) ctx.ask(cur.item); }
    }

    async function ride(item, i) {
      var ids = Core.shuffle(Core.choices(lang, item, 3, PLACES.filter(function (p) { return D.items[p] && D.items[p][lang]; })).slice(0, 3));
      var xs = Core.shuffle(STOP_X.slice());
      stopsBox.innerHTML = ''; var nodes = {};
      ids.forEach(function (id, k) {
        var n = makeStop(id, xs[k]); nodes[id] = n; stopsBox.appendChild(n); n.dataset.x = xs[k];
        tap(n, function () { onTap(id, n); }, { nopress: true });
      });
      cur = { item: item, nodes: nodes, xs: xs, ids: ids };
      stopsBox.style.transform = 'translateX(' + OFF_X + 'rem)';
      go(true);
      await slide(stopsBox, OFF_X, 0, 2200, 'cubic-bezier(.15,.8,.3,1)');
      go(false);
      ctx.setTarget(item, nodes[item]); active = true;
      await ctx.quiet(6000);
      ctx.ask(item);
      var tappedNode = await new Promise(function (r) { onRight = r; });
      /* pull in: the chosen stop slides to the door while the world scrolls, then the bus stops */
      shifted = DOOR_X - Number(nodes[item].dataset.x);
      go(true);
      var arrive = slide(stopsBox, 0, shifted, 1800, 'cubic-bezier(.2,.75,.3,1)');
      flow.after(1500, function () { go(false); });
      await arrive; go(false);
      Snd.sfx('door'); bus.classList.add('mgbus-open');
      /* passenger */
      var pid = paxIds[i % paxIds.length], pax = el('div', 'mgbus-pax'); pax.appendChild(Core.Pic.el(Core.item(pid)));
      paxBox.appendChild(pax);
      var hop = pax.animate ? pax.animate([
        { transform: 'translate(0,2rem) scale(.4)', opacity: 0, offset: 0 },
        { transform: 'translate(3rem,-5rem) scale(.9)', opacity: 1, offset: .25 },
        { transform: 'translate(11rem,-13rem) scale(1.05)', opacity: 1, offset: .6 },
        { transform: 'translate(19rem,0rem) scale(1)', opacity: 1, offset: 1 }], { duration: dur(900), easing: 'ease-out', fill: 'forwards' }) : null;
      var land = hop ? new Promise(function (r) { hop.onfinish = r; }) : Promise.resolve();
      var reward = ctx.correct(nodes[item], item);
      await land; Snd.sfx('land'); pax.classList.add('mgbus-wave');
      await reward;
      pax.classList.add('mgbus-bye'); bus.classList.remove('mgbus-open'); Snd.sfx('door');
      await flow.wait(500);
      if (pax.parentNode) pax.parentNode.removeChild(pax);
      if (i < targets.length - 1) {
        /* drive on: the stops roll out to the left */
        go(true);
        await slide(stopsBox, shifted, -OFF_X - 30, 1900, 'cubic-bezier(.5,0,.8,.5)');
      }
    }

    ctx.expose({
      stopIds: function () { return cur ? cur.ids.slice() : []; },
      state: function () { return { active: active, wrongs: wrongs, stops: cur ? cur.ids.slice() : [], open: bus.classList.contains('mgbus-open') }; }
    });

    (async function () {
      go(true);
      ctx.intro();
      for (var i = 0; i < targets.length; i++) { ctx.progress(i); await ride(targets[i], i); }
      go(false);
      return ctx.finish();
    })();
  }
});
})();
