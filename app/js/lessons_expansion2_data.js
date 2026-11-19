/* Exact Opus 5.5 authored lesson additions; technical registry adapter. */
(function(){'use strict';var additions = {
  "order": ["x_teremok", "x_balance", "x_stars", "x_frog"],
  "lessons": {
    "x_teremok": { "domain": "literature", "scene": "x_teremok", "word": "house", "edge": "#bfe8ff", "beats": [
      { "line": "cs_x_teremok_1", "anim": "intro" },
      { "line": "cs_x_teremok_2", "anim": "mouse" },
      { "line": "cs_x_teremok_3", "anim": "frogHare" },
      { "line": "cs_x_teremok_4", "anim": "foxWolf" },
      { "line": "cs_x_teremok_5", "anim": "bear" },
      { "line": "cs_x_teremok_6", "pose": "tilt", "prompt": { "q": "cs_x_teremok_6q", "choices": [
        { "id": "fits", "tile": { "kind": "fits" } }, { "id": "tooBig", "tile": { "kind": "tooBig" } }] } },
      { "line": "cs_x_teremok_7", "anim": "crash" },
      { "line": "cs_x_teremok_8", "anim": "build", "pose": "point", "poseMs": 1800 }
    ] },
    "x_balance": { "domain": "maths", "scene": "x_balance", "word": "apple", "edge": "#e9f3e1", "beats": [
      { "line": "cs_x_balance_1", "anim": "intro" },
      { "line": "cs_x_balance_2", "anim": "appleIn" },
      { "line": "cs_x_balance_3", "pose": "tilt", "prompt": { "q": "cs_x_balance_3q", "choices": [
        { "id": "apple", "tile": { "kind": "tiltApple" } }, { "id": "key", "tile": { "kind": "tiltKey" } }] } },
      { "line": "cs_x_balance_4", "anim": "keyIn" },
      { "line": "cs_x_balance_5", "anim": "keyOut", "pose": "tilt", "prompt": { "q": "cs_x_balance_5q", "choices": [
        { "id": "apple", "tile": { "kind": "tiltApple2" } }, { "id": "balloon", "tile": { "kind": "tiltBalloon" } }] } },
      { "line": "cs_x_balance_6", "anim": "balloonIn" },
      { "line": "cs_x_balance_7", "anim": "equal" },
      { "line": "cs_x_balance_8", "anim": "recap", "pose": "point", "poseMs": 1800 }
    ] },
    "x_stars": { "domain": "astronomy", "scene": "x_stars", "word": "star", "edge": "#8fd2ff", "beats": [
      { "line": "cs_x_stars_1", "anim": "intro" },
      { "line": "cs_x_stars_2", "pose": "tilt", "prompt": { "q": "cs_x_stars_2q", "choices": [
        { "id": "yes", "tile": { "kind": "starsYes" } }, { "id": "no", "tile": { "kind": "starsNo" } }] } },
      { "line": "cs_x_stars_3", "anim": "peek" },
      { "line": "cs_x_stars_4", "anim": "veilBack" },
      { "line": "cs_x_stars_5", "anim": "sunset" },
      { "line": "cs_x_stars_6", "anim": "starsOut" },
      { "line": "cs_x_stars_7", "anim": "recap", "pose": "point", "poseMs": 1800 }
    ] },
    "x_frog": { "domain": "nature", "scene": "x_frog", "word": "frog", "edge": "#cdeefc", "beats": [
      { "line": "cs_x_frog_1", "anim": "intro" },
      { "line": "cs_x_frog_2", "pose": "tilt", "prompt": { "q": "cs_x_frog_2q", "choices": [
        { "id": "frogling", "tile": { "kind": "frogling" } }, { "id": "tadpole", "tile": { "kind": "tadpole" } }] } },
      { "line": "cs_x_frog_3", "anim": "hatch" },
      { "line": "cs_x_frog_4", "anim": "legs" },
      { "line": "cs_x_frog_5", "anim": "front" },
      { "line": "cs_x_frog_6", "anim": "jump" },
      { "line": "cs_x_frog_7", "anim": "recap", "pose": "point", "poseMs": 1800 }
    ] }
  }
}; additions.order.forEach(function(id){if(Object.prototype.hasOwnProperty.call(window.LESSON_DATA.lessons,id))throw new Error('Duplicate lesson ID');window.LESSON_DATA.order.push(id);window.LESSON_DATA.lessons[id]=additions.lessons[id];});})();
