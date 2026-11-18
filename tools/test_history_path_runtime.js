'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
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

test('actual nextLesson exhausts all six history lessons in order with completed-domain interleaving', () => {
  const r = runtime(), S = session(r), progression = [];
  exhaustLegacy(r, S);
  for (let tick = 10; tick < 40; tick++) {
    const id = r.Path.nextLesson(S, 'en');
    if (!id) break;
    progression.push(id);
    S.lessonsSeen[id] = true;
    S.lastLessonDomain = r.data.lessons[id].domain;
    r.Core.L('en').lessons[id] = { seen: 1, last: tick };
  }
  assert.deepEqual(progression.filter(id => HISTORY.includes(id)), HISTORY);
  assert.equal(progression.length, 11, 'five non-history replays separate six history lessons');
  progression.forEach((id, i) => {
    if (i && HISTORY.includes(id)) assert.ok(!HISTORY.includes(progression[i - 1]));
  });
  assert.equal(r.Path.nextLesson(S, 'en'), null, 'fully exhausted scheduler has no new lesson');
});

test('old saves derive the previous domain from the newest per-language completion record', () => {
  const r = runtime(), S = session(r);
  exhaustLegacy(r, S);
  delete S.lastLessonDomain;
  S.lessonsSeen.hist_castle = true;
  r.Core.L('en').lessons.hist_castle = { seen: 1, last: 100 };
  assert.equal(r.Path.nextLesson(S, 'en'), 'float');
  r.Core.L('en').lessons.float.last = 101;
  assert.equal(r.Path.nextLesson(S, 'en'), 'hist_tiles');
});

test('lesson selection and completion remain isolated by language', async () => {
  const r = runtime(), en = session(r, 'en'), de = session(r, 'de');
  exhaustLegacy(r, en);
  lessonSlot(r, en);
  const beforeDe = plain(r.Core.L('de'));
  assert.equal(r.Path.nextLesson(en, 'en'), 'hist_castle');
  assert.equal(r.Path.nextLesson(de, 'de'), 'float');
  r.Path.lessonDone('en', 'hist_castle');
  await settle();
  assert.deepEqual(plain(r.Core.L('de')), beforeDe);
  assert.equal(en.lessonsSeen.hist_castle, true);
  assert.deepEqual(plain(en.queue), ['castle']);
  assert.equal(r.Path.nextLesson(de, 'de'), 'float');
});

test('lessonDone queues an unseen end word once and excludes known words and both current blocks', async () => {
  for (const scenario of ['unseen', 'queued', 'known', 'blockA', 'blockB']) {
    const r = runtime(), S = session(r);
    lessonSlot(r, S);
    if (scenario === 'queued') S.queue.push('castle');
    if (scenario === 'known') r.Core.L('en').srs.castle = { box: 2, exposures: 7 };
    if (scenario === 'blockA') S.newA.push('castle');
    if (scenario === 'blockB') S.newB.push('castle');
    const srsBefore = plain(r.Core.L('en').srs);
    S.lessonId = 'hist_castle';
    r.Path.lessonDone('en', 'hist_castle');
    await settle();
    assert.deepEqual(plain(S.queue), ['unseen', 'queued'].includes(scenario) ? ['castle'] : [], scenario);
    assert.equal(S.lessonsSeen.hist_castle, true, scenario);
    assert.equal(S.lastLessonDomain, 'history', scenario);
    assert.equal(S.lessonId, null, scenario);
    assert.equal(S.step, 1, 'completion advances the actual lesson step to movement');
    assert.equal(r.Core.save.stars, 1, 'actual finishStep requests one star through the Core double');
    assert.equal(r.visits.at(-1).screen, 'pmove');
    assert.deepEqual(plain(r.Core.L('en').srs), srsBefore, scenario);
    assert.deepEqual(r.srsWrites, [], 'completion does not introduce the end word');
    assert.deepEqual(r.persisted().langs.en.path.queue, plain(S.queue));
  }
});

test('pickNew prioritizes queued unseen words without SRS exposure mutations; newSession consumes selections', () => {
  const r = runtime();
  r.Core.L('en').srs.book = { box: 3, exposures: 9 };
  const initialSrs = plain(r.Core.L('en').srs);
  assert.deepEqual(plain(r.Path.pickNew('en', 2, ['ship'], ['book', 'castle', 'castle', 'ship', 'doll'])), ['castle', 'doll']);
  r.Core.L('en').path = { queue: ['castle', 'doll'], lessonsSeen: {} };
  const S = session(r);
  assert.deepEqual(plain(S.newA.slice(0, 2)), ['castle', 'doll']);
  assert.deepEqual(plain(S.queue), []);
  assert.deepEqual(plain(r.Core.L('en').srs), initialSrs);
  assert.deepEqual(r.srsWrites, []);
});

test('selected lesson survives serialized save reload and resumes the same lesson without reselection', () => {
  const r = runtime(), S = session(r);
  exhaustLegacy(r, S);
  lessonSlot(r, S);
  r.Path.go();
  assert.equal(r.visits.at(-1).props.id, 'hist_castle');
  assert.equal(S.lessonId, 'hist_castle');
  // A changed domain would choose a replay if the persisted selection were ignored.
  S.lastLessonDomain = 'history';
  assert.equal(r.Path.nextLesson({ ...S, lessonId: null }, 'en'), 'float');
  r.Core.persist();
  const saved = r.persisted();
  assert.equal(saved.langs.en.path.lessonId, 'hist_castle');
  const reload = runtime(saved);
  assert.equal(reload.Path.ensure('en').lessonId, 'hist_castle');
  reload.Path.go();
  assert.equal(reload.visits.at(-1).screen, 'lesson');
  assert.equal(reload.visits.at(-1).props.id, 'hist_castle');
  assert.equal(reload.Core.save.stars, 0, 'resuming selection pays no completion reward');
});
