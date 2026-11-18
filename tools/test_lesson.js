'use strict';
// Real Core, real Flow, real Lesson.play and real lesson data. Only DOM/art/audio I/O is adapted.
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
class Node {
 constructor(){this.children=[];this.parentNode=null;this.style={};this.dataset={};this.className='';this.events={};this.classes=new Set();this.classList={add:(...cs)=>cs.forEach(c=>this.classes.add(c)),remove:(...cs)=>cs.forEach(c=>this.classes.delete(c)),contains:c=>this.classes.has(c)||this.className.split(' ').includes(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
 appendChild(n){n.parentNode=this;this.children.push(n);return n;}
 removeChild(n){this.children.splice(this.children.indexOf(n),1);n.parentNode=null;}
 get childNodes(){return this.children;}
 get isConnected(){return this.root||!!(this.parentNode&&this.parentNode.isConnected);}
 setAttribute(){} addEventListener(k,fn){(this.events[k] ||= []).push(fn);} dispatchEvent(e){e.preventDefault ||=()=>{};e.stopPropagation ||=()=>{};for(const fn of this.events[e.type]||[])fn(e);}
 querySelectorAll(sel){let out=[];for(const n of this.children){if(n.classList.contains(sel.slice(1)))out.push(n);out=out.concat(n.querySelectorAll(sel));}return out;}
}
function harness({help=true,base='ru',lang='pt',missing=false}={}) {
 let now=1000,seq=0,callbacks=0,saved=null;const timers=new Map(),played=[],preloaded=[],animations=[],errors=[],waits=[];
 const later=(fn,ms,repeat)=>{const id=++seq;timers.set(id,{fn,at:now+ms,repeat});return id;};
 class ClockDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const root=new Node();root.root=true;const document={body:new Node(),hidden:false,createElement:()=>new Node(),addEventListener(){}};
 const context={window:{localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v}},document,Date:ClockDate,console:{error:(...a)=>errors.push(a.join(' ')),warn:(...a)=>errors.push(a.join(' '))},setTimeout:(f,ms)=>later(f,ms||0),setInterval:(f,ms)=>later(f,ms,ms),clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),PointerEvent:class{constructor(type,props){this.type=type;Object.assign(this,props);}}};
 vm.createContext(context);for(const file of ['data','core','lessons_data'])vm.runInContext(fs.readFileSync('app/js/'+file+'.js','utf8'),context);
 const C=context.Core=context.window.Core;context.LESSON_DATA=context.window.LESSON_DATA;C.save.settings.ruHelp=help;C.save.settings.baseLang=base;C.lang=lang;C.shuffle=a=>a.slice();
 // The generated EN inventory may still be awaiting parent TTS; model actual available clips explicitly.
 C.D.uiAudio={ru:Object.keys(C.D.ui.ru),en:Object.keys(C.D.ui.en)};
 for(const b of ['ru','en'])for(const k of Object.keys(C.D.ui[b]))C.Snd.cache['audio/ui/'+b+'_'+k+'.ogg']={duration:1};
 C.Snd.preload=url=>preloaded.push(url);C.Snd.say=async list=>{played.push(Array.from(list));C.Snd.token++;C.Snd.chainTok=C.Snd.token;return !missing;};C.Snd.busy=()=>false;C.Snd.sfx=()=>{};C.Snd.unlock=()=>{};C.Pic.el=()=>new Node();
 const records=C.save.langs;let persisted=0;const persist=C.persist;C.persist=()=>{persisted++;persist();};
 const originalWait=C.Flow.prototype.wait;C.Flow.prototype.wait=function(ms){waits.push({ms,line:context.window.__lessonTest?.state().lineKey});return originalWait.call(this,ms);};
 const scenes={};for(const def of Object.values(context.LESSON_DATA.lessons))scenes[def.scene]=()=>({act:new Proxy({}, {get:(_,name)=>()=>{animations.push({name,at:now});return new Promise(r=>later(r,60));}}),tile:()=>new Node()});
 context.LessonArt=context.window.LessonArt={scenes,stage:()=>({lisa:{pose(){}},set(){},dispose(){}})};
 vm.runInContext(fs.readFileSync('app/js/lesson.js','utf8'),context);const Lesson=context.window.Lesson;
 let h;function start(id){h=Lesson.play(id,root,ok=>{if(ok)callbacks++;},{lang});return h;}
 async function tick(){for(let i=0;i<30;i++)await Promise.resolve();const first=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!first)return false;const [id,t]=first;now=t.at;if(t.repeat)t.at+=t.repeat;else timers.delete(id);t.fn();for(let i=0;i<30;i++)await Promise.resolve();return true;}
 async function until(fn,limit=2500){for(let i=0;i<limit;i++){for(let j=0;j<30;j++)await Promise.resolve();if(fn())return;await tick();}assert.fail('virtual scheduler exhausted: '+JSON.stringify(h?.state())+' errors='+errors);}
 async function finish(pick=0){await until(()=>{if(h.state().promptOpen)context.window.__lessonTest.tapChoice(pick);return h.state().done;});assert.deepEqual(errors,[]);}
 function renderParent(){context.UI={screens:{},scene(){},go(){}};context.Path={sleeping:()=>false};vm.runInContext(fs.readFileSync('app/js/parent.js','utf8'),context);const parentRoot=new Node();parentRoot.root=true;context.UI.screens.parent(new C.Flow(),parentRoot,{});return parentRoot;}
 return {C,Lesson,renderParent,data:context.LESSON_DATA,start,tick,until,finish,played,preloaded,animations,waits,records,errors,root,get callbacks(){return callbacks;},get persisted(){return persisted;},get saved(){return saved&&JSON.parse(saved);},get now(){return now;}};
}
for(const help of [false,true])for(const lang of ['pt','en','de'])for(const id of ['float','daynight','stones'])test(`${id} ${lang} help ${help?'ON':'OFF'} keeps completion and target audio`,async()=>{
 const r=harness({help,lang});const h=r.start(id);await r.finish(id==='float'?1:0);
 const word=r.Lesson.word(id),target='audio/'+lang+'/'+word+'.ogg';assert.equal(r.played.flat().filter(u=>u===target).length,2);assert.equal(r.records[lang].lessons[id].seen,1);assert.equal(r.callbacks,1);assert.equal(r.persisted,1);r.C.flushNow();assert.equal(r.saved.langs[lang].lessons[id].seen,1);assert.equal(r.saved.settings.ruHelp,help);assert.equal(h.state().wordPlays,2);assert.ok(h.state().picks.length>=1);assert.ok(r.animations.length>0);
 assert.ok(r.played.every(a=>a.length>0&&a.every(u=>u!=null)));assert.ok(r.preloaded.every(u=>u!=null),'no null preload calls');
 if(help)assert.ok(r.played.flat().some(u=>u==='audio/ui/ru_cs_check.ogg'));
 else {assert.deepEqual(r.preloaded,[target]);assert.ok(r.played.flat().every(u=>u===target));assert.ok(r.waits.some(w=>w.line==='cs_'+id+'_1'&&w.ms>=900),'silent first beat retains reading time');}
});
test('OFF replay and idle remain silent; pulse/automatic choice and target completion survive',async()=>{
 const r=harness({help:false});const h=r.start('float');await r.until(()=>h.state().promptOpen);const count=r.played.length;h.replay();assert.equal(r.played.length,count,'manual replay must not call audio with null');
 await r.until(()=>h.state().pulsed);assert.equal(h.state().repeated,false);assert.equal(r.played.length,count);await r.until(()=>h.state().picks.length===1);assert.equal(h.state().picks[0].auto,true);await r.finish();assert.equal(r.callbacks,1);
});
test('ON replay and once-only idle repeat use current base setting',async()=>{
 const r=harness({base:'en'});const h=r.start('daynight');await r.until(()=>h.state().promptOpen);const count=r.played.length;h.replay();await r.tick();assert.ok(r.played.length>count);assert.equal(r.played.at(-1)[0],'audio/ui/en_cs_daynight_4.ogg');
 r.C.save.settings.ruHelp=false;const offCount=r.played.length;h.replay();assert.equal(r.played.length,offCount);r.C.save.settings.ruHelp=true;await r.until(()=>h.state().pulsed);assert.equal(h.state().repeated,true);const repeats=r.played.length;await r.tick();assert.equal(r.played.length,repeats);await r.finish();
});
test('silent number cues remain ordered and await animation completion',async()=>{
 const r=harness({help:false,base:'en'});const h=r.start('stones');await r.finish();const hops=r.animations.filter(x=>/^hop\d+$/.test(x.name));assert.deepEqual(hops.map(x=>x.name),Array.from({length:10},(_,i)=>'hop'+(i+1)));for(let i=1;i<hops.length;i++)assert.ok(hops[i].at>hops[i-1].at);assert.ok(r.now>=hops.at(-1).at+60);assert.equal(h.state().cues,9);
});
test('enabled missing audio uses reading-time fallback; cancellation cannot record or finish',async()=>{
 const r=harness({missing:true});r.start('float');await r.finish();assert.ok(r.waits.some(w=>w.line==='cs_float_1'&&w.ms>=900));
 const c=harness({help:false});const h=c.start('stones');await c.until(()=>h.state().beat===1);const n=c.played.length;h.stop();for(let i=0;i<50;i++)await c.tick();assert.equal(c.played.length,n);assert.equal(c.callbacks,0);assert.equal(c.persisted,0);assert.equal(c.records.pt,undefined);
});

