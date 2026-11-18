'use strict';
// Parent/controller only. No browser launches when this file is required by pure tests.
const assert=require('node:assert/strict');
function options(args) {
 const result={caseName:'settings',width:1128,height:752},seen=new Set();
 for(const arg of args){const m=/^--(case|viewport)=(.+)$/.exec(arg);if(!m||seen.has(m[1]))throw new Error('Unknown/duplicate option: '+arg);seen.add(m[1]);
  if(m[1]==='case'){if(!['settings','lessons','labels','routing'].includes(m[2]))throw new Error('Unsupported case: '+m[2]);result.caseName=m[2];}
  else {if(!['1128','1920'].includes(m[2]))throw new Error('Unsupported viewport: '+m[2]);result.width=Number(m[2]);result.height=result.width===1128?752:1080;}}
 return result;
}
function audioProblems(events, expected) {
 const out=[];for(const e of events){if(!e.urls.length||e.urls.some(u=>u==null||u===''))out.push('null/empty '+e.kind);
  for(const u of e.urls){if(typeof u!=='string'||!u.startsWith('audio/ui/'))continue;
   if(!expected.help)out.push('base speech while OFF '+u);else if(!u.startsWith('audio/ui/'+expected.base+'_'))out.push('wrong base '+u);}}
 if(expected.target&&expected.wordPlays!=null){const n=events.filter(e=>e.kind==='say').flatMap(e=>e.urls).filter(u=>u===expected.target).length;if(n!==expected.wordPlays)out.push('target count '+n+' expected '+expected.wordPlays);}
 return out;
}
function finiteOwnAnimationsSettled(node) {
 if (!node.isConnected) return false;
 return node.getAnimations({subtree:false}).filter(a=>a.effect&&a.effect.target===node&&Number.isFinite(a.effect.getComputedTiming().iterations)).every(a=>a.playState==='finished'||a.playState==='idle');
}
function lessonTapPoint(s) {
 assert.ok(s.connected && s.visible && s.hit, 'original lesson tile is visible/mounted and owns its hit point');
 assert.ok(s.width >= 150 && s.height >= 150, 'lesson tile retains >=150px touch geometry');
 return {x:s.left+s.width/2,y:s.top+s.height/2};
}
async function tapLessonChoice(page) {
 const node=await page.locator('.ls-tile').first().elementHandle();assert.ok(node,'original lesson tile mounted');
 try {
  // Pulsing sprites never become "stable" for Playwright scrolling; use actual on-screen geometry.
  await page.waitForFunction(n=>{if(!n.isConnected)return false;const r=n.getBoundingClientRect(),s=getComputedStyle(n),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.width>=150&&r.height>=150&&s.visibility==='visible'&&s.display!=='none'&&!!hit&&(hit===n||n.contains(hit));},node,{timeout:2500});
  const sample=await node.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {connected:n.isConnected,visible:s.visibility==='visible'&&s.display!=='none',hit:!!hit&&(hit===n||n.contains(hit)),left:r.left,top:r.top,width:r.width,height:r.height};});
  const point=lessonTapPoint(sample);await page.touchscreen.tap(point.x,point.y);
 } finally {await node.dispose();}
}
async function observe(page) {
 await page.evaluate(()=>{
  if(window.__baseSmoke)throw new Error('audio observer already installed');
  const s=window.__baseSmoke={events:[],labels:[],originalSay:Core.Snd.say,originalPreload:Core.Snd.preload,originalTap:Core.tap};
  const record=(kind,urls)=>s.events.push({kind,urls:[].concat(urls),screen:UI.cur,at:performance.now()});
  Core.Snd.say=function(list,...args){record('say',list);return s.originalSay.call(this,list,...args);};
  Core.Snd.preload=function(url){record('preload',[url]);return s.originalPreload.call(this,url);};
  // Observe the stable stage. Read the same mounted original node, never clone it.
  const seen=new WeakSet();s.observer=new MutationObserver(()=>{for(const n of UI.stage.querySelectorAll('.ls-cardword'))if(!seen.has(n)){seen.add(n);const w=n.querySelector('.vocab-word');s.labels.push({text:w&&w.textContent,color:w&&getComputedStyle(w).color,visibility:getComputedStyle(n).visibility,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height});if(s.holdWord)Core.speed=1;}});
  s.observer.observe(UI.stage,{childList:true,subtree:true});
 });
}
async function events(page){return page.evaluate(()=>window.__baseSmoke.events.slice());}
async function clearEvents(page){await page.evaluate(()=>{Core.Snd.stop();__baseSmoke.events=[];__baseSmoke.labels=[];});}
async function free(page){await page.waitForFunction(()=>!document.querySelector('.prompt-playing,.prompt-choice')&&!(window.__test&&__test.quizBusy&&__test.quizBusy()),null,{timeout:22000});}
async function tap(page,locator){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert.ok(box,'visible target has bounds');await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
async function wait(page,fn,arg,timeout=15000){await page.waitForFunction(fn,arg,{timeout});}
async function state(page){return page.evaluate(()=>({screen:UI.cur,settings:Core.save.settings,lesson:window.__lessonTest&&__lessonTest.state(),events:window.__baseSmoke&&__baseSmoke.events.slice(-15)}));}
async function settingsCase(lib){const {page}=lib;
 const old={v:1,firstRun:false,stars:23,xp:41,hats:{unlocked:['cap'],worn:[]},house:{stage:1,gifts:0,owned:[],placed:{},reviewDay:-1},langs:{pt:{words:{cat:{box:3,heard:2}},levels:{animals:[{stars:2,done:true}]},lessons:{float:{seen:2,last:7}},last:5}},settings:{enabled:{pt:true,en:true,de:true},ruHelp:true,subtitles:true,sessionMin:20,pathSmall:false}};
 const worlds=await page.evaluate(()=>Core.D.worlds.map(w=>w.id));for(const lang of ['pt','en','de']){old.langs[lang] ||= {words:{},levels:{},last:0};for(const world of worlds)old.langs[lang].levels[world]=Array.from({length:5},()=>({stars:0,done:false}));}old.langs.pt.levels.animals[0]={stars:2,done:true};
 await page.evaluate(s=>{ Core.save=s; Core.flushNow(); },old);await page.reload();await wait(page,()=>window.__test&&__test.screen()==='home');
 assert.equal(await page.evaluate(()=>Core.baseLang()),'ru');const before=await page.evaluate(()=>JSON.stringify({stars:Core.save.stars,xp:Core.save.xp,hats:Core.save.hats,house:Core.save.house,langs:Core.save.langs}));
 await page.evaluate(()=>__test.go('parent'));await tap(page,page.locator('.prow[data-setting="baseLang"] .pseg-b[data-v="en"]'));
 await wait(page,()=>JSON.parse(localStorage.getItem('lisa-island-v1')).settings.baseLang==='en');await page.reload();await wait(page,()=>window.__test&&__test.screen()==='home');assert.equal(await page.evaluate(()=>Core.baseLang()),'en');
 await page.evaluate(()=>__test.go('parent'));await tap(page,page.locator('.prow[data-setting="ageYears"] .pseg-b[data-v="3"]'));
 assert.deepEqual(await page.evaluate(()=>({age:Core.save.settings.ageYears,small:Core.save.settings.pathSmall,minutes:Core.save.settings.sessionMin})),{age:3,small:true,minutes:15});
 await tap(page,page.locator('.prow').filter({hasText:'Session length'}).locator('.pseg-b[data-v="20"]'));
 await tap(page,page.locator('.prow[data-setting="ageYears"] .pseg-b[data-v="3"]'));assert.equal(await page.evaluate(()=>Core.save.settings.sessionMin),20);
 await page.evaluate(()=>Core.flushNow());await page.reload();await wait(page,()=>window.__test&&__test.screen()==='home');assert.deepEqual(await page.evaluate(()=>({base:Core.baseLang(),age:Core.save.settings.ageYears,small:Core.save.settings.pathSmall,minutes:Core.save.settings.sessionMin})),{base:'en',age:3,small:true,minutes:20});
 assert.equal(await page.evaluate(()=>JSON.stringify({stars:Core.save.stars,xp:Core.save.xp,hats:Core.save.hats,house:Core.save.house,langs:Core.save.langs})),before);
 await page.evaluate(()=>__test.go('parent'));await tap(page,page.locator('.prow[data-setting="ageYears"] .pseg-b[data-v="6"]'));assert.deepEqual(await page.evaluate(()=>({small:Core.save.settings.pathSmall,minutes:Core.save.settings.sessionMin})),{small:false,minutes:15});
 await tap(page,page.locator('.prow[data-setting="baseLang"] .pseg-b[data-v="ru"]'));assert.equal(await page.evaluate(()=>Core.baseLang()),'ru');return {oldProgressPreserved:true,baseMigration:'ru',switchReload:'en',manualAgeOverrideRetained:true};
}
async function startLesson(page,{help,base='en',lang='pt',id='float',word=null,subtitles=true,holdWord=false}){
 await page.evaluate(o=>{__test.go('home');Core.save.settings.ruHelp=o.help;Core.save.settings.baseLang=o.base;Core.save.settings.subtitles=o.subtitles;Core.lang=o.lang;Core.speed=12;Core.fast=true;if(o.word)LESSON_DATA.lessons[o.id].word=o.word;window.__baseDone=0;__baseSmoke.holdWord=o.holdWord;__test.go('lesson',{id:o.id,lang:o.lang,done:()=>{__baseDone++;}});},{help,base,lang,id,word,subtitles,holdWord});
}
async function solveLesson(page,{replay=false,help=true}={}){
 const deadline=Date.now()+45000;let replayed=false;while(Date.now()<deadline){const s=await page.evaluate(()=>window.__lessonTest&&__lessonTest.state());if(s&&s.done)return s;if(!s)throw new Error('lesson disappeared');
  if(s.promptOpen){await free(page);if(replay&&!replayed){
    if(help){const beforeReplay=(await events(page)).length;await page.evaluate(()=>__lessonTest.handle.replay());await free(page);assert.ok((await events(page)).slice(beforeReplay).some(e=>e.kind==='say'&&e.urls.some(u=>typeof u==='string'&&u.endsWith('_cs_float_3q.ogg'))),'ON replay requested new question playback');}
    await page.evaluate(()=>{Core.save.settings.ruHelp=false;__baseSmoke.beforeReplay=__baseSmoke.events.length;__lessonTest.handle.replay();});assert.equal(await page.evaluate(()=>__baseSmoke.events.length-__baseSmoke.beforeReplay),0,'OFF manual replay makes no audio call');await page.evaluate(h=>Core.save.settings.ruHelp=h,help);replayed=true;}
   await tapLessonChoice(page);}
  await page.waitForTimeout(25);
 }throw new Error('lesson completion exceeded45s');
}
async function lessonsCase(lib){const {page}=lib;await observe(page);const results=[];
 for(const help of [false,true]){await page.evaluate(()=>__test.go('home'));await clearEvents(page);const before=await page.evaluate(()=>Lesson.seen('pt','float'));await startLesson(page,{help});const s=await solveLesson(page,{replay:true,help});const got=await events(page);assert.deepEqual(audioProblems(got,{base:'en',help,target:'audio/pt/water.ogg',wordPlays:2}),[]);assert.equal(s.wordPlays,2);assert.equal(await page.evaluate(()=>Lesson.seen('pt','float')),before+1);assert.equal(await page.evaluate(()=>__baseDone),1);
  const expected='audio/ui/en_cs_float_1.ogg';if(help)assert.ok(got.some(e=>e.kind==='say'&&e.urls.includes(expected)));else assert.deepEqual(got.filter(e=>e.kind==='preload').map(e=>e.urls[0]),['audio/pt/water.ogg']);
  await page.evaluate(()=>Core.flushNow());assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lisa-island-v1')).langs.pt.lessons.float.seen),before+1);results.push({help,base:'en',target:'pt',audioCalls:got.length,picks:s.picks});}
 // Silent idle pulse/auto progression, then stop instead of duplicating a whole lesson run.
 await page.evaluate(()=>__test.go('home'));await clearEvents(page);await startLesson(page,{help:false});await wait(page,()=>window.__lessonTest&&__lessonTest.state().promptOpen);await wait(page,()=>__lessonTest.state().pulsed);assert.equal(await page.evaluate(()=>__lessonTest.state().repeated),false);await wait(page,()=>__lessonTest.state().picks.length>0);assert.equal(await page.evaluate(()=>__lessonTest.state().picks[0].auto),true);assert.deepEqual(audioProblems(await events(page),{base:'en',help:false}),[]);await page.evaluate(()=>__test.go('home'));return results;
}
async function labelsCase(lib){const {page}=lib;await observe(page);const original=await page.evaluate(()=>LESSON_DATA.lessons.float.word),results=[];
 try{for(const [lang,word] of [['pt','cat'],['pt','water'],['de','water'],['en','cat']])for(const subtitles of [true,false]){
  await page.evaluate(()=>__test.go('home'));await clearEvents(page);await startLesson(page,{help:false,lang,word,subtitles,holdWord:true});
  const deadline=Date.now()+20000;while(!(await page.evaluate(()=>!!document.querySelector('.ls-cardword')))){if(Date.now()>deadline)throw new Error('end card exceeded20s');if(await page.evaluate(()=>!!(window.__lessonTest&&__lessonTest.state().promptOpen))){await free(page);await tapLessonChoice(page);}await page.waitForTimeout(20);}
  const originalCard=await page.locator('.ls-card').elementHandle();assert.ok(originalCard,'original end card is mounted');
  await page.waitForFunction(finiteOwnAnimationsSettled,originalCard,{timeout:2500});
  const result=await originalCard.evaluate((card,{lang,word})=>{const label=card.querySelector('.ls-cardword'),node=label.querySelector('.vocab-word'),info=Core.vocabLabel(lang,Core.item(word)),probe=document.createElement('span');probe.style.color=info.color;UI.stage.appendChild(probe);const color=getComputedStyle(probe).color;probe.remove();return {lang,word,text:node&&node.textContent,color:node&&getComputedStyle(node).color,expectedColor:color,expectedText:info.text,visibility:getComputedStyle(label).visibility,width:label.getBoundingClientRect().width,height:label.getBoundingClientRect().height,card:{width:card.getBoundingClientRect().width,height:card.getBoundingClientRect().height}};},{lang,word});
  assert.equal(result.text,result.expectedText);assert.equal(result.color,result.expectedColor);assert.equal(result.visibility,subtitles?'visible':'hidden');assert.ok(result.width>0&&result.height>0);const prior=results.find(x=>x.lang===lang&&x.word===word);if(prior){const diagnostic=JSON.stringify({prior,current:result});assert.ok(Math.abs(prior.width-result.width)<1,'label width footprint '+diagnostic);assert.ok(Math.abs(prior.height-result.height)<1,'label height footprint '+diagnostic);assert.deepEqual(prior.card,result.card,'card footprint '+diagnostic);}
  await originalCard.dispose();results.push({...result,subtitles});await lib.shot('base_label_'+lang+'_'+word+'_'+(subtitles?'on':'off')+'_'+(await page.viewportSize()).width);
 }}finally{await page.evaluate(w=>{__test.go('home');LESSON_DATA.lessons.float.word=w;},original);}
 return results;
}
async function routingCase(lib){const {page}=lib;await observe(page);const results=[];
 for(const base of ['en','ru']){await page.evaluate(b=>{__test.go('home');Core.save.settings.baseLang=b;Core.save.settings.ruHelp=true;Core.lang='pt';Core.speed=12;Core.fast=true;},base);await clearEvents(page);
  await page.evaluate(async()=>{await Core.sayRu(UI.flow,'welcome');await UI.flow.say([Core.ruUrl('explore')]);await UI.flow.say([Core.lisaLine('hi')]);});let got=await events(page);assert.deepEqual(audioProblems(got,{base,help:true}),[]);assert.ok(got.some(e=>e.urls.includes('audio/ui/'+base+'_welcome.ogg')));
  for(const [screen,p,key] of [['path',{world:'animals',lang:'pt'},'w_animals'],['minigame',{game:'feed',world:'food',lang:'pt'},'mg_feed_intro'],['scene',{scene:'zoo',world:'animals',lang:'pt'},'scene_zoo_intro'],['house',{},'house_intro']]){
   await page.evaluate(()=>__test.go('home'));await clearEvents(page);await page.evaluate(({screen,p})=>{if(screen==='house'){Core.save.stars=0;Core.save.house={stage:0,gifts:0,owned:[],placed:{},reviewDay:-1};}__test.go(screen,p);},{screen,p});
   if(screen==='path'){await tap(page,page.locator('.topbar .b-speaker').first());}
   await wait(page,expected=>__baseSmoke.events.some(e=>e.kind==='say'&&e.urls.includes(expected)),'audio/ui/'+base+'_'+key+'.ogg',15000);
   got=await events(page);const baseCalls=got.filter(e=>e.urls.some(u=>typeof u==='string'&&u.startsWith('audio/ui/'+base+'_')));assert.ok(baseCalls.length>0);assert.ok(!got.flatMap(e=>e.urls).some(u=>typeof u==='string'&&u.startsWith('audio/ui/'+(base==='en'?'ru':'en')+'_')),'no wrong-base narration');results.push({base,screen,expectedKey:key,calls:got.length});
  }
 }
 await page.evaluate(()=>{__test.go('home');Core.save.settings.baseLang='en';Core.save.settings.ruHelp=true;Core.lang='en';});await clearEvents(page);await page.evaluate(()=>__test.go('path',{world:'animals',lang:'en'}));await tap(page,page.locator('.topbar .b-speaker').first());const sameWorldCalls=await events(page);assert.equal(sameWorldCalls.filter(e=>e.kind==='say').flatMap(e=>e.urls).filter(u=>u==='audio/ui/en_w_animals.ogg').length,1,'same base/target world label plays once');
 const gloss=await page.evaluate(()=>{__test.go('home');Core.save.settings.baseLang='en';Core.save.settings.ruHelp=true;return {same:Core.url.gloss('cat','en'),sameText:Core.glossText('cat','en'),pt:Core.url.gloss('cat','pt'),de:Core.url.gloss('cat','de'),ptText:Core.glossText('cat','pt'),en:Core.item('cat').en.word};});assert.equal(gloss.same,null);assert.equal(gloss.sameText,'');assert.equal(gloss.pt,'audio/en/cat.ogg');assert.equal(gloss.de,'audio/en/cat.ogg');assert.equal(gloss.ptText,gloss.en);return {screens:results,sameBaseTargetWorldCount:1,gloss};
}
async function main(args){const o=options(args);const {boot}=require('./mg_lib');const started=Date.now();let lib;
 console.log(JSON.stringify({event:'base-smoke.start',...o,pid:process.pid}));
 try{lib=await boot({viewport:{width:o.width,height:o.height},speed:12});const result=await {settings:settingsCase,lessons:lessonsCase,labels:labelsCase,routing:routingCase}[o.caseName](lib);if(lib.errors.length)throw new Error('browser errors: '+JSON.stringify(lib.errors));console.log(JSON.stringify({event:'base-smoke.pass',...o,elapsedMs:Date.now()-started,result}));}
 catch(e){let snapshot=null;if(lib)try{snapshot=await state(lib.page);}catch{}console.error(JSON.stringify({event:'base-smoke.fail',...o,elapsedMs:Date.now()-started,error:e.stack||String(e),state:snapshot}));process.exitCode=1;}
 finally{if(lib){try{await lib.page.evaluate(()=>{if(!window.__baseSmoke)return;const s=__baseSmoke;s.observer.disconnect();Core.Snd.say=s.originalSay;Core.Snd.preload=s.originalPreload;delete window.__baseSmoke;});}catch{}await lib.browser.close();}}
}
module.exports={options,audioProblems,lessonTapPoint,tapLessonChoice,finiteOwnAnimationsSettled};
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.stack);process.exitCode=1;});
