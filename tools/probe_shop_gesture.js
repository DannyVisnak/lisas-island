/* Tiny controller-only probe: call run(lib) in the one owned browser. No app source edits. */
'use strict';
const {sleep}=require('./mg_lib');
async function run(lib){
 const {page}=lib;
 await page.evaluate(()=>{const lang=Core.curLang(),L=Core.L(lang);if(!L.minigames)L.minigames={};L.minigames.shop={};Core.worldItems('food').forEach(id=>{L.words[id]={box:0};});Core.persist();Core.flushNow();__test.go('minigame',{lang,world:'numbers',game:'shop'});});
 await page.waitForFunction(()=>window.__mgTest&&__mgTest.state().phase==='pay'&&!__mgTest.state().locked&&!MG.cur.prompting());
 await page.evaluate(()=>{window.__shopPointerLog=[];const fn=e=>{if(window.__shopPointerLog.length>=150)return;const t=e.target;window.__shopPointerLog.push({event:e.type,id:e.pointerId,kind:e.pointerType,button:e.button,target:t&&t.className,money:t&&t.dataset&&t.dataset.money,x:e.clientX,y:e.clientY,prompt:MG.cur&&MG.cur.prompting(),locked:MG.cur&&MG.cur.locked});};window.__shopProbeListener=fn;['pointerdown','pointerup','pointercancel'].forEach(k=>window.addEventListener(k,fn,true));});
 const selector='.mgs-money[data-money="w0"]',rows=[];
 async function snap(label){rows.push(await page.evaluate(label=>{const n=document.querySelector('.mgs-money[data-money="w0"]'),b=n.getBoundingClientRect(),p=document.querySelector('.mgs-pay').getBoundingClientRect(),css=getComputedStyle(n),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {label,state:__mgTest.state(),money:{class:n.className,left:n.style.left,top:n.style.top,translate:n.style.translate,computedTranslate:css.translate,scale:css.scale,rect:{x:b.x,y:b.y,w:b.width,h:b.height}},pay:{x:p.x,y:p.y,w:p.width,h:p.height},hit:{class:hit&&hit.className,money:hit&&hit.dataset&&hit.dataset.money},pointer:window.__shopPointerLog.splice(0)};},label));}
 await snap('clean');await lib.tapSel(selector);await snap('clean touch tap');await lib.tapSel(selector);await snap('clean touch undo');
 await lib.dragMouse(await lib.center(selector),await lib.center('.mgs-pay'));await snap('clean mouse drag');
 if((await lib.gameState()).payment)await lib.tapSel(selector);await sleep(350);
 await lib.dragMouse(await lib.center(selector),{x:5,y:5});await snap('offtarget immediate');await lib.dragMouse(await lib.center(selector),await lib.center('.mgs-pay'));await snap('immediate drag after offtarget');
 if((await lib.gameState()).payment)await lib.tapSel(selector);await sleep(350);await snap('settled');await lib.dragMouse(await lib.center(selector),await lib.center('.mgs-pay'));await snap('settled mouse drag');
 await page.evaluate(()=>{const fn=window.__shopProbeListener;['pointerdown','pointerup','pointercancel'].forEach(k=>window.removeEventListener(k,fn,true));delete window.__shopProbeListener;});
 console.log('SHOP GESTURE PROBE '+JSON.stringify(rows));return rows;
}
async function runSettled(lib){
 const {page}=lib,H=require('./shop_smoke_helpers');await page.setViewportSize({width:1128,height:752});
 await page.evaluate(()=>{const lang=Core.curLang(),L=Core.L(lang);if(!L.minigames)L.minigames={};L.minigames.shop={};Core.worldItems('food').forEach(id=>L.words[id]={box:0});Core.persist();Core.flushNow();__test.go('minigame',{lang,world:'numbers',game:'shop'});});
 await page.waitForFunction(()=>window.__mgTest&&__mgTest.state().phase==='pay'&&!MG.cur.prompting());const sel='.mgs-money[data-money="w0"]';await H.waitSettled(page,sel);
 await page.evaluate(()=>{const n=document.querySelector('.mgs-money[data-money="w0"]'),b=n.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;n.dispatchEvent(new PointerEvent('pointerdown',{pointerId:701,pointerType:'touch',clientX:x,clientY:y,bubbles:true}));window.dispatchEvent(new PointerEvent('pointermove',{pointerId:701,pointerType:'touch',clientX:x+30,clientY:y-30}));window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:701,pointerType:'touch',clientX:x+30,clientY:y-30}));});await H.waitSettled(page,sel);
 await lib.dragMouse(await lib.center(sel),{x:5,y:5});await H.waitSettled(page,sel);await lib.dragMouse(await lib.center(sel),await lib.center('.mgs-pay'));lib.expect((await lib.gameState()).payment===100,'settled postcancel/poststray real drag pays euro1');await H.waitSettled(page,sel);await lib.tapSel(sel);lib.expect((await lib.gameState()).payment===0,'settled real touch undo');console.log('SHOP SETTLED PROBE '+JSON.stringify(await lib.gameState()));
}
module.exports={run,runSettled};
