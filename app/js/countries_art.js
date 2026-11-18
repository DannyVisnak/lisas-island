/* Lisa's Island - countries pack art (LISA-13, Opus 5.5 17.11.26). Original inline SVG for the journey, album and postcard.
   Vocabulary pictures are app/img/country_*.svg (plus reused sea/bus/icecream/cheese/banana/sun/beach). Pure data + two helpers, no DOM, no network.
   Looks: css/countries.css. Objects, food flags and greeting sources live in content/packs/countries.json. */
(function () {
'use strict';
var A = window.CountryArt = {};

A.ORDER = ['pt', 'ru', 'de', 'eng', 'it', 'fr', 'jp', 'br', 'cn', 'eg', 'au', 'us'];
/* journey = approximate flight length from Portugal (context only, never asked). view = picture in the plane window, album preview and arrival landmark. */
A.TRIP = {
  pt:  { sky: '#9fdcff', sky2: '#fff4d8', hill: '#f6d18b', ground: '#e9b872', accent: '#1e88e5', journey: 'home', view: 'country_tram' },
  ru:  { sky: '#b9d7f0', sky2: '#f3f8fc', hill: '#dfe9f1', ground: '#c9d8e4', accent: '#d32f2f', journey: 'mid',  view: 'country_nesting_doll' },
  de:  { sky: '#a8dcf5', sky2: '#eef9ff', hill: '#a5d68f', ground: '#7cc36b', accent: '#6d4c41', journey: 'near', view: 'country_castle' },
  eng: { sky: '#c7dceb', sky2: '#f4f8fb', hill: '#b7dca0', ground: '#8fca78', accent: '#c62828', journey: 'near', view: 'bus' },
  it:  { sky: '#8fd3ff', sky2: '#fff1d6', hill: '#bfe3f0', ground: '#7ec8e3', accent: '#00897b', journey: 'near', view: 'country_gondola' },
  fr:  { sky: '#a9d8ff', sky2: '#fdf3e7', hill: '#cfe8b8', ground: '#a8d58a', accent: '#3949ab', journey: 'near', view: 'country_eiffel_tower' },
  jp:  { sky: '#b3e5fc', sky2: '#fff0f5', hill: '#cde8c0', ground: '#a5d68f', accent: '#ec407a', journey: 'far',  view: 'country_mountain' },
  br:  { sky: '#7fd6ff', sky2: '#e8fbff', hill: '#7cc576', ground: '#4caf50', accent: '#f9a825', journey: 'far',  view: 'country_rainforest' },
  cn:  { sky: '#b8e3f5', sky2: '#f7fbef', hill: '#b5d99c', ground: '#8cc96f', accent: '#e53935', journey: 'far',  view: 'country_panda' },
  eg:  { sky: '#9fd6f5', sky2: '#fff5dc', hill: '#f3d08c', ground: '#e6b765', accent: '#ff8f00', journey: 'mid',  view: 'country_pyramid' },
  au:  { sky: '#86d3ff', sky2: '#effaff', hill: '#f2c48a', ground: '#e0a768', accent: '#e65100', journey: 'far',  view: 'country_kangaroo' },
  us:  { sky: '#a3d4ff', sky2: '#f1f7ff', hill: '#bcd9a8', ground: '#94c47e', accent: '#1565c0', journey: 'far',  view: 'country_statue_liberty' }
};
A.JOURNEY_MS = { home: { globe: 1200, cruise: 1600 }, near: { globe: 1800, cruise: 2000 }, mid: { globe: 2400, cruise: 2400 }, far: { globe: 3000, cruise: 2800 } };
A.GLOBE_MAX_MS = 3000;   /* hard cap, the globe element is removed by then */
A.PHASE_MS = { boardCap: 3500, hop: 900, takeoff: 1200, land: 1400, arriveFade: 500, gap: 400, nameCap: 4000, introCap: 8000, greetCap: 4000, accIdle: 6000, accDone: 900, promptCap: 4000, peek: 8000, help: 15000, feed: 700, next: 900, album: 1200 };
/* postcard slots, 1 unit = 0.1 rem, postcard 1040 x 500: centre x, y and picture size s */
A.SLOTS = [ { x: 170, y: 300, s: 210 }, { x: 410, y: 210, s: 200 }, { x: 650, y: 310, s: 210 }, { x: 890, y: 230, s: 200 } ];
A.MOUTH = { left: 9, top: 58.8 };   /* rem, Lisa's mouth in the postcard screen */
A.ACC = ['suitcase', 'camera'];
A.ACC_DEFAULT = 'suitcase';

var PLANE_GLYPH = "<path d='M14 50 Q14 44 22 44 H76 Q90 46 94 50 Q90 54 76 56 H22 Q14 56 14 50Z'/><path d='M44 46 L32 14 H44 L64 46Z'/><path d='M44 54 L32 86 H44 L64 54Z'/><path d='M20 46 L12 30 H20 L30 46Z'/><path d='M20 54 L12 70 H20 L30 54Z'/>";

A.svg = {
  plane: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 220'><ellipse cx='210' cy='202' rx='150' ry='10' fill='#000' opacity='.12'/><path d='M150 146 L140 182 M290 146 L300 182' stroke='#546e7a' stroke-width='7' stroke-linecap='round'/><circle cx='140' cy='184' r='14' fill='#37474f'/><circle cx='140' cy='184' r='5' fill='#b0bec5'/><circle cx='300' cy='184' r='14' fill='#37474f'/><circle cx='300' cy='184' r='5' fill='#b0bec5'/><path d='M60 112 L36 40 Q34 32 44 32 H70 Q78 32 82 40 L120 96Z' fill='#ff7043'/><path d='M40 120 Q40 84 112 80 H296 Q350 82 368 114 Q350 146 296 148 H112 Q40 146 40 120Z' fill='#ffffff'/><path d='M44 130 Q60 144 112 146 H296 Q340 144 358 130Z' fill='#ffccbc'/><path d='M50 126 H358' stroke='#ff7043' stroke-width='7' stroke-linecap='round'/><g fill='#b3e5fc' stroke='#90a4ae' stroke-width='4'><circle cx='150' cy='104' r='12'/><circle cx='192' cy='104' r='12'/><circle cx='234' cy='104' r='12'/><circle cx='276' cy='104' r='12'/></g><path d='M316 92 Q346 94 356 110 H316Z' fill='#81d4fa' stroke='#90a4ae' stroke-width='4' stroke-linejoin='round'/><path d='M62 118 H112 L100 136 H68Z' fill='#ff8a65'/><path d='M180 124 H262 L226 178 Q222 184 214 184 H196 Q188 184 190 176Z' fill='#ff8a65'/><path d='M362 104 Q380 114 362 124Z' fill='#ff7043'/><g class='c-propel'><rect x='369' y='62' width='10' height='104' rx='5' fill='#78909c'/></g><circle cx='374' cy='114' r='9' fill='#546e7a'/></svg>",
  globe: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><clipPath id='cgclip'><circle cx='100' cy='100' r='86'/></clipPath><radialGradient id='cgsea' cx='.38' cy='.34' r='.8'><stop offset='0' stop-color='#8fdcff'/><stop offset='1' stop-color='#1e88e5'/></radialGradient></defs><circle cx='100' cy='100' r='96' fill='#fff' opacity='.5'/><circle cx='100' cy='100' r='86' fill='url(#cgsea)'/><g clip-path='url(#cgclip)'><g class='c-land' fill='#8bc34a'><path d='M20 60 Q40 40 64 52 Q80 70 60 84 Q40 96 26 82Z'/><path d='M96 120 Q120 104 140 124 Q150 150 124 160 Q100 156 96 120Z'/><path d='M130 46 Q156 36 172 56 Q168 76 146 74 Q128 66 130 46Z'/><path d='M40 130 Q56 124 66 140 Q60 156 44 150Z'/><path d='M220 60 Q240 40 264 52 Q280 70 260 84 Q240 96 226 82Z'/><path d='M296 120 Q320 104 340 124 Q350 150 324 160 Q300 156 296 120Z'/><path d='M330 46 Q356 36 372 56 Q368 76 346 74 Q328 66 330 46Z'/><path d='M240 130 Q256 124 266 140 Q260 156 244 150Z'/></g></g><ellipse cx='70' cy='58' rx='30' ry='16' transform='rotate(-30 70 58)' fill='#fff' opacity='.28'/><g class='c-pin'><circle cx='100' cy='92' r='17' fill='#fff' opacity='.6'/><circle cx='100' cy='92' r='9' fill='#ff7043' stroke='#fff' stroke-width='4'/></g></svg>",
  landing: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1366 768' preserveAspectRatio='xMidYMid slice'><path d='M0 560 Q240 500 480 548 T960 536 T1366 548 V768 H0Z' fill='#b5e3a8'/><rect x='0' y='610' width='1366' height='158' fill='#7ed957'/><path d='M150 628 V500' stroke='#90a4ae' stroke-width='6'/><path d='M153 504 L230 514 L230 538 L153 548Z' fill='#ff7043'/><path d='M180 508 V544 M206 511 V541' stroke='#fff' stroke-width='9'/><rect x='1200' y='420' width='40' height='208' fill='#eceff1'/><rect x='1178' y='388' width='84' height='44' rx='8' fill='#4fc3f7' stroke='#eceff1' stroke-width='8'/><rect x='1170' y='376' width='100' height='14' rx='6' fill='#ff7043'/><circle cx='1080' cy='606' r='26' fill='#4caf50'/><circle cx='1110' cy='612' r='20' fill='#66bb6a'/><circle cx='300' cy='606' r='22' fill='#4caf50'/><rect x='0' y='628' width='1366' height='44' fill='#78909c'/><rect x='0' y='628' width='1366' height='6' fill='#90a4ae'/><path d='M20 651 H1366' stroke='#fff' stroke-width='6' stroke-dasharray='60 44'/><rect x='0' y='672' width='1366' height='96' fill='#6fcf4a'/></svg>",
  window: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><path fill-rule='evenodd' fill='#eceff1' d='M2 100 A98 98 0 1 0 198 100 A98 98 0 1 0 2 100Z M22 100 A78 78 0 1 1 178 100 A78 78 0 1 1 22 100Z'/><circle cx='100' cy='100' r='78' fill='none' stroke='#b0bec5' stroke-width='5'/><circle cx='100' cy='100' r='96' fill='none' stroke='#cfd8dc' stroke-width='3'/><g fill='#b0bec5'><circle cx='100' cy='12' r='3.5'/><circle cx='162.2' cy='37.8' r='3.5'/><circle cx='188' cy='100' r='3.5'/><circle cx='162.2' cy='162.2' r='3.5'/><circle cx='100' cy='188' r='3.5'/><circle cx='37.8' cy='162.2' r='3.5'/><circle cx='12' cy='100' r='3.5'/><circle cx='37.8' cy='37.8' r='3.5'/></g><path d='M48 70 Q58 46 82 38' fill='none' stroke='#fff' stroke-width='7' stroke-linecap='round' opacity='.6'/></svg>",
  stamp: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'><rect x='4' y='4' width='92' height='112' rx='4' fill='#fff' stroke='#e0e0e0' stroke-width='2' stroke-dasharray='6 4'/><rect x='14' y='14' width='72' height='92' rx='4' fill='currentColor'/><g fill='#fff' transform='translate(22 30) scale(.56)'>" + PLANE_GLYPH + "</g><circle cx='70' cy='84' r='22' fill='none' stroke='#37474f' stroke-width='3' opacity='.55'/><path d='M30 96 Q40 90 50 96 T70 96 T90 96' fill='none' stroke='#37474f' stroke-width='3' opacity='.55'/></svg>",
  stampEmpty: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 120'><rect x='6' y='6' width='88' height='108' rx='6' fill='#fff' fill-opacity='.7' stroke='#90a4ae' stroke-width='4' stroke-dasharray='10 7'/><g fill='#cfd8dc' transform='translate(22 32) scale(.56)'>" + PLANE_GLYPH + "</g></svg>",
  planeMini: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='currentColor'>" + PLANE_GLYPH + "</g></svg>",
  travel: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g transform='rotate(-8 48 62)'><rect x='10' y='38' width='72' height='50' rx='6' fill='#fff'/><rect x='58' y='44' width='18' height='22' rx='2' fill='#ff7043'/><path d='M18 52 H48 M18 62 H44 M18 72 H48' stroke='#90caf9' stroke-width='4' stroke-linecap='round'/></g><g fill='#fff' stroke='#0288d1' stroke-width='3' stroke-linejoin='round' transform='translate(46 2) scale(.5)'>" + PLANE_GLYPH + "</g></svg>",
  arrowL: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M62 20 L32 50 L62 80' fill='none' stroke='#fff' stroke-width='14' stroke-linecap='round' stroke-linejoin='round'/></svg>",
  arrowR: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M38 20 L68 50 L38 80' fill='none' stroke='#fff' stroke-width='14' stroke-linecap='round' stroke-linejoin='round'/></svg>",
  suitcase: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M38 26 V16 Q38 10 44 10 H56 Q62 10 62 16 V26' fill='none' stroke='#5d4037' stroke-width='6'/><rect x='18' y='24' width='64' height='60' rx='10' fill='#ef6c00'/><rect x='18' y='24' width='64' height='10' rx='5' fill='#ff8f3d'/><rect x='31' y='24' width='7' height='60' fill='#bf5200'/><rect x='62' y='24' width='7' height='60' fill='#bf5200'/><path d='M50 42 L54 51 L63 51 L56 57 L59 66 L50 61 L41 66 L44 57 L37 51 L46 51Z' fill='#ffd54f'/><circle cx='28' cy='90' r='5' fill='#37474f'/><circle cx='72' cy='90' r='5' fill='#37474f'/></svg>",
  camera: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M18 38 Q50 6 82 38' fill='none' stroke='#5d4037' stroke-width='5'/><rect x='24' y='26' width='20' height='12' rx='3' fill='#00897b'/><rect x='12' y='34' width='76' height='50' rx='10' fill='#26a69a'/><rect x='70' y='40' width='12' height='8' rx='2' fill='#fff59d'/><circle cx='52' cy='60' r='18' fill='#37474f'/><circle cx='52' cy='60' r='11' fill='#4fc3f7'/><circle cx='47' cy='55' r='4' fill='#fff' opacity='.8'/></svg>",
  cloud: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'><path d='M30 80 Q8 80 10 62 Q12 44 34 46 Q38 20 66 22 Q86 6 112 22 Q138 14 150 38 Q182 36 188 60 Q192 82 166 82Z' fill='#fff'/></svg>"
};

/* postcard/arrival backdrop: sky, two clouds, two hills. Deliberately NO sun, sea, trees or buildings, so nothing on it can be mistaken for a vocabulary picture. uid keeps gradient ids unique. */
A.backdrop = function (id, uid) {
  var t = A.TRIP[id]; if (!t) return '';
  var g = 'cbg' + String(uid).replace(/[^a-z0-9]/gi, '');
  return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1040 500' preserveAspectRatio='xMidYMid slice'>" +
    "<defs><linearGradient id='" + g + "' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='" + t.sky + "'/><stop offset='1' stop-color='" + t.sky2 + "'/></linearGradient></defs>" +
    "<rect width='1040' height='500' fill='url(#" + g + ")'/>" +
    "<g fill='#fff' opacity='.8'><ellipse cx='170' cy='86' rx='74' ry='24'/><ellipse cx='222' cy='70' rx='44' ry='22'/><ellipse cx='760' cy='60' rx='60' ry='20'/><ellipse cx='800' cy='48' rx='36' ry='18'/></g>" +
    "<path d='M0 330 Q180 270 380 318 T760 300 T1040 316 V500 H0Z' fill='" + t.hill + "'/>" +
    "<path d='M0 400 Q260 360 520 392 T1040 384 V500 H0Z' fill='" + t.ground + "'/></svg>";
};
A.viewSrc = function (id) { var t = A.TRIP[id]; return t ? 'img/' + t.view + '.svg' : ''; };
})();
