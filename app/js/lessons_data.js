/* Lisa's Island - lesson data (beats). Text lives in content/ui.tsv (keys cs_*), taken from content/CUTSCENES.md v1 verbatim.
   Beat = { line: ui key, anim: name | [names] started with the line, cues: [{word, anim}] fired when the word is spoken, pose, art, prompt, pause }.
   prompt = { q: optional ui key of the question half (the idle repeat plays only this), choices: [{id, tile}] } - exactly two outcome pictures; ANY tap is accepted.
   Animations and tiles are defined per scene in lessons_art.js. Word = vocab id of the end word card. See SPEC.md "Lessons". */
(function () {
'use strict';
window.LESSON_DATA = {
  order: ['float', 'daynight', 'stones', 'repka', 'more', 'hist_castle', 'hist_tiles', 'hist_tram', 'hist_ship', 'hist_doll', 'hist_print'],
  lessons: {
    float: {
      domain: 'physics',
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
      domain: 'astronomy',
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
      domain: 'maths',
      scene: 'stones', word: 'n4', edge: '#8fd2ff',
      beats: [
        { line: 'cs_stones_1', anim: 'stonesIn' },
        { line: 'cs_stones_2', cues: [{ word: 'Раз', anim: 'hop1' }, { word: 'два', anim: 'hop2' }, { word: 'три', anim: 'hop3' }] },
        { line: 'cs_stones_3', pose: 'tilt', prompt: { choices: [{ id: 'n4', tile: { n: 4 } }, { id: 'n2', tile: { n: 2 } }] } },
        { line: 'cs_stones_4', anim: 'hop4' },
        { line: 'cs_stones_5', cues: [{ word: 'Пять', anim: 'hop5' }, { word: 'шесть', anim: 'hop6' }, { word: 'семь', anim: 'hop7' }, { word: 'восемь', anim: 'hop8' }, { word: 'девять', anim: 'hop9' }, { word: 'десять', anim: 'hop10' }] },
        { line: 'cs_stones_6', anim: 'cross' }
      ]
    },
    repka: {
      scene: 'repka', word: 'n6', edge: '#a9dd8b',
      beats: [
        { line: 'cs_repka_1', anim: 'plant' },
        { line: 'cs_repka_2', anim: 'pullGrandpa' },
        { line: 'cs_repka_3', anim: 'joinGrandma' },
        { line: 'cs_repka_4', anim: 'joinGirlDog' },
        { line: 'cs_repka_5', pose: 'tilt', prompt: { choices: [
          { id: 'cat', tile: { helper: 'cat' } }, { id: 'mouse', tile: { helper: 'mouse' } }] } },
        { line: 'cs_repka_6', anim: 'helpersPull' },
        { line: 'cs_repka_7', cues: [
          { word: 'дед', anim: 'countGrandpa' }, { word: 'бабка', anim: 'countGrandma' },
          { word: 'внучка', anim: 'countGirl' }, { word: 'Жучка', anim: 'countDog' },
          { word: 'кошка', anim: 'countCat' }, { word: 'мышка', anim: 'countMouse' }
        ] }
      ]
    },
    more: {
      scene: 'more', word: 'n3', edge: '#8fd2ff',
      beats: [
        { line: 'cs_more_1', anim: 'showBaskets' },
        { line: 'cs_more_2', anim: 'apples31' },
        { line: 'cs_more_3', pose: 'tilt', prompt: { choices: [
          { id: 'small', reply: 'cs_more_count', tile: { basket: 'small' } }, { id: 'large', tile: { basket: 'large' } }] } },
        { line: 'cs_more_4', cues: [{ word: 'Раз', anim: 'countLeft1' }, { word: 'два', anim: 'countLeft2' }, { word: 'три', anim: 'countLeft3' }, { word: 'И раз', anim: 'countRight1' }, { word: 'один', anim: 'compare31' }] },
        { line: 'cs_more_5', anim: 'apples32', cues: [{ word: 'Раз', anim: 'countRight1' }, { word: 'два', anim: 'countRight2' }, { word: 'меньше', anim: 'compare32' }] },
        { line: 'cs_more_6', anim: 'apples33', cues: [{ word: 'Раз', anim: 'countRight1' }, { word: 'два', anim: 'countRight2' }, { word: 'три', anim: 'countRight3' }, { word: 'Поровну', anim: 'compare33' }] },
        { line: 'cs_more_7', cues: [{ word: 'Больше', anim: 'highlightLeft' }, { word: 'меньше', anim: 'highlightRight' }, { word: 'поровну', anim: 'highlightBoth' }] }
      ]
    },
    hist_castle: { domain:'history', scene:'hist_castle', word:'castle', endIntro:'cs_hist_name', beats:[
      {line:'cs_hist_castle_1',anim:'intro'}, {line:'cs_hist_castle_2',anim:'reveal'}, {line:'cs_hist_castle_3'},
      {line:'cs_hist_castle_4',prompt:{q:'cs_hist_castle_4q',branch:true,defaultChoice:'tower',choices:[{id:'tower',tile:{kind:'tower'}},{id:'wall',tile:{kind:'wall'}}]}},
      {line:'cs_hist_castle_5a',branch:true,branches:{tower:{line:'cs_hist_castle_5a',anim:'tower'},wall:{line:'cs_hist_castle_5b',anim:'wall'}}},
      {line:'cs_hist_castle_6',anim:'reveal'}]},
    hist_tiles: { domain:'history', scene:'hist_tiles', word:'azulejo', endIntro:'cs_hist_name', beats:[
      {line:'cs_hist_tiles_1',anim:'intro'}, {line:'cs_hist_tiles_2',anim:'reveal'}, {line:'cs_hist_tiles_3'},
      {line:'cs_hist_tiles_4',prompt:{q:'cs_hist_tiles_4q',retry:{line:'cs_hist_tiles_4x',match:'match',max:1},choices:[{id:'match',tile:{kind:'match'}},{id:'other',tile:{kind:'miss'}}]}},
      {line:'cs_hist_tiles_5',anim:'reveal'}, {line:'cs_hist_tiles_6'}]},
    hist_tram: { domain:'history', scene:'hist_tram', word:'tram', endIntro:'cs_hist_name', beats:[
      {line:'cs_hist_tram_1',anim:'intro'}, {line:'cs_hist_tram_2',anim:'reveal'}, {line:'cs_hist_tram_3',anim:'move'},
      {line:'cs_hist_tram_4',prompt:{q:'cs_hist_tram_4q',choices:[{id:'yes',tile:{kind:'yes'}},{id:'no',tile:{kind:'no'}}]}},
      {line:'cs_hist_tram_5',anim:'move'}, {line:'cs_hist_tram_6'}]},
    hist_ship: { domain:'history', scene:'hist_ship', word:'ship', endIntro:'cs_hist_name', beats:[
      {line:'cs_hist_ship_1',anim:'intro'}, {line:'cs_hist_ship_2',anim:'reveal'}, {line:'cs_hist_ship_3'},
      {line:'cs_hist_ship_4',prompt:{q:'cs_hist_ship_4q',choiceAnims:{sailA:'inspectA',sailB:'inspectB'},choices:[{id:'sailA',tile:{kind:'sailA'}},{id:'sailB',tile:{kind:'sailB'}}]}},
      {line:'cs_hist_ship_5',anim:'sail'}, {line:'cs_hist_ship_6',anim:'reveal'}]},
    hist_doll: { domain:'history', scene:'hist_doll', word:'doll', endIntro:'cs_hist_name', beats:[
      {line:'cs_hist_doll_1',anim:'intro'}, {line:'cs_hist_doll_2',anim:'reveal'},
      {line:'cs_hist_doll_3',prompt:{q:'cs_hist_doll_3q',choices:[{id:'inside',tile:{kind:'inside'}},{id:'outside',tile:{kind:'outside'}}]}},
      {line:'cs_hist_doll_4',anim:'open'}, {line:'cs_hist_doll_4b',anim:'open'}, {line:'cs_hist_doll_5'}, {line:'cs_hist_doll_6'}]},
    hist_print: { domain:'history', scene:'hist_print', word:'book', endIntro:'cs_hist_name', beats:[
      {line:'cs_hist_print_1',anim:'intro'}, {line:'cs_hist_print_2',anim:'reveal'}, {line:'cs_hist_print_3',anim:'print'},
      {line:'cs_hist_print_4',prompt:{q:'cs_hist_print_4q',choices:[{id:'page',tile:{kind:'page'}},{id:'letters',tile:{kind:'letters'}}]}},
      {line:'cs_hist_print_5',anim:'print'}, {line:'cs_hist_print_6'}]}
  }
};
})();
