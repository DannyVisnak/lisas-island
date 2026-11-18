'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./test_shop_runtime');
function all(n){return [n,...n.children.flatMap(all)];}
function cls(n,c){return all(n).find(x=>x.classList.contains(c));}
function back(s){return all(s.root).find(x=>x.dataset.f==='back');}
function price(s){return all(s.root).find(x=>x.dataset.f==='price').children.find(x=>x.classList.contains('mgs-dots'));}
test('Opus V1 every passport board uses its actual card numeral, not raw minor units',async()=>{
 const values={GBP:'5',USD:'25',CHF:'10',JPY:'50',RUB:'5',BRL:'2'};
 for(const [cursor,currency] of Object.keys(values).entries()){
 const s=setup({skills:[7],nextActivity:9,visits:13,passportAnchor:9,passportCursor:cursor});await tick();assert.equal(s.ctx.extra.state().currency,currency);assert.equal(cls(s.root,'mgs-num').children[0].textContent,values[currency],currency+' numeral matches approved value card');
 }
});
test('Opus V2 exchange pay phase has no orange extra dots and change phase shows owed dots',async()=>{
 const s=setup({nextActivity:4,visits:4});await tick();assert.equal(back(s).classList.contains('on'),false);assert.equal(cls(back(s),'mgs-dots').children.length,0);
 const h=id=>s.handles.find(h=>!h.destroyed&&h.node.dataset.money===id);h('w0').options.onTap();h('w1').options.onTap();await tick();assert.equal(s.ctx.extra.state().phase,'change');assert.equal(back(s).classList.contains('on'),true);const dots=cls(back(s),'mgs-dots').children;assert.equal(dots.length,2);assert.ok(dots.every(n=>n.classList.contains('owe')&&!n.classList.contains('extra')));
});
test('Opus V3 no misleading capped price grid on20c or passport; ordinary2c keeps2 dots',async()=>{
 const s=setup({nextActivity:2,visits:2});await tick();assert.equal(price(s).children.length,2);s.handles.find(h=>!h.destroyed&&h.node.dataset.money==='w1').options.onTap();await tick();assert.equal(s.ctx.extra.state().price,20);assert.equal(price(s).children.length,0);
 for(let cursor=0;cursor<6;cursor++){const p=setup({skills:[7],nextActivity:9,visits:13,passportAnchor:9,passportCursor:cursor});await tick();assert.equal(price(p).children.length,0);}
});
