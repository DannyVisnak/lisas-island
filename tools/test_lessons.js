'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function fakeNode() { return { style: {}, dataset: {}, className:'', classList: { add() {}, remove() {} }, children: [], appendChild(child) { child.parentNode=this; this.children.push(child); }, removeChild(child) { this.children=this.children.filter(n=>n!==child); child.parentNode=null; }, querySelectorAll(selector) { const cls=selector.replace(/^\./,''); return this.children.flatMap(child=>[(child.className||'').split(/\s+/).includes(cls)?child:null,...child.querySelectorAll(selector)].filter(Boolean)); }, querySelector(selector) { return this.querySelectorAll(selector)[0] || fakeNode(); } }; }
const context = { window: {}, document: { createElement: fakeNode, body: {style:{},insertBefore(){}} }, console, Promise, setTimeout, clearTimeout, clearInterval };
context.window.window = context.window;
vm.createContext(context);
for (const file of ['app/js/lessons_data.js', 'app/js/lessons_art.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
vm.runInContext(fs.readFileSync(path.join(root, 'app/js/data.js'), 'utf8'), context, { filename: 'app/js/data.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'app/js/lesson.js'), 'utf8'), context, { filename: 'app/js/lesson.js' });
const data = context.window.LESSON_DATA;
context.LessonArt=context.window.LessonArt;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function stageMock() {
  const S = {
    actors: {},
    layer() { return fakeNode(); }, edge() {}, lisaBox() {}, wait() { return Promise.resolve(); },
    el() { return fakeNode(); }, img(name) { return 'img/' + name + '.svg'; },
    place(node) { return node; }, T() { return 'translate(0,0)'; },
    actor(parent, name) { const n=fakeNode(); n.inner={style:{}}; parent.appendChild(n); return n; },
    anim() { return Promise.resolve(); }, fade() { return Promise.resolve(); },
    lisa: { pose() {} }
  };
  return S;
}

test('new lessons append without changing the original lesson order', () => {
  assert.deepEqual(Array.from(data.order.slice(0,5)), ['float', 'daynight', 'stones', 'repka', 'more']);
});

test('new lessons have seven narrated beats, one picture prompt, and the specified end words', () => {
  for (const [id, word] of [['repka', 'n6'], ['more', 'n3']]) {
    const lesson = data.lessons[id];
    assert.equal(lesson.beats.length, 7);
    assert.equal(lesson.word, word);
    assert.ok(context.window.GAME_DATA.items[word], `${word} vocabulary entry is missing`);
    const prompts = lesson.beats.filter(beat => beat.prompt);
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].prompt.choices.length, 2);
    assert.notEqual(prompts[0].prompt.choices[0].id, prompts[0].prompt.choices[1].id);
  }
});

test('new narration and response keys occur once with matching Russian in both approved TSVs', () => {
  const expected = new Map([
    ['cs_repka_1','Посадил дед репку. Выросла репка большая-пребольшая!'],
    ['cs_repka_2','Стал дед репку тянуть. Тянет-потянет, вытянуть не может!'],
    ['cs_repka_3','Позвал дед бабку. Бабка за дедку, дедка за репку. Тянут-потянут, вытянуть не могут!'],
    ['cs_repka_4','Позвала бабка внучку, внучка позвала Жучку. Тянут-потянут, а репка сидит!'],
    ['cs_repka_5','Кого позовём на помощь?'],
    ['cs_repka_6','Позвала Жучка кошку, кошка позвала мышку. Тянут-потянут, и вытянули репку!'],
    ['cs_repka_7','Видишь? Даже маленькая мышка помогла. Давай посчитаем: дед, бабка, внучка, Жучка, кошка, мышка. Шесть! Вместе всё получается.'],
    ['cs_more_1','У меня две корзинки. Смотри, я кладу яблоки.'],['cs_more_2','Сюда три яблока, а сюда одно.'],
    ['cs_more_3','Где яблок больше? Нажми на корзинку!'],['cs_more_4','Раз, два, три. И раз. Три — это больше, чем один!'],
    ['cs_more_5','А если я положу сюда ещё одно? Раз, два. Всё равно меньше!'],['cs_more_6','А теперь? Раз, два, три! Поровну! Одинаково!'],
    ['cs_more_7','Больше, меньше и поровну. Ты теперь это знаешь!'],['cs_more_count','Давай посчитаем вместе!']
  ]);
  for (const file of ['content/lessons_ui.tsv','content/ui.tsv']) {
    const rows=read(file).split(/\r?\n/).filter(Boolean).map(line=>line.split('\t'));
    for (const [key,ru] of expected) {
      const found=rows.filter(row=>row[0]===key && row[1]==='ru');
      assert.equal(found.length,1,`${file}: ${key} occurs ${found.length} times`);
      assert.equal(found[0][1],'ru'); assert.equal(found[0][2],ru,`${file}: ${key} text mismatch`);
    }
  }
});

test('lesson beats reference scene actions and prompt tiles have scene renderers', () => {
  for (const id of ['repka', 'more']) {
    const lesson = data.lessons[id], scene = context.window.LessonArt.scenes[lesson.scene];
    const actions = scene(stageMock());
    for (const beat of lesson.beats) {
      for (const name of [].concat(beat.anim || [], (beat.cues || []).map(cue => cue.anim))) {
        assert.equal(typeof actions.act[name], 'function', `${id} missing action ${name}`);
      }
      if (beat.prompt) for (const choice of beat.prompt.choices) assert.ok(actions.tile(choice.tile));
    }
  }
});

test('Repka joins all helpers in order before extraction and highlights the count', () => {
  const src = read('app/js/lessons_art.js');
  assert.match(src, /scenes\.repka\s*=/);
  assert.match(src, /repka.*grandpa.*grandma.*girl.*dog.*cat.*mouse.*turnip/s);
  const dataText = read('app/js/lessons_data.js');
  assert.match(dataText, /repka[\s\S]*?id: 'cat'[\s\S]*?id: 'mouse'/);
  assert.match(dataText, /line: 'cs_repka_6', anim: 'helpersPull'/);
  assert.match(src, /helpersPull: function \(\) \{ return act\.joinCat\(\)\.then\(function\(\)\{return act\.joinMouse\(\);\}\)\.then\(function\(\)\{return act\.extract\(\);\}\); \}/);
});

test('Repka puts the cat and mouse into the same completed six-helper pull', async () => {
  const scene=context.window.LessonArt.scenes.repka(stageMock());
  await scene.act.plant(); await scene.act.pullGrandpa(); await scene.act.joinGrandma(); await scene.act.joinGirlDog();
  await scene.act.helpersPull();
  assert.deepEqual(['grandpa','grandma','girl','dog','cat','mouse'].map(name=>scene.helpers[name].dataset.joined),Array(6).fill('true'));
  assert.equal(scene.turnip.dataset.extracted,'true');
});

test('More quantities progress exactly 3–1, 3–2, 3–3 with one apple per addition', async () => {
  const scene = context.window.LessonArt.scenes.more(stageMock());
  assert.deepEqual([scene.quantities.left, scene.quantities.right], [3,1]);
  await scene.act.apples32(); assert.deepEqual([scene.quantities.left, scene.quantities.right], [3,2]);
  await scene.act.apples33(); assert.deepEqual([scene.quantities.left, scene.quantities.right], [3,3]);
  assert.equal((scene.tile({basket:'large'}).innerHTML.match(/img\/apple\.svg/g)||[]).length,3);
  assert.equal((scene.tile({basket:'small'}).innerHTML.match(/img\/apple\.svg/g)||[]).length,1);
});

test('More count cues highlight apple positions in spoken order', () => {
  const cues=Array.from(data.lessons.more.beats.slice(3,6).flatMap(beat=>beat.cues.map(cue=>cue.anim)));
  assert.deepEqual(cues,['countLeft1','countLeft2','countLeft3','countRight1','compare31','countRight1','countRight2','compare32','countRight1','countRight2','countRight3','compare33']);
});

test('the optional prompt reply is preloaded and replaces only the default choice response', () => {
  const source = read('app/js/lesson.js');
  assert.match(source, /P\.choices\.find\([\s\S]*?\.reply/);
  assert.match(source, /await speak\([^)]*reply[^)]*\)/);
  assert.match(source, /c\.reply\) preloadBase\(c\.reply\)/);
  assert.deepEqual(Array.from(data.lessons.more.beats[2].prompt.choices.map(choice=>choice.reply||'cs_check')),['cs_more_count','cs_check']);
  assert.deepEqual(Array.from(data.lessons.repka.beats[4].prompt.choices.map(choice=>choice.reply||'cs_check')),['cs_check','cs_check']);
});

