'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../app/js/shop_rules.js');
const A=require('../app/js/shop_activity.js');
test('fixed activity sequence and stable unfinished identity',()=>{
 let p={stars:2,plays:9,legacy:{keep:true}};
 const names=['L6intro','L0','L1','L2','L3','L4','L5','L6revisit','L7'];
 for(const name of names){const a=A.select(p,'pt');assert.equal(a.name,name);assert.deepEqual(A.select(p,'pt'),a); p=A.record(p,a);}
 assert.equal(p.visits,9); assert.equal(p.passportAnchor,9); assert.equal(p.stars,2);assert.equal(p.plays,9);assert.deepEqual(p.legacy,{keep:true});assert.ok(!Object.isFrozen(p));p.plays++;
});
test('passport is every fifth slot after anchor, one fact, stable across reload',()=>{
 let p={skills:[7],nextActivity:9,visits:20};p=A.migrate(p); assert.equal(p.passportAnchor,20);
 let currencies=[];
 for(let i=1;i<=30;i++){const a=A.select(p,'de'); assert.deepEqual(a,A.select(JSON.parse(JSON.stringify(p)),'de'));if(i%5===0){currencies.push(a.currency);assert.equal(a.level,'passport');}else assert.notEqual(a.level,'passport');p=A.record(p,a);assert.equal(A.record(p,a).visits,p.visits);}
 assert.deepEqual(currencies,['GBP','USD','CHF','JPY','RUB','BRL']);assert.equal(A.fact('JPY'),'lisa_fact_jp');
});
test('all fixed rounds construct and every overpayment has attainable change',()=>{
 for(const [name,activity] of Object.entries(A.activities)){
 if(name==='passport')continue;
 const a={...activity,name,id:name};for(let i=0;i<a.rounds.length;i++){
 const r=A.round(a,i);let st=R.createRound(r);assert.equal(st.money.length,r.wallet.length+r.till.length);if(st.money.some(m=>m.value===500))assert.ok(name==='L6revisit'&&i>=3);
 const sums=list=>list.reduce((s,v)=>[...new Set([...s,...s.map(n=>n+v.value)])],[0]);
 if(a.level===7)for(const n of sums(r.wallet).filter(n=>n>=r.price))assert.ok(sums(r.till).includes(n-r.price),name+': '+n);
 }
 }
});
test('UI amount mapping never makes vocabulary URLs; only approved euro note issued',()=>{
 assert.equal(A.amountKey('EUR','major',500),'shop_amt_eur_5');assert.equal(A.amountKey('EUR','minor',2),'shop_amt_eur_cent_2');assert.equal(A.amountKey('GBP','minor',1000),'shop_amt_gbp_10');
 for(const c of ['GBP','USD','CHF','JPY','RUB','BRL']){const a=A.select({skills:[7],nextActivity:9,visits:4,passportAnchor:0,passportCursor:['GBP','USD','CHF','JPY','RUB','BRL'].indexOf(c)},'en');for(let i=0;i<4;i++)assert.equal(R.createRound(A.round(a,i)).currency,c);}
});
