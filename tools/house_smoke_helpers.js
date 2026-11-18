'use strict';
const assert=require('node:assert/strict');
function validateP3Boundary(button,picture,scaledRem) {
 assert.ok(Number.isFinite(scaledRem)&&scaledRem>0,'actual scaled rem is finite');
 assert.ok(button.width>=110&&button.height>=110,'every visible topbar button remains >=110px');
 assert.ok(button.bottom<=picture.top+.01,'button bottom is above picture top (only .01px subpixel epsilon): '+JSON.stringify({button,picture}));
 assert.ok(button.bottom-picture.borderTop<=.6*scaledRem+.5,'border intrusion stays <=.6 scaled rem +.5px: '+JSON.stringify({intrusion:button.bottom-picture.borderTop,limit:.6*scaledRem+.5,button,picture}));
}
function validateP3Button(button,picture,scaledRem) {
 validateP3Boundary(button.rect,picture,scaledRem);
 if(button.active)assert.ok(button.hit,'active topbar button owns its center hit: '+button.className);
}
function bboxEqual(a,b){return !!a&&!!b&&['x','y','width','height'].every(k=>Number.isFinite(a[k])&&a[k]===b[k]);}
function tapPoint(r,min=0){assert.ok(r.connected&&r.visible&&r.hit,'mounted original node owns its center hit');assert.ok(r.width>=min&&r.height>=min,`target is at least ${min}px square: ${JSON.stringify(r)}`);return {x:r.left+r.width/2,y:r.top+r.height/2};}
function finiteAnimationsSettled(node){return !!node&&node.isConnected&&node.getAnimations({subtree:true}).filter(a=>a.effect&&Number.isFinite(a.effect.getComputedTiming().iterations)).every(a=>a.playState==='finished'||a.playState==='idle');}
function withoutLook(save){const clone=JSON.parse(JSON.stringify(save));if(clone.house)delete clone.house.look;return clone;}
function promptCount(events,base){return events.flatMap(e=>e.urls||[]).filter(x=>x===`audio/ui/${base}_house_pick.ogg`).length;}
function classicVariant(registry,key){assert.ok(Object.prototype.hasOwnProperty.call(registry,key),'authored key exists');return registry[key].def;}
function validateLegacyComparison(captures,comparison){
 assert.ok(Array.isArray(comparison),'comparison callback returns one result per capture region');const required=captures.flatMap(c=>c.regions.map(r=>c.name+'|'+r.selector));assert.deepEqual(comparison.map(r=>r.name+'|'+r.selector).sort(),required.sort(),'every old/new region compared exactly once');for(const r of comparison)assert.equal(r.mismatchedPixels,0,'A1 requires exact zero differing pixels: '+JSON.stringify(r));
}
async function originalTarget(page,selector,{min=0,hit=true}={}){
 const node=await page.locator(selector).first().elementHandle();assert.ok(node,'original target exists: '+selector);
 try {
  await page.waitForFunction(finiteAnimationsSettled,node,{timeout:7000});
  await page.waitForFunction(({n,min,hit})=>{if(!n.isConnected)return false;const r=n.getBoundingClientRect(),s=getComputedStyle(n),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>=min&&r.height>=min&&(!hit||(h&&(h===n||n.contains(h))));},{n:node,min,hit},{timeout:7000});
  const sample=await node.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {connected:n.isConnected,visible:s.display!=='none'&&s.visibility!=='hidden',left:r.left,top:r.top,width:r.width,height:r.height,hit:!!h&&(h===n||n.contains(h))};});
  return {sample,point:tapPoint({...sample,hit:hit?sample.hit:true},min)};
 }finally{await node.dispose();}
}
async function tapStable(lib,selector,options){const {point}=await originalTarget(lib.page,selector,options);await lib.tapAt(point.x,point.y);return point;}
async function waitHouse(lib,predicate,arg,timeout=18000){await lib.page.waitForFunction(({source,arg})=>{const state=window.__houseTest&&__houseTest.state();return !!state&&(0,eval)('('+source+')')(state,arg);},{source:predicate.toString(),arg},{timeout});return lib.page.evaluate(()=>__houseTest.state());}
async function waitIdle(lib){return waitHouse(lib,s=>!s.busy);}
async function classicStage(lib,stage){
 const before=await waitHouse(lib,(s,n)=>s.picker==='stage'&&s.stage===n-1&&!s.busy,stage);
 assert.equal(before.stage,stage-1,'due stage is uncommitted before tap');
 const key=await lib.page.evaluate(n=>HouseVariantRules.stagePartOf(n),stage);
 const v=await lib.page.evaluate(k=>House.VARIANTS[k].def,key);
 await tapStable(lib,`.hvar[data-v="${v}"]`,{min:110});
 await waitHouse(lib,(s,n)=>s.stage===n&&!s.busy,stage);
}
async function classicGiftStyle(lib,id,options={}){
 const state=await waitHouse(lib,(s,id)=>s.picker==='style'&&s.pickerKey===id&&!s.busy,id);
 const before=await lib.page.evaluate(()=>({gifts:Core.house().gifts,owned:Core.house().owned.slice()}));assert.ok(!before.owned.includes(id),'noun choice alone did not commit item');
 const v=await lib.page.evaluate(k=>House.VARIANTS[k].def,id);await tapStable(lib,`.hvar[data-v="${v}"]`,{min:110});
 if(options.wait!==false)await waitHouse(lib,(s,id)=>s.owned.includes(id)&&!s.busy,id);return {state,before};
}
module.exports={validateP3Boundary,validateP3Button,validateLegacyComparison,bboxEqual,tapPoint,finiteAnimationsSettled,withoutLook,promptCount,classicVariant,originalTarget,tapStable,waitHouse,waitIdle,classicStage,classicGiftStyle};
