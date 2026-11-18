'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
class Node{
 constructor(tag,cls='',html=''){this.tagName=tag;this.className=cls;this.children=[];this.style={};this.dataset={};this.attrs={};this.innerHTML=html;this.classList={add:(...cs)=>cs.forEach(c=>{if(!this.className.split(' ').includes(c))this.className+=' '+c;}),remove:(...cs)=>this.className=this.className.split(' ').filter(c=>!cs.includes(c)).join(' '),contains:c=>this.className.split(' ').includes(c)};}
 set innerHTML(v){this._html=v;this.children=[];}get innerHTML(){return this._html;}
 appendChild(n){this.children.push(n);n.parentNode=this;return n;}remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);}setAttribute(k,v){this.attrs[k]=String(v);}addEventListener(){}
}
const nodes=n=>[n,...n.children.flatMap(nodes)];
const byClass=(n,cls)=>nodes(n).find(n=>n.className.split(' ').includes(cls));
const tick=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
function boot(o={}){
 let time=0,timers=[],audio=[],events=[],lang=o.lang||'pt';
 const words=()=>Object.fromEntries(['apple','banana','ball','boat'].map(id=>[id,{heard:2,box:1,due:888,custom:'keep'}]));
 const save={stars:71,xp:90,house:{gifts:2},settings:{ruHelp:!!o.help,baseLang:o.base||'ru',subtitles:true,sessionMin:20},langs:{pt:{words:words(),path:{day:'x',step:4,activeMs:321},other:'keep'},en:{words:words()},de:{words:words()}}};
 const ctx={console,Date,Promise,window:null};ctx.window=ctx;
 function makeFlow(){return {dead:false,kills:[],onKill(f){this.kills.push(f);},kill(){if(this.dead)return;this.dead=true;this.kills.forEach(f=>f());},after(ms,fn){timers.push({at:time+ms,fn,flow:this});},every(ms,fn){const flow=this;function again(){if(!flow.dead){fn();timers.push({at:time+ms,fn:again,flow});}}timers.push({at:time+ms,fn:again,flow});}};}
 let flow=makeFlow();
 function mediaFor(url){if(snd.cache[url])return snd.cache[url];const listeners=[];return snd.cache[url]={duration:3.046208,currentTime:0,ended:false,listeners,addEventListener(type,fn){if(type==='ended')listeners.push(fn);},removeEventListener(type,fn){const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);}};}
 const snd={cache:{},preload:url=>mediaFor(url),stop(){events.push(['stop']);},say(list){const url=list[0],media=mediaFor(url);media.currentTime=0;media.ended=false;const generation=(media.generation||0)+1;media.generation=generation;events.push(['say',url]);return new Promise(resolve=>{
  const coreEnd=()=>resolve(true);media.addEventListener('ended',coreEnd);
  audio.push({url,async finish(ok=true,ended=true){if(media.generation!==generation){resolve(ok);return;}media.ended=ended;media.currentTime=ended?media.duration:0;if(ended){for(const fn of media.listeners.slice()){if(media.listeners.includes(fn))fn({isTrusted:true});if(o.nativeCheckpoints)await tick();}}media.removeEventListener('ended',coreEnd);resolve(ok);},async staleEnded(){for(const fn of media.listeners.slice()){if(media.listeners.includes(fn))fn({isTrusted:true});if(o.nativeCheckpoints)await tick();}media.removeEventListener('ended',coreEnd);}});
 });}};
 const el=(t,c,h)=>new Node(t,c,h),btn=(cl,h,fn)=>{const n=el('div','btn '+cl,h);n.onclick=fn;return n;};
 ctx.Core={save,Snd:snd,speed:1,inputSeq:0,D:{items:{}},el,tap:(n,fn)=>n.onclick=fn,curLang:()=>lang,baseLang:()=>save.settings.baseLang,L:l=>save.langs[l],item:id=>({id}),Pic:{el:it=>el('div','pic',it.id)},vocabLabelEl:(l,it,gloss,cls)=>{assert.equal(gloss,'');const n=el('span',cls+(save.settings.subtitles?'':' subtitles-off'),it.id);return n;},persist:()=>events.push(['persist'])};
 for(const id of ['apple','banana','ball','boat'])ctx.Core.D.items[id]={id,pt:{word:id},en:{word:id},de:{word:id}};ctx.Core.item=id=>ctx.Core.D.items[id];
 ctx.Lisa={ico:{},make:o=>{const n=el('div','lisa '+o.cls);n.pose=p=>{n.dataset.pose=p;events.push(['pose',p]);};return n;}};
 ctx.UI={screens:{},cur:'story',flow,scene:()=>{},btn,backBtn:fn=>btn('b-back','',fn),speakerBtn:fn=>btn('b-speaker','',fn),homeBtn:fn=>btn('b-home','',fn),pulse:n=>events.push(['pulse',n.className]),go(name){flow.kill();ctx.UI.cur=name;ctx.UI.flow=null;events.push(['go',name]);},idle(f,o){f.every(500,()=>{if(o.active&&!o.active())return;});ctx.idles=(ctx.idles||[]).concat(o);return {reset(){}};}};
 vm.createContext(ctx);
 for(const name of ['story_rules.js','stories_data.js','story.js']){const p=path.join(root,'app/js',name);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),ctx);}
 const shippedReady=ctx.STORIES_DATA?Array.from(ctx.STORIES_DATA.readyAssets):[];if(ctx.STORIES_DATA)ctx.STORIES_DATA.readyAssets=[];
 const host=el('section','screen s-story');
 function start(){assert.equal(typeof ctx.UI.screens.story,'function','actual story renderer registered');ctx.UI.screens.story(flow,host,{});return host;}
 function inventory(){assert(ctx.STORIES_DATA,'actual authored story data loaded');ctx.STORIES_DATA.readyAssets=ctx.STORIES_DATA.audioJobs.map(j=>j.path);}
 async function finish(ok=true,ended=true){assert(audio.length,'pending real playback boundary exists');const a=audio.shift();await a.finish(ok,ended);await tick();return a;}
 async function advance(ms){time+=ms;for(let i=0;i<30;i++){const due=timers.filter(t=>t.at<=time);timers=timers.filter(t=>t.at>time);for(const t of due)if(!t.flow.dead)t.fn();await tick();if(!timers.some(t=>t.at<=time))break;}}
 function click(cls){const n=byClass(host,cls);assert(n,'rendered '+cls);assert.equal(typeof n.onclick,'function');n.onclick();}
 function choose(id){const n=nodes(host).find(n=>n.dataset.choice===id);assert(n,'rendered choice '+id);n.onclick();}
 async function toFood(){start();await tick();await finish();await finish();assert.equal(host.dataset.phase,'choose');}
 function remount(){flow.kill();flow=makeFlow();ctx.UI.flow=flow;ctx.UI.cur='story';host.innerHTML='';start();}
 return {ctx,save,events,audio,host,start,inventory,finish,advance,click,choose,toFood,flow,remount,shippedReady,setLang:l=>lang=l};
}
function withoutStories(save){const x=JSON.parse(JSON.stringify(save));for(const l of Object.values(x.langs))delete l.stories;return x;}
async function route(b,food,play){await b.toFood();b.choose(food);b.choose(food);await b.advance(800);await b.finish();assert.equal(b.host.dataset.phase,'pause');await b.advance(1499);assert.equal(b.audio.length,0);await b.advance(1);await b.finish();assert.equal(b.host.dataset.phase,'choose');b.choose(play);await b.advance(200);await b.finish();await b.advance(1500);assert.equal(b.host.dataset.nodeId,'n_bye');assert.equal(b.save.langs[b.ctx.Core.curLang()].stories,undefined);await b.finish();assert.equal(b.host.dataset.phase,'end');}
test('actual readiness requires all met words and all eight target clips with no fake approval flag',()=>{
 const b=boot();assert.equal(typeof b.ctx.Stories?.ready,'function','story entry readiness exists');assert.equal(b.ctx.Stories.ready('pt'),false);b.inventory();assert.equal(b.ctx.Stories.ready('pt'),true);delete b.save.langs.pt.words.boat;assert.equal(b.ctx.Stories.ready('pt'),false);b.save.langs.pt.words.boat={heard:0,box:3};assert.equal(b.ctx.Stories.ready('pt'),false);b.save.langs.pt.words.boat.heard=1;assert.equal(b.ctx.Stories.ready('pt'),true);b.ctx.STORIES_DATA.readyAssets=b.ctx.STORIES_DATA.readyAssets.filter(p=>p!=='audio/story/st_picnic/pt/n_bye.ogg');assert.equal(b.ctx.Stories.ready('pt'),false);assert.equal(b.ctx.Stories.ready('en'),true);assert.equal(b.ctx.Stories.ready('ru'),false);
});
test('authored pack has numeric revision, 30 exact jobs and a verified inventory isolated from unit readiness fixtures',()=>{
 const b=boot();assert(b.ctx.STORIES_DATA,'story content module exists');const d=b.ctx.STORIES_DATA;assert.equal(d.pack.revision,1);assert.equal(d.pack.nodes.length,8);assert.equal(d.audioJobs.length,30);assert.equal(d.readyAssets.length,0,'unit fixture starts uninventoried independently');assert.equal(b.shippedReady.length,30);assert.deepEqual(new Set(b.shippedReady),new Set(d.audioJobs.map(j=>j.path)));assert.equal(new Set(d.audioJobs.map(j=>j.path)).size,30);assert.equal(d.audioJobs.find(j=>j.lang==='pt'&&j.id==='n_hello').text,'Olá! Tenho fome.');
});
test('all four routes in each target locale persist exactly once and preserve every assessment/session/reward field',async()=>{
 for(const lang of ['pt','en','de'])for(const food of ['c_apple','c_banana'])for(const play of ['c_ball','c_boat']){
  const b=boot({lang});b.inventory();const before=withoutStories(b.save);await route(b,food,play);assert.equal(b.save.langs[lang].stories.st_picnic.seen,1);assert.equal(b.events.filter(e=>e[0]==='persist').length,1);assert.deepEqual(withoutStories(b.save),before);b.click('b-speaker');await b.finish();assert.equal(b.save.langs[lang].stories.st_picnic.seen,1);assert.equal(b.events.filter(e=>e[0]==='persist').length,1);assert(b.events.filter(e=>e[0]==='say').every(e=>e[1].includes('/'+lang+'/')));
 }
});
test('Snd safety true without a real native ended event never unlocks or records',async()=>{
 const b=boot();b.inventory();b.start();await b.finish(true,false);assert.equal(b.host.dataset.phase,'retry');assert(!nodes(b.host).some(n=>n.dataset.choice));assert.equal(b.save.langs.pt.stories,undefined);b.click('b-speaker');await b.finish();await b.finish();assert.equal(b.host.dataset.phase,'choose');
});
test('failed optional help skips only help; matching base/target or help-off plays no help',async()=>{
 const b=boot({help:true,base:'ru'});b.inventory();b.start();assert(b.audio[0].url.includes('base_ru/h_intro'));await b.finish(false,false);assert(b.audio[0].url.endsWith('/pt/n_hello.ogg'));await b.finish();assert(b.audio[0].url.includes('base_ru/h_food'));
 for(const opt of [{lang:'en',help:true,base:'en'},{lang:'pt',help:false,base:'ru'}]){const n=boot(opt);n.inventory();n.start();assert(!n.audio[0].url.includes('base_'));}
});
test('question replay failure preserves choice; speaker during narration and replay cannot interrupt',async()=>{
 const b=boot();b.inventory();b.start();b.click('b-speaker');assert.equal(b.audio.length,1);await b.finish();await b.finish();b.click('b-speaker');b.click('b-speaker');b.choose('c_apple');assert.equal(b.host.dataset.nodeId,'n_food');assert.equal(b.audio.length,1);await b.finish(false,false);assert.equal(b.host.dataset.phase,'choose');assert.equal(nodes(b.host).filter(n=>n.dataset.choice).length,2);b.choose('c_banana');await b.advance(800);assert.equal(b.host.dataset.nodeId,'n_food_banana');
});
test('reply failure starts no pause; replay invalidates old pause and restarts full 1500ms after actual completion',async()=>{
 const b=boot();b.inventory();await b.toFood();b.choose('c_apple');await b.advance(800);await b.finish(false,false);assert.equal(b.host.dataset.phase,'retry');await b.advance(9000);assert.equal(b.audio.length,0);b.click('b-speaker');await b.finish();assert.equal(b.host.dataset.phase,'pause');assert.equal(byClass(b.host,'st-lisa').dataset.pose,'tilt');await b.advance(900);b.click('b-speaker');await b.advance(600);assert.equal(b.host.dataset.nodeId,'n_food_apple');await b.finish();await b.advance(1499);assert.equal(b.audio.length,0);await b.advance(1);assert.equal(b.host.dataset.nodeId,'n_play');assert.deepEqual(b.events.filter(e=>e[0]==='pose').slice(-2).map(e=>e[1]),['idle','tilt']);
});
test('Back cancels pending narration and pause; late audio or changed target cannot save or advance',async()=>{
 for(const phase of ['narration','pause']){const b=boot();b.inventory();if(phase==='pause'){await b.toFood();b.choose('c_apple');await b.advance(800);await b.finish();}else b.start();b.click('b-back');for(const a of b.audio.splice(0))a.finish(true,true);await tick();await b.advance(9000);assert.equal(b.ctx.UI.cur,'home');assert.equal(b.save.langs.pt.stories,undefined);assert.equal(b.events.filter(e=>e[0]==='persist').length,0);}
 const b=boot();b.inventory();b.start();b.setLang('de');await b.finish();assert.equal(b.audio.length,0);assert.equal(b.save.langs.pt.stories,undefined);
});
test('failed final line has no end controls or completion; retry succeeds once and replay counts nothing',async()=>{
 const b=boot();b.inventory();await b.toFood();b.choose('c_apple');await b.advance(800);await b.finish();await b.advance(1500);await b.finish();b.choose('c_ball');await b.advance(200);await b.finish();await b.advance(1500);await b.finish(false,false);assert.equal(b.host.dataset.phase,'retry');assert(!byClass(b.host,'st-end'));assert.equal(b.save.langs.pt.stories,undefined);b.click('b-speaker');await b.finish();assert.equal(b.save.langs.pt.stories.st_picnic.seen,1);assert(byClass(b.host,'b-story-again'));b.click('b-speaker');await b.finish(false,false);assert.equal(b.host.dataset.phase,'end');assert.equal(b.save.langs.pt.stories.st_picnic.seen,1);
});
test('tile uses existing picture and target-only subtitle label; idle never picks or advances',async()=>{
 const b=boot();b.inventory();b.save.settings.subtitles=false;await b.toFood();const tiles=nodes(b.host).filter(n=>n.dataset.choice);assert.equal(tiles.length,2);for(const tile of tiles){assert(byClass(tile,'pic'));assert(byClass(tile,'st-label').classList.contains('subtitles-off'));}const idle=b.ctx.idles.find(o=>o.speak);assert(idle);idle.visual();idle.speak();await b.finish();assert.equal(b.host.dataset.nodeId,'n_food');assert.equal(b.host.dataset.phase,'choose');assert.equal(b.save.langs.pt.stories,undefined);
});
test('real Core load/sanitize and flush preserve additive stories and unrelated progress across reload',()=>{
 const code=fs.readFileSync(path.join(root,'app/js/core.js'),'utf8'),prefix=code.slice(0,code.indexOf('Core.enabledLangs ='))+'\n})();';let store=JSON.stringify({stars:71,xp:90,settings:{baseLang:'en',sessionMin:20,ruHelp:false},langs:{pt:{words:{apple:{heard:3,box:4}},levels:{animals:2},stories:{other:{seen:9,last:1},st_picnic:{seen:2,last:123}}}}});function load(){const c={window:{GAME_DATA:{},localStorage:{getItem:()=>store,setItem:(k,v)=>store=v}},document:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},Date};vm.runInNewContext(prefix,c);return c.window.Core;}const c=load();c.L('pt').stories.st_picnic.seen++;c.flushNow();const loaded=load();assert.equal(loaded.L('pt').stories.st_picnic.seen,3);assert.equal(loaded.L('pt').stories.other.seen,9);assert.equal(loaded.L('pt').words.apple.box,4);assert.equal(loaded.save.stars,71);assert.equal(loaded.save.xp,90);assert.equal(loaded.save.settings.sessionMin,20);
});
test('a failed cached auxiliary question can be retried without removing the available choices',async()=>{
 const b=boot();b.inventory();await b.toFood();b.click('b-speaker');await b.finish(false,false);const url='audio/story/st_picnic/pt/n_food.ogg';b.ctx.Core.Snd.cache[url]._bad=true;
 const original=b.ctx.Core.Snd.say;b.ctx.Core.Snd.say=function(list){if(this.cache[list[0]]?._bad)return Promise.resolve(false);return original.call(this,list);};b.click('b-speaker');assert.equal(b.audio.length,1,'a fresh media attempt replaces the failed owned clip');await b.finish();assert.equal(b.host.dataset.phase,'choose');assert.equal(nodes(b.host).filter(n=>n.dataset.choice).length,2);
});

