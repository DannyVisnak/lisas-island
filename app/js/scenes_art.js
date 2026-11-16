/* Lisa's Island - seek-and-find scenes: hand-drawn SVG backgrounds (bg = behind the items, fg = in front, hides part of
   some items) and fixed item placements. Coordinates are "units": 1 unit = 0.1 rem, the world is 2400 x 768 units
   (1.76 screens wide, the screen is 1366 x 768). Item art is the normal app/img/<id>.svg (one per vocab id).
   x, y = centre of the item, s = art size, hit = tappable square (always >= 120 units = 12 rem; the engine enforces 110).
   hide = how much of the item the fg covers (for the test report only, the covering is drawn in fg). */
(function () {
'use strict';
var W = 2400, H = 768;

/* ---------- little drawing helpers (strings) ---------- */
function cloud(x, y, s) {
  s = s || 1;
  return '<g class="cl" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff"><ellipse cx="0" cy="0" rx="90" ry="34"/><ellipse cx="62" cy="-20" rx="56" ry="34"/><ellipse cx="-56" cy="-14" rx="50" ry="28"/></g>';
}
function hill(x1, x2, top, base, col) {
  var m = (x1 + x2) / 2;
  return '<path d="M' + x1 + ' ' + base + ' Q' + m + ' ' + (top - (base - top) * 0.3) + ' ' + x2 + ' ' + base + 'Z" fill="' + col + '"/>';
}
function treeSvg(x, y, s, crown, trunk) {
  /* x,y = foot of the trunk, s = scale; crown is a cluster of round shapes */
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<path d="M-26 0 L-18 -230 L18 -230 L26 0Z" fill="' + (trunk || '#a9744a') + '"/><path d="M-6 -20 L-4 -200" stroke="#8d5d38" stroke-width="7" stroke-linecap="round" opacity=".5"/>' +
    '<circle cx="-92" cy="-250" r="92" fill="' + crown + '"/><circle cx="92" cy="-250" r="92" fill="' + crown + '"/><circle cx="0" cy="-340" r="108" fill="' + crown + '"/><circle cx="-10" cy="-250" r="108" fill="' + crown + '"/>' +
    '<circle cx="-70" cy="-300" r="40" fill="#fff" opacity=".12"/></g>';
}
function bush(x, y, w, col, dark) {
  var r = w / 4;
  return '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="0" rx="' + (w / 2) + '" ry="' + (r * 1.1) + '" fill="' + dark + '"/><circle cx="' + (-r) + '" cy="' + (-r * 0.5) + '" r="' + r * 1.1 + '" fill="' + col + '"/><circle cx="' + r + '" cy="' + (-r * 0.55) + '" r="' + r * 1.15 + '" fill="' + col + '"/><circle cx="0" cy="' + (-r * 0.95) + '" r="' + r * 1.2 + '" fill="' + col + '"/></g>';
}
function flowers(list, cols) {
  var s = '';
  list.forEach(function (p, i) {
    var c = cols[i % cols.length];
    s += '<path d="M' + p[0] + ' ' + (p[1] + 26) + ' V' + p[1] + '" stroke="#4caf50" stroke-width="4"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="10" fill="' + c + '"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff59d"/>';
  });
  return s;
}
function grassTufts(list) {
  return list.map(function (p) { return '<path d="M' + (p[0] - 12) + ' ' + p[1] + ' L' + (p[0] - 6) + ' ' + (p[1] - 18) + ' L' + p[0] + ' ' + p[1] + ' L' + (p[0] + 6) + ' ' + (p[1] - 22) + ' L' + (p[0] + 12) + ' ' + p[1] + 'Z" fill="#5fb94a" opacity=".7"/>'; }).join('');
}
function sunSvg(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="96" fill="#fff3b0" opacity=".5"/><circle cx="' + x + '" cy="' + y + '" r="62" fill="#ffe27a"/>'; }
function skyGrad(id, a, b) { return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>'; }
function wrap(inner) { return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; }

/* ====================================================================== ZOO ====================================================================== */
var zooBg =
  skyGrad('zs', '#8fd3ff', '#e6f7ff') + '<rect width="' + W + '" height="' + H + '" fill="url(#zs)"/>' + sunSvg(1960, 120) +
  cloud(240, 130, 1) + cloud(820, 90, .8) + cloud(1500, 150, 1.1) + cloud(2200, 230, .7) +
  hill(-200, 760, 330, 560, '#bfe9a4') + hill(500, 1500, 300, 560, '#b2e39a') + hill(1300, 2500, 320, 560, '#c4ebaa') +
  '<rect x="0" y="470" width="' + W + '" height="' + (H - 470) + '" fill="#a9e58f"/>' +
  '<path d="M0 560 Q300 520 620 560 T1250 548 T1900 566 T2400 548 V768 H0Z" fill="#8fdc72"/>' +
  '<path d="M0 668 Q400 630 900 672 T1700 660 T2400 676 V768 H0Z" fill="#7ed957"/>' +
  /* sandy path winding through the whole zoo */
  '<path d="M-20 720 Q240 670 520 706 T1040 740 Q1260 760 1500 700 T2020 716 T2420 690" fill="none" stroke="#f3d28b" stroke-width="58" stroke-linecap="round"/>' +
  '<path d="M-20 720 Q240 670 520 706 T1040 740 Q1260 760 1500 700 T2020 716 T2420 690" fill="none" stroke="#fff3c4" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 24"/>' +
  /* LION den: rocky hill + cave */
  '<path d="M40 560 Q60 380 210 360 Q320 340 410 392 Q500 440 500 560Z" fill="#b9a58b"/><path d="M80 560 Q100 420 220 400 Q320 384 392 430 Q450 470 450 560Z" fill="#cdbba2"/>' +
  '<ellipse cx="266" cy="540" rx="150" ry="50" fill="#e0cfa2"/><path d="M120 470 Q150 440 200 450 M300 420 Q340 410 380 440" stroke="#a89473" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>' +
  '<rect x="40" y="552" width="460" height="14" rx="7" fill="#9e9e9e"/>' +
  /* signs */
  '<g><rect x="120" y="580" width="12" height="80" fill="#8d5d38"/><rect x="80" y="560" width="92" height="52" rx="12" fill="#ffcc80"/><path d="M104 596 q10 -22 22 -6 q12 -16 22 6" fill="none" stroke="#a1662f" stroke-width="6" stroke-linecap="round"/></g>' +
  /* POND */
  '<ellipse cx="760" cy="650" rx="268" ry="116" fill="#f0e0a6"/><ellipse cx="760" cy="650" rx="240" ry="96" fill="#6fd3f7"/><ellipse cx="740" cy="634" rx="190" ry="60" fill="#8ee0fb"/>' +
  '<g fill="none" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round"><path d="M640 600 q18 -10 36 0"/><path d="M820 700 q18 -10 36 0"/><ellipse cx="880" cy="598" rx="44" ry="10"/></g>' +
  '<ellipse cx="590" cy="676" rx="52" ry="20" fill="#43a047"/><path d="M590 676 L626 664" stroke="#6fd3f7" stroke-width="8"/>' +
  '<ellipse cx="930" cy="690" rx="38" ry="14" fill="#43a047"/>' +
  /* BIG TREE */
  treeSvg(1110, 700, 1.15, '#5cb85c') + '<ellipse cx="1110" cy="706" rx="110" ry="22" fill="#6dc956" opacity=".8"/>' +
  '<g fill="#e57373"><circle cx="1020" cy="190" r="10"/><circle cx="1210" cy="150" r="10"/><circle cx="1260" cy="320" r="10"/></g>' +
  /* FARM: barn, hay, paddock back rails, mud */
  '<g><rect x="1560" y="268" width="270" height="226" fill="#d9534f"/><path d="M1536 276 L1695 164 L1854 276Z" fill="#a8322f"/><rect x="1630" y="350" width="130" height="144" rx="6" fill="#fff"/><path d="M1630 350 L1760 494 M1760 350 L1630 494" stroke="#d9534f" stroke-width="10"/><rect x="1664" y="206" width="62" height="42" rx="6" fill="#fff"/></g>' +
  '<g fill="#e6c25a"><ellipse cx="1950" cy="480" rx="62" ry="38"/><ellipse cx="2010" cy="472" rx="46" ry="30"/></g><path d="M1900 470 q30 -16 60 0 M1976 462 q24 -12 46 0" stroke="#c9a23e" stroke-width="5" fill="none"/>' +
  '<g stroke="#a9744a" stroke-width="12" stroke-linecap="round"><path d="M1330 470 H1990"/></g>' +
  '<ellipse cx="1910" cy="690" rx="120" ry="34" fill="#8d6e4f"/><ellipse cx="1900" cy="684" rx="84" ry="20" fill="#a07f5c"/>' +
  /* PETTING GARDEN: kennel + hut */
  '<g><path d="M2090 470 L2210 372 L2330 470Z" fill="#d9534f"/><rect x="2106" y="468" width="208" height="150" fill="#ffd9a0"/><path d="M2166 618 V540 Q2210 500 2254 540 V618Z" fill="#6d4c41"/><rect x="2106" y="610" width="208" height="12" fill="#c9a06a"/></g>' +
  flowers([[60, 640], [180, 700], [440, 600], [1260, 640], [1330, 700], [1420, 560], [2040, 640], [2370, 700], [610, 730], [1700, 720]], ['#f48fb1', '#fff176', '#ce93d8', '#ffb74d', '#90caf9']) +
  grassTufts([[330, 720], [520, 650], [980, 580], [1250, 750], [1620, 740], [2100, 740], [2390, 600]]);

var zooFg =
  /* boulder in front of the lion (covers its lower right) */
  '<g><ellipse cx="336" cy="574" rx="92" ry="62" fill="#9a8a78"/><ellipse cx="320" cy="556" rx="76" ry="48" fill="#b0a08c"/><ellipse cx="300" cy="540" rx="30" ry="14" fill="#fff" opacity=".18"/></g>' +
  /* reeds at the left of the pond (frog), and a wavy water veil over the lower fish */
  '<g stroke="#2e7d32" stroke-width="9" stroke-linecap="round"><path d="M520 700 Q514 640 530 590"/><path d="M544 704 Q548 650 536 604"/><path d="M566 704 Q574 664 560 628"/></g>' +
  '<g fill="#8d5d38"><ellipse cx="530" cy="590" rx="9" ry="22"/><ellipse cx="536" cy="604" rx="0" ry="0"/><ellipse cx="560" cy="628" rx="8" ry="18"/></g>' +
  '<defs><clipPath id="zc"><ellipse cx="760" cy="650" rx="240" ry="96"/></clipPath></defs><g clip-path="url(#zc)">' +
  '<path d="M500 676 Q550 656 600 676 T700 676 T800 676 T900 676 T1000 668 V760 H500Z" fill="#5ec8f2" opacity=".5"/>' +
  '<path d="M500 676 Q550 656 600 676 T700 676 T800 676 T900 676 T1000 668" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/></g>' +
  /* leaf curtain in the tree (bird) and rock at the trunk foot (mouse) */
  '<g><circle cx="1190" cy="298" r="58" fill="#7ad37a"/><circle cx="1138" cy="318" r="48" fill="#6cc76c"/><circle cx="1226" cy="262" r="38" fill="#86dc86"/><path d="M1150 290 q20 -20 44 -4" stroke="#4caf50" stroke-width="6" fill="none" opacity=".6"/></g>' +
  '<g><ellipse cx="1120" cy="722" rx="62" ry="40" fill="#9a8a78"/><ellipse cx="1108" cy="710" rx="48" ry="28" fill="#b0a08c"/></g>' +
  /* paddock board fence in front of horse + cow */
  '<g fill="#c28b57"><rect x="1330" y="528" width="670" height="20" rx="8"/><rect x="1330" y="572" width="670" height="20" rx="8"/><rect x="1348" y="500" width="26" height="130" rx="10"/><rect x="1498" y="500" width="26" height="130" rx="10"/><rect x="1648" y="500" width="26" height="130" rx="10"/><rect x="1798" y="500" width="26" height="130" rx="10"/><rect x="1948" y="500" width="26" height="130" rx="10"/></g>' +
  '<g fill="#a9744a" opacity=".5"><rect x="1330" y="540" width="670" height="8" rx="4"/><rect x="1330" y="584" width="670" height="8" rx="4"/></g>' +
  /* flower box + bush in the petting garden */
  '<g><rect x="2150" y="590" width="120" height="48" rx="10" fill="#a9744a"/><rect x="2150" y="590" width="120" height="14" rx="6" fill="#c28b57"/><circle cx="2172" cy="588" r="12" fill="#f06292"/><circle cx="2210" cy="582" r="12" fill="#fff176"/><circle cx="2248" cy="588" r="12" fill="#ce93d8"/></g>' +
  bush(2352, 596, 150, '#56b85a', '#3f9a47');

/* ====================================================================== HOUSE ====================================================================== */
function tileGrid(x, y, w, h, step, col) {
  var s = '<g stroke="' + col + '" stroke-width="3" opacity=".55">';
  for (var i = x; i <= x + w; i += step) s += '<path d="M' + i + ' ' + y + ' V' + (y + h) + '"/>';
  for (var j = y; j <= y + h; j += step) s += '<path d="M' + x + ' ' + j + ' H' + (x + w) + '"/>';
  return s + '</g>';
}
function windowSvg(x, y, w, h) {
  return '<g><rect x="' + (x - 10) + '" y="' + (y - 10) + '" width="' + (w + 20) + '" height="' + (h + 20) + '" rx="14" fill="#fff"/><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="#a9defa"/><ellipse cx="' + (x + w * 0.3) + '" cy="' + (y + h * 0.3) + '" rx="30" ry="12" fill="#fff" opacity=".8"/><path d="M' + (x + w / 2) + ' ' + y + ' V' + (y + h) + ' M' + x + ' ' + (y + h / 2) + ' H' + (x + w) + '" stroke="#fff" stroke-width="8"/></g>';
}
var houseBg =
  '<rect width="' + W + '" height="' + H + '" fill="#fff3e0"/>' +
  /* room wallpapers */
  '<rect x="0" y="96" width="610" height="540" fill="#e1d4f5"/><rect x="610" y="96" width="620" height="540" fill="#ffdcb8"/><rect x="1230" y="96" width="560" height="540" fill="#e6f2b5"/><rect x="1790" y="96" width="200" height="540" fill="#fff0b3"/><rect x="1990" y="96" width="410" height="540" fill="#bfe9f2"/>' +
  /* wallpaper dots per room */
  (function () { var s = '', cols = ['#d2c0ee', '#fdcb9c', '#d5e69a', '#ffe58a', '#a8dcea'], xs = [0, 610, 1230, 1790, 1990], ws = [610, 620, 560, 200, 410];
    for (var r = 0; r < 5; r++) for (var i = 0; i < 70; i++) { var x = xs[r] + 20 + (i * 83) % (ws[r] - 40), y = 120 + (i * 61) % 480; s += '<circle cx="' + x + '" cy="' + y + '" r="' + (6 + i % 3 * 2) + '" fill="' + cols[r] + '" opacity=".6"/>'; }
    return s; })() +
  tileGrid(1990, 380, 410, 256, 64, '#8fcfe0') + tileGrid(1230, 460, 560, 176, 56, '#c7dc86') +
  /* ceiling, beams, floor */
  '<rect width="' + W + '" height="96" fill="#fff8ec"/><rect y="86" width="' + W + '" height="14" fill="#e7cfa1"/>' +
  '<rect y="636" width="' + W + '" height="132" fill="#d9a86c"/><path d="M0 636 H2400" stroke="#b8864d" stroke-width="10"/>' +
  (function () { var s = '<g stroke="#c4925a" stroke-width="4" opacity=".7">'; for (var i = 0; i < 2400; i += 150) s += '<path d="M' + i + ' 636 L' + (i - 40) + ' 768"/>'; s += '<path d="M0 700 H2400"/></g>'; return s; })() +
  '<g fill="#e7cfa1"><rect x="600" y="96" width="22" height="540"/><rect x="1220" y="96" width="22" height="540"/><rect x="1780" y="96" width="22" height="540"/><rect x="1980" y="96" width="22" height="540"/></g>' +
  /* lamps */
  '<g stroke="#8d6e63" stroke-width="5"><path d="M300 96 V150"/><path d="M910 96 V150"/><path d="M1510 96 V150"/><path d="M2190 96 V150"/></g>' +
  '<g fill="#ffd54f"><path d="M262 190 Q300 128 338 190Z"/><path d="M872 190 Q910 128 948 190Z"/><path d="M1472 190 Q1510 128 1548 190Z"/><path d="M2152 190 Q2190 128 2228 190Z"/></g>' +
  /* BEDROOM: window, bed frame hint, rug, shelf picture */
  windowSvg(60, 150, 170, 190) + '<rect x="332" y="150" width="140" height="106" rx="10" fill="#fff"/><path d="M350 240 l30 -50 l24 30 l20 -22 l26 42Z" fill="#81c784"/><circle cx="440" cy="186" r="14" fill="#ffd54f"/>' +
  '<ellipse cx="300" cy="650" rx="190" ry="26" fill="#9575cd" opacity=".55"/><rect x="60" y="560" width="270" height="76" rx="12" fill="#7e57c2"/><rect x="60" y="440" width="26" height="196" rx="8" fill="#5e35b1"/>' +
  '<rect x="64" y="470" width="262" height="100" rx="18" fill="#fff"/><rect x="64" y="470" width="262" height="40" rx="18" fill="#b39ddb"/><rect x="80" y="440" width="96" height="48" rx="22" fill="#ede7f6"/>' +
  /* LIVING ROOM: tv cabinet, shelf with books, window, sofa-back hint */
  '<rect x="690" y="548" width="200" height="88" rx="10" fill="#a9744a"/><rect x="700" y="560" width="82" height="60" rx="6" fill="#c28b57"/><rect x="798" y="560" width="82" height="60" rx="6" fill="#c28b57"/>' +
  '<rect x="906" y="326" width="196" height="16" rx="6" fill="#a9744a"/><path d="M930 342 V380 M1078 342 V380" stroke="#a9744a" stroke-width="10"/>' +
  windowSvg(1100, 160, 90, 130) + '<rect x="650" y="150" width="120" height="100" rx="10" fill="#fff"/><circle cx="710" cy="200" r="30" fill="#ffab91"/><circle cx="710" cy="200" r="14" fill="#ffe0b2"/>' +
  '<rect x="1040" y="598" width="150" height="38" rx="12" fill="#ef9a9a"/><rect x="1060" y="560" width="110" height="46" rx="14" fill="#f48fb1" opacity=".0"/>' +
  /* KITCHEN: counter, window, table, wall hook board */
  '<rect x="1250" y="400" width="500" height="20" rx="6" fill="#a9744a"/><rect x="1250" y="420" width="500" height="216" fill="#fff"/><path d="M1380 420 V636 M1500 420 V636 M1620 420 V636" stroke="#c7dc86" stroke-width="5"/>' +
  windowSvg(1280, 150, 170, 150) + '<rect x="1640" y="320" width="150" height="40" rx="10" fill="#a9744a"/><g fill="#8d6e63"><circle cx="1664" cy="340" r="8"/><circle cx="1708" cy="340" r="8"/><circle cx="1752" cy="340" r="8"/></g>' +
  '<rect x="1330" y="498" width="220" height="22" rx="8" fill="#c28b57"/><rect x="1350" y="520" width="18" height="116" fill="#a9744a"/><rect x="1512" y="520" width="18" height="116" fill="#a9744a"/>' +
  /* HALL: front door frame + mat */
  '<rect x="1800" y="396" width="180" height="240" rx="14" fill="#e7cfa1"/><rect x="1812" y="408" width="156" height="228" rx="10" fill="#8d6e63"/><rect x="1820" y="620" width="140" height="18" rx="6" fill="#ef5350"/>' +
  /* BATHROOM: tub, mirror, sink, tiles, window */
  '<rect x="2030" y="150" width="150" height="120" rx="16" fill="#fff"/><rect x="2042" y="162" width="126" height="96" rx="10" fill="#e1f5fe"/><path d="M2060 240 L2100 180" stroke="#fff" stroke-width="8" opacity=".7"/>' +
  '<rect x="2250" y="300" width="100" height="14" rx="6" fill="#90a4ae"/><path d="M2270 314 V360 M2330 314 V360" stroke="#90a4ae" stroke-width="8"/><rect x="2262" y="360" width="76" height="20" rx="10" fill="#fff"/>' +
  '<rect x="2040" y="590" width="110" height="46" rx="12" fill="#fff" opacity=".0"/>';

var houseFg =
  /* toy basket front (teddy) */
  '<g><path d="M340 598 H460 L450 662 Q400 676 350 662Z" fill="#d9a05c"/><path d="M340 598 H460" stroke="#b97e3d" stroke-width="12" stroke-linecap="round"/><path d="M352 616 H448 M356 636 H444" stroke="#b97e3d" stroke-width="6" opacity=".6"/></g>' +
  /* plant on the shelf (hides part of the book) */
  '<g><path d="M996 330 Q1024 270 1050 330Z" fill="#43a047"/><path d="M1000 330 Q990 290 970 296 Q984 316 1000 330Z" fill="#66bb6a"/><path d="M1052 330 Q1066 290 1086 296 Q1070 316 1052 330Z" fill="#66bb6a"/><path d="M1008 330 Q1024 296 1040 330Z" fill="#81c784"/><rect x="1004" y="322" width="60" height="22" rx="6" fill="#ef6c00"/></g>' +
  /* floor plant next to the ball */
  '<g><path d="M1178 650 Q1190 580 1212 566 Q1214 610 1214 650Z" fill="#43a047"/><path d="M1206 650 Q1230 590 1262 600 Q1240 624 1226 650Z" fill="#66bb6a"/><path d="M1170 650 Q1150 616 1126 624 Q1146 640 1166 650Z" fill="#66bb6a"/><rect x="1172" y="630" width="64" height="62" rx="12" fill="#e67e22"/><rect x="1166" y="624" width="76" height="16" rx="8" fill="#f0903a"/></g>' +
  /* fruit bowl in front of the spoon */
  '<g><path d="M1396 498 H1498 Q1492 540 1447 542 Q1402 540 1396 498Z" fill="#ef9a9a"/><circle cx="1420" cy="494" r="14" fill="#e53935"/><circle cx="1448" cy="486" r="14" fill="#fdd835"/><circle cx="1474" cy="494" r="14" fill="#7cb342"/><path d="M1396 498 H1498" stroke="#d32f2f" stroke-width="8" stroke-linecap="round"/></g>' +
  /* cardboard box in front of the pencil */
  '<g><rect x="1494" y="630" width="92" height="76" rx="8" fill="#d9a05c"/><rect x="1494" y="630" width="92" height="20" rx="8" fill="#c28b57"/><path d="M1540 630 V650" stroke="#a9744a" stroke-width="5"/></g>' +
  /* curtain over the key's board */
  '<g><path d="M1742 130 H1790 V420 Q1766 440 1742 420Z" fill="#ffab91"/><path d="M1758 130 V420 M1774 130 V420" stroke="#ff8a65" stroke-width="5" opacity=".7"/></g>' +
  /* shower curtain at the left of the tub */
  '<g><rect x="2008" y="418" width="14" height="26" fill="#90a4ae"/><path d="M2004 420 H2084 V610 Q2044 624 2004 610Z" fill="#80deea" opacity=".95"/><path d="M2024 420 V612 M2046 420 V616 M2066 420 V612" stroke="#4dd0e1" stroke-width="5" opacity=".8"/></g>';

/* ====================================================================== PICNIC ====================================================================== */
var picnicBg =
  skyGrad('ps', '#9bdcff', '#eefaff') + '<rect width="' + W + '" height="' + H + '" fill="url(#ps)"/>' + sunSvg(1380, 110) +
  cloud(180, 110, .9) + cloud(760, 160, 1.1) + cloud(1900, 100, 1) + cloud(2250, 200, .7) +
  hill(-300, 900, 340, 580, '#c0eaa4') + hill(700, 1900, 310, 580, '#b4e49b') + hill(1500, 2700, 330, 580, '#c5ecab') +
  '<rect x="0" y="480" width="' + W + '" height="288" fill="#a9e58f"/>' +
  '<path d="M0 580 Q400 536 900 578 T1700 566 T2400 580 V768 H0Z" fill="#8fdc72"/><path d="M0 690 Q500 650 1200 694 T2400 684 V768 H0Z" fill="#7ed957"/>' +
  /* tree 1 with fruit (orange, apple) */
  treeSvg(420, 660, 1.3, '#58b85f') + '<g fill="#ff9800"><circle cx="320" cy="200" r="11"/><circle cx="500" cy="170" r="11"/></g><g fill="#e53935"><circle cx="360" cy="330" r="11"/><circle cx="640" cy="280" r="11"/></g>' +
  /* strawberry patch */
  bush(230, 676, 230, '#4caf50', '#388e3c') + '<g fill="#e53935"><circle cx="170" cy="640" r="9"/><circle cx="280" cy="650" r="9"/></g>' +
  /* carrot garden bed */
  '<rect x="640" y="650" width="260" height="90" rx="30" fill="#8d6e4f"/><rect x="650" y="656" width="240" height="40" rx="20" fill="#a07f5c"/>' +
  /* blanket (gingham) */
  '<path d="M780 540 H1880 L2000 722 H650Z" fill="#ef9a9a"/>' +
  (function () { var s = '<defs><clipPath id="pk"><path d="M780 540 H1880 L2000 722 H650Z"/></clipPath></defs><g clip-path="url(#pk)"><g fill="#fff" opacity=".6">'; for (var i = 0; i < 12; i++) s += '<path d="M' + (780 + i * 100) + ' 540 H' + (830 + i * 100) + ' L' + (830 + i * 110 - 60) + ' 722 H' + (780 + i * 110 - 60) + 'Z"/>'; s += '</g><g fill="#fff" opacity=".35"><path d="M700 600 H1950 V630 H700Z"/><path d="M650 668 H2000 V698 H650Z"/></g></g>'; return s; })() +
  /* picnic basket body (back part) */
  '<path d="M884 520 H1156 L1130 650 Q1020 668 910 650Z" fill="#d9a05c"/><path d="M930 520 Q1020 410 1110 520" fill="none" stroke="#b97e3d" stroke-width="16" stroke-linecap="round"/>' +
  /* banana tree */
  '<g transform="translate(2040 690)"><path d="M-22 0 L-14 -380 L14 -380 L22 0Z" fill="#a9744a"/>' +
    '<path d="M0 -380 Q-120 -440 -210 -380 Q-120 -400 0 -360Z" fill="#43a047"/><path d="M0 -380 Q120 -440 210 -380 Q120 -400 0 -360Z" fill="#43a047"/><path d="M0 -380 Q-60 -490 -150 -520 Q-60 -470 0 -380Z" fill="#66bb6a"/><path d="M0 -380 Q60 -490 150 -520 Q60 -470 0 -380Z" fill="#66bb6a"/><path d="M0 -380 Q0 -500 0 -560 Q20 -480 0 -380Z" fill="#81c784"/></g>' +
  /* cooler box (back / lid) */
  '<rect x="1730" y="596" width="150" height="100" rx="12" fill="#42a5f5"/><path d="M1722 596 H1888 L1900 570 H1710Z" fill="#1e88e5"/>' +
  /* hay nest */
  '<ellipse cx="2260" cy="700" rx="110" ry="36" fill="#d4b254"/>' +
  flowers([[110, 740], [560, 720], [1240, 750], [1680, 750], [2120, 744], [2370, 720], [720, 760], [1990, 580]], ['#f48fb1', '#fff176', '#ce93d8', '#ffb74d', '#90caf9']) +
  grassTufts([[60, 700], [340, 740], [580, 600], [980, 740], [1960, 750], [2330, 600]]) +
  /* butterflies */
  '<g fill="#ce93d8"><path d="M1240 400 q-16 -16 -4 -28 q12 8 4 28 q16 -16 28 -4 q-8 12 -28 4Z"/></g><g fill="#ffb74d"><path d="M1750 330 q-16 -16 -4 -28 q12 8 4 28 q16 -16 28 -4 q-8 12 -28 4Z"/></g>';

var picnicFg =
  /* leaves hiding orange + apple in the tree */
  '<g><circle cx="438" cy="262" r="48" fill="#7ad37a"/><circle cx="392" cy="262" r="36" fill="#6cc76c"/><circle cx="462" cy="236" r="28" fill="#86dc86"/></g>' +
  '<g><circle cx="602" cy="352" r="44" fill="#7ad37a"/><circle cx="560" cy="358" r="30" fill="#6cc76c"/><circle cx="624" cy="326" r="26" fill="#86dc86"/></g>' +
  /* strawberry bush front leaves */
  bush(274, 696, 150, '#5cbd5f', '#43a047') +
  /* soil mound over the carrot */
  '<g><ellipse cx="770" cy="704" rx="96" ry="42" fill="#7b5a3a"/><ellipse cx="770" cy="694" rx="84" ry="32" fill="#946b44"/><circle cx="740" cy="690" r="6" fill="#7b5a3a"/><circle cx="800" cy="696" r="6" fill="#7b5a3a"/></g>' +
  /* basket front rim and cloth */
  '<g><path d="M876 548 H1164 L1138 662 Q1020 684 902 662Z" fill="#e0a95a"/><path d="M876 548 H1164" stroke="#b97e3d" stroke-width="14" stroke-linecap="round"/><path d="M896 580 H1146 M900 606 H1142 M906 632 H1136" stroke="#b97e3d" stroke-width="6" opacity=".6"/><path d="M880 552 L1160 552 L1170 566 L870 566Z" fill="#fff" opacity=".9"/><path d="M880 552 L1160 552 L1170 566 L870 566Z" fill="#e53935" opacity=".25"/></g>' +
  /* cooler box front (ice cream) */
  '<g><rect x="1722" y="590" width="166" height="112" rx="14" fill="#64b5f6"/><rect x="1722" y="590" width="166" height="26" rx="12" fill="#42a5f5"/><rect x="1778" y="632" width="54" height="16" rx="8" fill="#fff"/></g>' +
  /* banana tree front leaf */
  '<g><path d="M1980 330 Q2030 300 2020 370 Q1990 380 1980 330Z" fill="#43a047"/><path d="M1960 356 Q2010 320 2004 392 Q1976 396 1960 356Z" fill="#66bb6a"/></g>' +
  /* hay nest front */
  '<g><path d="M2158 670 Q2260 640 2362 670 Q2330 724 2260 724 Q2190 724 2158 670Z" fill="#e6c25a"/><path d="M2180 676 q40 -14 80 0 M2250 676 q40 -14 80 0 M2200 698 q30 -10 60 0 M2262 700 q30 -10 60 0" stroke="#c9a23e" stroke-width="6" fill="none" stroke-linecap="round"/></g>';

/* ---------- registry ---------- */
var SceneArt = window.SceneArt = {
  zoo: {
    id: 'zoo', worlds: ['animals'], edge: 'linear-gradient(#8fd3ff,#7ed957)', introKey: 'scene_zoo_intro',
    bg: wrap(zooBg), fg: wrap(zooFg),
    items: [
      { id: 'lion', x: 266, y: 492, s: 160, hit: 150, hide: 0.3 },
      { id: 'frog', x: 592, y: 646, s: 110, hit: 130, hide: 0.2 },
      { id: 'fish', x: 740, y: 648, s: 120, hit: 130, hide: 0.4 },
      { id: 'duck', x: 886, y: 568, s: 120, hit: 130, hide: 0 },
      { id: 'bird', x: 1146, y: 250, s: 120, hit: 130, hide: 0.4 },
      { id: 'mouse', x: 1062, y: 686, s: 100, hit: 130, hide: 0.35 },
      { id: 'horse', x: 1480, y: 476, s: 170, hit: 150, hide: 0.3 },
      { id: 'cow', x: 1700, y: 478, s: 170, hit: 150, hide: 0.3 },
      { id: 'pig', x: 1904, y: 626, s: 130, hit: 130, hide: 0 },
      { id: 'cat', x: 2210, y: 342, s: 120, hit: 130, hide: 0 },
      { id: 'dog', x: 2210, y: 540, s: 120, hit: 130, hide: 0.35 },
      { id: 'rabbit', x: 2332, y: 520, s: 110, hit: 120, hide: 0.35 }
    ]
  },
  house: {
    id: 'house', worlds: ['home', 'toys'], edge: 'linear-gradient(#fff8ec,#d9a86c)', introKey: 'scene_house_intro',
    bg: wrap(houseBg), fg: wrap(houseFg),
    items: [
      { id: 'bed', x: 196, y: 516, s: 210, hit: 190, hide: 0 },
      { id: 'teddy', x: 400, y: 584, s: 120, hit: 130, hide: 0.4 },
      { id: 'balloon', x: 524, y: 262, s: 130, hit: 130, hide: 0 },
      { id: 'tv', x: 790, y: 424, s: 170, hit: 150, hide: 0 },
      { id: 'book', x: 962, y: 262, s: 120, hit: 130, hide: 0.35 },
      { id: 'chair', x: 1022, y: 560, s: 150, hit: 140, hide: 0 },
      { id: 'ball', x: 1156, y: 650, s: 110, hit: 120, hide: 0.3 },
      { id: 'spoon', x: 1400, y: 456, s: 110, hit: 120, hide: 0.3 },
      { id: 'pencil', x: 1472, y: 664, s: 110, hit: 120, hide: 0.35 },
      { id: 'backpack', x: 1642, y: 560, s: 140, hit: 130, hide: 0 },
      { id: 'key', x: 1726, y: 272, s: 110, hit: 120, hide: 0.35 },
      { id: 'door', x: 1892, y: 496, s: 180, hit: 150, hide: 0 },
      { id: 'bath', x: 2132, y: 536, s: 210, hit: 180, hide: 0.2 },
      { id: 'toilet', x: 2310, y: 524, s: 150, hit: 130, hide: 0 }
    ]
  },
  picnic: {
    id: 'picnic', worlds: ['food'], edge: 'linear-gradient(#9bdcff,#7ed957)', introKey: 'scene_picnic_intro',
    bg: wrap(picnicBg), fg: wrap(picnicFg),
    items: [
      { id: 'strawberry', x: 224, y: 624, s: 110, hit: 120, hide: 0.3 },
      { id: 'orange', x: 410, y: 232, s: 110, hit: 120, hide: 0.35 },
      { id: 'apple', x: 568, y: 322, s: 110, hit: 120, hide: 0.35 },
      { id: 'carrot', x: 768, y: 648, s: 120, hit: 120, hide: 0.4 },
      { id: 'bread', x: 956, y: 508, s: 120, hit: 130, hide: 0.4 },
      { id: 'milk', x: 1094, y: 498, s: 120, hit: 130, hide: 0.35 },
      { id: 'water', x: 1294, y: 616, s: 110, hit: 120, hide: 0 },
      { id: 'cake', x: 1454, y: 592, s: 120, hit: 130, hide: 0 },
      { id: 'cheese', x: 1626, y: 660, s: 110, hit: 120, hide: 0 },
      { id: 'icecream', x: 1806, y: 556, s: 120, hit: 130, hide: 0.35 },
      { id: 'banana', x: 2026, y: 270, s: 120, hit: 130, hide: 0.3 },
      { id: 'egg', x: 2262, y: 632, s: 110, hit: 120, hide: 0.35 }
    ]
  }
};
SceneArt.W = W; SceneArt.H = H;

/* entry-node icon: binoculars, white on the node colour */
SceneArt.icon = '<svg viewBox="0 0 100 100"><rect x="12" y="34" width="30" height="46" rx="12" fill="#fff"/><rect x="58" y="34" width="30" height="46" rx="12" fill="#fff"/>' +
  '<rect x="36" y="46" width="28" height="16" rx="6" fill="#fff"/><rect x="18" y="22" width="18" height="18" rx="6" fill="#fff"/><rect x="64" y="22" width="18" height="18" rx="6" fill="#fff"/>' +
  '<circle cx="27" cy="68" r="9" fill="#26a69a" opacity=".85"/><circle cx="73" cy="68" r="9" fill="#26a69a" opacity=".85"/><circle cx="24" cy="65" r="3" fill="#fff"/><circle cx="70" cy="65" r="3" fill="#fff"/></svg>';
})();
