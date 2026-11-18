'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./test_shop_runtime');
const A=require('../app/js/shop_activity'),R=require('../app/js/shop_rules');
function all(n){return [n,...n.children.flatMap(all)];}
function h(s,id){return s.handles.find(h=>!h.destroyed&&h.node.dataset.money===id);}
async function atFind(){const s=setup({nextActivity:7,visits:7});await tick();for(const ids of [['w0','w1'],['w0','w1','w2'],['w0','t0','t1']]){for(const id of ids){h(s,id).options.onTap();await tick();}}assert.equal(s.ctx.extra.state().round,3);return s;}
test('only appended note rounds; all previous rounds byte-equivalent to historical contract',()=>{
 const fs=require('node:fs'),old=JSON.parse(fs.readFileSync('tools/fixtures/approved/shop/OPUS_DESIGN.json','utf8')).activityProtocol.activities;assert.equal(A.activities.L6revisit.rounds.length,5);for(const [name,a] of Object.entries(old)){if(name==='L6revisit')assert.deepEqual(A.activities[name].rounds.slice(0,3),a.rounds);else assert.deepEqual(A.activities[name].rounds,a.rounds);}
});
test('note-only find enforces wrong-coin feedback, exact art/span, hint and no exact narration or vocabulary credit',async()=>{
 const s=await atFind();assert.equal(s.ctx.extra.state().price,500);assert.equal(h(s,'w0').node.style.left,'3.8rem');assert.equal(h(s,'w1').node.style.left,'31.8rem');assert.ok(h(s,'w0').node.classList.contains('mgs-notecell'));assert.equal(all(h(s,'w0').node).find(n=>n.src).src,'img/shop/eur_5_specimen.png');
 let glow;s.ctx.glow=n=>glow=n;s.ctx.assist();assert.equal(glow,h(s,'w0').node);let wiggles=0,misses=0;s.ctx.wiggle=()=>wiggles++;s.ctx.other=async()=>misses++;assert.ok(s.ctx.ruUrl('help').includes('lisa_shop_find'));const before=s.credits.length;
 for(const id of ['w1','w2']){h(s,id).options.onTap();await tick();assert.equal(s.ctx.extra.state().payment,0);}assert.equal(wiggles,2);assert.equal(misses,0);assert.equal(s.credits.length,before);
 const mark=s.sounds.length;h(s,'w0').options.onTap();h(s,'w0').options.onTap();await tick();assert.equal(s.ctx.extra.state().round,4);assert.ok(!s.sounds.slice(mark).flat().some(x=>String(x).includes('lisa_shop_exact')));assert.equal(s.sounds.flat().filter(x=>String(x).includes('lisa_shop_note')).length,1);s.ctx.flow.dead=true;s.kills.forEach(f=>f());
});
test('note exchange supports undo, drag, conservation, idempotent completion and unchanged clock',async()=>{
 const s=await atFind();h(s,'w0').options.onTap();await tick();const find=c=>all(s.root).find(n=>n.classList.contains(c));assert.equal(find('mgs-pay').style.width,'43.2rem');assert.equal(find('mgs-change').style.left,'47rem');
 h(s,'w0').options.onTap();assert.equal(s.ctx.extra.state().payment,100);h(s,'w0').options.onTap();assert.equal(s.ctx.extra.state().payment,0);
 for(const id of ['w0','w1','w2']){h(s,id).options.onDrop(find('mgs-pay'));await tick();}assert.equal(s.ctx.extra.state().phase,'change');assert.equal(h(s,'t0').node.style.left,'84.8rem');assert.equal(s.sounds.flat().filter(x=>String(x).includes('lisa_shop_note')).length,2);
 s.ctx.busy=true;h(s,'t0').options.onTap();assert.equal(s.ctx.extra.state().change,0);s.ctx.busy=false;h(s,'t0').options.onDrop(find('mgs-change'));h(s,'t0').options.onTap();await tick();assert.equal(s.ctx.finishes,1);assert.equal(s.lang.minigames.shop.visits,8);assert.equal(s.lang.minigames.shop.nextActivity,8);assert.ok(s.credits.every(x=>x===null));
 const a=A.select({nextActivity:7,visits:7},'pt');let r=R.createRound(A.round(a,4));const total=r.money.reduce((v,m)=>v+m.value,0);for(const [id,to] of [['w0','payment'],['w0','wallet'],['w1','payment'],['w2','payment'],['w0','payment'],['t0','change'],['t0','till']]){r=R.move(r,id,to);assert.equal(r.money.reduce((v,m)=>v+m.value,0),total);}assert.equal(R.status(r).change,0);const reset=R.restart(r);assert.equal(R.status(reset).payment,0);assert.equal(R.status(reset).change,0);
});
test('Back in note find/exchange destroys handlers and restarting retains unfinished activity',async()=>{for(const exchange of [false,true]){const s=await atFind();if(exchange){h(s,'w0').options.onTap();await tick();}s.ctx.flow.dead=true;s.kills.forEach(f=>f());await tick();assert.ok(s.handles.every(h=>h.destroyed));assert.equal(s.ctx.finishes,undefined);assert.equal(A.select(s.lang.minigames.shop,'pt').name,'L6revisit');}});
