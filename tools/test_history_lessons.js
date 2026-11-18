'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function data() {
  const code = fs.readFileSync('app/js/lessons_data.js', 'utf8');
  const window = {};
  vm.runInNewContext(code, { window });
  return JSON.parse(JSON.stringify(window.LESSON_DATA));
}

test('history pack is registered in the specified order with the specified end words', () => {
  const d = data();
  const ids = ['hist_castle', 'hist_tiles', 'hist_tram', 'hist_ship', 'hist_doll', 'hist_print'];
  assert.deepEqual(d.order.slice(-6), ids);
  assert.deepEqual(ids.map(id => d.lessons[id].word), ['castle', 'azulejo', 'tram', 'ship', 'doll', 'book']);
});

test('all imported Russian narration is byte-for-byte the writer source', () => {
  const source = fs.readFileSync('tools/fixtures/approved/history-copy.tsv', 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#'));
  for (const target of ['content/ui.tsv', 'content/lessons_ui.tsv']) {
    const rows = new Set(fs.readFileSync(target, 'utf8').split(/\r?\n/));
    for (const row of source) assert.ok(rows.has(row), `${target} missing source row: ${row}`);
  }
});

test('new vocabulary rows have ten columns and scene art assets exist', () => {
  const rows = fs.readFileSync('content/vocab.tsv', 'utf8').split(/\r?\n/);
  const writer = new Map(fs.readFileSync('tools/fixtures/approved/history-vocab.tsv','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>[x.split('\t')[1],x]));
  const wanted = ['castle', 'azulejo', 'tram', 'ship', 'doll'];
  for (const id of wanted) {
    const row = rows.find(x => x.split('\t')[1] === id);
    assert.ok(row, `missing ${id}`);
    assert.equal(row.split('\t').length, 10, `${id} must have all ten columns`);
    assert.equal(row, writer.get(id), `${id} must match writer-supplied vocabulary verbatim`);
    assert.ok(fs.existsSync(`app/img/${id}.svg`));
  }
  assert.ok(fs.existsSync('app/img/book.svg'), 'book remains the existing asset');
});

test('history prompts use stable choices, a valid castle fallback, and one bounded tile retry', () => {
  const d=data(), castle=d.lessons.hist_castle, tiles=d.lessons.hist_tiles, ship=d.lessons.hist_ship;
  const cp=castle.beats.find(x=>x.prompt).prompt;
  assert.deepEqual(cp.choices.map(x=>x.id).sort(),['tower','wall']);
  assert.equal(cp.defaultChoice,'tower');
  assert.deepEqual(Object.keys(castle.beats.find(x=>x.branches).branches).sort(),['tower','wall']);
  assert.deepEqual(Object.keys(ship.beats.find(x=>x.prompt).prompt.choiceAnims).sort(),['sailA','sailB']);
  const retry=tiles.beats.find(x=>x.prompt).prompt;
  assert.equal(retry.retry.match,'match');
  assert.equal(retry.retry.max,1);
  assert.deepEqual(retry.choices.map(x=>x.id).sort(),['match','other']);
});

test('ship scene inspects the selected sail and the following beat is shared sailing', async () => {
  const d=data(), beats=d.lessons.hist_ship.beats, prompt=beats.find(x=>x.prompt).prompt;
  assert.deepEqual(prompt.choiceAnims,{sailA:'inspectA',sailB:'inspectB'});
  assert.equal(beats[4].anim,'sail');
  const src=fs.readFileSync('app/js/lessons_history_art.js','utf8'), calls=[];
  const node=()=>({className:'',style:{},dataset:{},children:[],appendChild(x){this.children.push(x);},set innerHTML(v){this.html=v;}});
  const context={window:{LessonArt:{scenes:{}}},document:{createElement:node}};
  vm.runInNewContext(src,context);
  const S={layer:()=>node(),place(){},lisaBox(){},edge(){},fade:n=>Promise.resolve(n),anim:(n)=>{calls.push(n);return Promise.resolve();},pop:n=>{calls.push(n);return Promise.resolve();}};
  const scene=context.window.LessonArt.scenes.hist_ship(S);
  await scene.act.inspectA();
  const sailA=calls.pop();
  await scene.act.inspectB();
  const sailB=calls.pop();
  await scene.act.sail();
  assert.notEqual(sailA,sailB,'each inspection animates its own sail');
  assert.equal(calls.length,2,'shared sailing reveal moves both sails together');
  assert.deepEqual(calls,[sailA,sailB]);
  assert.equal(scene.act.inspectB===scene.act.inspectA,false);
  assert.notEqual(scene.tile({kind:'sailA'}).html,scene.tile({kind:'sailB'}).html);
});

test('history lesson lines, branches and prompts resolve to imported keys', () => {
  const d = data(), ui = new Set(fs.readFileSync('content/lessons_ui.tsv', 'utf8').split(/\r?\n/).map(x => x.split('\t')[0]));
  for (const id of d.order.slice(-6)) {
    const lesson = d.lessons[id];
    assert.equal(lesson.domain, 'history');
    assert.ok(lesson.endIntro === 'cs_hist_name');
    for (const beat of lesson.beats) {
      assert.ok(ui.has(beat.line), `${id}: ${beat.line}`);
      if (beat.prompt && beat.prompt.q) assert.ok(ui.has(beat.prompt.q));
      if (beat.prompt && beat.prompt.retry) assert.ok(ui.has(beat.prompt.retry.line));
      if (beat.branches) Object.values(beat.branches).forEach(x => assert.ok(ui.has(x.line)));
    }
  }
});
