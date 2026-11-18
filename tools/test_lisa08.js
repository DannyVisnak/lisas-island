'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function boot(saved) {
  let stored = saved && JSON.stringify(saved);
  const c = { console, Date, Math, Promise, setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    document: { hidden: false, addEventListener() {} }, Lisa: { ico: {} }, UI: { screens: {}, p: {}, makeSeq: (ids, n) => Array.from({length:n}, (_,i) => ids[i % ids.length]), go(screen,p) { this.last = {screen,p}; } } };
  c.window = c; c.localStorage = { getItem: () => stored, setItem: (key, value) => { stored = value; } };
  vm.createContext(c);
  for (const file of ['app/js/data.js','app/js/core.js','app/js/path.js']) vm.runInContext(read(file), c, { filename:file });
  c.reload = () => { c.Core.flushNow(); return boot(JSON.parse(stored)); };
  return c;
}
test('fresh age six defaults, A+B planning and active cap survive reload', () => {
  let c=boot();
  assert.equal(c.Core.save.settings.ageYears,6);
  assert.equal(c.Core.save.settings.pathSmall,false);
  assert.equal(c.Core.save.settings.sessionMin,15);
  assert.equal(c.Path.capMs(),900000);
  const s=c.Path.newSession('pt'); assert.equal(s.newA.length,4); assert.ok(s.plan.includes('B1'));
  s.step=s.plan.indexOf('B1'); c.Path.go(); assert.equal(s.newB.length,4); assert.equal(new Set([...s.newA,...s.newB]).size,8);
  s.playedMs=899999; assert.equal(c.Path.shouldStop(s),false);
  s.playedMs=900000; assert.equal(c.Path.shouldStop(s),true); c.Path.go(); assert.equal(c.UI.last.screen,'pritual');
  c=c.reload(); assert.equal(c.Core.save.settings.ageYears,6); assert.equal(c.Path.capMs(),900000);
});
test('legacy age migration preserves manual overrides and all learning/reward/session data', () => {
  const seed=plain(boot().Core.save); delete seed.settings.ageYears; seed.settings.pathSmall=true; seed.settings.sessionMin=20;
  seed.stars=29; seed.xp=46; seed.hats={unlocked:['hat'],worn:['hat']}; seed.house={stage:2,gifts:1,owned:['bed'],placed:{bed:'left'},reviewDay:5};
  seed.langs.pt={words:{cat:{box:3,fc:3,last:123,due:124,heard:8}},levels:{a:2},last:123,path:{day:'2026-11-17',step:2,plan:['A1','A2','R'],newA:['cat'],cc:{cat:3},paid:{A1:true}}};
  let c=boot(seed); assert.equal(c.Core.save.settings.ageYears,6); assert.equal(c.Core.save.settings.pathSmall,true); assert.equal(c.Core.save.settings.sessionMin,20);
  for(const key of ['langs','stars','xp','hats']) assert.deepEqual(plain(c.Core.save[key]),seed[key]);
  assert.deepEqual(plain(c.Core.save.house),Object.assign({},seed.house,{look:{}}));
  const before=plain(c.Core.save); c=c.reload(); assert.deepEqual(plain(c.Core.save),before);
  for(const age of [null,2,7,3.5,'4']) { const bad=plain(seed); bad.settings.ageYears=age; assert.equal(boot(bad).Core.save.settings.ageYears,6); }
});
test('age profiles apply only on changed explicit selection; overrides and existing plan persist', () => {
  let c=boot(); const s=c.Path.newSession('pt'), before=plain(s);
  assert.equal(c.Core.applyAgeProfile(3),true); assert.equal(c.Core.save.settings.pathSmall,true); assert.equal(c.Core.save.settings.sessionMin,15);
  c.Core.save.settings.pathSmall=false; c.Core.save.settings.sessionMin=10;
  assert.equal(c.Core.applyAgeProfile(3),false); c=c.reload(); assert.equal(c.Core.save.settings.pathSmall,false); assert.equal(c.Core.save.settings.sessionMin,10); assert.deepEqual(plain(c.Path.session('pt')),before);
  assert.equal(c.Core.applyAgeProfile(4),true); assert.equal(c.Core.save.settings.pathSmall,true);
  assert.equal(c.Core.applyAgeProfile(5),true); assert.equal(c.Core.save.settings.pathSmall,false);
  assert.equal(c.Core.applyAgeProfile(6),true); assert.equal(c.Core.applyAgeProfile(99),false);
});
test('real cross-day answers progress 2/3/4; same-day/help do not promote; cache survives errors and reload', () => {
  let c=boot(); const id=c.Core.D.worlds[0].items[0], lang='pt';
  const expected=[2,2,2,3,3,3,4];
  for(let day=0;day<=6;day++) {
    assert.equal(c.Core.SRS.choiceCount(lang,id),expected[day]);
    if(day===6) break;
    c.Core.dayShift=day; c.Core.SRS.answer(lang,id,true); const fc=c.Core.SRS.w(lang,id).fc;
    c.Core.SRS.answer(lang,id,true); c.Core.SRS.touch(lang,id); assert.equal(c.Core.SRS.w(lang,id).fc,fc);
  }
  c.Path.newSession(lang); assert.equal(c.Path.choices(lang,id),4); c.Core.SRS.answer(lang,id,false); c.Core.SRS.w(lang,id).fc=0;
  assert.equal(c.Path.choices(lang,id),4); c=c.reload(); assert.equal(c.Path.choices(lang,id),4);
});
test('ordinary path fallbacks and catch-up use ladder while warmup stays two', () => {
  const c=boot(), lang='pt', s=c.Path.newSession(lang); const id=s.newA[0];
  for(const step of ['A3','B1','B3']) {
    s.step=s.plan.indexOf(step); c.Path.go(); assert.equal(c.UI.last.screen,'plisten'); assert.equal(c.UI.last.p.fixed,undefined,step+' does not force three');
  }
  s.warm=[id]; s.step=0; c.Path.go(); assert.equal(c.UI.last.p.fixed,2);
});
test('Run daily gate uses session cached ladder; freeplay retains adaptive choices', async () => {
  const c=boot(), lang='pt', id=c.Core.D.worlds[0].items[0]; c.Path.newSession(lang); c.Core.SRS.w(lang,id).fc=6; c.Path.choices(lang,id); c.Core.SRS.w(lang,id).fc=0;
  const src=read('app/js/run.js'); const fn=src.slice(src.indexOf('async function openGate(g)'),src.indexOf('  /* ----- simulation ----- */'));
  const node=()=>({classList:{add(){},remove(){}},appendChild(){},remove(){}});
  Object.assign(c,{S:{ad:{n:3,recent:[],streak:0},parts:[],gi:0,mistakes:0},lang,pool:c.Core.D.worlds[0].items,maxN:4,inPath:true,el:node,root:node(),sp:node(),flow:{wait:async()=>{}},gates:[],hud:{set(){}},Snd:{sfx(){}},requestAnimationFrame:fn=>fn(),Q:{ask:async(f,h,p)=>{c.asked=p.choices;return {first:true};}}});
  c.UI.speakerBtn=node; c.UI.helpBtn=node; const open=vm.runInContext('('+fn+')',c);
  await open({target:id}); assert.equal(c.asked.length,4);
  c.inPath=false; await open({target:id}); assert.equal(c.asked.length,3);
});
function domNode(tag) {
  const n={tagName:tag,children:[],dataset:{},style:{},events:{},className:'',innerHTML:'',appendChild(child){this.children.push(child); child.parentNode=this;return child;},addEventListener(ev,fn){this.events[ev]=fn;},get firstChild(){return this.children[0] || {style:{}};},querySelectorAll(sel){const cls=sel.slice(1);return this.children.flatMap(child=>[...(child.className.split(' ').includes(cls)?[child]:[]),...child.querySelectorAll(sel)]);}};
  n.classList={contains:cls=>n.className.split(' ').includes(cls),add(cls){if(!this.contains(cls)) n.className+=' '+cls;},remove(cls){n.className=n.className.split(' ').filter(c=>c!==cls).join(' ');},toggle(cls,on){if(on===undefined)on=!this.contains(cls);if(on)this.add(cls);else this.remove(cls);}};
  return n;
}
test('actual parent numeric age control updates profile and selected values; same selection retains overrides', () => {
  const c=boot(); c.Core.save.settings.baseLang='en'; c.document.createElement=domNode; c.UI.scene=()=>{};
  vm.runInContext(read('app/js/parent.js'),c);
  const render=()=>{const root=domNode('root');c.UI.screens.parent({},root,{});return root;};
  const find=(root,key)=>{const walk=n=>n.dataset.setting===key?n:n.children.map(walk).find(Boolean);return walk(root);};
  let root=render(), row=find(root,'ageYears'); assert.ok(row,'parent Age control exists');
  let buttons=row.querySelectorAll('.pseg-b'); assert.equal(buttons.find(b=>b.classList.contains('sel')).dataset.v,6);
  buttons[0].events.click({stopPropagation(){}}); assert.equal(c.Core.save.settings.ageYears,3); assert.equal(c.Core.save.settings.pathSmall,true); assert.equal(c.UI.last.screen,'parent');
  c.Core.save.settings.sessionMin=20;c.Core.save.settings.pathSmall=false;root=render();row=find(root,'ageYears');row.querySelectorAll('.pseg-b')[0].events.click({stopPropagation(){}});
  assert.equal(c.Core.save.settings.sessionMin,20); assert.equal(c.Core.save.settings.pathSmall,false);
  assert.equal(c.reload().Core.save.settings.ageYears,3);
  assert.equal(c.Core.save.settings.baseLang,'en','age selection preserves English base language');
  assert.equal(c.reload().Core.save.settings.baseLang,'en','both settings survive reload');
});
test('Listen and tap receives the real cached per-word ladder; warm-up remains fixed', async () => {
  const c=boot(),lang='pt',s=c.Path.newSession(lang), id=s.newA[0];let config;
  c.Core.save.settings.ruHelp=false;s.said=true;c.UI.chrome=()=>({});c.UI.runQuestions=async(f,ctx,p)=>{config=p;};c.Path.finishStep=()=>{};
  const flow={wait:async()=>{},say:async()=>{}};
  for(const [fc,count] of [[0,2],[2,2],[3,3],[5,3],[6,4]]) {
    s.cc={};c.Core.SRS.w(lang,id).fc=fc;c.UI.screens.plisten(flow,{}, {lang,words:[id]});await new Promise(setImmediate);
    assert.equal(config.fixed,0);assert.equal(config.choiceFor(id),count);
  }
  c.UI.screens.plisten(flow,{}, {lang,words:[id],fixed:2});await new Promise(setImmediate);assert.equal(config.fixed,2);assert.equal(config.choiceFor,null);
});
test('small distractor pools return unique valid cards without padding',()=>{
  const c=boot(); const ids=c.Core.D.worlds[0].items.slice(0,2);const items=Object.fromEntries(ids.map(id=>[id,c.Core.item(id)]));
  c.Core.D.items=items;c.Core.D.worlds=[{id:items[ids[0]].world,items:ids}];
  const cards=c.Core.choices('pt',ids[0],4,ids.concat(ids));assert.equal(cards.length,2);assert.equal(new Set(cards).size,2);assert.ok(cards.includes(ids[0]));
});