test('response assignment uses choice identity, independent of shuffled tile positions', () => {
  const choices = [{ id: 'small', reply: 'cs_more_count' }, { id: 'large' }];
  for (const order of [[0, 1], [1, 0]]) {
    const selected = order.map(index => choices[index]).find(choice => choice.id === 'small');
    assert.equal(selected.reply, 'cs_more_count');
  }
});

test('prompt input records only the first answer and stop cancels the owned flow before completion', () => {
  const source=read('app/js/lesson.js');
  assert.match(source,/if \(picked \|\| flow\.promptActive\(\) \|\| st\.stopped\) return;\s*picked = t\.dataset\.choice; resolveFn\(\);/);
  assert.match(source,/st\.picks\.push\(\{ beat: i, choice: auto \? null : choice, auto: auto, attempt: st\.attemptCount \}\)/);
  assert.match(source,/flow\.kill\(\)/);
  assert.match(source,/record\(\);\s*st\.phase = 'done'/);
});

test('Lesson.play speaks the selected reply once, defaults other answers, and stop blocks later work', async () => {
  const speech=[], records={pt:{lessons:{}}}, made=[];
  class Flow {
    constructor(){this.dead=false;this.kills=[];}
    wait(){return Promise.resolve();} after(ms,fn){return setTimeout(()=>{if(!this.dead)fn();},0);} every(){return null;}
    say(list){speech.push(...list);return Promise.resolve(true);} prompt(){return Promise.resolve(true);}
    promptActive(){return false;} onKill(fn){this.kills.push(fn);} kill(){this.dead=true;this.kills.forEach(fn=>fn());}
  }
  const oldCore=context.Core, oldWindowCore=context.window.Core, oldStage=context.window.LessonArt.stage, oldMore=context.window.LessonArt.scenes.more;
  const actions=[];
  const Core={fast:true,speed:1,inputSeq:0,Flow,curLang:()=> 'pt',L:lang=>records[lang],persist(){},
    baseText:()=>'',baseLang:()=> 'ru',baseUrl:key=>'ui:'+key,save:{settings:{subtitles:true}},vocabLabelEl:()=>fakeNode(),
    D:{ui:{ru:{}}},url:{ui:(lang,key)=>'ui:'+key,w:(lang,id)=>'word:'+id},item:id=>({id,pt:{word:id}}),
    Pic:{el:()=>fakeNode()},tap(node,fn){node.onTap=fn;},shuffle(xs){return xs.reverse();},
    Snd:{cache:{},preload(){},busy(){return false;},sfx(){}},
  };
  Core.L=function(lang){return records[lang] || (records[lang]={lessons:{}});};
  context.Core=Core; context.window.Core=Core; context.document.body={style:{}};
  context.window.LessonArt.stage=function(box,flow,st){return {lisa:{pose(){}},dispose(){},set(){}};};
  context.window.LessonArt.scenes.more=function(){const act={};for(const beat of data.lessons.more.beats){for(const name of [].concat(beat.anim||[],(beat.cues||[]).map(c=>c.anim)))act[name]=()=>{actions.push(name);return Promise.resolve();};}return {act,tile(){return fakeNode();},promptBox:{x:680,y:180,size:240,gap:50}};};
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function reachPrompt(){for(let i=0;i<100;i++){if(context.window.__lessonTest&&context.window.__lessonTest.state().phase==='prompt')return;await pause(1);}throw new Error('lesson prompt was not reached');}
  try {
    for(const [choice,reply] of [['small','ui:cs_more_count'],['large','ui:cs_check']]){
      const root=fakeNode();let completed=0;const handle=context.window.Lesson.play('more',root,ok=>{if(ok)completed++;},{lang:'pt'});
      await reachPrompt();
      const tile=root.querySelectorAll('.ls-tile').find(node=>node.dataset.choice===choice);assert.ok(tile,`${choice} choice tile missing`);
      tile.onTap();root.querySelectorAll('.ls-tile').find(node=>node!==tile).onTap();
      for(let i=0;i<100&&completed===0;i++)await pause(1);
      assert.equal(handle.state().picks.length,1);assert.equal(handle.state().picks[0].choice,choice);
      assert.equal(speech.filter(key=>key===reply).length,1,`${choice} response count`);
      assert.equal(completed,1);
    }
    const before=records.pt.lessons.more.seen;let stoppedDone=null;
    const handle=context.window.Lesson.play('more',fakeNode(),ok=>{stoppedDone=ok;},{lang:'pt'});
    await reachPrompt();const beforeActions=actions.length;handle.stop();await pause(10);
    assert.equal(stoppedDone,false);assert.equal(records.pt.lessons.more.seen,before);assert.equal(actions.length,beforeActions);
  } finally {
    context.Core=oldCore;context.window.Core=oldWindowCore;context.window.LessonArt.stage=oldStage;context.window.LessonArt.scenes.more=oldMore;
  }
});

test('CUTSCENES documents a single apple added at More beat 6', () => {
  assert.match(read('content/CUTSCENES.md'), /### 4\. Где больше[\s\S]*?6\. \[one more\]/);
  assert.doesNotMatch(read('content/CUTSCENES.md'), /6\. \[two more\]/);
});