for(const [lang,id,kind] of [['pt','cat','masculine'],['pt','water','feminine'],['de','water','das'],['en','cat','neutral']])for(const subtitles of [true,false])test(`end card ${lang} ${kind} uses approved word component, subtitles ${subtitles}`,async()=>{
 const r=harness({help:false,lang});r.C.save.settings.subtitles=subtitles;r.data.lessons.float.word=id;
 const original=r.C.vocabLabelEl,calls=[];r.C.vocabLabelEl=function(...args){calls.push(args);return original.apply(this,args);};
 r.start('float');await r.finish();const cards=r.root.querySelectorAll('.ls-cardword');assert.equal(cards.length,1);const label=cards[0],info=r.C.vocabLabel(lang,r.C.item(id));
 assert.equal(calls.length,1,'end card must call the existing approved component');assert.equal(calls[0][0],lang);assert.equal(calls[0][1],r.C.item(id));assert.equal(calls[0][3],'ls-cardword','existing placement/style class preserved');
 const word=label.querySelectorAll('.vocab-word')[0];assert.ok(word,'approved word span exists');assert.equal(word.textContent,info.text,'article and noun unchanged');assert.equal(word.style.color,info.color,'same shared article colour policy');assert.equal(label.classList.contains('subtitles-off'),!subtitles);assert.equal(label.style.visibility==='hidden',!subtitles,'OFF keeps label space while hiding text');
});

