'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(rec,known){
 class N{constructor(cls){this.children=[];this.style={setProperty(){}};this.dataset={};this.attrs={};this.events={};let s=new Set((cls||'').split(' '));this.classList={add:(...x)=>x.forEach(v=>s.add(v)),remove:(...x)=>x.forEach(v=>s.delete(v)),contains:x=>s.has(x),toggle:(x,on)=>on?s.add(x):s.delete(x)};}appendChild(n){this.children.push(n);n.parentNode=this;return n;}set innerHTML(x){this.html=x;this.children=[];}get innerHTML(){return this.html||'';}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,v){this.events[k]=v;}removeEventListener(k){delete this.events[k];}}
 const root=new N('screen mg mg-shop'),lang={minigames:{shop:rec||{}}},kills=[],handles=[],sounds=[],credits=[],ctx={lang:'pt',locked:false,finished:false,target:null,flow:{dead:false,onKill:f=>kills.push(f),wait:async()=>{},say:async l=>sounds.push(l)},chrome(){},placeLisa(){},prompting(){return this.busy;},async prompt(l){sounds.push(l);this.busy=true;await Promise.resolve();this.busy=false;},ruUrl:k=>'audio/ui/ru_'+k+'.ogg',askUrl:k=>'q/'+k,wordUrl:k=>'w/'+k,setTarget(k){this.target=k;this.locked=!k;},setPromptTargets(){},progress(){},lock(v){this.locked=v;},onPeek(f){this.peek=f;},onAssist(f){this.assist=f;},onHelp(){},glow(){},wiggle(){},async correct(n,id){credits.push(id);this.locked=true;},other:async()=>{},async finish(){this.finished=true;this.finishes=(this.finishes||0)+1;},expose(o){this.extra=o;},async run(o){for(let i=0;i<o.targets.length&&!this.flow.dead;i++){this.setTarget(o.targets[i]);await o.play(o.targets[i],i);}if(!this.flow.dead)await this.finish();}};
 const c={window:null,Core:{D:{items:{apple:{pt:{word:'apple'}},banana:{pt:{word:'banana'}},orange:{pt:{word:'orange'}},milk:{pt:{word:'milk'}}},ui:{pt:{}}},Snd:{sfx(){}},SRS:{peek:()=>({box:known?1:0})},el:(tag,cl,html)=>{let n=new N(cl);n.innerHTML=html||'';return n;},L:()=>lang,persist(){},shuffle:a=>a.slice(),worldItems:()=>['apple','banana','orange','milk'],item:id=>({id}),Pic:{el:()=>new N()},baseText:()=>'',url:{q:(l,k)=>'q/'+k,ui:(l,k)=>'ui/'+l+'/'+k}},MG:{register(d){this.def=d;},drag(n,o){let h={node:n,options:o,disable(v){this.disabled=v;},reset(){},destroy(){this.destroyed=true;}};handles.push(h);return h;}},console};c.window=c;vm.createContext(c);for(const f of ['shop_rules','shop_contract','shop_activity','mg_shop']){const p=__dirname+'/../app/js/'+f+'.js';if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),c);}
 assert.ok(c.MG.def,'playable shop must register');const pending=c.MG.def.start(root,ctx);return {c,ctx,root,handles,lang,kills,sounds,credits,pending};
}
async function tick(){for(let i=0;i<30;i++)await Promise.resolve();}
test('real shop money controls ignore prompt input; exact alternate payments, undo and completion record once without vocabulary credit',async()=>{
 const s=setup();await tick();assert.equal(s.ctx.extra.state().phase,'pay');const money=()=>s.handles.filter(h=>!h.destroyed&&h.node.dataset.money);let hs=money();
 s.ctx.busy=true;hs[0].options.onTap();assert.equal(s.ctx.extra.state().payment,0);s.ctx.busy=false;
 hs[0].options.onTap();assert.equal(s.ctx.extra.state().payment,100);hs[0].options.onTap();assert.equal(s.ctx.extra.state().payment,0);
 hs[1].options.onTap();await tick();assert.equal(s.ctx.extra.state().round,1);
 hs=money();hs[0].options.onTap();hs[1].options.onTap();await tick();assert.equal(s.ctx.extra.state().round,2);
 hs=money();hs[0].options.onTap();hs[1].options.onTap();await tick();assert.equal(s.ctx.extra.state().phase,'change');hs.find(h=>h.node.dataset.money==='t0').options.onTap();await tick();assert.equal(s.ctx.finishes,1);assert.equal(s.lang.minigames.shop.visits,1);assert.ok(s.credits.every(x=>x===null));assert.ok(!s.sounds.flat().some(x=>typeof x==='string'&&x.includes('mg_shop_')));
});
test('Back destroys owned drag handlers and stale prompts never advance a round',async()=>{const s=setup();s.ctx.flow.dead=true;s.kills.forEach(f=>f());await tick();assert.ok(s.handles.every(h=>h.destroyed));assert.equal(s.ctx.finishes,undefined);});
test('level 7 bell rejects insufficient money, supports change undo, zero change and finishes once',async()=>{
 const s=setup({skills:[7],visits:9,nextActivity:9,passportAnchor:9});await tick();
 const h=id=>s.handles.find(h=>!h.destroyed&&h.node.dataset.money===id),bell=()=>s.handles.find(h=>!h.destroyed&&!h.node.dataset.money).options.onTap();
 bell();await tick();assert.equal(s.ctx.extra.state().phase,'pay');assert.equal(s.ctx.extra.state().payment,0);
 h('w0').options.onTap();bell();await tick();assert.equal(s.ctx.extra.state().phase,'change');h('t0').options.onTap();assert.equal(s.ctx.extra.state().change,1);h('t0').options.onTap();assert.equal(s.ctx.extra.state().change,0);h('t2').options.onTap();await tick();assert.equal(s.ctx.extra.state().round,1);
 h('w0').options.onTap();h('w1').options.onTap();bell();await tick();assert.equal(s.ctx.extra.state().round,2);
 h('w0').options.onTap();bell();await tick();assert.equal(s.ctx.extra.state().phase,'pay');h('w1').options.onTap();bell();await tick();h('t0').options.onTap();await tick();assert.equal(s.ctx.extra.state().round,3);
 h('w0').options.onTap();h('w1').options.onTap();bell();await tick();assert.equal(s.ctx.finishes,1);assert.equal(s.lang.minigames.shop.visits,10);assert.ok(s.credits.every(x=>x===null));
});
test('actual grocery question gives credit only for selected language item, never its monetary price',async()=>{
 const s=setup(undefined,true);await tick();assert.equal(s.ctx.extra.state().phase,'basket');const good=s.handles.find(h=>!h.destroyed&&h.node.dataset.item==='apple');await good.options.onTap();await tick();assert.equal(s.ctx.extra.state().phase,'pay');assert.deepEqual(s.credits,['apple']);s.handles.find(h=>!h.destroyed&&h.node.dataset.money==='w1').options.onTap();await tick();assert.deepEqual(s.credits,['apple',null]);
});
module.exports={setup,tick};
