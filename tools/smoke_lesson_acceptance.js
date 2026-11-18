/* Focused runtime acceptance; controller owns the sole browser slot.
   node tools/smoke_lesson_acceptance.js --case=branches|idle|cancel|missing --viewport=1128|1920 [--lesson=ID]
   Accelerated real app; request audit observes audio requests, not audibility. Replay uses real local audio. Missing case injects failed narration. */
const assert = require('node:assert/strict');
const {boot,sleep}=require('./mg_lib');
const arg=(key,fallback)=>{const a=process.argv.find(x=>x.startsWith('--'+key+'='));return a?a.split('=')[1]:fallback;};
const kind=arg('case','branches'), width=Number(arg('viewport','1128'));
function selectLessons(ids, lesson) {
  if (lesson === null) return ids;
  if (typeof lesson !== 'string' || !lesson || !ids.includes(lesson)) throw new Error('Unknown or malformed --lesson: '+String(lesson));
  return [lesson];
}
const state=p=>p.page.evaluate(()=>window.__lessonTest&&__lessonTest.state());
async function start(lib,id,lang='pt'){
  await lib.page.evaluate(({id,lang})=>{
    __test.go('home'); Core.lang=lang; Core.save.settings.enabled[lang]=true; Core.save.settings.baseLang='ru'; Core.save.settings.ruHelp=true;
    window.__accept={calls:[],done:0,states:[],before:Lesson.seen(lang,id),srs:JSON.stringify(Core.SRS.peek(lang,Lesson.word(id)))};
    if(!window.__acceptOriginalSay){window.__acceptOriginalSay=Core.Snd.say;Core.Snd.say=function(list){window.__accept.calls.push(...Array.from(list||[]).filter(x=>typeof x==='string'));return window.__acceptOriginalSay.apply(this,arguments);};}
    __test.go('lesson',{id,lang,done:()=>{window.__accept.done++;window.__accept.final=__lessonTest.state();__test.go('home');}});
  },{id,lang});
  await lib.page.waitForFunction(()=>window.__lessonTest,null,{timeout:8000});
}
async function prompt(lib){
  try { await lib.page.waitForFunction(()=>window.__lessonTest&&__lessonTest.state().phase==='prompt'&&__lessonTest.state().promptOpen,null,{timeout:90000});await lib.waitPromptFree(); }
  catch(error){ const context=await lib.page.evaluate(()=>({screen:__test.screen(),state:window.__lessonTest&&__lessonTest.state(),done:window.__accept&&__accept.done,recentAudio:window.__accept&&__accept.calls.slice(-8)}));throw new Error('Prompt not available: '+JSON.stringify(context)+'; '+error.message); }
}
async function choose(lib,id){
  const sel='.ls-tile[data-choice="'+id+'"]';
  await lib.page.locator(sel).waitFor({state:'visible'});
  await lib.page.waitForFunction(s=>{const t=document.querySelector(s);return t&&!t.getAnimations({subtree:true}).some(a=>a.playState==='running');},sel,{timeout:5000});
  const r=await lib.page.evaluate(s=>{const t=document.querySelector(s),r=t.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,hit:!!hit&&hit.closest('.ls-tile')===t};},sel);
  assert(r.width>=150&&r.height>=110&&r.hit,'selected tile is settled, large and hit-testable: '+JSON.stringify(r));
  await lib.page.evaluate(s=>{window.__acceptDuplicateTile=document.querySelector(s);},sel);
  await lib.tapSel(sel);
}
async function completed(lib,id,lang){
  await lib.page.waitForFunction(()=>window.__accept.done===1,null,{timeout:120000});
  const r=await lib.page.evaluate(({id,lang})=>({audit:__accept,seen:Lesson.seen(lang,id),srs:JSON.stringify(Core.SRS.peek(lang,Lesson.word(id))),url:Core.url.w(lang,Lesson.word(id)),record:Core.L(lang).lessons[id]}),{id,lang});
  assert.equal(r.seen,r.audit.before+1,'one completion record');assert.equal(r.audit.done,1);assert.equal(r.srs,r.audit.srs,'end-card exposure does not alter SRS');
  assert.equal(r.audit.calls.filter(u=>u===r.url).length,2,'active-language word requested twice through real audio');
  await lib.page.evaluate(()=>Core.flushNow());await lib.page.reload();await lib.page.waitForFunction(()=>window.__test&&__test.screen()==='home');await lib.page.evaluate(()=>__test.speedUp(8));
  const saved=await lib.page.evaluate(({id,lang})=>Core.L(lang).lessons[id],{id,lang});assert.deepEqual(saved,r.record,'completion survives browser localStorage reload');
  return r;
}
async function branches(lib,ids){
  for(const id of ids){
    const choices=await lib.page.evaluate(i=>LESSON_DATA.lessons[i].beats.find(b=>b.prompt).prompt.choices.map(c=>c.id),id);
    for(let index=0;index<choices.length;index++){
      const choice=choices[index],lang=['pt','en','de'][ids.indexOf(id)%3];console.log('BRANCH '+id+' '+choice+' '+lang);
      await start(lib,id,lang);await prompt(lib);
      if(index===0){
        await lib.page.evaluate(()=>{Core.speed=1;Core.fast=false;});await lib.tapSel('.ls-bar .b-speaker');
        assert(await lib.page.evaluate(()=>__lessonTest.handle.flow.promptActive()),'real replay owns answer gate');
        const n=(await state(lib)).picks.length;await lib.tapSel('.ls-tile[data-choice="'+choice+'"]');
        assert.equal((await state(lib)).picks.length,n,'tap during replay is ignored');
        await lib.waitPromptFree();await lib.page.evaluate(()=>{Core.speed=8;Core.fast=true;});
      }
      await choose(lib,choice);
      // Rapid second input uses real pointer dispatch while the first outcome is pending.
      await lib.page.evaluate(()=>{const t=window.__acceptDuplicateTile;if(t)t.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',isPrimary:true}));});
      if(id==='hist_tiles'&&choice==='other'){await prompt(lib);await choose(lib,'other');}
      const r=await completed(lib,id,lang);const calls=r.audit.calls;
      assert.equal(r.audit.final.picks.length,id==='hist_tiles'&&choice==='other'?2:1,'rapid input adds no extra prediction attempts');
      if(id==='hist_castle'){const own=choice==='tower'?'5a':'5b',other=choice==='tower'?'5b':'5a';assert.equal(calls.filter(u=>u.includes('cs_hist_castle_'+own+'.ogg')).length,1);assert(!calls.some(u=>u.includes('cs_hist_castle_'+other+'.ogg')),'unchosen castle branch stays silent');}
      if(id==='more'){assert.equal(calls.filter(u=>u.includes('cs_more_count.ogg')).length,choice==='small'?1:0,'basket response follows identity');}
      if(id==='hist_tiles'&&choice==='other')assert.equal(calls.filter(u=>u.includes('cs_hist_tiles_4x.ogg')).length,1,'one retry then assistance');
    }
  }
}
async function idle(lib,ids){for(const id of ids){console.log('IDLE '+id);await start(lib,id);await prompt(lib);await lib.page.evaluate(()=>Core.speed=3);await lib.page.waitForFunction(()=>__lessonTest.state().repeated,null,{timeout:16000});const s=await state(lib);assert(s.pulsed,'idle highlights choices');await lib.page.waitForFunction(()=>__lessonTest.state().picks.length===1,null,{timeout:22000});const picked=await state(lib);assert(picked.picks[0].auto,'idle progresses automatically');await lib.page.evaluate(()=>Core.speed=8);await completed(lib,id,'pt');}}
async function cancel(lib,ids){for(const id of ids){console.log('CANCEL '+id);await start(lib,id);await prompt(lib);await lib.tapSel('.ls-bar .b-back');await lib.page.waitForFunction(()=>__test.screen()==='home');const before=await lib.page.evaluate(()=>({calls:__accept.calls.length,done:__accept.done}));await sleep(2500);const r=await lib.page.evaluate(i=>({screen:__test.screen(),hook:!!window.__lessonTest,calls:__accept.calls.length,done:__accept.done,seen:Lesson.seen('pt',i),initial:__accept.before}),id);assert.equal(r.screen,'home');assert(!r.hook);assert.equal(r.done,0);assert.equal(r.seen,r.initial);assert.equal(r.calls,before.calls,'no stale narration after Back');}}
async function pathCase(lib,ids){
  for(const known of [false,true]){
    const target=ids[0];console.log('PATH '+target+' known='+known);
    const seeded=await lib.page.evaluate(({target,known})=>{
      __test.go('home');Core.lang='pt';Core.save.settings.enabled.pt=true;Core.save.settings.ruHelp=false;
      const L=Core.L('pt');L.lessons={};LESSON_DATA.order.slice(0,LESSON_DATA.order.indexOf(target)).forEach((id,n)=>L.lessons[id]={seen:1,last:n+1});
      const word=Lesson.word(target);if(known)L.words[word]={box:2,heard:3,due:Core.today()+5};else delete L.words[word];
      const S=Path.newSession('pt');S.plan=['L','MV','B1','R'];S.step=0;S.newA=[];S.newB=[];S.queue=[];S.lessonsSeen={};S.paid={};S.lastLessonDomain=null;S.lessonId=null;
      const result={word,stars:Core.save.stars,srs:JSON.stringify(Core.SRS.peek('pt',word)),other:JSON.stringify(Core.L('de'))};Core.persist();Path.go();return result;
    },{target,known});
    await prompt(lib);await lib.page.evaluate(()=>Core.flushNow());await lib.page.reload();await lib.page.waitForFunction(()=>window.__test&&__test.screen()==='home');await lib.page.evaluate(()=>__test.speedUp(8));
    await lib.tapSel('.path-play');await prompt(lib);
    assert.equal(await lib.page.evaluate(()=>__lessonTest.id),target,'reload resumes selected lesson');
    const choice=await lib.page.evaluate(()=>document.querySelector('.ls-tile').dataset.choice);await choose(lib,choice);
    await lib.page.waitForFunction(()=>__test.screen()==='pmove',null,{timeout:120000});
    const r=await lib.page.evaluate(({word,target})=>({stars:Core.save.stars,seen:Lesson.seen('pt',target),srs:JSON.stringify(Core.SRS.peek('pt',word)),queue:Path.session('pt').queue,other:JSON.stringify(Core.L('de'))}),{word:seeded.word,target});
    assert.equal(r.stars,seeded.stars+1,'one path step reward after resumed completion');assert.equal(r.seen,1);assert.equal(r.srs,seeded.srs,'lesson exposure alone leaves actual SRS unchanged');assert.equal(r.other,seeded.other,'other-language save unchanged');assert.equal(r.queue.filter(x=>x===seeded.word).length,known?0:1,'word queues once only when unknown');
    await lib.page.evaluate(()=>Core.flushNow());await lib.page.reload();await lib.page.waitForFunction(()=>window.__test&&__test.screen()==='home');await lib.page.evaluate(()=>__test.speedUp(8));await lib.tapSel('.path-play');
    await lib.page.waitForFunction(()=>__test.screen()==='pmeet',null,{timeout:20000});
    const meet=await lib.page.evaluate(word=>({words:UI.p.words,queue:Path.session('pt').queue,stars:Core.save.stars,card:!!document.querySelector('.meet[data-id="'+word+'"]')}),seeded.word);
    assert.equal(meet.stars,seeded.stars+1,'movement reload does not duplicate lesson reward');
    if(!known){assert.equal(meet.words[0],seeded.word,'next real Meet starts with lesson word');assert(meet.card,'queued word is rendered on Meet');assert(!meet.queue.includes(seeded.word),'Meet consumes queue');await lib.page.waitForFunction(w=>Core.SRS.peek('pt',w).box===1,seeded.word,{timeout:10000});}
    else assert(!meet.words.includes(seeded.word),'known lesson word excluded from new Meet');
    await lib.page.evaluate(()=>__test.go('home'));
  }
}

(async()=>{const lib=await boot({viewport:{width,height:width===1128?752:1080},speed:8});let code=0;try{const ids=selectLessons(await lib.page.evaluate(()=>LESSON_DATA.order.filter(id=>id==='repka'||id==='more'||id.startsWith('hist_'))),arg('lesson',null));assert(ids.length);if(kind==='path')await pathCase(lib,ids);else if(kind==='branches')await branches(lib,ids);else if(kind==='idle')await idle(lib,ids);else if(kind==='cancel')await cancel(lib,ids);else if(kind==='missing'){
  const id=ids[0];await lib.page.evaluate(()=>{window.__missingOriginal=Core.Snd.say;Core.Snd.say=function(list){if(list.some(u=>typeof u==='string'&&u.includes('/ui/ru_cs_')))return Promise.resolve(false);return window.__missingOriginal.apply(this,arguments);};Core.fast=false;});
  await start(lib,id);await prompt(lib);const choice=await lib.page.evaluate(()=>document.querySelector('.ls-tile').dataset.choice);await choose(lib,choice);await completed(lib,id,'pt');
}else throw new Error('unknown case '+kind);console.log('ACCEPT '+kind+' '+width+' OK');}catch(e){lib.fail(e.stack||String(e));code=1;}code=(await lib.finish('FOCUSED LESSON ACCEPTANCE'))||code;process.exit(code);})();
