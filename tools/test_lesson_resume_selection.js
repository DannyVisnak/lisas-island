'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(process.env.LISA_SOURCE_ROOT || path.join(__dirname, '..'), file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const HISTORY = ['hist_castle', 'hist_tiles', 'hist_tram', 'hist_ship', 'hist_doll', 'hist_print'];

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
    curLang: () => 'en', today: () => 20000,
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
  r.data.order.filter(id => !HISTORY.includes(id)).forEach((id, i) => {
    S.lessonsSeen[id] = true;
    r.Core.L(lang).lessons[id] = { seen: 1, last: i + 1 };
  });
}


test('already-seen interleaving replay remains selected after recency changes and serialized reload',()=>{
 const r=runtime(),S=session(r);exhaustLegacy(r,S);S.lastLessonDomain='history';lessonSlot(r,S);r.Path.go();
 assert.equal(r.visits.at(-1).props.id,'float');assert.equal(S.lessonId,'float');
 r.Core.L('en').lessons.float.last=1000;assert.equal(r.Path.nextLesson(S,'en'),'float');r.Core.persist();
 const reload=runtime(r.persisted());reload.Path.go();assert.equal(reload.visits.at(-1).props.id,'float');assert.equal(reload.Core.save.stars,0);
});
test('valid cached replay survives a fully seen catalogue; uncached exhaustion returns null',()=>{
 const r=runtime(),S=session(r);r.data.order.forEach(id=>{S.lessonsSeen[id]=true;r.Core.L('en').lessons[id]={seen:1,last:1};});
 S.lessonId='float';assert.equal(r.Path.nextLesson(S,'en'),'float');S.lessonId=null;assert.equal(r.Path.nextLesson(S,'en'),null);
});
test('unknown prototype and removed cached IDs fall back to a valid available lesson',()=>{
 for(const id of ['missing','toString','__proto__','float']) {const r=runtime(),S=session(r);S.lessonId=id;if(id==='float')r.data.order=r.data.order.filter(x=>x!=='float');assert.equal(r.Path.nextLesson(S,'en'),id==='float'?'daynight':'float');}
});
test('completed selected replay clears its cache and preserves language isolation and reward guard',async()=>{
 const r=runtime(),S=session(r);exhaustLegacy(r,S);S.lessonId='float';lessonSlot(r,S);const beforeDe=plain(r.Core.L('de'));
 r.Path.lessonDone('en','float');await settle();assert.equal(S.lessonId,null);assert.equal(S.step,1);assert.equal(r.Core.save.stars,1);assert.deepEqual(plain(r.Core.L('de')),beforeDe);
 S.step=0;r.Path.finishStep(r.UI.flow);await settle();assert.equal(r.Core.save.stars,1);assert.equal(S.step,1);assert.equal(new Set(S.queue).size,S.queue.length);
});
