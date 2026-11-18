'use strict';
function targetSettled(selector){
 const node=document.querySelector(selector),key=selector;
 const slots=window.__countryTargetSettle||(window.__countryTargetSettle={});
 if(!node||!node.isConnected){delete slots[key];return false;}
 for(let n=node;n;n=n.parentElement){const animations=n.getAnimations?n.getAnimations():[];if(animations.some(a=>a.effect&&Number.isFinite(a.effect.getComputedTiming().iterations)&&a.playState!=='finished'&&a.playState!=='idle')){delete slots[key];return false;}}
 const b=node.getBoundingClientRect(),rect=[b.x,b.y,b.width,b.height];
 const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
 if(!b.width||!b.height||!(hit===node||node.contains(hit))){delete slots[key];return false;}
 const prior=slots[key];slots[key]={node,rect};
 return !!prior&&prior.node===node&&rect.every((v,i)=>Math.abs(v-prior.rect[i])<0.5);
}
async function waitTarget(lib,selector){await lib.page.waitForFunction(targetSettled,selector,{polling:'raf',timeout:7000});}
module.exports={targetSettled,waitTarget};
