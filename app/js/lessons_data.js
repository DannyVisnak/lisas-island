/* Lisa's Island - lesson data (beats). Text lives in content/ui.tsv (keys cs_*), taken from content/CUTSCENES.md v1 verbatim.
   Beat = { line: ui key, anim: name | [names] started with the line, cues: [{word, anim}] fired when the word is spoken, pose, art, prompt, pause }.
   prompt = { q: optional ui key of the question half (the idle repeat plays only this), choices: [{id, tile}] } - exactly two outcome pictures; ANY tap is accepted.
   Animations and tiles are defined per scene in lessons_art.js. Word = vocab id of the end word card. See SPEC.md "Lessons". */
(function () {
'use strict';
window.LESSON_DATA = {
  order: ['float', 'daynight', 'stones'],
  lessons: {
    float: {
      scene: 'float', word: 'water', edge: '#ffeccb',
      beats: [
        { line: 'cs_float_1', anim: 'intro' },
        { line: 'cs_float_2', anim: 'duckShow', cues: [{ word: 'Плюх', anim: 'duckDrop' }] },
        { line: 'cs_float_3', anim: 'logShow', pose: 'tilt', prompt: { q: 'cs_float_3q', choices: [
          { id: 'float', tile: { mode: 'float', obj: 'log' } }, { id: 'sink', tile: { mode: 'sink', obj: 'log' } }] } },
        { line: 'cs_float_4', anim: 'logDrop' },
        { line: 'cs_float_5', anim: 'keyShow', prompt: { q: 'cs_float_5q', choices: [
          { id: 'float', tile: { mode: 'float', obj: 'key' } }, { id: 'sink', tile: { mode: 'sink', obj: 'key' } }] } },
        { line: 'cs_float_6', anim: 'keyDrop' },
        { line: 'cs_float_7', anim: 'appleDrop' },
        { line: 'cs_float_8', cues: [{ word: 'Большое', anim: 'popLog' }, { word: 'маленькое', anim: 'popKey' }], pose: 'point', poseMs: 1800 }
      ]
    },
    daynight: {
      scene: 'daynight', word: 'moon', edge: '#8fd2ff',
      beats: [
        { line: 'cs_daynight_1', anim: 'sunrise' },
        { line: 'cs_daynight_2', anim: 'midday' },
        { line: 'cs_daynight_3', anim: 'evening' },
        { line: 'cs_daynight_4', pose: 'tilt', prompt: { choices: [
          { id: 'moon', tile: { kind: 'moon' } }, { id: 'sun', tile: { kind: 'sun' } }] } },
        { line: 'cs_daynight_5', anim: 'night' },
        { line: 'cs_daynight_6', pose: 'sleep', cues: [{ word: 'А утром', anim: 'dawn' }] },
        { line: 'cs_daynight_7', anim: 'badges', cues: [{ word: 'Утро', anim: 'badge1' }, { word: 'день', anim: 'badge2' }, { word: 'вечер', anim: 'badge3' }, { word: 'ночь', anim: 'badge4' }] }
      ]
    },
    stones: {
      scene: 'stones', word: 'n4', edge: '#8fd2ff',
      beats: [
        { line: 'cs_stones_1', anim: 'stonesIn' },
        { line: 'cs_stones_2', cues: [{ word: 'Раз', anim: 'hop1' }, { word: 'два', anim: 'hop2' }, { word: 'три', anim: 'hop3' }] },
        { line: 'cs_stones_3', pose: 'tilt', prompt: { choices: [{ id: 'n4', tile: { n: 4 } }, { id: 'n2', tile: { n: 2 } }] } },
        { line: 'cs_stones_4', anim: 'hop4' },
        { line: 'cs_stones_5', cues: [{ word: 'Пять', anim: 'hop5' }, { word: 'шесть', anim: 'hop6' }, { word: 'семь', anim: 'hop7' }, { word: 'восемь', anim: 'hop8' }, { word: 'девять', anim: 'hop9' }, { word: 'десять', anim: 'hop10' }] },
        { line: 'cs_stones_6', anim: 'cross' }
      ]
    }
  }
};
})();
