'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const NEW = ['repka', 'more'];

// Load production planning/completion code; replace only platform, save and screen dependencies.
function runtime(saved) {
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(read('app/js/lessons_data.js'), context);
  const data = context.LESSON_DATA;
  const items = {};
  ['ordinary', ...Object.values(data.lessons).map(lesson => lesson.word)].forEach(id => {
    items[id] = { id, world: 'animals', en: { word: id }, de: { word: id } };
  });
  let persisted;
  const visits = [], srsWrites = [];
  const emptyLang = () => ({ lessons: {}, srs: {} });
  const Core = {
    D: { items, worlds: [{ id: 'animals' }], langs: ['en', 'de'] },
    save: saved ? plain(saved) : { settings: { sessionMin: 15 }, stars: 0, langs: { en: emptyLang(), de: emptyLang() } },
    lang: 'en', curLang() { return this.lang; }, today: () => 20000,
    L(lang) { return this.save.langs[lang]; },
    persist() { persisted = plain(this.save); },
    worldItems: world => Object.keys(items).filter(id => items[id].world === world),
    picKey: item => item.id, shuffle: array => array.slice(),
    el: () => ({}), tap() {}, speed: 1,
    addStars(n) { this.save.stars += n; },
    Snd: { sfx() {} },
    SRS: {
      peek: (lang, id) => Core.L(lang).srs[id] || { box: 0 },
      dueList: () => [], introduced: () => [],
      intro(...args) { srsWrites.push(['intro', ...args]); },
      touch(...args) { srsWrites.push(['touch', ...args]); },
      answer(...args) { srsWrites.push(['answer', ...args]); }
    }
  };
  const UI = {
    p: { path: true, lang: 'en' }, screens: {}, overlay: { appendChild() {} },
    flow: { wait: async () => {}, say: async () => {} },
    go(screen, props) { visits.push({ screen, props }); this.p = props || {}; }
  };
  Object.assign(context, {
    Core, UI, Lisa: { ico: {} }, document: { hidden: false },
    setInterval() {}, setTimeout() {},
    Lesson: {
      list: () => data.order.map(id => ({ id, ...data.lessons[id] })),
      seen: (lang, id) => !!(Core.L(lang).lessons[id] && Core.L(lang).lessons[id].seen),
      word: id => data.lessons[id].word
    }
  });
  vm.runInContext(read('app/js/path.js'), context, { filename: 'app/js/path.js' });
  return { Path: context.Path, Core, UI, data, visits, srsWrites, persisted: () => plain(persisted) };
}
function session(r, lang = 'en') {
  return r.Path.newSession(lang);
}
function lessonSlot(r, S) {
  S.plan = ['L', 'MV', 'B1', 'R']; S.step = 0; S.newA = []; S.newB = [];
  r.UI.p = { path: true, lang: 'en' };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

function exhaustLegacy(r, S, lang = 'en') {
  for (const id of ['float', 'daynight', 'stones']) {
    S.lessonsSeen[id] = true;
    r.Core.L(lang).lessons[id] = { seen: 1, last: 1 };
  }
}

test('actual lesson step selects repka then more after the original lessons', async () => {
  const r=runtime(), S=session(r); exhaustLegacy(r,S); lessonSlot(r,S);
  for (const id of NEW) {
    S.step=0; r.Path.go();
    assert.equal(r.visits.at(-1).screen,'lesson');
    assert.equal(r.visits.at(-1).props.id,id);
    r.visits.at(-1).props.done(); await settle();
    assert.equal(S.lessonsSeen[id],true);
    assert.equal(r.visits.at(-1).screen,'pmove');
  }
});

test('actual completion queues each unseen end word once, excludes known/current-block words, and leaves SRS unchanged', async () => {
  for(const [id,word] of [['repka','n6'],['more','n3']]) for(const kind of ['unseen','queued','known','blockA','blockB']) {
    const r=runtime(), S=session(r); lessonSlot(r,S);
    if(kind==='queued') S.queue.push(word);
    if(kind==='known') r.Core.L('en').srs[word]={box:2,exposures:7};
    if(kind==='blockA') S.newA.push(word);
    if(kind==='blockB') S.newB.push(word);
    const before=plain(r.Core.L('en').srs);
    r.Path.lessonDone('en',id); await settle();
    assert.deepEqual(plain(S.queue),['unseen','queued'].includes(kind)?[word]:[],id+':'+kind);
    assert.equal(S.step,1); assert.equal(r.Core.save.stars,1);
    assert.equal(r.visits.at(-1).screen,'pmove');
    assert.deepEqual(plain(r.Core.L('en').srs),before);
    assert.deepEqual(r.srsWrites,[]);
    assert.deepEqual(r.persisted().langs.en.path.queue,plain(S.queue));
  }
});

test('actual B1 consumes queued lesson words before ordinary vocabulary into Meet without SRS writes', async () => {
  for(const [id,word] of [['repka','n6'],['more','n3']]) {
    const r=runtime(), S=session(r); lessonSlot(r,S);
    r.Path.lessonDone('en',id); await settle();
    S.step=2; r.Path.go();
    const visit=r.visits.at(-1);
    assert.equal(visit.screen,'pmeet'); assert.equal(visit.props.step,'B1');
    assert.equal(visit.props.words[0],word);
    assert.ok(visit.props.words.indexOf('ordinary')>0);
    assert.equal(S.queue.includes(word),false);
    assert.deepEqual(r.srsWrites,[]); assert.deepEqual(plain(r.Core.L('en').srs),{});
  }
});

test('a new session prioritizes and consumes queued lesson words without introducing them', () => {
  const r=runtime();
  r.Core.L('en').path={queue:['n6','n3','n6'],lessonsSeen:{}};
  const S=session(r);
  assert.deepEqual(plain(S.newA.slice(0,2)),['n6','n3']);
  assert.deepEqual(plain(S.queue),[]); assert.deepEqual(r.srsWrites,[]);
});

test('serialized selected lesson reload resumes the unchanged completion state and remains isolated by language', async () => {
  for(const chosen of NEW) {
    const r=runtime(), S=session(r); exhaustLegacy(r,S); lessonSlot(r,S);
    session(r,'de');
    if(chosen==='more') S.lessonsSeen.repka=true;
    const deBefore=plain(r.Core.L('de'));
    r.Path.go(); assert.equal(S.lessonId,chosen); r.Core.persist();
    const reload=runtime(r.persisted());
    assert.equal(reload.Path.ensure('en').lessonId,chosen);
    reload.Path.go(); assert.equal(reload.visits.at(-1).props.id,chosen);
    reload.visits.at(-1).props.done(); await settle();
    assert.deepEqual(plain(reload.Core.L('de')),deBefore);
    assert.equal(reload.Core.save.stars,1);
    reload.Core.lang='de'; reload.UI.p={path:true,lang:'de'};
    const de=reload.Path.session('de'); lessonSlot(reload,de); reload.UI.p={path:true,lang:'de'};
    reload.Path.go(); assert.equal(reload.visits.at(-1).props.id,'float');
  }
});
