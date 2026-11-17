/* Lisa's Island - parent area (English UI, opened through the 3-second hold gate). */
(function () {
'use strict';
var D = Core.D, el = Core.el, Snd = Core.Snd;
var LANGNAME = { pt: 'Portuguese', en: 'English', de: 'German' };

function click(node, fn) { node.addEventListener('click', function (e) { e.stopPropagation(); fn(e, node); }); }
function section(host, title, sub) {
  var s = el('div', 'psec'); s.appendChild(el('h2', null, title));
  if (sub) s.appendChild(el('p', 'psub', sub));
  host.appendChild(s); return s;
}
function row(host, label, hint) {
  var r = el('div', 'prow'); r.appendChild(el('div', 'plabel', '<b>' + label + '</b>' + (hint ? '<small>' + hint + '</small>' : '')));
  var c = el('div', 'pctl'); r.appendChild(c); host.appendChild(r); return c;
}
function toggle(host, on, fn) {
  var t = el('div', 'ptoggle' + (on ? ' on' : ''), '<i></i>');
  click(t, function () { on = !on; t.classList.toggle('on', on); fn(on); });
  host.appendChild(t); return t;
}
function seg(host, opts, cur, fn) {
  var d = el('div', 'pseg');
  opts.forEach(function (o) {
    var b = el('div', 'pseg-b' + (o.v === cur ? ' sel' : ''), o.t); b.dataset.v = o.v;
    click(b, function () { Core.$$('.pseg-b', d).forEach(function (x) { x.classList.toggle('sel', x === b); }); fn(o.v); });
    d.appendChild(b);
  });
  host.appendChild(d); return d;
}
/* press and hold for 3 s to confirm a destructive action */
function holdButton(host, label, fn) {
  var b = el('div', 'phold', '<i class="phold-fill"></i><span>' + label + '</span>');
  var t = null, fill = b.firstChild;
  function cancel() { clearTimeout(t); t = null; fill.style.transition = 'width .2s'; fill.style.width = '0'; }
  b.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var ms = Core.fast ? 400 : 3000;
    fill.style.transition = 'width ' + ms + 'ms linear'; void fill.offsetWidth; fill.style.width = '100%';
    t = setTimeout(function () { t = null; fill.style.width = '0'; fn(); }, ms);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { b.addEventListener(ev, cancel); });
  b.__hold = function () { clearTimeout(t); fn(); };
  host.appendChild(b); return b;
}
function fmtDate(ts) { return ts ? Core.dayLabel(ts) : 'never'; }

UI.screens.parent = function (flow, root, p) {
  UI.scene(root, 'paper');
  var S = Core.save.settings;
  var head = el('div', 'phead'); root.appendChild(head);
  head.appendChild(el('h1', null, 'Parent area'));
  var closeB = el('div', 'pclose', 'Back to the game'); head.appendChild(closeB);
  click(closeB, function () { UI.go('home'); });
  var sc = el('div', 'pscroll'); root.appendChild(sc);
  var wrap = el('div', 'pwrap'); sc.appendChild(wrap);

  /* languages */
  var sl = section(wrap, 'Languages', 'Which flags the child sees on the start screen. At least one stays on.');
  D.langs.forEach(function (l) {
    var c = row(sl, LANGNAME[l] || l);
    var flag = el('img', 'pflag'); flag.src = D.uiImg['flag_' + l]; flag.alt = ''; c.appendChild(flag);
    toggle(c, !!S.enabled[l], function (on) {
      var en = D.langs.filter(function (x) { return x !== l && S.enabled[x]; });
      if (!on && !en.length) { S.enabled[l] = true; Core.$$('.ptoggle', c)[0].classList.add('on'); return; }
      S.enabled[l] = on; if (!on && Core.lang === l) Core.lang = null; Core.persist();
    });
  });
  var rh = row(sl, 'Russian help', 'Short spoken Russian instructions and word translations.');
  toggle(rh, !!S.ruHelp, function (on) { S.ruHelp = on; Core.persist(); });

  /* daily path */
  var dp = section(wrap, 'Daily path', 'One Play button: a short session of about 10 to 15 minutes, once a day. After it Lisa sleeps until tomorrow.');
  var cs = row(dp, 'Session length', 'The hard stop for active play. The session ends with the bedtime ritual at this limit.');
  seg(cs, [{ v: 10, t: '10 min' }, { v: 15, t: '15 min' }, { v: 20, t: '20 min' }], [10, 15, 20].indexOf(Number(S.sessionMin)) >= 0 ? Number(S.sessionMin) : 15, function (v) { S.sessionMin = v; Core.persist(); });
  var csm = row(dp, 'Small sessions (age 3 to 4)', 'Only 4 new words a day (block A), then bedtime.');
  seg(csm, [{ v: false, t: 'Normal' }, { v: true, t: 'Small' }], !!S.pathSmall, function (v) { S.pathSmall = v; Core.persist(); });
  csm.parentNode.dataset.setting = 'pathSmall';
  var cu = row(dp, 'Another session today', Path.sleeping() ? 'Lisa is asleep after today\'s session. Wake her up for one more session.' : 'Lisa is awake; nothing to unlock.');
  var ub = el('div', 'pbtn', 'Unlock another session today'); ub.dataset.act = 'unlock'; cu.appendChild(ub);
  click(ub, function () { Path.unlockExtra(); UI.go('parent'); });
  var cf2 = row(dp, 'Free play (parent)', 'The old map with worlds and levels. It keeps its own star counting; the child does not need it.');
  var fpb = el('div', 'pbtn', 'Open the map'); fpb.dataset.act = 'freeplay'; cf2.appendChild(fpb);
  click(fpb, function () { UI.go('map'); });

  /* free play timing (old map only) */
  var st = section(wrap, 'Free play timing', 'Applies to the old map and levels only.');
  var c2 = row(st, 'When time is up', 'Soft: the child can wake Lisa up by tapping home. Hard: no more play until tomorrow (unlock with the gear).');
  seg(c2, [{ v: false, t: 'Soft' }, { v: true, t: 'Hard' }], !!S.hard, function (v) { S.hard = v; Core.persist(); });

  var c3 = row(st, 'Daily goal', 'Points (XP) Lisa and your child collect in a day. Reaching it gives a trophy and a sun for the day. Nothing is ever lost if a day is missed.');
  seg(c3, [{ v: 15, t: '15' }, { v: 30, t: '30' }, { v: 45, t: '45' }, { v: 60, t: '60' }, { v: 90, t: '90' }], S.dailyGoal, function (v) { S.dailyGoal = v; Core.persist(); });
  c3.parentNode.dataset.setting = 'dailyGoal';

  /* sound and screen */
  var ss = section(wrap, 'Sound and screen');
  var subt = row(ss, 'Subtitles');
  subt.parentNode.dataset.setting = 'subtitles';
  toggle(subt, !!S.subtitles, function (on) { S.subtitles = on; Core.persist(); });
  var cv = row(ss, 'Volume');
  var vol = el('input', 'pvol'); vol.type = 'range'; vol.min = '0.1'; vol.max = '1'; vol.step = '0.05'; vol.value = String(S.volume == null ? 0.9 : S.volume);
  vol.addEventListener('input', function () { S.volume = parseFloat(vol.value); Snd.setVolume(S.volume); Core.persist(); });
  vol.addEventListener('change', function () { Snd.unlock(); Snd.sfx('good'); });
  cv.appendChild(vol);
  var cf = row(ss, 'Full screen');
  var fb = el('div', 'pbtn', 'Switch full screen on / off'); cf.appendChild(fb);
  click(fb, function () {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } catch (e) {}
  });

  /* progress */
  var sp = section(wrap, 'Progress', 'What your child has heard and learned, per language.');
  D.langs.forEach(function (l) {
    var L = Core.L(l), intro = Core.SRS.introduced(l).length, stick = Core.SRS.stickerCount(l);
    var card = el('div', 'pcard'); card.dataset.lang = l; sp.appendChild(card);
    var top = el('div', 'ptop');
    var fl = el('img', 'pflag'); fl.src = D.uiImg['flag_' + l]; fl.alt = ''; top.appendChild(fl);
    top.appendChild(el('div', 'ptitle', '<b>' + (LANGNAME[l] || l) + '</b><small>Last played: ' + fmtDate(L.last) + '</small>'));
    card.appendChild(top);
    var nums = el('div', 'pnums');
    nums.innerHTML = '<div><b>' + intro + '</b><small>of ' + Core.totalWords + ' words heard</small></div><div><b>' + stick + '</b><small>stickers earned</small></div>' +
      '<div><b>' + D.worlds.filter(function (w, i) { return Core.worldDone(l, i); }).length + '</b><small>of ' + D.worlds.length + ' worlds finished</small></div>';
    card.appendChild(nums);
    var bar = el('div', 'pbar', '<i style="width:' + Math.round(100 * intro / Core.totalWords) + '%"></i>'); card.appendChild(bar);
    var more = el('div', 'pmore', 'Show word list'); card.appendChild(more);
    var list = el('div', 'plist'); list.style.display = 'none'; card.appendChild(list);
    click(more, function () {
      var open = list.style.display === 'none';
      if (open && !list.childNodes.length) {
        D.worlds.forEach(function (w) {
          var ws = w.items.filter(function (id) { return L.words[id] && L.words[id].box >= 1; });
          if (!ws.length) return;
          var g = el('div', 'pworld'); g.appendChild(el('h3', null, D.ui.en['w_' + w.id] || w.id));
          ws.forEach(function (id) {
            var it = D.items[id], wd = L.words[id];
            g.appendChild(el('div', 'pword', '<span>' + it[l].word + '</span><em>' + (D.items[id].ru || '') + '</em><u class="box b' + wd.box + '">' +
              [1, 2, 3, 4, 5].map(function (k) { return '<i' + (k <= wd.box ? ' class="on"' : '') + '></i>'; }).join('') + '</u>'));
          });
          list.appendChild(g);
        });
        if (!list.childNodes.length) list.appendChild(el('p', 'psub', 'No words heard yet.'));
      }
      list.style.display = open ? 'block' : 'none'; more.textContent = open ? 'Hide word list' : 'Show word list';
    });
    var rs = el('div', 'preset'); card.appendChild(rs);
    rs.appendChild(el('small', null, 'Reset all ' + (LANGNAME[l] || l) + ' progress (hold 3 seconds):'));
    var hb = holdButton(rs, 'Hold to reset', function () {
      Core.save.langs[l] = { words: {}, levels: {}, last: 0 }; delete Core.save.crowns[l]; Core.persist(); Core.flushNow();
      UI.go('parent');
    });
    hb.dataset.reset = l;
  });

  /* tips */
  var tp = section(wrap, 'How to play together');
  tp.appendChild(el('div', 'ptips',
    '<p><b>Sit next to your child at first.</b> Let them tap the pictures; say the word with them, quietly and warmly.</p>' +
    '<p><b>There is no failing.</b> A wrong tap just wobbles and tries again. Never correct, just cheer.</p>' +
    '<p><b>Short and often.</b> Ten happy minutes a day beat one long session. The game comes back to old words by itself.</p>' +
    '<p><b>Use the words outside the game.</b> Point at a real cat and say the word you just learned. The picture garden is for free play.</p>'));
  var qb = el('div', 'pbtn quit', 'Quit the game'); tp.appendChild(qb);
  click(qb, function () { Core.flushNow(); try { window.close(); } catch (e) {} });
  wrap.appendChild(el('div', 'pend'));
  void p;
};
})();
