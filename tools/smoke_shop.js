/* Parent-owned single browser chain. Real Shop DOM tap + drag checks; no TTS/network generation. */
'use strict';
const {boot,sleep}=require('./mg_lib');
const H=require('./shop_smoke_helpers');
async function run(lib){
 const {page}=lib;let network=[];page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 async function seed(rec,base='ru',known=false,wait=true){await page.evaluate(([r,b,k])=>{const l=Core.curLang();Core.save.settings.ruHelp=true;Core.save.settings.baseLang=b;if(!Core.L(l).minigames)Core.L(l).minigames={};Core.L(l).minigames.shop=r;Core.worldItems('food').forEach(id=>{Core.L(l).words[id]={box:k?1:0,next:0};});Core.persist();Core.flushNow();__test.go('minigame',{lang:l,world:'numbers',game:'shop'});},[rec,base,known]);if(wait)await ready(0,known?'basket':'pay');}
 async function ready(round,phase='pay'){await page.waitForFunction(([r,p])=>window.__mgTest&&__mgTest.id==='shop'&&__mgTest.state().round===r&&__mgTest.state().phase===p&&!__mgTest.state().locked&&!MG.cur.prompting(),[round,phase],{timeout:25000});lib.expect(H.ready(await lib.gameState(),await page.evaluate(()=>MG.cur.prompting()),round,phase),'Shop ready phase '+phase+' round '+round);}
 const money=id=>'.mg-shop .mgs-money[data-money="'+id+'"]';
 async function put(id,drag=false){await lib.waitPromptFree();await H.waitSettled(page,money(id));if(drag){await lib.dragMouse(await lib.center(money(id)),await lib.center('.mgs-pay'));}else await lib.tapSel(money(id));}
 async function bell(){await lib.waitPromptFree();await lib.tapSel('.mgs-bell');await lib.waitPromptFree();}
 const initial=await page.evaluate(()=>({misses:FX.misses,stars:Core.save.stars}));
 await seed({});for(const [w,h] of [[1366,768],[1128,752]]){await page.setViewportSize({width:w,height:h});await sleep(100);const boxes=await page.locator('.mg-shop .mgs-money').evaluateAll(ns=>ns.filter(n=>!n.classList.contains('mgs-hide')).map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};}));lib.expect(boxes.every(b=>b.w>=110&&b.h>=110),'Shop110px targets '+w);lib.expect(boxes.every((b,i)=>boxes.every((a,j)=>i===j||b.x+b.w<=a.x||a.x+a.w<=b.x||b.y+b.h<=a.y||a.y+a.h<=b.y)),'Shop money cells do not overlap '+w);await lib.shot('shop_euro_'+w);}
 const before=await page.evaluate(()=>JSON.stringify(Core.L(Core.curLang()).words));
 // Protected replay must block a real tap and release after the held ended event.
 await lib.holdAudio();await page.evaluate(()=>MG.cur.replay());await page.waitForFunction(()=>__mgHeldAudio.pending.length>0);
 const lockedPayment=(await lib.gameState()).payment;await lib.tapSel(money('w0'));lib.expect((await lib.gameState()).payment===lockedPayment,'real tap during protected amount replay has no effect');await lib.releaseAudio();await ready(0);
 // Synthetic pointercancel verifies the DOM event route; physical multi-touch stays a device check.
 await page.evaluate(()=>{const n=document.querySelector('.mgs-money[data-money="w0"]'),b=n.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;n.dispatchEvent(new PointerEvent('pointerdown',{pointerId:701,pointerType:'touch',clientX:x,clientY:y,bubbles:true}));window.dispatchEvent(new PointerEvent('pointermove',{pointerId:701,pointerType:'touch',clientX:x+30,clientY:y-30}));window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:701,pointerType:'touch',clientX:x+30,clientY:y-30}));});lib.expect((await lib.gameState()).payment===0,'DOM pointercancel preserves payment');

 await H.waitSettled(page,money('w0'));const stray=await lib.center(money('w0'));await lib.dragMouse(stray,{x:5,y:5});lib.expect((await lib.gameState()).payment===0,'off-target real drag preserves payment');
 await put('w0',true);lib.expect((await lib.gameState()).payment===100,'real drag pays €1');await put('w0');lib.expect((await lib.gameState()).payment===0,'tap undoes payment');
 await put('w1');await ready(1);await put('w0');await put('w1',true);await ready(2);await put('w0');await put('w1');await ready(2,'change');await put('t0');await page.waitForFunction(()=>__test.screen()==='result');
 let saved=await page.evaluate(()=>Core.L(Core.curLang()).minigames.shop);lib.expect(saved.visits===1&&saved.plays===1,'Shop activity and framework completion recorded once');lib.expect(await page.evaluate(()=>JSON.stringify(Core.L(Core.curLang()).words))===before,'money-only activity leaves SRS unchanged');
 // A second real framework finish must retain mutable stars/plays plus activity progress.
 await seed({stars:3,plays:1,nextActivity:0,visits:1});await put('w1');await ready(1);await put('w0');await put('w1');await ready(2);await put('w0');await put('w1');await ready(2,'change');await put('t0');await page.waitForFunction(()=>__test.screen()==='result');
 saved=await page.evaluate(()=>Core.L(Core.curLang()).minigames.shop);lib.expect(saved.visits===2&&saved.plays===2&&saved.stars===3,'second free-play finish keeps mutable legacy stars/plays');
 // Known-food language answer uses a real touch, with the actual question target, before money actions.
 await seed({},'en',true);const target=await page.evaluate(()=>MG.cur.target),wordsBefore=await page.evaluate(()=>JSON.parse(JSON.stringify(Core.L(Core.curLang()).words)));
 await lib.tapSel('.mg-shop .mgs-good[data-item="'+target+'"]');await ready(0);const wordsAfter=await page.evaluate(()=>Core.L(Core.curLang()).words);
 lib.expect(Object.keys(wordsBefore).filter(id=>JSON.stringify(wordsBefore[id])!==JSON.stringify(wordsAfter[id])).every(id=>id===target),'grocery answer changes only asked vocabulary');lib.expect(wordsAfter[target].box>wordsBefore[target].box,'unhelped grocery answer earns actual vocabulary credit');
 // Hold playback and verify Back releases ownership while audio is pending.
 await lib.holdAudio();await seed({},'en',false,false);await page.waitForFunction(()=>__mgHeldAudio.pending.length>0);await lib.tapSel('.mg-shop .topbar .b-back');await lib.releaseAudio();await sleep(100);lib.expect((await lib.screen())!=='minigame','Back during held Shop audio exits');
 for(const [name,index] of [['count',1],['recognition',2],['exchange',4],['mixed',6],['euro_revisit',7]]){await seed({nextActivity:index,visits:index});await lib.shot('shop_'+name);if(index===2){await put('w1');await ready(1);await lib.shot('shop_cent_recognition');await put('w1');await ready(2);await lib.shot('shop_euro_recognition');}}
 await page.evaluate(()=>{window.__shopUrls=[];const original=Core.Snd.say;Core.Snd.say=function(list,opts){window.__shopUrls.push(...[].concat(list).filter(u=>typeof u==='string'));return original.call(this,list,opts);};});
 await seed({skills:[7],nextActivity:9,visits:9,passportAnchor:9},'en');await bell();lib.expect((await lib.gameState()).phase==='pay','insufficient payment remains pay');await put('w0',true);await bell();await ready(0,'change');await lib.shot('shop_l7_change');await put('t0');await put('t0');lib.expect((await lib.gameState()).change===0,'change undo works');await put('t2');await ready(1);await put('w0');await put('w1');await bell();await ready(2);lib.expect((await lib.gameState()).change===0,'zero change advances');
 lib.expect(H.badAudio(await page.evaluate(()=>window.__shopUrls),'en').length===0,'English Shop instructions use authored base English and monetary UI URLs');
 await page.evaluate(()=>{Core.save.settings.ruHelp=false;window.__shopUrls=[];});await lib.tapSel('.mg-shop .top-help');await lib.waitPromptFree();lib.expect(!(await page.evaluate(()=>window.__shopUrls)).some(u=>/lisa_(shop_|cur_|fact_)/.test(u)),'help-off requests no Shop instruction clips');
 await seed({skills:[7],nextActivity:9,visits:13,passportAnchor:9,passportCursor:3});lib.expect((await lib.gameState()).currency==='JPY','cadence forces JPY value-card visit');lib.expect(await page.locator('.mgs-pay.mgs-tray').count()===1,'JPY tray');await lib.shot('shop_jpy_tray');
 const cid=(await lib.gameState()).activityId;await page.reload();await page.waitForFunction(()=>window.__test&&__test.screen()==='home');await page.evaluate(()=>{__test.speedUp(8);__test.go('minigame',{lang:Core.curLang(),world:'numbers',game:'shop'});});await ready(0);lib.expect((await lib.gameState()).activityId===cid,'reload keeps unfinished passport identity');
 await lib.tapSel('.mg-shop .topbar .b-back');await sleep(100);
 lib.expect(network.length===0,'Shop offline run made no HTTP request');
 lib.expect(await page.evaluate(()=>FX.misses)===initial.misses,'Shop errorless actions preserve misses');
}
module.exports={run};if(require.main===module)(async()=>{const lib=await boot({speed:8});try{await run(lib);}catch(e){lib.fail(e.stack||String(e));}process.exitCode=await lib.finish('SHOP');})();
