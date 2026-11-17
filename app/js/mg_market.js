/* Lisa's Island - mini-game "market" (world numbers): "Fill the basket". A market stall holds a pile of one fruit; the voice says a number (1-5);
   the child drags fruit one by one into the basket, Lisa counts aloud with every drop and a number badge pops. At the target: reward + basket wiggle.
   Errorless: an extra fruit just bounces back out; a drop beside the basket snaps back silently; "mg_market_more" when he stops short and idles.
   5 rounds, numbers rising softly (1 -> 5), then mg_market_done. Everything for this game lives in THIS file and css/mg_market.css. */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el;

var ROUNDS = [1, 2, 3, 4, 5];
var FRUITS = ['apple', 'banana', 'orange', 'strawberry'];
var PILE = 7;
/* pile slots (rem, inside the stall): back row then front row */
var PILE_SLOTS = [[7, 33], [19, 32], [31, 33], [43, 32], [13, 40], [25, 41], [37, 40]];
/* basket slots (rem, relative to the basket box): 5 fruits */
var BASKET_SLOTS = [[4, 0], [14, 0], [24, 0], [9, -5], [19, -5]];

var STALL = '<svg viewBox="0 0 640 520" xmlns="http://www.w3.org/2000/svg">' +
  '<rect x="30" y="120" width="16" height="400" rx="8" fill="#8d6e63"/><rect x="594" y="120" width="16" height="400" rx="8" fill="#8d6e63"/>' +
  '<path d="M10 20 H630 L610 130 H30Z" fill="#fff"/>' +
  '<path d="M10 20 H90 L78 130 H30Z M170 20 H250 L238 130 H190Z M330 20 H410 L398 130 H350Z M490 20 H570 L558 130 H510Z" fill="#ef5350"/>' +
  '<path d="M30 130 Q60 170 90 130 Q120 170 150 130 Q180 170 210 130 Q240 170 270 130 Q300 170 330 130 Q360 170 390 130 Q420 170 450 130 Q480 170 510 130 Q540 170 570 130 L610 130Z" fill="#fff" opacity=".0"/>' +
  '<rect x="10" y="372" width="620" height="40" rx="14" fill="#a1744a"/><rect x="26" y="410" width="588" height="108" rx="12" fill="#8d6240"/>' +
  '<path d="M26 440 H614 M26 476 H614" stroke="#6d4a2d" stroke-width="5"/>' +
  '<rect x="30" y="366" width="580" height="14" rx="7" fill="#c89a68"/></svg>';
var BASKET_BACK = '<svg viewBox="0 0 380 240" xmlns="http://www.w3.org/2000/svg"><ellipse cx="190" cy="62" rx="178" ry="42" fill="#6d4423"/></svg>';
var BASKET_FRONT = '<svg viewBox="0 0 380 240" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M6 62 Q190 128 374 62 L340 220 Q190 250 40 220Z" fill="#d49a4a"/>' +
  '<path d="M30 112 Q190 160 350 112 M38 150 Q190 196 342 150 M44 186 Q190 230 336 186" stroke="#a9742c" stroke-width="7" fill="none" stroke-linecap="round"/>' +
  '<path d="M96 100 L84 226 M150 112 L144 236 M210 114 L214 238 M266 106 L282 228" stroke="#a9742c" stroke-width="6" stroke-linecap="round"/>' +
  '<path d="M4 62 Q190 130 376 62" stroke="#f1c27a" stroke-width="16" fill="none" stroke-linecap="round"/></svg>';

