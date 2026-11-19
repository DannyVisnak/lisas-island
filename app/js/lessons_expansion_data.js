/* Exact Opus 5.5 authored lesson additions; technical registry adapter. */
(function(){'use strict';var additions = {
  "order": ["x_shadow", "x_sprout", "x_halves", "x_rainbow"],
  "lessons": {
    "x_shadow": { "domain": "physics", "scene": "x_shadow", "word": "tree", "edge": "#bfe8ff", "beats": [
      { "line": "cs_x_shadow_1", "anim": "intro" },
      { "line": "cs_x_shadow_2", "anim": "point" },
      { "line": "cs_x_shadow_3", "pose": "tilt", "prompt": { "q": "cs_x_shadow_3q", "choices": [
        { "id": "left", "tile": { "kind": "shadowLeft" } }, { "id": "right", "tile": { "kind": "shadowRight" } }] } },
      { "line": "cs_x_shadow_4", "anim": "sunRight" },
      { "line": "cs_x_shadow_5", "anim": "sunHigh" },
      { "line": "cs_x_shadow_6", "anim": "sunLow" },
      { "line": "cs_x_shadow_7", "anim": "recap", "pose": "point", "poseMs": 1800 }
    ] },
    "x_sprout": { "domain": "nature", "scene": "x_sprout", "word": "flower", "edge": "#cdeefc", "beats": [
      { "line": "cs_x_sprout_1", "anim": ["intro", "seedShow"] },
      { "line": "cs_x_sprout_2", "anim": "seedIn" },
      { "line": "cs_x_sprout_3", "anim": ["water", "sunOn"] },
      { "line": "cs_x_sprout_4", "pose": "tilt", "prompt": { "q": "cs_x_sprout_4q", "choices": [
        { "id": "sprout", "tile": { "kind": "sprout" } }, { "id": "flower", "tile": { "kind": "flower" } }] } },
      { "line": "cs_x_sprout_5", "anim": "sprout" },
      { "line": "cs_x_sprout_6", "anim": "grow" },
      { "line": "cs_x_sprout_7", "anim": "bloom" },
      { "line": "cs_x_sprout_8", "anim": "recap", "pose": "point", "poseMs": 1800 }
    ] },
    "x_halves": { "domain": "maths", "scene": "x_halves", "word": "n2", "edge": "#ffe7c2", "beats": [
      { "line": "cs_x_halves_1", "anim": ["intro", "showWhole"] },
      { "line": "cs_x_halves_2", "pose": "tilt", "prompt": { "q": "cs_x_halves_2q", "choices": [
        { "id": "middle", "tile": { "kind": "cutMiddle" } }, { "id": "edge", "tile": { "kind": "cutEdge" } }] } },
      { "line": "cs_x_halves_3", "anim": "cutSide" },
      { "line": "cs_x_halves_4", "anim": "reset" },
      { "line": "cs_x_halves_5", "anim": "cutMiddle" },
      { "line": "cs_x_halves_6", "anim": "compare" },
      { "line": "cs_x_halves_7", "anim": "toPlates" },
      { "line": "cs_x_halves_8", "anim": "rejoin", "pose": "point", "poseMs": 1800 }
    ] },
    "x_rainbow": { "domain": "physics", "scene": "x_rainbow", "word": "rain", "edge": "#a9c4d8", "beats": [
      { "line": "cs_x_rainbow_1", "anim": ["intro", "rainOn"] },
      { "line": "cs_x_rainbow_2", "pose": "tilt", "prompt": { "q": "cs_x_rainbow_2q", "choices": [
        { "id": "rainOnly", "tile": { "kind": "rainOnly" } }, { "id": "rainSun", "tile": { "kind": "rainSun" } }] } },
      { "line": "cs_x_rainbow_3", "anim": "rainOnly" },
      { "line": "cs_x_rainbow_4", "anim": "sunOut" },
      { "line": "cs_x_rainbow_5", "anim": "rainbow" },
      { "line": "cs_x_rainbow_6", "anim": "recap", "pose": "point", "poseMs": 1800 }
    ] }
  }
}; additions.order.forEach(function(id){if(Object.prototype.hasOwnProperty.call(window.LESSON_DATA.lessons,id))throw new Error('Duplicate lesson ID');window.LESSON_DATA.order.push(id);window.LESSON_DATA.lessons[id]=additions.lessons[id];});})();
