/* Pure house style registry. IDs/defaults transcribed from the Opus 5.5 contract. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HouseVariantRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
var VARIANTS = {
  "plot": {
    "def": "dirt",
    "list": [
      "dirt",
      "sand",
      "meadow"
    ]
  },
  "base": {
    "def": "stone",
    "list": [
      "stone",
      "sandstone",
      "cobble"
    ]
  },
  "walls": {
    "def": "plaster",
    "list": [
      "plaster",
      "wood",
      "brick"
    ]
  },
  "roof": {
    "def": "redtile",
    "list": [
      "redtile",
      "bluetile",
      "straw"
    ]
  },
  "door": {
    "def": "arch",
    "list": [
      "arch",
      "round",
      "shutter"
    ]
  },
  "bed": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "ball": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "car": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "chair": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "backpack": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "bath": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "toilet": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "tv": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "cake": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "book": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "teddy": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "pencil": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "balloon": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "flower": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "key": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "spoon": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  },
  "plane": {
    "def": "a",
    "list": [
      "a",
      "b",
      "c"
    ]
  }
};
var PARTS = ['plot', 'base', 'walls', 'roof', 'door'];
Object.keys(VARIANTS).forEach(function (key) { Object.freeze(VARIANTS[key].list); Object.freeze(VARIANTS[key]); });
Object.freeze(VARIANTS);
function entry(key) { return typeof key === 'string' && Object.prototype.hasOwnProperty.call(VARIANTS, key) ? VARIANTS[key] : null; }
function valid(key, value) { var e = entry(key); return !!e && typeof value === 'string' && e.list.indexOf(value) >= 0; }
function lookOf(look, key) {
  var e = entry(key); if (!e) return null;
  return look && Object.prototype.hasOwnProperty.call(look, key) && valid(key, look[key]) ? look[key] : e.def;
}
return Object.freeze({ VARIANTS: VARIANTS, valid: valid, lookOf: lookOf,
  stagePartOf: function (n) { return typeof n === 'number' && n >= 1 && n <= 5 && Math.floor(n) === n ? PARTS[n - 1] : null; },
  stageOf: function (key) { return typeof key === 'string' ? PARTS.indexOf(key) + 1 : 0; }
});
});
