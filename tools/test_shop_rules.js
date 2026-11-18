'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Shop=new Proxy(require('../app/js/shop_rules'),{get(target,key){assert.equal(typeof target[key],'function','Missing engine operation '+key);return target[key];}});
const coins=values=>values.map((value,i)=>({id:'w'+i,value}));
const round=(extra={})=>Shop.createRound({id:'r1',level:6,currency:'EUR',unit:'major',price:300,wallet:coins([100,100,100,200,500]),...extra});
const pay=(s,ids)=>ids.reduce((r,id)=>Shop.move(r,id,'payment'),s);
test('every exact euro combination succeeds by value, and duplicate rapid moves never double spend',()=>{
 const base=round();let accepted=0;
 for(let mask=0;mask<32;mask++){
  const ids=base.money.filter((m,i)=>mask&(1<<i)).map(m=>m.id);const value=base.money.filter(m=>ids.includes(m.id)).reduce((a,m)=>a+m.value,0);
  let s=pay(base,ids);assert.equal(Shop.status(s).valid,value===300);if(value===300)accepted++;
  if(ids.length){const before=Shop.status(s).payment;s=Shop.move(s,ids[0],'payment');assert.equal(Shop.status(s).payment,before);}
 }
 assert.equal(accepted,4);assert.equal(Shop.status(base).payment,0);assert(Object.isFrozen(base.money[0]));
});
test('undo, canceled input and restart preserve immutable wallet identities and deterministic initial state',()=>{
 const base=round(),partial=pay(base,['w3']);assert.deepEqual(Shop.move(partial,'w3','wallet'),base);
 assert.equal(Shop.move(partial,'w3','off-target'),partial);assert.equal(Shop.move(partial,'missing','payment'),partial);
 assert.deepEqual(Shop.cancel(partial),base);assert.deepEqual(Shop.restart(partial),base);assert.equal(Shop.status(partial).payment,200);
 assert.throws(()=>round({wallet:[{id:'same',value:100},{id:'same',value:200}]}),/identity/);
});
test('change requires enough payment and the exact return, including zero change, without creating wealth',()=>{
 for(const [unit,price,wallet,till] of [['minor',3,[5],[1,1,2]],['major',400,[500],[100,200]]]){
  let s=round({level:7,unit,price,wallet:coins(wallet),till:till.map((value,i)=>({id:'t'+i,value}))});
  assert.equal(Shop.status(s).valid,false);s=Shop.move(s,'w0','payment');assert.equal(Shop.status(s).valid,false);
  const correct=unit==='minor'?'t2':'t0';s=Shop.move(s,correct,'change');assert.equal(Shop.status(s).valid,true);
  assert.equal(Shop.status(s).payment,price+Shop.status(s).change);assert.equal(Shop.status(s).balance,wallet[0]-price);
  const done=Shop.complete(s);assert(done.done);assert.equal(Shop.complete(done),done);assert.equal(Shop.move(done,'w0','wallet'),done);
 }
 let exact=round({level:7,price:200,wallet:coins([200])});exact=Shop.move(exact,'w0','payment');assert(Shop.status(exact).valid);assert.equal(Shop.status(exact).change,0);
 const insufficient=pay(round({level:7,price:300,wallet:coins([100])}),['w0']);assert(!Shop.complete(insufficient).done);assert.equal(Shop.status(insufficient).balance,0);
});
test('approved level groups exclude decimal amounts, mixed units, later levels and illegal currency wallets',()=>{
 for(const bad of [{price:1.5},{level:8},{unit:'minor',price:3,wallet:coins([100])},{currency:'USD'}])assert.throws(()=>round(bad));
 for(const [level,unit,price,values] of [[0,'count',3,[1,1,1]],[1,'minor',20,[10,20,50]],[2,'minor',4,[1,1,1,1]],[3,'minor',6,[1,2,5]],[4,'minor',10,[5,5]],[5,'minor',7,[5,2,1]],[6,'major',500,[100,200,500]]]){
  const s=Shop.createRound({id:'l'+level,level,currency:level===0?null:'EUR',unit,price,wallet:coins(values)});assert.equal(s.level,level);
 }
 assert.throws(()=>round({level:4,unit:'minor',price:7,wallet:coins([2,5])}));
 const recognition=pay(round({level:1,unit:'minor',price:2,wallet:coins([1,1,2])}),['w0','w1']);assert(!Shop.status(recognition).valid,'recognition is one denomination, not arithmetic');
});
test('foreign single-denomination matching uses only its approved isolated wallet',()=>{
 const wallets={GBP:[50,100,500,1000],USD:[5,10,25,100],CHF:[100,200,1000,2000],JPY:[5,10,50,100],RUB:[100,200,500,1000],BRL:[50,100,200,500]};
 for(const [currency,values] of Object.entries(wallets)){
  const base=Shop.createRound({id:currency,level:'passport',currency,unit:'minor',price:values[2],wallet:coins(values)});
  assert(Shop.status(Shop.move(base,'w2','payment')).valid);assert.throws(()=>Shop.createRound({id:currency,level:'passport',currency,unit:'minor',price:3,wallet:coins([3])}));
 }
});
test('completion ledger is idempotent, preserves old fields and curriculum begins whole euros before foundations',()=>{
 const old={stars:7,plays:9,custom:'keep'},p=Shop.progress(old);assert.equal(p.nextLevel,6);assert.deepEqual(old,{stars:7,plays:9,custom:'keep'});
 let current=p;
 for(const [i,level] of [6,0,1,2,3,4,5,6,7].entries()){
  const next=Shop.recordCompletion(current,{id:'visit'+i,level,done:true});assert.equal(Shop.recordCompletion(next,{id:'visit'+i,level,done:true}),next);current=next;
 }
 assert(current.skills.includes(7));assert.equal(current.nextLevel,null);assert.equal(current.visits,9);assert.equal(current.stars,7);assert.equal(current.plays,9);
 assert.equal(Shop.recordCompletion(p,{id:'out-of-order',level:7,done:true}),p);
});
test('passport slot cadence never unlocks early, selects one in five and rotates only committed visits',()=>{
 for(let slot=1;slot<=30;slot++){const visit=Shop.passportSlot({unlocked:true,slot,cursor:0});assert.equal(visit.currency!=='EUR',slot%5===0);}
 assert.equal(Shop.passportSlot({unlocked:false,slot:5,cursor:0}).currency,'EUR');
 assert.deepEqual(Array.from({length:6},(_,cursor)=>Shop.passportSlot({unlocked:true,slot:5,cursor}).currency),['GBP','USD','CHF','JPY','RUB','BRL']);
 assert.throws(()=>Shop.passportSlot({unlocked:true,slot:0,cursor:0}));
});
test('passport completion cannot replay a cadence slot or rotate before an explicitly anchored eligible visit',()=>{
 let p=Shop.progress({skills:[0,1,2,3,4,5,6,7],nextActivity:9,visits:9});
 const visit={id:'foreign',level:'passport',currency:'GBP',slot:5,done:true};
 assert.equal(Shop.recordCompletion(p,visit),p,'unresolved cadence origin is held');
 p=Shop.progress({...p,passportAnchor:p.visits});
 assert.equal(Shop.recordCompletion(p,visit),p,'cannot skip four actual completed visits');
 for(let i=0;i<4;i++)p=Shop.recordCompletion(p,{id:'euro'+i,level:6,done:true});
 const after=Shop.recordCompletion(p,visit);assert.equal(after.passportCursor,1);assert.equal(after.visits,p.visits+1);assert.equal(Shop.recordCompletion(after,visit),after);
 assert.equal(Shop.recordCompletion(after,{...visit,id:'repeat',currency:'USD'}),after,'replayed slot cannot consume next currency');
 p=after;for(let i=0;i<4;i++)p=Shop.recordCompletion(p,{id:'more-euro'+i,level:6,done:true});
 p=Shop.recordCompletion(p,{...visit,id:'next-foreign',currency:'USD',slot:10});assert.equal(p.passportCursor,2);
});
test('unsafe sums and malformed progress do not leak mutable references or corrupt old save fields',()=>{
 assert.throws(()=>round({price:NaN}));assert.throws(()=>round({price:Infinity}));assert.throws(()=>round({wallet:[{id:'x',value:Number.MAX_SAFE_INTEGER}]}));
 const legacy={stars:11,plays:3,metadata:{keep:true},skills:[7,7,-1,'6'],completed:['x','x',null],nextActivity:-1,visits:NaN};
 const p=Shop.progress(legacy);assert.equal(p.visits,0);assert.equal(p.nextLevel,6);assert.deepEqual(p.skills,[7]);assert.equal(Object.isFrozen(legacy.metadata),false);assert.notEqual(p.metadata,legacy.metadata);
 const s=round();assert.equal(Shop.recordCompletion(p,s),p,'unfinished round cannot commit');
});
test('fair swaps transfer equal value both ways while preserving purchasing power and physical identities',()=>{
 for(const [level,unit,wallet,till,target] of [[3,'minor',[1,1],[2],2],[3,'minor',[5],[1,1,1,1,1],5],[6,'major',[500],[100,100,100,100,100],500]]){
  let s=round({level,unit,price:target,wallet:coins(wallet),till:till.map((value,i)=>({id:'t'+i,value}))});
  s=pay(s,s.money.filter(m=>m.owner==='wallet').map(m=>m.id));assert(!Shop.status(s).valid,'handed-over money alone is not a completed exchange');
  for(const coin of s.money.filter(m=>m.owner==='till'))s=Shop.move(s,coin.id,'change');
  assert(Shop.status(s).valid);assert.equal(Shop.status(s).balance,wallet.reduce((a,b)=>a+b,0));assert(Shop.complete(s).done);
 }
});
test('mixed-cent payment accepts both few-coin and many-coin solutions without a preferred answer',()=>{
 const base=round({level:5,unit:'minor',price:7,wallet:coins([5,2,2,2,1])});
 for(const ids of [['w0','w1'],['w1','w2','w3','w4']])assert(Shop.complete(pay(base,ids)).done);
 const tooMuch=pay(base,['w0','w1','w4']);assert(!Shop.complete(tooMuch).done);assert(Shop.complete(Shop.move(tooMuch,'w4','wallet')).done);
});
test('safe-integer completion counters refuse overflow without resetting visits or losing saved fields',()=>{
 const p=Shop.progress({visits:Number.MAX_SAFE_INTEGER,passportAnchor:9,stars:12,plays:8,metadata:{keep:true}});
 assert.equal(Shop.recordCompletion(p,{id:'overflow',level:6,done:true}),p,'cannot wrap visit count to zero');assert.equal(p.visits,Number.MAX_SAFE_INTEGER);assert.equal(p.stars,12);assert.deepEqual(p.metadata,{keep:true});
 const last=Shop.progress({visits:Number.MAX_SAFE_INTEGER-1});const final=Shop.recordCompletion(last,{id:'last-safe',level:6,done:true});assert.equal(final.visits,Number.MAX_SAFE_INTEGER);assert(final.completed.includes('last-safe'));assert.equal(Shop.recordCompletion(final,{id:'next-overflow',level:0,done:true}),final);
 const cursor=Shop.progress({visits:4,passportAnchor:0,skills:[7],nextActivity:9,passportCursor:Number.MAX_SAFE_INTEGER});const currency=Shop.passportSlot({unlocked:true,slot:5,cursor:cursor.passportCursor}).currency;
 assert.equal(Shop.recordCompletion(cursor,{id:'foreign-overflow',level:'passport',slot:5,currency,done:true}),cursor,'cannot wrap passport cursor to zero');assert.equal(cursor.visits,4);
});
