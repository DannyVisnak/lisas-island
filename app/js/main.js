/* Lisa's Island - boot, global input hygiene, test hooks. */
(function () {
'use strict';
var D = Core.D;

/* a small child must not be able to open menus, drag images, select text or zoom */
['contextmenu', 'dragstart', 'selectstart', 'gesturestart', 'gesturechange', 'dblclick'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { if (e.target && e.target.closest && e.target.closest('.pscroll input')) return; e.preventDefault(); }, { passive: false });
});
document.addEventListener('touchmove', function (e) {
  if (e.touches && e.touches.length > 1) { e.preventDefault(); return; }
  if (!(e.target && e.target.closest && e.target.closest('.pscroll'))) e.preventDefault();
}, { passive: false });
document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) >= 0) e.preventDefault();
});
document.addEventListener('visibilitychange', function () { if (document.hidden) Core.Snd.stop(); });
window.addEventListener('pagehide', function () { Core.flushNow(); });
window.addEventListener('beforeunload', function () { Core.flushNow(); });

/* test hooks (harmless in production) */
window.__test = {
  screen: function () { return UI.cur; },
  lang: function () { return Core.lang; },
  params: function () { return UI.p; },
  correctId: function () { return window.Q && Q.cur ? Q.cur.target : null; },
  choiceIds: function () { return window.Q && Q.cur ? Q.cur.choices.slice() : []; },
  wrongsNow: function () { return window.Q && Q.cur ? Q.cur.wrongs() : 0; },
  speedUp: function (n) { Core.speed = n || 8; Core.fast = true; },
  dayShift: function (d) { Core.dayShift = d; },
  save: function () { return Core.save; },
  run: function () { return window.__runState || null; },
  go: function (name, p) { return UI.go(name, p); },
  pending: function () { return JSON.parse(JSON.stringify(Core.pending)); },
  worlds: function () { return D.worlds.length; },
  restDue: function () { Core.sess.restDue = true; },
  ms: function () { return Date.now(); },
  /* reward layer */
  fx: function () { return FX.state(); },
  /* real-time mode: speed 1 and sound/tones on, for mid-animation screenshots and the missing-audio test */
  realTime: function () { Core.speed = 1; Core.fast = false; },
  xp: function () { return { total: Core.save.xp, day: Core.dayXP(), goal: Core.goalTarget(), met: Core.goalMet(), days: Core.save.goalDays.slice() }; },
  setGoal: function (n) { Core.save.settings.dailyGoal = n; Core.persist(); },
  addXP: function (n) { return Core.addXP(n); },
  crown: function (lang, wid) { return Core.crownOf(lang, wid); },
  lisaLine: function (g) { return Core.lisaLine(g); },
  hud: function () { var h = FX.activeHud; return h ? { fill: h.dataset.fill, combo: h.dataset.combo, xp: h.dataset.xp, total: h.total } : null; },
  say: function (list) { return Core.Snd.say(list); }
};

function boot() {
  Core.Snd.setVolume(Core.save.settings.volume == null ? 0.9 : Core.save.settings.volume);
  Core.lisaProbe();
  if (Core.isHardStopped()) UI.go('rest', { hard: true });
  else UI.go('home');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
