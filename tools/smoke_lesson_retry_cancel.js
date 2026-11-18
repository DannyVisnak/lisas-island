/* Focused history retry gate + Back cancellation; controller sole browser slot. */
const assert=require('node:assert/strict'),{boot,sleep}=require('./mg_lib');
function canceledLessonCalls(calls) {
 return calls.filter(url=>/ru_cs_hist_tiles_|ru_cs_hist_name\.ogg|\/(?:pt|en|de)\/azulejo(?:_q)?\.ogg/.test(url));
}
const width=Number((process.argv.find(x=>x.startsWith('--viewport='))||'--viewport=1128').split('=')[1]);
(async()=>{const lib=await boot({viewport:{width,height:width===1128?752:1080},speed:8});let code=0;
try{
 await lib.page.evaluate(()=>{window.__retryAudit={calls:[],done:0,before:Lesson.seen(Core.curLang(),'hist_tiles')};window.__retrySay=Core.Snd.say;Core.Snd.say=function(list){__retryAudit.calls.push(...list.filter(x=>typeof x==='string'));return __retrySay.apply(this,arguments);};__test.go('lesson',{id:'hist_tiles',done:()=>__retryAudit.done++});});
 await lib.page.waitForFunction(()=>window.__lessonTest&&__lessonTest.state().phase==='prompt',null,{timeout:60000});await lib.waitPromptFree();
 await lib.page.evaluate(()=>{Core.fast=false;Core.speed=1;});await lib.tapSel('.ls-tile[data-choice="other"]');
 await lib.page.waitForFunction(()=>__lessonTest.state().phase==='retry'&&__lessonTest.handle.flow.promptActive(),null,{timeout:5000});
 const before=await lib.page.evaluate(()=>__lessonTest.state().picks.length);await lib.tapSel('.ls-tile[data-choice="match"]');
 assert.equal(await lib.page.evaluate(()=>__lessonTest.state().picks.length),before,'retry audio owns answer gate');
 await lib.tapSel('.ls-bar .b-back');await lib.page.waitForFunction(()=>__test.screen()==='home');
 const after=await lib.page.evaluate(()=>({calls:__retryAudit.calls.length,urls:__retryAudit.calls.slice(),stars:Core.save.stars}));after.lessonCalls=canceledLessonCalls(after.urls).length;await sleep(3000);
 const r=await lib.page.evaluate(()=>({screen:__test.screen(),hook:!!window.__lessonTest,done:__retryAudit.done,seen:Lesson.seen(Core.curLang(),'hist_tiles'),before:__retryAudit.before,calls:__retryAudit.calls,stars:Core.save.stars}));
 assert.equal(r.screen,'home');assert(!r.hook);assert.equal(r.done,0);assert.equal(r.seen,r.before);assert.equal(r.stars,after.stars);assert.equal(canceledLessonCalls(r.calls).length,after.lessonCalls,'no continuation narration after Back');assert(!r.calls.some(u=>u.includes('cs_hist_tiles_5.ogg')),'canceled retry never reaches reveal');
 console.log('POST_BACK_DESTINATION_AUDIO '+JSON.stringify(r.calls.slice(after.calls)));
 console.log('RETRY CANCEL '+width+' OK');
}catch(e){lib.fail(e.stack||String(e));code=1;}code=(await lib.finish('HISTORY RETRY CANCEL'))||code;process.exit(code);})();