MG.register({
  id: 'market', worlds: ['numbers'], title: 'Market', color: '#43a047', scene: 'meadow',
  icon: '<svg viewBox="0 0 100 100"><path d="M26 42 Q26 12 50 12 Q74 12 74 42" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M10 42 H90 L80 86 H20Z" fill="#fff"/><path d="M30 50 L34 80 M50 50 V80 M70 50 L66 80" stroke="#000" stroke-opacity=".16" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="34" r="10" fill="#ef5350"/><circle cx="62" cy="32" r="10" fill="#ffee58"/></svg>',
  start: function (root, ctx) {
    var flow = ctx.flow;
    ctx.chrome({ total: ROUNDS.length, lisa: false });

    /* ---- scene ---- */
    root.appendChild(el('div', 'mgm-ground'));
    root.appendChild(el('div', 'mgm-stall', STALL));
    var pileBox = el('div', 'mgm-pile'); root.appendChild(pileBox);
    var basket = el('div', 'mgm-basket'); root.appendChild(basket);
    basket.appendChild(el('div', 'mgm-bback', BASKET_BACK));
    var inLayer = el('div', 'mgm-in'); basket.appendChild(inLayer);
    basket.appendChild(el('div', 'mgm-bfront', BASKET_FRONT));
    var badge = el('div', 'mgm-badge'); root.appendChild(badge);

    /* ---- helpers ---- */
    function dur(ms) { return Math.max(40, ms / Core.speed); }
    function wig(n, cls) { if (!n) return; n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); }
    function alive() { return pile.filter(function (n) { return !n.classList.contains('mgm-gone'); }); }

    var pile = [], handles = [], count = 0, target = 0, extras = 0, round = 0, solved = false, waiter = null, fruit = null, inputVersion = 0, playbackToken = 0;
    var fruits = Core.shuffle(FRUITS.filter(function (f) { return D.items[f]; }));
    fruits.push(fruits[0]);

    function remind(partial) {
      var thisRound = round, goal = target, thisInput = inputVersion, thisPlayback = ++playbackToken;
      function current() { return !flow.dead && !ctx.finished && !solved && !ctx.locked && ctx.target === 'n' + goal && round === thisRound && target === goal; }
      if (!goal || !current()) return;
      var f = alive()[0];
      if (f) { if (partial) ctx.glow(f); else ctx.wiggle(f, 'mgpeek'); }
      if (count > 0 && count < goal) {
        var cue = ctx.ru('more'), cueSoundToken = Core.Snd.token;
        cue.then(function () {
          /* Missing cues leave this token unchanged; canceled or superseded cues lose ownership. */
          if (current() && inputVersion === thisInput && thisPlayback === playbackToken && Core.Snd.token === cueSoundToken)
            flow.say([ctx.ruUrl('help'), ctx.wordUrl('n' + goal)].filter(Boolean));
        });
        return;
      }
      flow.say([ctx.ruUrl('help'), ctx.wordUrl('n' + goal)].filter(Boolean));
    }
    ctx.onPeek(function () { remind(false); });
    ctx.onAssist(function () { remind(true); });
    ctx.onHelp(function () { var f = alive()[0]; if (f && count === 0) ctx.wiggle(f, 'mgpeek'); });

    function buildPile() {
      pileBox.innerHTML = ''; pile = []; handles.forEach(function (h) { h.destroy(); }); handles = [];
      for (var i = 0; i < PILE; i++) {
        var n = el('div', 'mgm-fruit'); n.dataset.fruit = fruit; n.style.left = PILE_SLOTS[i][0] + 'rem'; n.style.top = PILE_SLOTS[i][1] + 'rem';
        n.style.animationDelay = (i * 60) + 'ms';
        n.appendChild(Core.Pic.el(Core.item(fruit)));
        pileBox.appendChild(n); pile.push(n);
        handles.push(MG.drag(n, { targets: [basket], pad: 30, onDrop: (function (node) { return function (t) { return onDrop(node, t); }; })(n) }));
      }
    }
    function showBadge(k) {
      badge.innerHTML = ''; badge.appendChild(Core.Pic.el(Core.item('n' + k)));
      badge.classList.add('on'); wig(badge, 'mgm-pop');
    }

    function onDrop(n, t) {
      if (!t) return false;                                         /* beside the basket: back to the stall, no sound, no judgement */
      if (solved || count >= target) { extras++; Snd.sfx('boop'); wig(badge, 'mgm-pop'); return 'back'; }   /* one too many: it hops back out */
      inputVersion++;
      count++; n.classList.add('mgm-gone');
      var slot = BASKET_SLOTS[count - 1], c = el('div', 'mgm-infruit'); c.style.left = slot[0] + 'rem'; c.style.top = slot[1] + 'rem';
      c.appendChild(Core.Pic.el(Core.item(fruit))); inLayer.appendChild(c);
      if (c.animate) c.animate([{ transform: 'translateY(-9rem) scale(1.25)', opacity: .6 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: dur(380), easing: 'cubic-bezier(.3,1.5,.5,1)' });
      Snd.sfx('collect'); wig(basket, 'mgm-bwig'); showBadge(count);
      var said = ctx.say('n' + count);                             /* Lisa counts aloud */
      if (count === target) reached(said);
      return true;
    }
    async function reached(said) {
      solved = true; ctx.setTarget(null);
      var fxr = await ctx.correct(basket, 'n' + target, { say: false });
      Snd.sfx('star'); wig(basket, 'mgm-bwig2');
      var t0 = Date.now(); await said;
      await flow.say([150, ctx.praise(fxr.milestone)]);
      await flow.wait(Math.max(200, fxr.hold - (Date.now() - t0) * Core.speed));
      if (waiter) { var w = waiter; waiter = null; w(); }
    }

    ctx.expose({
      state: function () { return { count: count, extras: extras, round: round, solved: solved, goal: target }; }
    });

    (async function () {
      await ctx.intro();
      for (round = 0; round < ROUNDS.length; round++) {
        target = ROUNDS[round]; fruit = fruits[round % fruits.length]; count = 0; solved = false;
        inLayer.innerHTML = ''; badge.classList.remove('on'); badge.innerHTML = '';
        buildPile(); ctx.progress(round);
        ctx.setTarget('n' + target, basket);
        await ctx.quiet(6000);
        ctx.say('n' + target);
        await new Promise(function (r) { waiter = r; });
        ctx.lock(true);
        if (round < ROUNDS.length - 1) {
          pileBox.classList.add('mgm-out'); await flow.wait(500); pileBox.classList.remove('mgm-out');
        }
      }
      return ctx.finish();
    })();
  }
});
})();