test('parent progress uses same approved article policy in its existing span',()=>{
 const r=harness();for(const lang of ['pt','de','en'])for(const id of ['cat','water'])r.C.L(lang).words[id]={box:4};
 const root=r.renderParent();for(const more of root.querySelectorAll('.pmore'))more.dispatchEvent({type:'click'});
 const words=root.querySelectorAll('.pword');assert.equal(words.length,6);
 for(const lang of ['pt','de','en'])for(const id of ['cat','water']){const expected=r.C.vocabLabel(lang,r.C.item(id));assert.ok(words.some(w=>w.innerHTML.includes('<span style="color:'+expected.color+'">'+expected.text+'</span>')),'parent '+lang+'/'+id+' retains span and approved article colour');}
});

// Integration boundary: existing follow-on definitions run through the real merged engine.
const FOLLOWON=['repka','more','hist_castle','hist_tiles','hist_tram','hist_ship','hist_doll','hist_print'];
for(const id of FOLLOWON)for(const config of [{help:false,base:'ru'},{help:false,base:'en'},{help:true,base:'en'},{help:true,base:'en',missing:true}])test(`candidate ${id} ${config.base} help ${config.help} missing ${!!config.missing} completes with approved base narration`,async()=>{
 const r=harness(config), h=r.start(id);await r.finish();const word=r.Lesson.word(id),target='audio/pt/'+word+'.ogg';
 assert.equal(r.callbacks,1);assert.equal(r.records.pt.lessons[id].seen,1);assert.equal(h.state().wordPlays,2);
 assert.equal(r.played.flat().filter(url=>url===target).length,2);assert.ok(r.played.every(list=>list.length&&list.every(Boolean)));assert.ok(r.preloaded.every(Boolean));
 assert.ok(!r.played.flat().some(url=>url.includes('/ui/ru_')),'English/disabled help never falls back to Russian');
 if(!config.help){assert.deepEqual(r.preloaded,[target]);assert.ok(r.played.flat().every(url=>url===target));}
 else {assert.ok(r.played.flat().every(url=>!url.includes('/ui/')||url.startsWith('audio/ui/en_')),'follow-on narration uses English only');assert.ok(r.played.flat().some(url=>url.includes('/en_cs_'+id+'_')),'approved follow-on English narration is attempted');}
});
for(const base of ['ru','en'])for(const pick of [0,1])test(`candidate ${base} castle branch ${pick} and bounded tile retry retain stable outcomes`,async()=>{
 const castle=harness({base});const ch=castle.start('hist_castle');await castle.finish(pick);const choice=pick?'wall':'tower';assert.equal(ch.state().resolvedBranch,choice);
 const expected=pick?'cs_hist_castle_5b':'cs_hist_castle_5a';assert.ok(castle.played.flat().some(url=>url.includes(expected)),expected+' branch narration');
 const tiles=harness({base});const th=tiles.start('hist_tiles');await tiles.finish(1);assert.equal(th.state().picks.length,2);assert.equal(th.state().resolvedBranch,'match');assert.equal(tiles.callbacks,1);
});
