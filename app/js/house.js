/* Lisa's Island - Lisa's house. The house grows by itself as the child's lifetime stars reach milestones (5 build stages), and furniture arrives as GIFTS
   earned by finishing things (a level, a mini-game, a scene, the review chest). A gift is opened in the house: pick one of two items, it flies to its slot,
   its word plays. Furniture = vocabulary words: tapping a placed item replays the word (a free review).
   NO spending, NO purse, NO price tags, NO "unaffordable" state: stars only ever grow (Core.save.stars drives the hats and is never touched here).
   Self-contained on purpose: hooks are UI.screens.house (registered here), House.mapBtn() (one line in ui.js, map screen), House.exhausted() (read by Core.houseGift),
   Core.houseGift / housePlace / houseStage in core.js, and the lisa_* voice groups househi / build / builddone / gift / buy.
   Idle: no spoken repeat on this screen, only a visual nudge. Look: css/house.css. Reference: SPEC.md "Lisa's house". */
(function () {
'use strict';
var D = Core.D, Snd = Core.Snd, el = Core.el, tap = Core.tap;
var House = window.House = {};

/* ================= MILESTONES: the ONE place to tune the build (lifetime stars at which stage 1..5 appears; stars are never spent) ================= */
var STAGE_AT = [3, 8, 16, 28, 42];   /* plot, foundation, walls, roof, door + windows. Stage 1 is reachable on day 1 (a level gives 1-3 stars). */

/* ================= CATALOG: word id + fixed slot in the room (x, y = centre, s = picture size; room units: 1 unit = 0.1 rem, room 1200 x 460) ================= */
var CATALOG = [
  { id: 'bed',      slot: { x: 190,  y: 345, s: 220 } },
  { id: 'ball',     slot: { x: 345,  y: 412, s: 80 } },
  { id: 'car',      slot: { x: 432,  y: 410, s: 84 } },
  { id: 'chair',    slot: { x: 690,  y: 388, s: 130 } },
  { id: 'backpack', slot: { x: 812,  y: 400, s: 96 } },
  { id: 'bath',     slot: { x: 962,  y: 378, s: 160 } },
  { id: 'toilet',   slot: { x: 1100, y: 392, s: 120 } },
  { id: 'tv',       slot: { x: 870,  y: 205, s: 130 } },
  { id: 'cake',     slot: { x: 990,  y: 228, s: 88 } },
  { id: 'book',     slot: { x: 100,  y: 128, s: 90 } },
  { id: 'teddy',    slot: { x: 215,  y: 128, s: 90 } },
  { id: 'pencil',   slot: { x: 330,  y: 128, s: 90 } },
  { id: 'balloon',  slot: { x: 438,  y: 72,  s: 100 } },
  { id: 'flower',   slot: { x: 620,  y: 182, s: 90 } },
  { id: 'key',      slot: { x: 812,  y: 74,  s: 90 } },
  { id: 'spoon',    slot: { x: 926,  y: 74,  s: 90 } },
  { id: 'plane',    slot: { x: 1040, y: 74,  s: 90 } }
];
var LISA_W = 136, LISA_H = 153.3;                          /* Lisa in room units */
var LISA_EXT = { x: 175, bottom: 440 }, LISA_ROOM = { x: 556, bottom: 452 };
var BED_SPOT = { x: 205, bottom: 395 };                    /* where Lisa lies down when the bed is owned */

House.STAGE_AT = STAGE_AT;
House.CATALOG = CATALOG;
House.stageDue = function () {
  var st = Core.save.stars, n = 0; STAGE_AT.forEach(function (a) { if (st >= a) n++; });
  return Math.max(0, n - Core.save.house.stage);
};
House.catalogLeft = function () { var H = Core.save.house; return CATALOG.filter(function (c) { return D.items[c.id] && H.owned.indexOf(c.id) < 0; }); };
House.exhausted = function () { return House.catalogLeft().length === 0; };
/* ================= styles (Opus 5.5 phase 2): registry js/house_variant_rules.js, state Core.save.house.look ================= */
var VR = window.HouseVariantRules;
var PARTS = ['plot', 'base', 'walls', 'roof', 'door'];
House.VARIANTS = VR.VARIANTS;
House.lookOf = function (key) { return VR.lookOf(Core.save.house.look, key); };

/* ================= art ================= */
function ico(inner) { return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; }
var STAGE_ICO = [
  ico('<path d="M6 72 Q6 52 26 52 H74 Q94 52 94 72 Q94 90 74 90 H26 Q6 90 6 72Z" fill="#c8a165"/><rect x="10" y="40" width="8" height="34" rx="3" fill="#8d5a2b"/><rect x="82" y="40" width="8" height="34" rx="3" fill="#8d5a2b"/><path d="M14 46 H86" stroke="#fff" stroke-width="4" stroke-dasharray="7 5"/><path d="M50 30 L50 70" stroke="#8d5a2b" stroke-width="6" stroke-linecap="round"/><path d="M40 18 H60 L58 34 H42Z" fill="#b0b7c0"/>'),
  ico('<rect x="8" y="42" width="84" height="40" rx="8" fill="#b9c0c9"/><rect x="8" y="42" width="84" height="12" rx="6" fill="#d7dce2"/><path d="M8 64 H92 M30 42 V64 M58 64 V82 M70 42 V64" stroke="#98a0aa" stroke-width="4"/>'),
  ico('<rect x="14" y="30" width="72" height="58" rx="4" fill="#ffe0b2"/><path d="M14 48 H86 M14 66 H86" stroke="#f5c98a" stroke-width="5"/><rect x="8" y="84" width="84" height="10" rx="5" fill="#b9c0c9"/>'),
  ico('<path d="M6 62 L50 14 L94 62Z" fill="#e5533d"/><path d="M22 48 H78 M34 36 H66" stroke="#c9402d" stroke-width="5" stroke-linecap="round"/><rect x="4" y="58" width="92" height="12" rx="6" fill="#c9402d"/><circle cx="50" cy="46" r="8" fill="#fff3c4"/><rect x="18" y="72" width="64" height="20" fill="#ffe0b2"/>'),
  ico('<rect x="10" y="12" width="80" height="80" rx="8" fill="#ffe0b2"/><path d="M36 92 V54 Q36 38 50 38 Q64 38 64 54 V92Z" fill="#26a69a"/><circle cx="58" cy="68" r="3.5" fill="#ffd54f"/><rect x="14" y="26" width="18" height="16" rx="3" fill="#b3e5fc" stroke="#fff" stroke-width="3"/><rect x="68" y="26" width="18" height="16" rx="3" fill="#b3e5fc" stroke="#fff" stroke-width="3"/>')
];
/* stage-variant chips (100 viewBox). Defaults are the existing STAGE_ICO entries, unchanged. */
var VAR_ICO = {
  dirt: STAGE_ICO[0],
  sand: ico('<path d="M6 72 Q6 52 26 52 H74 Q94 52 94 72 Q94 90 74 90 H26 Q6 90 6 72Z" fill="#f0d9a0"/><circle cx="28" cy="80" r="3.5" fill="#c7b28c"/><circle cx="64" cy="82" r="3" fill="#c7b28c"/><circle cx="72" cy="64" r="3.5" fill="#c7b28c"/><rect x="10" y="40" width="8" height="34" rx="3" fill="#8d5a2b"/><rect x="82" y="40" width="8" height="34" rx="3" fill="#8d5a2b"/><path d="M14 46 H86" stroke="#fff" stroke-width="4" stroke-dasharray="7 5"/><path d="M50 30 L50 70" stroke="#8d5a2b" stroke-width="6" stroke-linecap="round"/><path d="M40 18 H60 L58 34 H42Z" fill="#b0b7c0"/>'),
  meadow: ico('<path d="M6 72 Q6 52 26 52 H74 Q94 52 94 72 Q94 90 74 90 H26 Q6 90 6 72Z" fill="#5f9e2f"/><circle cx="26" cy="78" r="3.5" fill="#fff"/><circle cx="40" cy="64" r="3.5" fill="#fff176"/><circle cx="64" cy="80" r="3.5" fill="#fff"/><circle cx="74" cy="62" r="3.5" fill="#fff176"/><rect x="10" y="40" width="8" height="34" rx="3" fill="#8d5a2b"/><rect x="82" y="40" width="8" height="34" rx="3" fill="#8d5a2b"/><path d="M14 46 H86" stroke="#fff" stroke-width="4" stroke-dasharray="7 5"/><path d="M50 30 L50 70" stroke="#8d5a2b" stroke-width="6" stroke-linecap="round"/><path d="M40 18 H60 L58 34 H42Z" fill="#b0b7c0"/>'),
  stone: STAGE_ICO[1],
  sandstone: ico('<rect x="8" y="42" width="84" height="40" rx="8" fill="#e3c690"/><rect x="8" y="42" width="84" height="12" rx="6" fill="#f0dcb4"/><path d="M8 64 H92 M30 42 V64 M58 64 V82 M70 42 V64" stroke="#c9a96e" stroke-width="4"/>'),
  cobble: ico('<rect x="8" y="42" width="84" height="40" rx="8" fill="#7d8b99"/><ellipse cx="19" cy="52" rx="9.5" ry="7" fill="#c3ced8"/><ellipse cx="39" cy="52" rx="9.5" ry="7" fill="#9fb0c0"/><ellipse cx="59" cy="52" rx="9.5" ry="7" fill="#c3ced8"/><ellipse cx="79" cy="52" rx="9.5" ry="7" fill="#9fb0c0"/><ellipse cx="13.5" cy="71" rx="4" ry="7" fill="#c3ced8"/><ellipse cx="29" cy="71" rx="9.5" ry="8" fill="#9fb0c0"/><ellipse cx="49" cy="71" rx="9.5" ry="8" fill="#c3ced8"/><ellipse cx="69" cy="71" rx="9.5" ry="8" fill="#9fb0c0"/><ellipse cx="85" cy="71" rx="5" ry="7" fill="#c3ced8"/>'),
  plaster: STAGE_ICO[2],
  wood: ico('<rect x="14" y="30" width="72" height="58" rx="4" fill="#c98b57"/><path d="M14 44.5 H86 M14 59 H86 M14 73.5 H86" stroke="#a8673a" stroke-width="3"/><g fill="#e0a872" stroke="#a8673a" stroke-width="2"><circle cx="20" cy="37" r="5"/><circle cx="80" cy="37" r="5"/><circle cx="20" cy="51.5" r="5"/><circle cx="80" cy="51.5" r="5"/><circle cx="20" cy="66" r="5"/><circle cx="80" cy="66" r="5"/><circle cx="20" cy="80.5" r="5"/><circle cx="80" cy="80.5" r="5"/></g><rect x="8" y="84" width="84" height="10" rx="5" fill="#b9c0c9"/>'),
  brick: ico('<rect x="14" y="30" width="72" height="58" rx="4" fill="#d9725a"/><path d="M14 44.5 H86 M14 59 H86 M14 73.5 H86" stroke="#f3c3b3" stroke-width="3"/><path d="M38 30 V44.5 M62 30 V44.5 M26 44.5 V59 M50 44.5 V59 M74 44.5 V59 M38 59 V73.5 M62 59 V73.5 M26 73.5 V88 M50 73.5 V88 M74 73.5 V88" stroke="#f3c3b3" stroke-width="2.5"/><rect x="8" y="84" width="84" height="10" rx="5" fill="#b9c0c9"/>'),
  redtile: STAGE_ICO[3],
  bluetile: ico('<path d="M6 62 L50 14 L94 62Z" fill="#4f8fe0"/><path d="M22 48 H78 M34 36 H66" stroke="#3a74c4" stroke-width="5" stroke-linecap="round"/><rect x="4" y="58" width="92" height="12" rx="6" fill="#3a74c4"/><circle cx="50" cy="46" r="8" fill="#fff3c4"/><rect x="18" y="72" width="64" height="20" fill="#ffe0b2"/>'),
  straw: ico('<path d="M6 62 L50 14 L94 62Z" fill="#e8c15a"/><path d="M24 58 l-1 -9 M36 58 l-1 -9 M48 58 v-9 M60 58 l1 -9 M72 58 l1 -9 M32 44 l-1 -8 M44 44 v-8 M56 44 v-8 M68 44 l1 -8 M44 30 v-7 M56 30 v-7" stroke="#c9a13d" stroke-width="3" stroke-linecap="round"/><rect x="4" y="58" width="92" height="12" rx="6" fill="#b8902f"/><circle cx="50" cy="46" r="8" fill="#fff3c4"/><rect x="18" y="72" width="64" height="20" fill="#ffe0b2"/>'),
  arch: STAGE_ICO[4],
  round: ico('<rect x="10" y="12" width="80" height="80" rx="8" fill="#ffe0b2"/><path d="M36 92 V52 A14 14 0 0 1 64 52 V92Z" fill="#7e57c2"/><circle cx="58" cy="70" r="3.5" fill="#ffd54f"/><circle cx="23" cy="34" r="9" fill="#b3e5fc" stroke="#fff" stroke-width="3"/><circle cx="77" cy="34" r="9" fill="#b3e5fc" stroke="#fff" stroke-width="3"/>'),
  shutter: ico('<rect x="10" y="12" width="80" height="80" rx="8" fill="#ffe0b2"/><rect x="36" y="40" width="28" height="52" rx="2" fill="#ffca28"/><path d="M40 44 h9 v20 h-9Z M51 44 h9 v20 h-9Z M40 68 h9 v20 h-9Z M51 68 h9 v20 h-9Z" fill="none" stroke="#f9a825" stroke-width="2"/><circle cx="56" cy="66" r="2.5" fill="#8d5a2b"/><rect x="18" y="26" width="11" height="16" rx="2" fill="#b3e5fc" stroke="#fff" stroke-width="3"/><rect x="71" y="26" width="11" height="16" rx="2" fill="#b3e5fc" stroke="#fff" stroke-width="3"/><g fill="#42a5f5"><rect x="11" y="25" width="5" height="18" rx="1.5"/><rect x="31" y="25" width="5" height="18" rx="1.5"/><rect x="64" y="25" width="5" height="18" rx="1.5"/><rect x="84" y="25" width="5" height="18" rx="1.5"/></g>')
};
function partIco(n) { return VAR_ICO[House.lookOf(PARTS[n - 1])]; }
var BRUSH_ICO = ico('<path d="M84 10 L92 18 L52 62 L42 52Z" fill="#c98b57"/><path d="M84 10 L92 18 L88 22 L80 14Z" fill="#a8673a"/><path d="M42 52 L52 62 L46 68 L36 58Z" fill="#b0b7c0"/><path d="M36 58 L46 68 Q40 84 22 90 Q12 92 10 88 Q14 82 16 72 Q22 60 36 58Z" fill="#ec407a"/><path d="M20 86 Q22 94 18 96 Q14 94 16 88Z" fill="#ec407a"/><path d="M30 64 Q24 70 22 80" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>');
/* exterior stage variants: same bbox as each default group (hs1 shares the default's stakes/string/shovel/planks byte for byte) */
var HS1_KIT = '<g fill="#8d5a2b"><rect x="341" y="366" width="9" height="36" rx="3"/><rect x="851" y="366" width="9" height="36" rx="3"/><rect x="341" y="412" width="9" height="36" rx="3"/><rect x="851" y="412" width="9" height="36" rx="3"/></g><path d="M345 372 H855 V418 H345Z" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="14 8"/><path d="M296 360 L318 420" stroke="#8d5a2b" stroke-width="8" stroke-linecap="round"/><path d="M304 418 H334 L326 440 H308Z" fill="#b0b7c0"/><g><rect x="900" y="408" width="70" height="10" rx="2" fill="#d9a066"/><rect x="906" y="396" width="70" height="10" rx="2" fill="#c48850"/><rect x="896" y="420" width="76" height="10" rx="2" fill="#d9a066"/></g>';
var HS1_SAND = '<g class="hs hs1 v-sand"><path d="M330 396 Q330 374 360 374 H840 Q870 374 870 396 Q870 426 840 428 H360 Q330 426 330 396Z" fill="#f0d9a0"/><ellipse cx="500" cy="404" rx="70" ry="10" fill="#e2c584" opacity=".6"/><ellipse cx="740" cy="412" rx="60" ry="8" fill="#e2c584" opacity=".6"/><g fill="#c7b28c"><circle cx="420" cy="392" r="6"/><circle cx="560" cy="406" r="5"/><circle cx="640" cy="388" r="7"/><circle cx="700" cy="410" r="4"/><circle cx="790" cy="400" r="5"/></g>' + HS1_KIT + '</g>';
var HS1_MEADOW = '<g class="hs hs1 v-meadow"><path d="M330 396 Q330 374 360 374 H840 Q870 374 870 396 Q870 426 840 428 H360 Q330 426 330 396Z" fill="#5f9e2f"/><ellipse cx="500" cy="404" rx="70" ry="10" fill="#4a8a22" opacity=".6"/><ellipse cx="740" cy="412" rx="60" ry="8" fill="#4a8a22" opacity=".6"/><circle cx="410" cy="396" r="5" fill="#fff"/><circle cx="470" cy="408" r="5" fill="#fff176"/><circle cx="590" cy="392" r="5" fill="#fff"/><circle cx="660" cy="406" r="5" fill="#fff176"/><circle cx="760" cy="396" r="5" fill="#fff"/><circle cx="820" cy="406" r="5" fill="#fff176"/>' + HS1_KIT + '</g>';
var HS2_SANDSTONE = '<g class="hs hs2 v-sandstone"><rect x="380" y="352" width="440" height="40" rx="6" fill="#e3c690"/><rect x="380" y="352" width="440" height="10" rx="5" fill="#f0dcb4"/><path d="M380 372 H820 M440 352 V372 M520 372 V392 M600 352 V372 M690 372 V392 M760 352 V372" stroke="#c9a96e" stroke-width="3"/></g>';
var HS2_COBBLE = '<g class="hs hs2 v-cobble"><rect x="380" y="352" width="440" height="40" rx="6" fill="#7d8b99"/>' +
  '<ellipse cx="404" cy="362" rx="22" ry="8" fill="#c3ced8"/><ellipse cx="452" cy="362" rx="22" ry="8" fill="#9fb0c0"/><ellipse cx="500" cy="362" rx="22" ry="8" fill="#c3ced8"/><ellipse cx="548" cy="362" rx="22" ry="8" fill="#9fb0c0"/><ellipse cx="596" cy="362" rx="22" ry="8" fill="#c3ced8"/><ellipse cx="644" cy="362" rx="22" ry="8" fill="#9fb0c0"/><ellipse cx="692" cy="362" rx="22" ry="8" fill="#c3ced8"/><ellipse cx="740" cy="362" rx="22" ry="8" fill="#9fb0c0"/><ellipse cx="788" cy="362" rx="22" ry="8" fill="#c3ced8"/>' +
  '<ellipse cx="393" cy="381" rx="11" ry="9" fill="#c3ced8"/><ellipse cx="428" cy="381" rx="22" ry="9" fill="#9fb0c0"/><ellipse cx="476" cy="381" rx="22" ry="9" fill="#c3ced8"/><ellipse cx="524" cy="381" rx="22" ry="9" fill="#9fb0c0"/><ellipse cx="572" cy="381" rx="22" ry="9" fill="#c3ced8"/><ellipse cx="620" cy="381" rx="22" ry="9" fill="#9fb0c0"/><ellipse cx="668" cy="381" rx="22" ry="9" fill="#c3ced8"/><ellipse cx="716" cy="381" rx="22" ry="9" fill="#9fb0c0"/><ellipse cx="764" cy="381" rx="22" ry="9" fill="#c3ced8"/><ellipse cx="803" cy="381" rx="15" ry="9" fill="#9fb0c0"/></g>';
var HS3_WOOD = '<g class="hs hs3 v-wood"><rect x="400" y="192" width="400" height="162" fill="#c98b57"/><path d="M400 219 H800 M400 246 H800 M400 273 H800 M400 300 H800 M400 327 H800" stroke="#a8673a" stroke-width="4"/><path d="M440 205 H520 M600 232 H700 M470 259 H560 M640 286 H740 M430 313 H500 M560 340 H660" stroke="#b87a48" stroke-width="3" stroke-linecap="round"/><g fill="#e0a872" stroke="#a8673a" stroke-width="3"><circle cx="411" cy="205.5" r="9"/><circle cx="789" cy="205.5" r="9"/><circle cx="411" cy="232.5" r="9"/><circle cx="789" cy="232.5" r="9"/><circle cx="411" cy="259.5" r="9"/><circle cx="789" cy="259.5" r="9"/><circle cx="411" cy="286.5" r="9"/><circle cx="789" cy="286.5" r="9"/><circle cx="411" cy="313.5" r="9"/><circle cx="789" cy="313.5" r="9"/><circle cx="411" cy="340.5" r="9"/><circle cx="789" cy="340.5" r="9"/></g></g>';
var HS3_BRICK = '<g class="hs hs3 v-brick"><rect x="400" y="192" width="400" height="162" fill="#d9725a"/><path d="M400 219 H800 M400 246 H800 M400 273 H800 M400 300 H800 M400 327 H800" stroke="#f3c3b3" stroke-width="4"/><path d="M450 192 V219 M530 192 V219 M610 192 V219 M690 192 V219 M770 192 V219 M490 219 V246 M570 219 V246 M650 219 V246 M730 219 V246 M450 246 V273 M530 246 V273 M610 246 V273 M690 246 V273 M770 246 V273 M490 273 V300 M570 273 V300 M650 273 V300 M730 273 V300 M450 300 V327 M530 300 V327 M610 300 V327 M690 300 V327 M770 300 V327 M490 327 V354 M570 327 V354 M650 327 V354 M730 327 V354" stroke="#f3c3b3" stroke-width="3"/><rect x="400" y="192" width="14" height="162" fill="#b95a44" opacity=".5"/></g>';
var HS4_ATTIC = '<circle cx="600" cy="152" r="22" fill="#fff3c4" stroke="#fff" stroke-width="5"/><path d="M600 130 V174 M578 152 H622" stroke="#fff" stroke-width="4"/>';
var HS4_BLUETILE = '<g class="hs hs4 v-bluetile"><path d="M340 200 L600 62 L860 200Z" fill="#4f8fe0"/><path d="M393 172 H807 M442 146 H758 M491 120 H709 M540 94 H660" stroke="#3a74c4" stroke-width="5" stroke-linecap="round"/><path d="M340 200 L600 62 L860 200" fill="none" stroke="#2c5ea8" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><rect x="330" y="194" width="540" height="14" rx="7" fill="#3a74c4"/>' + HS4_ATTIC + '</g>';
var HS4_STRAW = '<g class="hs hs4 v-straw"><path d="M340 200 L600 62 L860 200Z" fill="#e8c15a"/><path d="M400 190 l-3 -16 M450 190 l-3 -16 M500 190 l-2 -16 M550 190 l-1 -16 M600 190 v-16 M650 190 l1 -16 M700 190 l2 -16 M750 190 l3 -16 M800 190 l3 -16 M470 158 l-2 -16 M520 158 l-2 -16 M570 158 l-1 -16 M630 158 l1 -16 M680 158 l2 -16 M730 158 l2 -16 M530 124 l-1 -16 M570 124 l-1 -16 M630 124 l1 -16 M670 124 l1 -16 M585 94 l-1 -14 M615 94 l1 -14" stroke="#c9a13d" stroke-width="4" stroke-linecap="round"/><path d="M340 200 L600 62 L860 200" fill="none" stroke="#b8902f" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><rect x="330" y="194" width="540" height="14" rx="7" fill="#b8902f"/>' + HS4_ATTIC + '</g>';
var HS5_BOXES = '<rect x="428" y="304" width="102" height="16" rx="4" fill="#8d5a2b"/><rect x="672" y="304" width="102" height="16" rx="4" fill="#8d5a2b"/><g><circle cx="448" cy="302" r="8" fill="#f48fb1"/><circle cx="478" cy="300" r="8" fill="#fff176"/><circle cx="508" cy="302" r="8" fill="#ce93d8"/><circle cx="692" cy="302" r="8" fill="#ffb74d"/><circle cx="722" cy="300" r="8" fill="#f48fb1"/><circle cx="752" cy="302" r="8" fill="#fff176"/></g>';
var HS5_ROUND = '<g class="hs hs5 v-round"><path d="M565 352 V285 A35 35 0 0 1 635 285 V352Z" fill="#7e57c2"/><path d="M582 330 V288 A18 18 0 0 1 618 288 V330Z" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/><circle cx="620" cy="308" r="5" fill="#ffd54f"/><g stroke="#fff" stroke-width="8" fill="#b3e5fc"><circle cx="479" cy="267" r="35"/><circle cx="723" cy="267" r="35"/></g><path d="M479 236 V298 M448 267 H510 M723 236 V298 M692 267 H754" stroke="#fff" stroke-width="5"/>' + HS5_BOXES + '</g>';
var HS5_SHUTTER = '<g class="hs hs5 v-shutter"><rect x="565" y="250" width="70" height="102" rx="4" fill="#ffca28"/><g fill="none" stroke="#f9a825" stroke-width="3"><rect x="574" y="260" width="22" height="36"/><rect x="604" y="260" width="22" height="36"/><rect x="574" y="304" width="22" height="38"/><rect x="604" y="304" width="22" height="38"/></g><circle cx="615" cy="300" r="4" fill="#8d5a2b"/><g fill="#42a5f5"><rect x="430" y="232" width="18" height="72" rx="3"/><rect x="510" y="232" width="18" height="72" rx="3"/><rect x="674" y="232" width="18" height="72" rx="3"/><rect x="754" y="232" width="18" height="72" rx="3"/></g><path d="M433 244 H445 M433 258 H445 M433 272 H445 M433 286 H445 M513 244 H525 M513 258 H525 M513 272 H525 M513 286 H525 M677 244 H689 M677 258 H689 M677 272 H689 M677 286 H689 M757 244 H769 M757 258 H769 M757 272 H769 M757 286 H769" stroke="#1e88e5" stroke-width="3"/><g stroke="#fff" stroke-width="8" fill="#b3e5fc"><rect x="453" y="232" width="52" height="70" rx="3"/><rect x="697" y="232" width="52" height="70" rx="3"/></g><path d="M479 236 V298 M457 267 H501 M723 236 V298 M701 267 H745" stroke="#fff" stroke-width="5"/>' + HS5_BOXES + '</g>';
var HOUSE_ICO = ico('<path d="M10 52 L50 14 L90 52Z" fill="#e5533d" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><rect x="20" y="50" width="60" height="38" rx="4" fill="#fff" /><rect x="43" y="62" width="14" height="26" rx="6" fill="#26a69a"/><rect x="26" y="58" width="12" height="12" rx="2" fill="#b3e5fc"/><rect x="62" y="58" width="12" height="12" rx="2" fill="#b3e5fc"/>');
var CHECK = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#4caf50"/><path d="M26 52 L43 68 L75 34" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>';

var EXT_SVG = (function () {
  var s = '<svg viewBox="0 0 1200 460" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
    '<defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset=".75" stop-color="#e6f7ff"/></linearGradient></defs>' +
    '<rect width="1200" height="460" fill="url(#hsky)"/><circle cx="1040" cy="82" r="70" fill="#fff3b0" opacity=".45"/><circle cx="1040" cy="82" r="46" fill="#ffe27a"/>' +
    '<g class="cloud c1"><ellipse cx="180" cy="80" rx="80" ry="30" fill="#fff"/><ellipse cx="236" cy="62" rx="50" ry="28" fill="#fff"/></g>' +
    '<g class="cloud c2"><ellipse cx="880" cy="150" rx="70" ry="26" fill="#fff"/><ellipse cx="930" cy="134" rx="42" ry="24" fill="#fff"/></g>' +
    '<path d="M0 330 Q200 250 420 320 T860 300 T1200 320 V460 H0Z" fill="#b5e3a8"/>' +
    '<path d="M0 384 Q300 342 600 374 T1200 368 V460 H0Z" fill="#7ed957"/><path d="M0 436 Q400 404 800 436 T1200 424 V460 H0Z" fill="#6fcf4a"/>' +
    '<rect x="113" y="318" width="14" height="70" rx="5" fill="#8d6e63"/><circle cx="120" cy="306" r="42" fill="#4caf50"/><circle cx="106" cy="296" r="22" fill="#66bb6a"/>' +
    '<rect x="1073" y="326" width="14" height="62" rx="5" fill="#8d6e63"/><circle cx="1080" cy="314" r="36" fill="#4caf50"/><circle cx="1068" cy="304" r="18" fill="#66bb6a"/>';
  /* stage 1: the plot (dirt patch, stakes, string, shovel, a few planks) */
  s += '<g class="hs hs1 v-dirt"><path d="M330 396 Q330 374 360 374 H840 Q870 374 870 396 Q870 426 840 428 H360 Q330 426 330 396Z" fill="#c8a165"/>' +
    '<ellipse cx="500" cy="404" rx="70" ry="10" fill="#b68c52" opacity=".6"/><ellipse cx="740" cy="412" rx="60" ry="8" fill="#b68c52" opacity=".6"/>' +
    '<g fill="#8d5a2b"><rect x="341" y="366" width="9" height="36" rx="3"/><rect x="851" y="366" width="9" height="36" rx="3"/><rect x="341" y="412" width="9" height="36" rx="3"/><rect x="851" y="412" width="9" height="36" rx="3"/></g>' +
    '<path d="M345 372 H855 V418 H345Z" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="14 8"/>' +
    '<path d="M296 360 L318 420" stroke="#8d5a2b" stroke-width="8" stroke-linecap="round"/><path d="M304 418 H334 L326 440 H308Z" fill="#b0b7c0"/>' +
    '<g><rect x="900" y="408" width="70" height="10" rx="2" fill="#d9a066"/><rect x="906" y="396" width="70" height="10" rx="2" fill="#c48850"/><rect x="896" y="420" width="76" height="10" rx="2" fill="#d9a066"/></g></g>';
  s += HS1_SAND + HS1_MEADOW;
  /* chimney body sits behind walls and roof (shown with the finished house) */
  s += '<g class="hs hs6c"><rect x="702" y="72" width="48" height="96" fill="#c76a52"/><path d="M702 98 H750 M702 124 H750 M726 72 V98 M714 98 V124 M738 124 V150" stroke="#a9513c" stroke-width="3"/><rect x="696" y="62" width="60" height="14" rx="4" fill="#8d4b3b"/></g>';
  /* stage 2: foundation */
  s += '<g class="hs hs2 v-stone"><rect x="380" y="352" width="440" height="40" rx="6" fill="#b9c0c9"/><rect x="380" y="352" width="440" height="10" rx="5" fill="#d7dce2"/>' +
    '<path d="M380 372 H820 M440 352 V372 M520 372 V392 M600 352 V372 M690 372 V392 M760 352 V372" stroke="#98a0aa" stroke-width="3"/></g>';
  s += HS2_SANDSTONE + HS2_COBBLE;
  /* stage 3: walls */
  s += '<g class="hs hs3 v-plaster"><rect x="400" y="192" width="400" height="162" fill="#ffe0b2"/><path d="M400 232 H800 M400 272 H800 M400 312 H800" stroke="#f5c98a" stroke-width="4"/><rect x="400" y="192" width="14" height="162" fill="#f5c98a" opacity=".5"/></g>';
  s += HS3_WOOD + HS3_BRICK;
  /* stage 4: roof */
  s += '<g class="hs hs4 v-redtile"><path d="M340 200 L600 62 L860 200Z" fill="#e5533d"/><path d="M393 172 H807 M442 146 H758 M491 120 H709 M540 94 H660" stroke="#c9402d" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M340 200 L600 62 L860 200" fill="none" stroke="#b73321" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/><rect x="330" y="194" width="540" height="14" rx="7" fill="#c9402d"/>' +
    '<circle cx="600" cy="152" r="22" fill="#fff3c4" stroke="#fff" stroke-width="5"/><path d="M600 130 V174 M578 152 H622" stroke="#fff" stroke-width="4"/></g>';
  s += HS4_BLUETILE + HS4_STRAW;
  /* stage 5: door + windows */
  s += '<g class="hs hs5 v-arch"><path d="M565 352 V274 Q565 250 600 250 Q635 250 635 274 V352Z" fill="#26a69a"/><path d="M582 330 V280 Q582 268 600 268 Q618 268 618 280 V330Z" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/><circle cx="620" cy="308" r="5" fill="#ffd54f"/>' +
    '<g stroke="#fff" stroke-width="8" fill="#b3e5fc"><rect x="435" y="232" width="88" height="70" rx="10"/><rect x="679" y="232" width="88" height="70" rx="10"/></g>' +
    '<path d="M479 236 V298 M439 267 H519 M723 236 V298 M683 267 H763" stroke="#fff" stroke-width="5"/>' +
    '<rect x="428" y="304" width="102" height="16" rx="4" fill="#8d5a2b"/><rect x="672" y="304" width="102" height="16" rx="4" fill="#8d5a2b"/>' +
    '<g><circle cx="448" cy="302" r="8" fill="#f48fb1"/><circle cx="478" cy="300" r="8" fill="#fff176"/><circle cx="508" cy="302" r="8" fill="#ce93d8"/><circle cx="692" cy="302" r="8" fill="#ffb74d"/><circle cx="722" cy="300" r="8" fill="#f48fb1"/><circle cx="752" cy="302" r="8" fill="#fff176"/></g></g>';
  s += HS5_ROUND + HS5_SHUTTER;
  /* finished: smoke, path, bushes, flowers */
  s += '<g class="hs hs6"><path d="M578 392 L622 392 L664 452 L536 452Z" fill="#f3d28b"/><path d="M590 410 H610 M582 428 H618" stroke="#fff3c4" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="384" cy="378" r="28" fill="#43a047"/><circle cx="366" cy="372" r="16" fill="#66bb6a"/><circle cx="818" cy="378" r="28" fill="#43a047"/><circle cx="836" cy="372" r="16" fill="#66bb6a"/>' +
    (function () {
      var o = '', cols = ['#f48fb1', '#fff176', '#ce93d8', '#ffb74d', '#90caf9', '#ff8a80'], xs = [420, 458, 496, 534, 668, 706, 744, 782];
      xs.forEach(function (x, i) { var y = 414 + (i % 2) * 16; o += '<path d="M' + x + ' ' + (y + 24) + ' V' + y + '" stroke="#388e3c" stroke-width="5" stroke-linecap="round"/><circle cx="' + x + '" cy="' + y + '" r="11" fill="' + cols[i % 6] + '"/><circle cx="' + x + '" cy="' + y + '" r="4.5" fill="#fff59d"/>'; });
      return o;
    })() +
    '<g class="smk s1"><circle cx="726" cy="46" r="13" fill="#fff" opacity=".9"/></g><g class="smk s2"><circle cx="730" cy="46" r="16" fill="#fff" opacity=".85"/></g><g class="smk s3"><circle cx="722" cy="46" r="12" fill="#fff" opacity=".85"/></g></g>';
  return s + '</svg>';
})();

var ROOM_SVG = (function () {
  var s = '<svg viewBox="0 0 1200 460" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="1200" height="460" fill="#ffe8b0"/>';
  for (var i = 0; i < 20; i++) s += '<rect x="' + (i * 60 + 30) + '" y="0" width="30" height="305" fill="#ffdf9a" opacity=".55"/>';
  s += '<rect x="0" y="300" width="1200" height="160" fill="#d9a066"/>';
  [330, 364, 400, 436].forEach(function (y) { s += '<path d="M0 ' + y + ' H1200" stroke="#c48850" stroke-width="3"/>'; });
  [[150, 300], [450, 330], [90, 364], [610, 364], [300, 400], [900, 400], [200, 436], [760, 436], [1050, 330], [1010, 364]].forEach(function (p) { s += '<path d="M' + p[0] + ' ' + p[1] + ' V' + (p[1] + 34) + '" stroke="#c48850" stroke-width="3"/>'; });
  s += '<rect x="0" y="292" width="1200" height="16" fill="#fff3e0"/><rect x="0" y="306" width="1200" height="6" fill="#000" opacity=".08"/>' +
    /* window with sky, sun, curtains and sill */
    '<rect x="500" y="30" width="240" height="195" rx="10" fill="#8fd3ff"/><circle cx="676" cy="82" r="26" fill="#ffe27a"/><ellipse cx="566" cy="96" rx="40" ry="14" fill="#fff"/><ellipse cx="596" cy="84" rx="26" ry="14" fill="#fff"/>' +
    '<path d="M500 168 Q560 150 620 170 T740 166 V225 H500Z" fill="#7ed957"/>' +
    '<rect x="500" y="30" width="240" height="195" rx="10" fill="none" stroke="#fff" stroke-width="10"/><path d="M620 30 V225 M500 128 H740" stroke="#fff" stroke-width="8"/>' +
    '<rect x="486" y="222" width="268" height="16" rx="6" fill="#fff"/><rect x="486" y="236" width="268" height="5" fill="#000" opacity=".08"/>' +
    '<path d="M484 20 H546 Q530 100 548 232 H484Z" fill="#f48fb1"/><path d="M756 20 H694 Q710 100 692 232 H756Z" fill="#f48fb1"/>' +
    '<path d="M500 20 Q520 130 506 232" fill="none" stroke="#ec6f95" stroke-width="5"/><path d="M740 20 Q720 130 734 232" fill="none" stroke="#ec6f95" stroke-width="5"/>' +
    '<rect x="470" y="14" width="300" height="12" rx="6" fill="#8d5a2b"/>' +
    /* shelf A (left), rack B (right) */
    '<rect x="30" y="172" width="370" height="14" rx="5" fill="#b97a3e"/><path d="M70 186 L70 214 L98 186Z M330 186 L330 214 L358 186Z" fill="#9c6330"/>' +
    '<rect x="765" y="117" width="350" height="14" rx="5" fill="#b97a3e"/><path d="M805 131 L805 159 L833 131Z M1050 131 L1050 159 L1078 131Z" fill="#9c6330"/>' +
    /* sideboard + rug */
    '<ellipse cx="640" cy="418" rx="210" ry="34" fill="#f8bbd0"/><ellipse cx="640" cy="418" rx="170" ry="24" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>' +
    '<rect x="770" y="272" width="300" height="100" rx="8" fill="#a8673a"/><rect x="764" y="266" width="312" height="14" rx="6" fill="#c98b57"/><path d="M920 280 V370" stroke="#8d5a2b" stroke-width="4"/><circle cx="905" cy="322" r="6" fill="#ffd54f"/><circle cx="935" cy="322" r="6" fill="#ffd54f"/>' +
    '<rect x="788" y="368" width="20" height="10" fill="#8d5a2b"/><rect x="1032" y="368" width="20" height="10" fill="#8d5a2b"/>';
  return s + '</svg>';
})();


var GIFT_SVG = '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="108" rx="44" ry="8" fill="#000" opacity=".14"/>' +
  '<g class="glid"><rect x="12" y="34" width="96" height="26" rx="7" fill="#ec6f95"/><rect x="50" y="34" width="20" height="26" fill="#ffd54f"/>' +
  '<path d="M60 34 C40 6 14 18 34 34Z" fill="#ffd54f" stroke="#ffb300" stroke-width="3"/><path d="M60 34 C80 6 106 18 86 34Z" fill="#ffd54f" stroke="#ffb300" stroke-width="3"/></g>' +
  '<rect x="18" y="58" width="84" height="46" rx="7" fill="#f48fb1"/><rect x="50" y="58" width="20" height="46" fill="#ffd54f"/><path d="M26 66 V96 M94 66 V96" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/></svg>';

/* ================= helpers ================= */
function rem() { return parseFloat(getComputedStyle(document.documentElement).fontSize) || 10; }
function u(n) { return (n / 10) + 'rem'; }
/* the word was heard: a plain exposure counter, never a box change (SRS is only touched by real answers) */
function heard(lang, id) { var w = Core.SRS.w(lang, id); w.heard = (w.heard || 0) + 1; Core.persist(); }
/* two items the child has not got yet; words already met come first */
function pickTwo(lang) {
  var left = House.catalogLeft().map(function (c) { return c.id; });
  var met = left.filter(function (id) { var w = Core.SRS.peek(lang, id); return (w.heard || 0) > 0 || (w.box || 0) > 0; });
  var rest = left.filter(function (id) { return met.indexOf(id) < 0; });
  return Core.shuffle(met).concat(Core.shuffle(rest)).slice(0, 2);
}
function slotOf(id) { return CATALOG.filter(function (c) { return c.id === id; })[0]; }
/* the item picture in style v: 'a' = the normal picture; 'b'/'c' = recoloured copies in img/house/ (same wrapper, only the file differs) */
function itemPic(id, v) {
  var node = Core.Pic.el(Core.item(id));
  if (!v || v === 'a') return node;
  var src = 'img/house/' + id + '_' + v + '.svg';
  var im = node.tagName === 'IMG' ? node : node.querySelector('img');
  if (im) { im.removeAttribute('srcset'); im.src = src; }
  else { node.innerHTML = ''; im = document.createElement('img'); im.src = src; im.alt = ''; im.draggable = false; node.appendChild(im); }
  return node;
}

/* one small button for the map screen (ui.js adds it with one line). A sparkle shows when something waits in the house (no number). */
House.mapBtn = function (from) {
  from = from || 'map';
  var b = UI.btn('b-house', '<span class="ic">' + HOUSE_ICO + '</span>', function () { Snd.sfx('door'); UI.go('house', { from: from }); });
  var H = Core.save.house;
  if ((H.gifts > 0 && !House.exhausted()) || House.stageDue() > 0) { b.classList.add('news'); b.appendChild(el('span', 'hspark')); }
  return b;
};

/* ================= the screen ================= */
UI.screens.house = function (flow, root, p) {
  var lang = Core.curLang(); Core.lang = lang;
  var H = Core.house();
  UI.scene(root, 'garden');
  var busy = false, lisa = null, sleeping = false, extSvg = null, itemsLayer = null, giftBox = null, offered = [];
  var picker = null, pickerKey = null, styling = false, viewExt = false, pickSaid = false, varCards = [], brush = null;
  var mode = H.stage >= 5 ? 'room' : 'build';

  var bar = el('div', 'topbar'); root.appendChild(bar);
  bar.appendChild(UI.backBtn(function () { UI.go(p.from === 'home' ? 'home' : 'map'); }));
  var sp = UI.speakerBtn(function () { Snd.say([Core.ruUrl('house_help')]); });
  bar.appendChild(sp);
  brush = UI.btn('b-hstyle', '<span class="ic">' + BRUSH_ICO + '</span>', function () {
    if (busy || (!styling && (picker === 'stage' || picker === 'style' || picker === 'gift'))) return;
    Snd.sfx('tap'); setStyling(!styling);
  });
  bar.appendChild(brush); syncBrush();
  if (window.Countries && window.CountryArt) bar.appendChild(UI.btn('b-travel', '<span class="ic">' + CountryArt.svg.travel + '</span>', function () { if (busy) return; Snd.sfx('door'); UI.go('countries', { from: 'house', houseFrom: p.from }); }));
  var box = el('div', 'house-stage'); root.appendChild(box);
  var tray = el('div', 'house-tray'); root.appendChild(tray);

  /* ---------- Lisa ---------- */
  function putLisa(spot) {
    if (lisa && lisa.parentNode) lisa.parentNode.removeChild(lisa);
    lisa = Lisa.make({ cls: 'house-lisa nopoke' });
    lisa.style.width = u(LISA_W); lisa.style.height = u(LISA_H);
    placeLisa(spot);
    lisa.style.zIndex = String(Math.round(spot.bottom));
    box.appendChild(lisa);
    tap(lisa, onLisa, { silent: true, nopress: true });
    return lisa;
  }
  function placeLisa(spot) { lisa.style.left = u(spot.x - LISA_W / 2); lisa.style.top = u(spot.bottom - LISA_H); }
  function onLisa() {
    if (sleeping || !lisa) return;
    if (mode === 'room' && !viewExt && H.owned.indexOf('bed') >= 0) {
      sleeping = true; Snd.sfx('yawn');
      lisa.style.zIndex = '900'; lisa.classList.add('hmove'); placeLisa(BED_SPOT);
      flow.after(900, function () { lisa.pose('sleep'); });
      flow.after(4300, function () {
        lisa.pose('idle'); placeLisa(LISA_ROOM);
        flow.after(900, function () { lisa.classList.remove('hmove'); lisa.style.zIndex = String(LISA_ROOM.bottom); sleeping = false; });
      });
    } else { Snd.sfx('pop'); lisa.react(Math.random() < 0.5 ? 'giggle' : 'jump'); }
  }

  /* ---------- exterior (build mode) ---------- */
  function showExterior() {
    box.innerHTML = ''; box.className = 'house-stage ext';
    var bg = el('div', 'house-bg', EXT_SVG); box.appendChild(bg);
    extSvg = bg.firstChild;
    for (var n = 1; n <= H.stage; n++) markStage(n, false);
    if (H.stage >= 5) markStage(6, false);
    putLisa(LISA_EXT);
  }
  function markStage(n, fresh) {
    if (n === 6) { ['hs6', 'hs6c'].forEach(function (nm) { var g = extSvg.querySelector('.' + nm); if (g) popOn(g, fresh); }); return; }
    var v = House.lookOf(PARTS[n - 1]);
    [].forEach.call(extSvg.querySelectorAll('.hs' + n), function (g) {
      if (g.classList.contains('v-' + v)) popOn(g, fresh); else g.classList.remove('on', 'hs-pop');
    });
  }
  function popOn(g, fresh) {
    g.classList.add('on');
    if (fresh) { g.classList.remove('hs-pop'); void g.getBoundingClientRect().width; g.classList.add('hs-pop'); }
  }
  /* roadmap in the tray while building: what is done, what is next (pictures only, no numbers, nothing to tap) */
  function renderRoad() {
    tray.innerHTML = ''; tray.className = 'house-tray road';
    for (var n = 1; n <= 5; n++) {
      var t = el('div', 'hstep ' + (n <= H.stage ? 'done' : n === H.stage + 1 ? 'next' : 'later'), '<span class="hsp">' + (n <= H.stage ? partIco(n) : STAGE_ICO[n - 1]) + '</span>');
      if (n <= H.stage) t.appendChild(el('span', 'hcheck', CHECK));
      tray.appendChild(t);
    }
  }

  /* ---------- interior (room mode) ---------- */
  function showRoom() {
    box.innerHTML = ''; box.className = 'house-stage room';
    var bg = el('div', 'house-bg', ROOM_SVG); box.appendChild(bg);
    itemsLayer = el('div', 'house-items'); box.appendChild(itemsLayer);
    CATALOG.forEach(function (c) { if (H.owned.indexOf(c.id) >= 0 && D.items[c.id]) placeItem(c, false); });
    putLisa(LISA_ROOM);
    tray.innerHTML = ''; tray.className = 'house-tray gifts';
  }
  function placeItem(c, hidden) {
    var s = c.slot, hit = Math.max(s.s, 110);
    var n = el('div', 'hitem' + (hidden ? ' hidden' : '')); n.dataset.id = c.id;
    n.style.left = u(s.x - hit / 2); n.style.top = u(s.y - hit / 2); n.style.width = u(hit); n.style.height = u(hit); n.style.zIndex = String(Math.round(s.y + s.s / 2));
    var pic = el('div', 'hpic'); pic.style.width = u(s.s); pic.style.height = u(s.s);
    pic.appendChild(itemPic(c.id, House.lookOf(c.id)));
    n.appendChild(pic);
    tap(n, function () {
      if (styling) { itemPicker(c.id, n, pic); return; }
      /* a placed item replays its word: a free review */
      Snd.say([Core.url.w(lang, c.id)]); heard(lang, c.id);
      pic.classList.remove('hwig'); void pic.offsetWidth; pic.classList.add('hwig');
      if (lisa && !sleeping && lisa.react) lisa.react('point');
    }, { silent: true, nopress: true });
    itemsLayer.appendChild(n);
    return n;
  }

  /* ---------- pickers (Opus 5.5 phase 2): one tray, 3 style cards; a tap is the choice ---------- */
  function setBusy(b) { busy = b; syncBrush(); }
  function syncBrush() {
    if (!brush) return;
    brush.classList.toggle('hidden', H.stage < 1);
    brush.classList.toggle('on', !!styling);
    brush.classList.toggle('off', !styling && !!(busy || picker === 'stage' || picker === 'style' || picker === 'gift'));
  }
  function pickLine() { if (pickSaid) return []; pickSaid = true; var a = Core.ruUrl('house_pick'); return a ? [a] : []; }
  function varCard(key, v, i, art, onPick) {
    var c = el('div', 'hvar hvpop' + ((picker === 'part' || picker === 'item') && House.lookOf(key) === v ? ' hsel' : ''));
    c.dataset.v = v; c.style.animationDelay = (i * 120) + 'ms';
    var p = el('div', 'hvpic'); if (typeof art === 'string') p.innerHTML = art; else p.appendChild(art); c.appendChild(p);
    c.appendChild(el('span', 'hcheck', CHECK));
    tap(c, function () { onPick(v, c); }, { silent: true, nopress: true });
    return c;
  }
  function showCards(cls, key, artOf, onPick, withDone, sparkle) {
    var list = VR.VARIANTS[key].list;
    tray.innerHTML = ''; tray.className = 'house-tray ' + cls; varCards = list.slice();
    list.forEach(function (v, i) { tray.appendChild(varCard(key, v, i, artOf(v), onPick)); });
    if (withDone) { var d = el('div', 'hdone', CHECK); tap(d, closePicker, { silent: true, nopress: true }); tray.appendChild(d); }
    if (sparkle) Snd.sfx('sparkle');
    syncBrush();
  }
  function markSel(v) { [].forEach.call(tray.querySelectorAll('.hvar'), function (c) { c.classList.toggle('hsel', c.dataset.v === v); }); }

  /* ---------- gifts: step 1 nouns (words play), step 2 style (word + house_pick once), commit = housePlace ---------- */
  function giftWaiting() { return H.stage >= 5 && H.gifts > 0 && !House.exhausted(); }
  function offerGift(voice) {
    tray.innerHTML = ''; tray.className = 'house-tray gifts'; giftBox = null; offered = []; picker = null; pickerKey = null; varCards = [];
    syncBrush();
    if (!giftWaiting() || styling) return;
    giftBox = el('div', 'hgift', GIFT_SVG); tray.appendChild(giftBox);
    tap(giftBox, openGift, { silent: true, nopress: true });
    Snd.sfx('sparkle');
    if (voice) { var l = Core.lisaLine('gift'); if (l) Snd.say([l], { retry: true }); }
  }
  async function openGift() {
    if (busy || !giftBox || flow.dead || styling) return;
    setBusy(true);
    giftBox.classList.add('open'); Snd.sfx('unlock');
    var r = giftBox.getBoundingClientRect(), rr = root.getBoundingClientRect();
    FX.burst(r.left - rr.left + r.width / 2, r.top - rr.top + r.height * 0.4, { n: 12, power: 0.8 });
    if (lisa && !sleeping) lisa.react('cheer');
    await flow.wait(480);
    offered = pickTwo(lang);
    tray.innerHTML = ''; tray.className = 'house-tray gifts choose'; giftBox = null;
    offered.forEach(function (id, i) { tray.appendChild(card(id, i)); });
    picker = 'gift';
    if (window.__houseTest) __houseTest.offered = offered.slice();
    /* both words are heard as the two cards appear (no heard() here, as before) */
    var say = []; offered.forEach(function (id, i) { if (i) say.push(350); say.push(Core.url.w(lang, id)); });
    Snd.say(say);
    setBusy(false);
  }
  function card(id, i) {
    var c = el('div', 'hcard hcpop'); c.dataset.id = id; c.style.animationDelay = (i * 120) + 'ms';
    var pic = el('div', 'hcpic'); pic.appendChild(Core.Pic.el(Core.item(id))); c.appendChild(pic);
    var go = function () { stylePicker(id); };
    if (window.MG && MG.drag) {
      MG.drag(c, { targets: function () { return [box]; }, point: 'center', pad: 0, lift: 1.1, onTap: go, onDrop: function (t) { if (t) go(); return false; } });
    } else tap(c, go, { nopress: true });
    return c;
  }
  function stylePicker(id) {
    if (busy || flow.dead || picker !== 'gift') return;
    picker = 'style'; pickerKey = id; offered = [];
    showCards('pickstyle', id, function (v) { return itemPic(id, v); }, function (v, c) { choose(id, v, c); }, false, true);
    var pl = pickLine();
    Snd.say([Core.url.w(lang, id)].concat(pl.length ? [300].concat(pl) : []));
  }
  async function choose(id, v, c) {
    if (busy || flow.dead || picker !== 'style' || pickerKey !== id) return;
    var def = slotOf(id); if (!def) return;
    setBusy(true);
    var from = c.querySelector('.hvpic').getBoundingClientRect(), rr = root.getBoundingClientRect();
    if (!Core.housePlace(id, id, v)) { setBusy(false); return; }
    picker = null; pickerKey = null; varCards = [];
    var n = placeItem(def, true), to = n.getBoundingClientRect();
    var tx = to.left + to.width / 2, ty = to.top + to.height / 2, sx = from.left + from.width / 2, sy = from.top + from.height / 2;
    var sz = def.slot.s / 10 * rem(), k0 = from.width / sz;
    tray.innerHTML = ''; offered = [];
    /* a copy of the chosen-style picture flies from the card into its slot */
    var fly = el('div', 'hfly'); fly.appendChild(itemPic(id, v));
    fly.style.width = sz + 'px'; fly.style.height = sz + 'px'; fly.style.left = (sx - rr.left - sz / 2) + 'px'; fly.style.top = (sy - rr.top - sz / 2) + 'px';
    root.appendChild(fly);
    var dx = tx - sx, dy = ty - sy, up = Math.min(14 * rem(), Math.abs(dy) * 0.25 + 6 * rem());
    Snd.sfx('whoosh');
    if (fly.animate) fly.animate([
      { transform: 'translate(0,0) scale(' + k0 + ') rotate(0deg)' },
      { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55 - up) + 'px) scale(1.1) rotate(-10deg)', offset: 0.55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(0deg)' }], { duration: 720 / Core.speed, easing: 'ease-in-out', fill: 'both' });
    await flow.wait(720);
    fly.remove(); n.classList.remove('hidden'); n.classList.add('hland');
    Snd.sfx('bounce'); Snd.sfx('sparkle');
    FX.burst(tx - rr.left, ty - rr.top, { n: 12, power: 0.7 });
    if (lisa && !sleeping) lisa.react('cheer');
    heard(lang, id);   /* the one exposure credit of the whole gift */
    var line = Core.lisaLine('buy');
    await flow.say([Core.url.w(lang, id), 300, line].filter(function (x) { return x != null; }));
    n.classList.remove('hland');
    setBusy(false);
    offerGift(true);
  }

  /* ---------- building: a due stage waits for the child's style tap ---------- */
  function stagePicker() {
    var n = H.stage + 1, key = PARTS[n - 1];
    picker = 'stage'; pickerKey = key;
    return new Promise(function (done) {
      showCards('pickstage', key, function (v) { return VAR_ICO[v]; }, async function (v) {
        if (busy || flow.dead || picker !== 'stage' || pickerKey !== key) return;
        setBusy(true); picker = null; pickerKey = null; varCards = [];
        await buildStage(n, v); setBusy(false); done();
      }, false, true);
      setBusy(false);
      var pl = pickLine(); if (pl.length) Snd.say(pl);
    });
  }
  async function buildStage(n, v) {
    var was = H.stage;
    Core.houseStage(n, v);
    if (H.stage === was) { renderRoad(); syncBrush(); return; }
    markStage(n, true); Snd.sfx(n === 5 ? 'unlock' : 'bounce');
    if (lisa) lisa.react('cheer');
    renderRoad(); syncBrush();
    var bb = box.getBoundingClientRect(), rr = root.getBoundingClientRect();
    FX.burst(bb.left - rr.left + bb.width / 2, bb.top - rr.top + bb.height * 0.6, { n: 12, power: 0.9 });
    if (n < 5) { var line = Core.lisaLine('build'); await flow.say([line].filter(Boolean)); await flow.wait(900); return; }
    markStage(6, true); Snd.sfx('fanfare');
    FX.burst(bb.left - rr.left + bb.width / 2, bb.top - rr.top + bb.height * 0.5, { n: 22, power: 1.2, big: true });
    await flow.say([Core.lisaLine('builddone')].filter(Boolean));
    await flow.wait(1500);
    box.classList.add('fadeout'); await flow.wait(450);
    mode = 'room'; showRoom();
    box.classList.remove('fadeout'); box.classList.add('fadein'); flow.after(500, function () { box.classList.remove('fadein'); });
  }

  /* ---------- the brush: restyle only what is already built or owned (Core.houseSetLook guards it) ---------- */
  function setStyling(on) {
    styling = on; picker = null; pickerKey = null; varCards = [];
    [].forEach.call(box.querySelectorAll('.hitem'), function (n) { n.classList.toggle('hstyle-ok', on); });
    if (on) { giftBox = null; partChips(); }
    else { if (viewExt) backToRoom(); if (mode === 'room') offerGift(false); else renderRoad(); }
    syncBrush();
  }
  function partChips() {
    picker = null; pickerKey = null; varCards = [];
    tray.innerHTML = ''; tray.className = 'house-tray styler';
    for (var k = 1; k <= 5; k++) (function (n) {
      var built = n <= H.stage;
      var t = el('div', 'hstep hpart ' + (built ? 'done' : 'later off'), '<span class="hsp">' + (built ? partIco(n) : STAGE_ICO[n - 1]) + '</span>');
      if (built) tap(t, function () { partPicker(n); }, { nopress: true });
      tray.appendChild(t);
    })(k);
    syncBrush();
  }
  function partPicker(n) {
    if (busy || flow.dead || !styling || sleeping || n > H.stage) return;
    var key = PARTS[n - 1];
    if (mode === 'room' && !viewExt) { viewExt = true; showExterior(); }
    picker = 'part'; pickerKey = key;
    showCards('styler', key, function (v) { return VAR_ICO[v]; }, function (v) {
      if (busy || picker !== 'part' || pickerKey !== key) return;
      if (!Core.houseSetLook(key, v)) return;
      markStage(n, true); Snd.sfx('pop'); markSel(v);
    }, true, false);
  }
  function itemPicker(id, n, pic) {
    if (busy || flow.dead || !styling) return;
    picker = 'item'; pickerKey = id;
    showCards('styler', id, function (v) { return itemPic(id, v); }, function (v) {
      if (busy || picker !== 'item' || pickerKey !== id) return;
      if (!Core.houseSetLook(id, v)) return;
      pic.innerHTML = ''; pic.appendChild(itemPic(id, v));
      n.classList.remove('hland'); void n.offsetWidth; n.classList.add('hland'); flow.after(700, function () { n.classList.remove('hland'); });
      Snd.sfx('pop'); markSel(v);
    }, true, false);
    Snd.say([Core.url.w(lang, id)]);   /* word once, no heard() */
  }
  function backToRoom() {
    viewExt = false; showRoom();
    if (styling) [].forEach.call(box.querySelectorAll('.hitem'), function (n) { n.classList.add('hstyle-ok'); });
  }
  function closePicker() {
    if (busy) return;
    if (viewExt) backToRoom();
    if (styling) partChips();
  }

  /* ---------- go ---------- */
  if (mode === 'room') showRoom(); else { showExterior(); renderRoad(); }
  syncBrush();
  (async function () {
    await flow.wait(500);
    if (mode === 'build') {
      if (H.stage === 0) await flow.say([Core.ruUrl('house_intro')].filter(Boolean));
      while (House.stageDue() > 0 && H.stage < 5 && !flow.dead) { await flow.wait(300); if (styling) setStyling(false); await stagePicker(); }
    } else if (!giftWaiting()) {
      Snd.say([Core.lisaLine('househi')].filter(Boolean), { retry: true });
    }
    if (mode === 'room' && !styling) offerGift(true);
  })();
  /* idle: visual only. Nudge open style cards, else the gift box, else the speaker. */
  UI.idle(flow, { visualMs: 8000, visual: function () {
    var vc = tray.querySelectorAll('.hvar');
    if (vc.length) [].forEach.call(vc, function (c) { c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge'); });
    else if (giftBox) { giftBox.classList.remove('nudge'); void giftBox.offsetWidth; giftBox.classList.add('nudge'); } else UI.pulse(sp);
  } });

  /* test hooks */
  window.__houseTest = {
    offered: [],
    state: function () {
      return { mode: mode, stage: H.stage, gifts: H.gifts, owned: H.owned.slice(), placed: JSON.parse(JSON.stringify(H.placed)), stars: Core.save.stars, busy: busy,
        gift: !!giftBox, cards: [].slice.call(tray.querySelectorAll('.hcard')).map(function (c) { return c.dataset.id; }), stageDue: House.stageDue(),
        items: [].slice.call(box.querySelectorAll('.hitem')).map(function (n) { return n.dataset.id; }), sleeping: sleeping, lang: lang, look: JSON.parse(JSON.stringify(H.look || {})), styling: styling, picker: picker === 'gift' ? null : picker, pickerKey: pickerKey, varCards: varCards.slice() };
    }
  };
  flow.onKill(function () { window.__houseTest = null; });
};
})();
