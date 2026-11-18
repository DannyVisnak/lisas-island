'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Rules=new Proxy(require('../app/js/letter_rules'),{get(o,k){assert.equal(typeof o[k],'function','Missing letter rule '+k);return o[k];}});
const rows=fs.readFileSync(path.join(__dirname,'../content/vocab.tsv'),'utf8').split('\n').filter(x=>x&&!x.startsWith('#')).map(x=>x.split('\t'));
const vocab=Object.fromEntries(rows.map(r=>[r[1],{pt:{word:r[4]}}]));
const words=Object.fromEntries(rows.slice(0,24).map(r=>[r[1],{box:3}]));for(const id of ['duck','yellow','apple','egg','milk','cow'])words[id]={box:3};
const assets=Object.fromEntries(['p','a','m','o','l','v'].map(k=>[k,{approved:true,available:true,reviewer:'native-review-fixture'}]));
const options=(extra={})=>({sessionId:'s1',day:100,lang:'pt',enabled:true,wordsByLang:{pt:words},vocab,assets,progress:Rules.progress(),remainingMs:120000,basePlan:['warm','A1','A2','A3','L','MV','B1','B2','B3','R'],...extra});
const selected=(extra={})=>Rules.selectSession(options(extra));
function advanceToPhysical(e){for(const event of [{type:'continue'},{type:'continue'},{type:'choice',letter:e.mapping.lower},{type:'touch'},{type:'screenKey',letter:e.mapping.upper}])e=Rules.advance(e,event);return e;}
test('metadata uses verified familiar nouns and highlights noun initials rather than articles',()=>{
 const list=Rules.mappings(vocab);assert.deepEqual(list.map(x=>x.lower),['p','a','m','o','l','v']);
 for(const m of list){assert.equal(m.label,vocab[m.anchor].pt.word);assert.equal(m.label.slice(m.target.start,m.target.end),m.lower);assert.equal(m.noun[0],m.lower);assert.equal(m.code,'Key'+m.upper);}
 assert.equal(list.find(x=>x.lower==='m').noun,'maçã');assert.throws(()=>Rules.mappings({...vocab,duck:{pt:{word:'different'}}}));
});
test('valid PT content with box3 determines exact20 gate, independent from hears, foreign words and invalid IDs',()=>{
 const valid=rows.slice(0,20).map(r=>r[1]),nineteen=Object.fromEntries(valid.slice(0,19).map(id=>[id,{box:3,heard:99}]));
 assert.equal(Rules.countKnown(vocab,nineteen),19);assert.equal(Rules.countKnown(vocab,{...nineteen,missing:{box:5}}),19);
 assert.equal(Rules.countKnown(vocab,{...nineteen,[valid[19]]:{box:1,heard:999}}),19);assert.equal(Rules.countKnown(vocab,{...nineteen,[valid[19]]:{box:3}}),20);
 assert.equal(selected({wordsByLang:{pt:nineteen,de:words}}).kind,'normal');assert.equal(selected({lang:'de'}).kind,'normal');
});
test('flags, unavailable review assets, small/review plans, caps and insufficient reserve keep normal words usable',()=>{
 for(const change of [{enabled:false},{small:true},{reviewOnly:true},{earlyStop:true},{remainingMs:119999},{assets:{}},{wordsByLang:{pt:{}}}])assert.equal(selected(change).kind,'normal');
 const bad={...assets,p:{approved:false,available:true,reviewer:'x'}};assert.equal(selected({assets:bad}).mapping.lower,'a');
 const noAnchor={...words};delete noAnchor.duck;assert.equal(selected({wordsByLang:{pt:noAnchor}}).mapping.lower,'a');
 const plan=selected();assert.deepEqual(plan.plan,['warm','A1','A2','A3','L','MV','LETTER','R']);
});
test('cached session selection is stable after known-word changes and six initial mappings advance in queue order',()=>{
 let p=Rules.progress(),seen=[];
 for(let i=0;i<6;i++){
  const plan=selected({sessionId:'s'+i,day:100+i*7,progress:p});seen.push(plan.mapping.lower);
  const cached=Rules.selectSession(options({sessionId:'s'+i,day:100+i*7,progress:p,wordsByLang:{pt:{}},assets:{},cached:plan}));assert.deepEqual(cached,plan);
  let e=Rules.createEncounter(plan,{physicalEnabled:false});e=Rules.advance(e,{type:'continue'});p=Rules.recordIntroduction(p,e);e=Rules.advance(e,{type:'continue'});e=Rules.advance(e,{type:'choice',letter:e.mapping.lower});e=Rules.advance(e,{type:'touch'});e=Rules.advance(e,{type:'screenKey',letter:e.mapping.upper});assert(e.done);p=Rules.recordCompletion(p,e);
 }
 assert.deepEqual(seen,['p','a','m','o','l','v']);assert.equal(selected({day:200,progress:p}).kind,'normal');
});
test('introduction records enforce one per played day and two per rolling7days without duplicate exposure',()=>{
 let p=Rules.progress();const plan=selected(),e=Rules.advance(Rules.createEncounter(plan),{type:'continue'});p=Rules.recordIntroduction(p,e);assert.equal(Rules.recordIntroduction(p,e),p);
 assert.equal(selected({sessionId:'extra',progress:p}).kind,'normal');assert.equal(selected({day:101,progress:p}).mapping.lower,'a');
 const next=selected({sessionId:'next',day:101,progress:p});p=Rules.recordIntroduction(p,Rules.advance(Rules.createEncounter(next),{type:'continue'}));
 assert.equal(selected({day:106,progress:p}).kind,'normal');assert.equal(selected({day:107,progress:p}).mapping.lower,'m');
});
test('resumption preserves mapping/help/substep; two uncertain choices assist and touch completes equivalently without SRS/reward mutation',()=>{
 const original={stars:9,words:{duck:{box:4}},custom:{keep:true}},p=Rules.progress(original);let e=Rules.createEncounter(selected());
 e=Rules.advance(e,{type:'continue'});e=Rules.advance(e,{type:'continue'});e=Rules.advance(e,{type:'choice',letter:'m'});assert.equal(e.step,'choice');
 e=Rules.restoreEncounter(JSON.parse(JSON.stringify(e)));assert.equal(e.mapping.lower,'p');assert.equal(e.attempts,1);e=Rules.advance(e,{type:'choice',letter:'m'});assert.equal(e.step,'formation');assert(e.helped);
 e=Rules.advance(e,{type:'touch'});e=Rules.advance(e,{type:'screenKey',letter:'P'});e=Rules.advance(e,{type:'touch'});assert(e.done);
 const after=Rules.recordCompletion(p,e);assert.equal(Rules.recordCompletion(after,e),after);assert.equal(after.stars,9);assert.deepEqual(after.words,original.words);assert.deepEqual(original,{stars:9,words:{duck:{box:4}},custom:{keep:true}});assert.equal(Rules.advance(e,{type:'touch'}),e);
});
test('physical input matches code across Russian layouts, requires release and ignores held/repeat/composition/shortcuts',()=>{
 const base=advanceToPhysical(Rules.createEncounter(selected()));assert.equal(base.step,'physicalKey');
 for(const event of [{type:'keydown',code:'KeyM',key:'p'},{type:'keydown',code:'KeyP',key:'з',repeat:true},{type:'keydown',code:'KeyP',isComposing:true},{type:'keydown',code:'KeyP',ctrlKey:true},{type:'keydown',code:'KeyP',altKey:true},{type:'keydown',code:'KeyP',metaKey:true},{type:'keyup',code:'KeyP'}])assert.equal(Rules.keyboard(base,event),base);
 let e=Rules.keyboard(base,{type:'keydown',code:'KeyP',key:'З',shiftKey:true});assert(!e.done);assert.equal(Rules.keyboard(e,{type:'keydown',code:'KeyP',repeat:true}),e);assert.equal(Rules.keyboard(e,{type:'keyup',code:'KeyM'}),e);
 const restored=Rules.restoreEncounter(JSON.parse(JSON.stringify(e)));assert.equal(Rules.keyboard(restored,{type:'keyup',code:'KeyP'}),restored,'reload requires fresh press');
 e=Rules.keyboard(e,{type:'keyup',code:'KeyP',key:'з'});assert(e.done);assert(e.usedPhysical);assert.equal(Rules.keyboard(e,{type:'keyup',code:'KeyP'}),e);
});
test('cached PT encounter cannot leak into another target language or overwrite its letter record',()=>{
 const cached=selected();assert.equal(selected({lang:'de',cached}).kind,'normal');assert.throws(()=>Rules.progress({lang:'de',completed:['keep']}),/language/);
});
test('explicit help persists independently and completion records separate observed locations without mastery claims',()=>{
 let e=Rules.createEncounter(selected(),{physicalEnabled:false});e=Rules.advance(e,{type:'continue'});e=Rules.advance(e,{type:'help'});assert(e.helped);
 e=Rules.restoreEncounter(JSON.parse(JSON.stringify(e)));e=Rules.advance(e,{type:'continue'});e=Rules.advance(e,{type:'choice',letter:'p'});e=Rules.advance(e,{type:'trace'});e=Rules.advance(e,{type:'screenKey',letter:'P'});
 const p=Rules.recordCompletion(Rules.progress(),e);assert.equal(p.observations.p.helped,true);assert.equal(p.observations.p.soundSelectionUnhelped,false);assert.equal(p.observations.p.screenKeyLocated,true);assert.equal(p.observations.p.physicalKeyLocated,false);assert.equal(p.observations.p.formation,'trace');assert.equal(p.observations.p.mastered,undefined);
});
test('all six code positions accept Russian layout values and malformed letter inputs do not advance',()=>{
 const list=Rules.mappings(vocab),keys=['з','ф','ь','щ','д','м'];
 for(let i=0;i<list.length;i++){let e=advanceToPhysical(Rules.createEncounter({...selected(),mapping:list[i]}));e=Rules.keyboard(e,{type:'keydown',code:list[i].code,key:keys[i]});e=Rules.keyboard(e,{type:'keyup',code:list[i].code,key:keys[i]});assert(e.done);}
 let e=Rules.createEncounter(selected());e=Rules.advance(e,{type:'continue'});e=Rules.advance(e,{type:'continue'});assert.equal(Rules.advance(e,{type:'choice'}),e);assert.equal(Rules.advance(e,{type:'choice',letter:7}),e);
});
test('classic-script module loads without DOM, clocks, storage or audio dependencies',()=>{
 const vm=require('node:vm'),context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/js/letter_rules.js'),'utf8'),context);assert.equal(typeof context.LetterRules.selectSession,'function');assert.equal(context.LetterRules.countKnown(vocab,words),Rules.countKnown(vocab,words));assert.equal(context.document,undefined);
});
test('every fixed metadata field is validated at cache, creation and resume boundaries',()=>{
 const valid=selected(),original=Rules.createEncounter(valid);
 const changes=[{upper:'Z'},{code:'KeyZ'},{variant:'wrong'},{anchor:'missing'},{lang:'de'},{locale:'de-DE'},{noun:'other'},{label:'o other'},{target:{start:0,end:1}},{nounSpan:{start:0,end:6}}];
 for(const change of changes){
  const mapping={...valid.mapping,...change},corrupt={...valid,mapping};
  assert.throws(()=>selected({cached:corrupt}),/mapping/,'cache rejects '+JSON.stringify(change));
  assert.throws(()=>Rules.createEncounter(corrupt),/mapping/,'creation rejects '+JSON.stringify(change));
  assert.throws(()=>Rules.restoreEncounter({...original,mapping}),/mapping/,'resume rejects '+JSON.stringify(change));
 }
 const incomplete={...valid,mapping:{lower:'p'}};assert.throws(()=>selected({cached:incomplete}),/mapping/);assert.throws(()=>Rules.createEncounter(incomplete),/mapping/);
 assert.throws(()=>selected({cached:{...valid,plan:['LETTER','LETTER']}}),/plan/);
 assert.deepEqual(selected({cached:valid,wordsByLang:{pt:{}},assets:{},remainingMs:0}),valid,'valid chosen mapping survives current eligibility/cap changes');
});
