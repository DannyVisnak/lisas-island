'use strict';
function ready(state,prompting,round,phase){return !!state&&state.round===round&&state.phase===phase&&!state.locked&&!prompting;}
function badAudio(urls,base){return urls.filter(u=>typeof u==='string'&&(/mg_shop_/.test(u)||/audio\/(?:pt|en|de)\/r\d+(?:_q)?\.ogg/.test(u)||(/audio\/ui\/(?:ru|en)_lisa_(?:shop_|cur_|fact_)/.test(u)&&!u.includes('/'+base+'_lisa_'))));}
function settled(s){return !!s&&s.attached&&!s.classes.some(x=>x==='mgback'||x==='mgdragging')&&(/^(?:none|0px(?: 0px)?)$/.test(s.translate))&&(/^(?:none|1(?: 1)?)$/.test(s.scale))&&s.hit;}
async function waitSettled(page,selector,timeout=5000){
 const end=Date.now()+timeout;let last;
 do{last=await page.evaluate(sel=>{const n=document.querySelector(sel);if(!n)return {attached:false};const c=getComputedStyle(n),b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {attached:n.isConnected,classes:Array.from(n.classList),translate:c.translate,scale:c.scale,hit:hit===n||n.contains(hit)};},selector);if(settled(last))return;await page.waitForTimeout(25);}while(Date.now()<end);
 throw new Error('Shop gesture target did not settle '+selector+': '+JSON.stringify(last));
}
module.exports={ready,badAudio,settled,waitSettled};