test('restart creates a separate run, rejects previous callback and increments seen only for a completed new run',async()=>{
 const b=boot();b.inventory();b.start();const first=b.host.dataset.runId,old=b.audio.shift();b.remount();assert.notEqual(b.host.dataset.runId,first);assert.equal(b.host.dataset.nodeId,'n_hello');old.finish();await tick();assert.equal(b.host.dataset.nodeId,'n_hello');assert.equal(b.audio.length,1);assert.equal(b.save.langs.pt.stories,undefined);
 b.click('b-back');b.audio.splice(0).forEach(a=>a.finish());await tick();
 b.remount();await b.finish();await b.finish();b.choose('c_apple');await b.advance(800);await b.finish();await b.advance(1500);await b.finish();b.choose('c_ball');await b.advance(200);await b.finish();await b.advance(1500);await b.finish();assert.equal(b.save.langs.pt.stories.st_picnic.seen,1);
 b.remount();await b.finish();await b.finish();b.choose('c_banana');await b.advance(800);await b.finish();await b.advance(1500);await b.finish();b.choose('c_boat');await b.advance(200);await b.finish();await b.advance(1500);await b.finish();assert.equal(b.save.langs.pt.stories.st_picnic.seen,2);
});
test('actual home renderer adds the fifth button only with met words and complete verified assets',()=>{
 const b=boot();b.ctx.document={getElementById:()=>new Node('div')};b.ctx.Path={sleeping:()=>true};b.ctx.House={mapBtn:()=>new Node('div','btn b-house')};b.ctx.FX={goalPill:()=>new Node('div','goalpill')};b.ctx.Core.enabledLangs=()=>['pt'];b.ctx.Core.lang='pt';b.ctx.Core.lisaLine=()=>null;b.save.firstRun=false;
 vm.runInContext(fs.readFileSync(path.join(root,'app/js/ui.js'),'utf8'),b.ctx);b.ctx.UI.scene=()=>{};b.ctx.UI.holdGate=()=>{};
 let host=new Node('section');b.ctx.UI.screens.home(b.flow,host);let low=byClass(host,'homebtns');assert.equal(low.children.length,4);assert.equal(low.classList.contains('has-story'),false);
 b.inventory();host=new Node('section');b.ctx.UI.screens.home(b.flow,host);low=byClass(host,'homebtns');assert.equal(low.children.length,5);assert(low.classList.contains('has-story'));assert(low.children[0].classList.contains('b-story'));assert(low.children[1].classList.contains('b-house'));
});

test('native event microtask checkpoints cannot resolve playback before story acknowledges the same ended event',async()=>{
 const b=boot({nativeCheckpoints:true});b.inventory();b.start();await b.finish();assert.equal(b.host.dataset.nodeId,'n_food','native full ended progresses rather than false retry');assert.equal(b.host.dataset.phase,'speaking');await b.finish();assert.equal(b.host.dataset.phase,'choose');assert.equal(b.save.langs.pt.stories,undefined);
});
test('a queued trusted ended event from a previous playback cannot acknowledge a fresh clip at time zero',async()=>{
 const b=boot();b.inventory();b.start();const old=b.audio.shift();await old.staleEnded();await tick();assert.equal(b.host.dataset.nodeId,'n_hello');assert.equal(b.host.dataset.phase,'retry');assert.equal(b.save.langs.pt.stories,undefined);
});
test('fast mode cannot acknowledge story narration through a prior native media object',async()=>{
 const b=boot();b.inventory();b.ctx.Core.fast=true;b.start();for(const a of b.audio.splice(0))await a.finish();await tick();assert.equal(b.host.dataset.nodeId,'n_hello');assert.equal(b.host.dataset.phase,'retry');assert.equal(b.save.langs.pt.stories,undefined);
});
