/* Lisa - original orange fox mascot (inline SVG front view + canvas side view) and accessory icons. */
(function () {
'use strict';
var Lisa = window.Lisa = {};
var OR = '#ff9b3d', OR2 = '#f07f1d', CR = '#fff4e0', BR = '#6b3b1d', PK = '#ff8fa3';

function svgFront() {
  return '<svg viewBox="0 0 240 270" xmlns="http://www.w3.org/2000/svg">' +
  /* cape (behind) */
  '<g class="acc acc-cape"><path d="M62 168 Q8 226 34 264 L206 264 Q232 226 178 168 Z" fill="#d32f2f"/><path d="M62 168 Q40 215 52 262 L90 264 Q74 222 84 172Z" fill="#b71c1c" opacity=".55"/></g>' +
  /* tail */
  '<g class="tail"><path d="M168 226 Q232 232 226 168 Q222 120 190 112 Q206 150 176 176 Q160 196 150 214 Z" fill="' + OR + '"/>' +
  '<path d="M226 168 Q222 120 190 112 Q200 130 204 148 Q222 150 226 168Z" fill="' + CR + '"/></g>' +
  /* body */
  '<g class="body"><ellipse cx="120" cy="204" rx="58" ry="58" fill="' + OR + '"/><ellipse cx="120" cy="214" rx="35" ry="42" fill="' + CR + '"/>' +
  '<ellipse cx="92" cy="258" rx="26" ry="11" fill="' + BR + '"/><ellipse cx="148" cy="258" rx="26" ry="11" fill="' + BR + '"/>' +
  '<g class="arm arm-l"><ellipse cx="66" cy="202" rx="13" ry="31" transform="rotate(14 66 202)" fill="' + OR + '"/><ellipse cx="60" cy="230" rx="12" ry="9" fill="' + BR + '"/></g>' +
  '<g class="arm arm-r"><ellipse cx="174" cy="202" rx="13" ry="31" transform="rotate(-14 174 202)" fill="' + OR + '"/><ellipse cx="180" cy="230" rx="12" ry="9" fill="' + BR + '"/></g></g>' +
  /* scarf + clasp */
  '<g class="acc acc-scarf"><path d="M66 168 Q120 196 174 168 L180 190 Q120 220 60 190 Z" fill="#26a69a"/><path d="M80 178 L86 200 M110 186 L114 210 M140 186 L136 210 M164 178 L158 200" stroke="#fff" stroke-width="5" opacity=".55"/>' +
  '<path d="M146 198 L180 248 L156 256 L128 206 Z" fill="#26a69a"/><path d="M150 214 L168 240" stroke="#fff" stroke-width="5" opacity=".55"/></g>' +
  '<g class="acc acc-cape"><circle cx="120" cy="176" r="9" fill="#ffc107" stroke="#ff8f00" stroke-width="2"/></g>' +
  /* guitar */
  '<g class="acc acc-guitar" transform="rotate(-28 120 214)"><rect x="115" y="62" width="10" height="130" rx="4" fill="#8d5524"/><rect x="111" y="52" width="18" height="18" rx="5" fill="#5d3a1a"/>' +
  '<ellipse cx="120" cy="226" rx="36" ry="28" fill="#d98a3d"/><ellipse cx="120" cy="196" rx="26" ry="20" fill="#d98a3d"/><circle cx="120" cy="214" r="10" fill="#3e2412"/>' +
  '<rect x="104" y="238" width="32" height="5" rx="2" fill="#3e2412"/></g>' +
  /* head */
  '<g class="head">' +
  '<path class="ear ear-l" d="M58 82 Q38 22 64 6 Q74 2 82 10 L112 52 Z" fill="' + OR + '"/><path d="M68 70 Q56 34 68 20 Q74 18 80 24 L98 52 Z" fill="' + BR + '"/>' +
  '<path class="ear ear-r" d="M182 82 Q202 22 176 6 Q166 2 158 10 L128 52 Z" fill="' + OR + '"/><path d="M172 70 Q184 34 172 20 Q166 18 160 24 L142 52 Z" fill="' + BR + '"/>' +
  '<path d="M34 128 L50 104 L52 146 Z" fill="' + CR + '"/><path d="M206 128 L190 104 L188 146 Z" fill="' + CR + '"/>' +
  '<path d="M40 112 Q40 52 120 50 Q200 52 200 112 Q200 170 120 174 Q40 170 40 112 Z" fill="' + OR + '"/>' +
  '<path d="M52 118 Q86 108 108 122 Q120 118 132 122 Q154 108 188 118 Q190 168 120 174 Q50 168 52 118 Z" fill="' + CR + '"/>' +
  '<ellipse cx="70" cy="132" rx="13" ry="8" fill="' + PK + '" opacity=".55"/><ellipse cx="170" cy="132" rx="13" ry="8" fill="' + PK + '" opacity=".55"/>' +
  /* eyes */
  '<g class="eyes eyes-open"><ellipse cx="90" cy="102" rx="11" ry="14" fill="' + BR + '"/><ellipse cx="150" cy="102" rx="11" ry="14" fill="' + BR + '"/>' +
  '<circle cx="94" cy="96" r="4.5" fill="#fff"/><circle cx="154" cy="96" r="4.5" fill="#fff"/><circle cx="87" cy="107" r="2" fill="#fff"/><circle cx="147" cy="107" r="2" fill="#fff"/></g>' +
  '<g class="eyes eyes-happy"><path d="M76 108 Q90 90 104 108" fill="none" stroke="' + BR + '" stroke-width="6" stroke-linecap="round"/><path d="M136 108 Q150 90 164 108" fill="none" stroke="' + BR + '" stroke-width="6" stroke-linecap="round"/></g>' +
  '<g class="eyes eyes-closed"><path d="M76 100 Q90 114 104 100" fill="none" stroke="' + BR + '" stroke-width="5" stroke-linecap="round"/><path d="M136 100 Q150 114 164 100" fill="none" stroke="' + BR + '" stroke-width="5" stroke-linecap="round"/></g>' +
  '<ellipse cx="120" cy="128" rx="12" ry="8.5" fill="' + BR + '"/><ellipse cx="116" cy="125" rx="4" ry="2.2" fill="#fff" opacity=".45"/>' +
  '<path class="mouth mouth-smile" d="M120 137 L120 143 M96 140 Q108 158 120 143 Q132 158 144 140" fill="none" stroke="' + BR + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<g class="mouth mouth-open"><path d="M98 138 Q120 140 142 138 Q142 172 120 172 Q98 172 98 138Z" fill="#b3262c"/><path d="M106 160 Q120 150 134 160 Q128 172 120 172 Q112 172 106 160Z" fill="' + PK + '"/></g>' +
  /* head accessories */
  '<g class="acc acc-sunglasses"><rect x="62" y="86" width="50" height="34" rx="14" fill="#1c1c24" opacity=".94"/><rect x="128" y="86" width="50" height="34" rx="14" fill="#1c1c24" opacity=".94"/><rect x="110" y="95" width="20" height="6" fill="#1c1c24"/><path d="M70 96 L82 92 M136 96 L148 92" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/></g>' +
  '<g class="acc acc-cap"><path d="M66 70 Q120 -6 174 70 Q120 58 66 70Z" fill="#e53935"/><path d="M120 12 Q104 30 104 62 Q120 60 136 62 Q136 30 120 12Z" fill="#c62828" opacity=".5"/><ellipse cx="120" cy="66" rx="64" ry="10" fill="#c62828"/><path d="M96 70 Q120 96 176 76 Q150 62 120 66Z" fill="#b71c1c"/><circle cx="120" cy="14" r="7" fill="#fff"/></g>' +
  '<g class="acc acc-crown"><path d="M84 62 L88 26 L106 44 L120 18 L134 44 L152 26 L156 62 Z" fill="#ffc107" stroke="#ff8f00" stroke-width="3" stroke-linejoin="round"/><circle cx="120" cy="40" r="5" fill="#e53935"/><circle cx="96" cy="48" r="3.5" fill="#42a5f5"/><circle cx="144" cy="48" r="3.5" fill="#66bb6a"/></g>' +
  '<g class="acc acc-helmet"><ellipse cx="120" cy="178" rx="74" ry="13" fill="#cfd8dc" stroke="#90a4ae" stroke-width="3"/><circle cx="120" cy="108" r="98" fill="#bfe6ff" opacity=".28" stroke="#fff" stroke-width="5"/><path d="M52 52 Q70 24 108 18" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/><path d="M168 30 L176 4" stroke="#90a4ae" stroke-width="4"/><circle cx="177" cy="4" r="6" fill="#ef5350"/></g>' +
  '</g>' +
  /* zzz */
  '<g class="zzz"><path d="M176 40 h22 l-22 26 h22" fill="none" stroke="#7e57c2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M206 12 h14 l-14 17 h14" fill="none" stroke="#9575cd" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>' +
  '</svg>';
}

Lisa.make = function (o) {
  o = o || {};
  var d = document.createElement('div');
  d.className = 'lisa p-idle' + (o.cls ? ' ' + o.cls : '');
  d.innerHTML = svgFront();
  Lisa.applyWorn(d, o.worn);
  var timer = null;
  d.pose = function (p, ms) {
    d.className = d.className.replace(/\bp-\w+/g, '').trim() + ' p-' + p;
    clearTimeout(timer);
    if (ms) timer = setTimeout(function () { d.pose('idle'); }, ms / Core.speed);
  };
  d.react = function (kind) {
    if (kind === 'cheer') d.pose('cheer', 1500);
    else if (kind === 'tilt') d.pose('tilt', 1100);
    else if (kind === 'wave') d.pose('wave', 1800);
    else if (kind === 'jump') d.pose('jump', 900);
    else if (kind === 'flip') d.pose('flip', 1100);
    else if (kind === 'giggle') d.pose('giggle', 800);
    else if (kind === 'dance') d.pose('dance');
    else d.pose(kind, 1200);
  };
  return d;
};
Lisa.applyWorn = function (d, worn) {
  worn = worn || Core.save.hats.worn;
  Core.HATS.forEach(function (h) { d.classList.toggle('w-' + h.id, worn.indexOf(h.id) >= 0); });
};

/* ----- accessory icons (wardrobe buttons) ----- */
Lisa.icon = function (id) {
  var s = {
    cap: '<path d="M14 62 Q50 4 86 62 Z" fill="#e53935"/><ellipse cx="50" cy="62" rx="40" ry="9" fill="#c62828"/><path d="M60 58 Q86 70 96 60 Q80 52 62 54Z" fill="#b71c1c"/><circle cx="50" cy="16" r="6" fill="#fff"/>',
    sunglasses: '<rect x="8" y="34" width="38" height="28" rx="12" fill="#1c1c24"/><rect x="54" y="34" width="38" height="28" rx="12" fill="#1c1c24"/><rect x="44" y="42" width="12" height="6" fill="#1c1c24"/><path d="M15 42 L25 39 M61 42 L71 39" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>',
    scarf: '<path d="M10 28 Q50 52 90 28 L94 50 Q50 76 6 50Z" fill="#26a69a"/><path d="M62 56 L88 92 L68 98 L50 62Z" fill="#26a69a"/><path d="M24 36 L28 56 M50 44 L52 64 M76 36 L72 56" stroke="#fff" stroke-width="5" opacity=".55"/>',
    cape: '<path d="M28 14 Q2 60 14 92 L86 92 Q98 60 72 14 Z" fill="#d32f2f"/><circle cx="50" cy="16" r="8" fill="#ffc107" stroke="#ff8f00" stroke-width="2"/>',
    crown: '<path d="M14 78 L20 24 L38 50 L50 14 L62 50 L80 24 L86 78 Z" fill="#ffc107" stroke="#ff8f00" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="52" r="6" fill="#e53935"/><circle cx="28" cy="64" r="4.5" fill="#42a5f5"/><circle cx="72" cy="64" r="4.5" fill="#66bb6a"/>',
    guitar: '<g transform="rotate(35 50 55)"><rect x="45" y="2" width="10" height="56" rx="4" fill="#8d5524"/><rect x="41" y="-4" width="18" height="14" rx="4" fill="#5d3a1a"/><ellipse cx="50" cy="76" rx="26" ry="20" fill="#d98a3d"/><ellipse cx="50" cy="56" rx="19" ry="14" fill="#d98a3d"/><circle cx="50" cy="68" r="7" fill="#3e2412"/></g>',
    helmet: '<ellipse cx="50" cy="82" rx="38" ry="9" fill="#cfd8dc" stroke="#90a4ae" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="#bfe6ff" opacity=".6" stroke="#90a4ae" stroke-width="4"/><path d="M24 34 Q34 18 52 14" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M70 14 L78 0" stroke="#90a4ae" stroke-width="4"/><circle cx="79" cy="2" r="5" fill="#ef5350"/>'
  };
  return '<svg viewBox="0 0 100 100">' + (s[id] || '') + '</svg>';
};

/* ----- generic UI icons (inline, no dependencies) ----- */
Lisa.ico = {
  star: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#ffd54f" stroke="#ffb300" stroke-width="5" stroke-linejoin="round"/><path d="M42 28 L50 20" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/></svg>',
  starOff: '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z" fill="#e3dccf" stroke="#cfc5b2" stroke-width="5" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 100 100"><path d="M14 38 H32 L54 18 V82 L32 62 H14 Z" fill="#fff"/><path d="M66 36 Q80 50 66 64" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M76 24 Q100 50 76 76" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 100 100"><path d="M14 52 L50 18 L86 52" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 48 V82 H42 V60 H58 V82 H76 V48 L50 26 Z" fill="#fff"/></svg>',
  back: '<svg viewBox="0 0 100 100"><path d="M60 18 L28 50 L60 82" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 100 100"><path d="M40 18 L72 50 L40 82" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 100 100"><path d="M30 46 V34 Q30 14 50 14 Q70 14 70 34 V46" fill="none" stroke="#8d96a3" stroke-width="10" stroke-linecap="round"/><rect x="20" y="44" width="60" height="44" rx="12" fill="#b0b8c4"/><circle cx="50" cy="63" r="6" fill="#6f7886"/><rect x="47" y="64" width="6" height="14" rx="3" fill="#6f7886"/></svg>',
  check: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#4caf50"/><path d="M26 52 L43 68 L75 34" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chest: '<svg viewBox="0 0 120 100"><rect x="10" y="40" width="100" height="50" rx="10" fill="#a8672c"/><path d="M10 48 Q10 14 60 14 Q110 14 110 48 Z" fill="#c97d36"/><rect x="10" y="44" width="100" height="10" fill="#7a461b"/><rect x="50" y="38" width="20" height="26" rx="5" fill="#ffc107" stroke="#ff8f00" stroke-width="3"/><circle cx="60" cy="50" r="4" fill="#7a461b"/><path d="M24 40 V90 M96 40 V90" stroke="#7a461b" stroke-width="6"/></svg>',
  album: '<svg viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="10" fill="#7e57c2"/><rect x="22" y="14" width="64" height="72" rx="8" fill="#9575cd"/><path d="M54 30 L60 44 L75 45 L64 55 L67 70 L54 62 L41 70 L44 55 L33 45 L48 44 Z" fill="#ffd54f"/><path d="M14 28 H26 M14 50 H26 M14 72 H26" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>',
  run: '<svg viewBox="0 0 100 100"><ellipse cx="42" cy="58" rx="24" ry="16" fill="#ff9b3d"/><circle cx="68" cy="42" r="15" fill="#ff9b3d"/><path d="M62 30 L66 14 L76 28Z" fill="#ff9b3d"/><ellipse cx="80" cy="46" rx="8" ry="6" fill="#fff4e0"/><circle cx="72" cy="40" r="2.6" fill="#6b3b1d"/><path d="M20 56 Q2 40 8 26 Q22 36 24 52Z" fill="#ff9b3d"/><path d="M8 26 Q10 20 14 22 Q14 28 12 32Z" fill="#fff4e0"/><rect x="30" y="68" width="8" height="18" rx="4" fill="#6b3b1d" transform="rotate(20 34 68)"/><rect x="48" y="68" width="8" height="18" rx="4" fill="#6b3b1d" transform="rotate(-24 52 68)"/></svg>',
  wardrobe: '<svg viewBox="0 0 100 100"><path d="M14 62 Q50 0 86 62 Z" fill="#e53935"/><ellipse cx="50" cy="62" rx="40" ry="9" fill="#c62828"/><path d="M60 58 Q86 70 96 60 Q80 52 62 54Z" fill="#b71c1c"/><circle cx="50" cy="14" r="6" fill="#fff"/><rect x="26" y="80" width="48" height="8" rx="4" fill="#ffc107"/></svg>',
  garden: '<svg viewBox="0 0 100 100"><path d="M50 96 V54" stroke="#43a047" stroke-width="7" stroke-linecap="round"/><path d="M50 78 Q28 74 24 56 Q44 56 50 74Z" fill="#66bb6a"/><path d="M50 70 Q72 66 76 48 Q56 48 50 66Z" fill="#66bb6a"/>' +
    '<g fill="#f48fb1"><circle cx="50" cy="24" r="14"/><circle cx="72" cy="38" r="14"/><circle cx="64" cy="14" r="0"/><circle cx="28" cy="38" r="14"/><circle cx="36" cy="14" r="0"/><circle cx="64" cy="58" r="0"/><circle cx="36" cy="58" r="0"/></g>' +
    '<g fill="#f06292"><circle cx="40" cy="26" r="13"/><circle cx="60" cy="26" r="13"/><circle cx="68" cy="44" r="13"/><circle cx="32" cy="44" r="13"/><circle cx="50" cy="52" r="13"/></g><circle cx="50" cy="38" r="13" fill="#ffd54f"/><circle cx="46" cy="34" r="4" fill="#fff" opacity=".5"/></svg>',
  jar: '<svg viewBox="0 0 100 120"><rect x="24" y="4" width="52" height="14" rx="6" fill="#a1887f"/><path d="M26 18 H74 Q90 30 90 54 V98 Q90 116 70 116 H30 Q10 116 10 98 V54 Q10 30 26 18Z" fill="#e1f5fe" fill-opacity=".7" stroke="#81d4fa" stroke-width="4"/><path d="M22 40 Q20 60 22 84" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8" fill="none"/></svg>',
  gear: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="16" fill="none" stroke="#9e9e9e" stroke-width="10"/><g stroke="#9e9e9e" stroke-width="12" stroke-linecap="round"><path d="M50 8 V20 M50 80 V92 M8 50 H20 M80 50 H92 M20 20 L28 28 M72 72 L80 80 M80 20 L72 28 M28 72 L20 80"/></g></svg>',
  moon: '<svg viewBox="0 0 100 100"><path d="M64 10 A42 42 0 1 0 90 62 A34 34 0 0 1 64 10Z" fill="#fff59d"/></svg>',
  bulb: '<svg viewBox="0 0 100 100"><path d="M50 8 Q24 8 24 36 Q24 50 36 60 Q40 64 40 72 H60 Q60 64 64 60 Q76 50 76 36 Q76 8 50 8Z" fill="#fff"/><rect x="38" y="78" width="24" height="7" rx="3.5" fill="#fff"/><rect x="42" y="88" width="16" height="6" rx="3" fill="#fff"/><path d="M42 40 Q50 52 58 40 M50 46 V70" fill="none" stroke="#ffb300" stroke-width="5" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 100 100"><path d="M40 90 Q20 70 24 52 Q28 46 34 52 L38 58 V22 Q38 14 46 14 Q54 14 54 22 V44 Q58 38 64 40 Q70 42 68 48 Q74 44 80 48 Q84 54 80 60 Q82 76 70 90Z" fill="#fff" stroke="#ff9b3d" stroke-width="5" stroke-linejoin="round"/></svg>'
};
/* level icons for the path screen */
Lisa.levelIcon = function (k) {
  return [
    '<svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="62" rx="10" fill="#fff"/><circle cx="50" cy="48" r="14" fill="#ffb74d"/><path d="M44 50 l5 6 l10 -12" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 70 L80 92 L70 74 Z" fill="#7e57c2"/></svg>',
    '<svg viewBox="0 0 100 100"><path d="M26 56 Q22 20 52 18 Q82 18 78 48 Q76 62 62 66 Q56 78 46 80" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M48 50 Q52 38 62 44" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M82 18 Q96 30 84 44 M88 8 Q108 28 90 54" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/></svg>',
    '<svg viewBox="0 0 100 100"><rect x="10" y="26" width="38" height="50" rx="8" fill="#fff"/><rect x="52" y="26" width="38" height="50" rx="8" fill="#fff"/><circle cx="29" cy="50" r="9" fill="#ffb74d"/><path d="M71 38 L74 47 L83 48 L76 54 L78 63 L71 58 L64 63 L66 54 L59 48 L68 47Z" fill="#ffd54f"/></svg>',
    '<svg viewBox="0 0 100 100"><rect x="8" y="28" width="38" height="48" rx="8" fill="#fff"/><rect x="54" y="28" width="38" height="48" rx="8" fill="#fff"/><circle cx="27" cy="52" r="10" fill="#b39ddb"/><circle cx="73" cy="52" r="10" fill="#b39ddb"/><circle cx="22" cy="46" r="3.5" fill="#fff"/><circle cx="32" cy="46" r="3.5" fill="#fff"/><circle cx="27" cy="55" r="4.5" fill="#fff"/><circle cx="68" cy="46" r="3.5" fill="#fff"/><circle cx="78" cy="46" r="3.5" fill="#fff"/><circle cx="73" cy="55" r="4.5" fill="#fff"/></svg>',
    Lisa.ico.run.replace('fill="#ff9b3d"', 'fill="#fff"')
  ][k];
};

/* ---------- canvas side view (platformer) ---------- */
function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); c.fill(); }
/* feet at (x,y), facing right. o: t (time), air (bool), sc (scale), cheer, sleep */
Lisa.drawSide = function (c, x, y, o) {
  var worn = o.worn || [], t = o.t || 0, sc = o.sc || 1, run = o.run !== false, has = function (k) { return worn.indexOf(k) >= 0; };
  var sw = run ? Math.sin(t * 13) : 0, bob = run && !o.air ? Math.abs(Math.sin(t * 13)) * 4 : 0;
  c.save(); c.translate(x, y); c.scale(sc, sc);
  var lean = o.air ? -0.1 : 0;
  c.rotate(lean);
  /* cape */
  if (has('cape')) {
    c.fillStyle = '#d32f2f'; c.beginPath(); c.moveTo(14, -78 - bob);
    var fl = Math.sin(t * 11) * 6; c.quadraticCurveTo(-44, -76 + fl, -64, -34 + fl * 1.5); c.lineTo(-10, -30 - bob); c.closePath(); c.fill();
  }
  /* tail */
  c.fillStyle = OR; c.save(); c.translate(-38, -56 - bob); c.rotate(-0.5 + Math.sin(t * 7) * 0.18);
  ell(c, -26, 0, 34, 15, 0); c.fillStyle = CR; ell(c, -52, 0, 12, 12, 0); c.restore();
  /* back legs */
  c.fillStyle = BR;
  c.save(); c.translate(-18, -26 - bob); c.rotate(sw * 0.55); c.beginPath(); c.roundRect ? c.roundRect(-7, 0, 14, 28 + bob, 7) : c.rect(-7, 0, 14, 28); c.fill(); c.restore();
  c.save(); c.translate(-2, -26 - bob); c.rotate(-sw * 0.55); c.beginPath(); c.roundRect ? c.roundRect(-7, 0, 14, 28 + bob, 7) : c.rect(-7, 0, 14, 28); c.fill(); c.restore();
  /* body */
  c.fillStyle = OR; ell(c, 0, -52 - bob, 44, 31, 0);
  c.fillStyle = CR; ell(c, 8, -43 - bob, 30, 17, 0.1);
  /* front legs */
  c.fillStyle = BR;
  c.save(); c.translate(22, -30 - bob); c.rotate(-sw * 0.55); c.beginPath(); c.roundRect ? c.roundRect(-7, 0, 14, 30 + bob, 7) : c.rect(-7, 0, 14, 30); c.fill(); c.restore();
  c.save(); c.translate(34, -30 - bob); c.rotate(sw * 0.55); c.beginPath(); c.roundRect ? c.roundRect(-7, 0, 14, 30 + bob, 7) : c.rect(-7, 0, 14, 30); c.fill(); c.restore();
  /* guitar on back */
  if (has('guitar')) {
    c.save(); c.translate(-6, -62 - bob); c.rotate(-0.9);
    c.fillStyle = '#8d5524'; c.fillRect(-4, -46, 8, 50); c.fillStyle = '#d98a3d'; ell(c, 0, 14, 17, 13, 0); ell(c, 0, 0, 12, 9, 0);
    c.fillStyle = '#3e2412'; ell(c, 0, 10, 5, 5, 0); c.restore();
  }
  /* scarf */
  if (has('scarf')) {
    c.fillStyle = '#26a69a'; c.beginPath(); c.moveTo(20, -76 - bob); c.quadraticCurveTo(34, -62, 46, -74 - bob); c.lineTo(46, -64 - bob); c.quadraticCurveTo(34, -52, 20, -62 - bob); c.closePath(); c.fill();
    var f2 = Math.sin(t * 12) * 5; c.beginPath(); c.moveTo(22, -66 - bob); c.lineTo(-24, -58 + f2 - bob); c.lineTo(-24, -46 + f2 - bob); c.lineTo(24, -54 - bob); c.closePath(); c.fill();
  }
  /* head */
  var hx = 40, hy = -82 - bob;
  c.fillStyle = OR;
  c.beginPath(); c.moveTo(hx - 12, hy - 20); c.lineTo(hx - 6, hy - 50); c.lineTo(hx + 12, hy - 24); c.closePath(); c.fill();
  c.fillStyle = BR; c.beginPath(); c.moveTo(hx - 9, hy - 25); c.lineTo(hx - 5, hy - 42); c.lineTo(hx + 4, hy - 27); c.closePath(); c.fill();
  c.fillStyle = OR; ell(c, hx, hy, 30, 27, 0);
  c.beginPath(); c.moveTo(hx + 4, hy - 22); c.lineTo(hx + 16, hy - 52); c.lineTo(hx + 28, hy - 20); c.closePath(); c.fill();
  c.fillStyle = BR; c.beginPath(); c.moveTo(hx + 10, hy - 25); c.lineTo(hx + 16, hy - 42); c.lineTo(hx + 22, hy - 24); c.closePath(); c.fill();
  c.fillStyle = CR; ell(c, hx + 22, hy + 8, 22, 14, 0.12); ell(c, hx + 2, hy + 12, 18, 12, 0);
  c.fillStyle = PK; c.globalAlpha = 0.55; ell(c, hx + 8, hy + 8, 7, 5, 0); c.globalAlpha = 1;
  c.fillStyle = BR; ell(c, hx + 40, hy + 3, 6.5, 5, 0);
  if (!has('sunglasses')) {
    c.fillStyle = BR; ell(c, hx + 14, hy - 6, 5, 7, 0); c.fillStyle = '#fff'; ell(c, hx + 15.5, hy - 8.5, 2, 2, 0);
  } else {
    c.fillStyle = '#1c1c24'; c.beginPath(); c.roundRect ? c.roundRect(hx + 4, hy - 16, 26, 17, 8) : c.rect(hx + 4, hy - 16, 26, 17); c.fill();
    c.fillRect(hx - 12, hy - 11, 18, 4); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(hx + 9, hy - 12, 8, 3);
  }
  c.strokeStyle = BR; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx + 28, hy + 12); c.quadraticCurveTo(hx + 34, hy + 17, hx + 40, hy + 11); c.stroke();
  /* head gear */
  if (has('cap')) {
    c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(hx - 22, hy - 16); c.quadraticCurveTo(hx + 2, hy - 54, hx + 28, hy - 16); c.closePath(); c.fill();
    c.fillStyle = '#c62828'; c.beginPath(); c.ellipse(hx + 28, hy - 16, 24, 5, 0.05, 0, 6.3); c.fill();
  }
  if (has('crown')) {
    c.fillStyle = '#ffc107'; c.beginPath(); c.moveTo(hx - 12, hy - 22); c.lineTo(hx - 14, hy - 44); c.lineTo(hx - 3, hy - 34); c.lineTo(hx + 6, hy - 48); c.lineTo(hx + 15, hy - 34); c.lineTo(hx + 26, hy - 44); c.lineTo(hx + 24, hy - 22); c.closePath(); c.fill();
    c.fillStyle = '#e53935'; ell(c, hx + 6, hy - 30, 3, 3, 0);
  }
  if (has('helmet')) {
    c.fillStyle = 'rgba(190,230,255,.3)'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(hx + 8, hy - 2, 46, 0, 6.3); c.fill(); c.stroke();
    c.fillStyle = '#cfd8dc'; ell(c, hx + 2, hy + 38, 30, 6, 0);
  }
  c.restore();
};
})();
