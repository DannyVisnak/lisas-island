/* Opus 5.5 fixed activity contract; technical adapter for the reviewed ShopRules. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./shop_rules.js'),require('./shop_contract.js'));else root.ShopActivity=factory(root.ShopRules,root.ShopContract);})(typeof globalThis!=='undefined'?globalThis:this,function(R,C){
'use strict';
var acts=C.activities, names=['L6intro','L0','L1','L2','L3','L4','L5','L6revisit','L7'],review=['L7','L5','L6revisit','L3'];
var denoms={GBP:[50,100,500,1000],USD:[5,10,25,100],CHF:[100,200,1000,2000],JPY:[5,10,50,100],RUB:[100,200,500,1000],BRL:[50,100,200,500]};
function plain(x){return JSON.parse(JSON.stringify(x));}
function migrate(rec){var p=plain(R.progress(rec));if(p.skills.includes(7)&&p.passportAnchor===null)p.passportAnchor=p.visits;return p;}
function select(rec,lang){var p=migrate(rec),slot=p.passportAnchor===null?null:p.visits-p.passportAnchor+1,currency=slot===null?'EUR':R.passportSlot({unlocked:true,slot:slot,cursor:p.passportCursor}).currency;
 var name=currency!=='EUR'?'passport':names[p.nextActivity]||review[((p.visits-9-p.passportCursor)%4+4)%4],a=plain(acts[name]);
 a.name=name;a.currency=currency;a.slot=slot;a.visits=p.visits;a.id='shop:'+lang+':v'+p.visits+(name==='passport'?':passport:'+currency:':L'+a.level);
 if(name==='passport'){var ds=denoms[currency];a.rounds=[ds[2],ds[0],ds[3],ds[1]].map(function(v){return {type:'find',price:v,wallet:ds};});}
 return a;
}
function round(a,i){var r=a.rounds[i];return {id:a.id+':r'+i,level:a.level,currency:a.level===0?null:a.currency,unit:r.unit||a.unit,price:r.price,wallet:r.wallet.map(function(v,j){return {id:'w'+j,value:v};}),till:(r.till||[]).map(function(v,j){return {id:'t'+j,value:v};})};}
function record(rec,a){var p=R.progress(rec),next=R.recordCompletion(p,{id:a.id,level:a.level,done:true,slot:a.slot,currency:a.currency});if(next===p)return plain(p);next=plain(next);if(next.skills.includes(7)&&next.passportAnchor===null)next.passportAnchor=next.visits;return next;}
function amountKey(c,u,v){return c==='EUR'?(u==='major'?'shop_amt_eur_'+v/100:'shop_amt_eur_cent_'+v):C.audioMap[c][v];}
function fact(c){return 'lisa_fact_'+({GBP:'uk',USD:'us',CHF:'ch',JPY:'jp',RUB:'ru',BRL:'br'}[c]||'pt');}
return Object.freeze({activities:acts,select:select,migrate:migrate,record:record,round:round,amountKey:amountKey,fact:fact});
});
