/* Pure LISA-06 preparation. No UI, persistence, audio, rewards or automatic mastery decisions. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShopRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var FOREIGN = ['GBP', 'USD', 'CHF', 'JPY', 'RUB', 'BRL'];
  var DENOMS = { EUR:[1,2,5,10,20,50,100,200,500], GBP:[50,100,500,1000], USD:[5,10,25,100], CHF:[100,200,1000,2000], JPY:[5,10,50,100], RUB:[100,200,500,1000], BRL:[50,100,200,500] };
  var ORDER = [6,0,1,2,3,4,5,6,7];
  function integer(n) { return Number.isSafeInteger(n) && n >= 0; }
  function requireRule(ok, message) { if (!ok) throw new Error(message); }
  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (value && typeof value === 'object') { var out={}; Object.keys(value).forEach(function(k){Object.defineProperty(out,k,{value:copy(value[k]),enumerable:true,writable:true,configurable:true});}); return out; }
    return value;
  }
  function frozen(value) { if (value && typeof value === 'object') { Object.keys(value).forEach(function(k){frozen(value[k]);});Object.freeze(value); }return value; }
  function total(list) { var n=list.reduce(function(sum,m){return sum+m.value;},0);requireRule(integer(n),'unsafe money total');return n; }
  function createRound(input) {
    var spec=copy(input), level=spec.level, currency=spec.currency, unit=spec.unit, price=spec.price;
    requireRule(typeof spec.id==='string' && spec.id.length>0,'round identity required');
    requireRule((integer(level) && level<=7) || level==='passport','level outside approved scope');
    requireRule(integer(price) && price>0,'integer positive minor-unit price required');
    requireRule(Array.isArray(spec.wallet) && spec.wallet.length>0,'wallet required');
    requireRule(!spec.till || Array.isArray(spec.till),'invalid till');
    var seen=new Set(), money=[];
    [['wallet',spec.wallet],['till',spec.till||[]]].forEach(function(pair){pair[1].forEach(function(m){
      requireRule(m && typeof m.id==='string' && m.id && !seen.has(m.id),'unique physical money identity required');seen.add(m.id);
      requireRule(integer(m.value) && m.value>0,'integer positive denomination required');
      requireRule(!m.currency || m.currency===currency,'mixed currencies prohibited');
      money.push({id:m.id,value:m.value,owner:pair[0]});
    });});
    if (level===0) requireRule(currency===null && unit==='count' && price<=5 && money.every(function(m){return m.value===1;}),'level 0 requires plain unit counters');
    else {
      requireRule(Array.isArray(DENOMS[currency]) && money.every(function(m){return DENOMS[currency].includes(m.value);}), 'illegal denomination or currency');
      if (level==='passport') requireRule(FOREIGN.includes(currency) && unit==='minor' && DENOMS[currency].includes(price) && !(spec.till||[]).length,'passport is isolated denomination matching');
      else {
        requireRule(currency==='EUR','foundation rounds use EUR only');
        requireRule(unit==='minor' || unit==='major','explicit separate unit required');
        var allowed;
        if (level===1) {
          var groups=[[1,2,5],[10,20,50],[100,200]];
          requireRule(groups.some(function(group){return group.includes(price)&&money.every(function(m){return group.includes(m.value);});}),'recognition groups must stay separate');
          requireRule((unit==='major')===(price>=100),'recognition unit mismatch');
        } else if (unit==='major') {
          requireRule((level===6 || level===7) && price%100===0 && price<=500,'whole-euro scope exceeded');allowed=[100,200,500];
        } else {
          requireRule(level!==6 && price<= (level===2?5:level===3?6:10),'cent level price scope exceeded');
          allowed=level===2?[1]:level===4?[2,5]:[1,2,5];
          if (level===4) requireRule(new Set(money.map(function(m){return m.value;})).size===1 && price%money[0].value===0,'repeated groups require one denomination');
        }
        if (allowed) requireRule(money.every(function(m){return allowed.includes(m.value);}), 'denomination outside level or unit');
      }
    }
    requireRule([3,6,7].includes(level) || !(spec.till||[]).length,'returns only for approved exchanges or level 7 change');
    total(money);
    return frozen({id:spec.id,level:level,currency:currency,unit:unit,price:price,money:money,payment:[],change:[],done:false,seed:spec});
  }
  function move(state,id,to) {
    if (state.done) return state;
    var coin=state.money.find(function(m){return m.id===id;});
    if (!coin || !['wallet','payment','till','change'].includes(to)) return state;
    var selected=coin.owner==='wallet'?'payment':'change';
    if (to!==coin.owner && to!==selected) return state;
    var on=state[selected].includes(id), add=to===selected;
    if (on===add) return state;
    var next=Object.assign({},state);next[selected]=add?state[selected].concat(id):state[selected].filter(function(x){return x!==id;});
    return frozen(next);
  }
  function status(state) {
    var payment=total(state.money.filter(function(m){return state.payment.includes(m.id);}));
    var change=total(state.money.filter(function(m){return state.change.includes(m.id);}));
    var initial=total(state.money.filter(function(m){return m.owner==='wallet';}));
    var exchange=[3,6].includes(state.level) && state.money.some(function(m){return m.owner==='till';});
    var valid=exchange?payment===state.price && change===state.price:state.level===7?payment>=state.price && state.price+change===payment:payment===state.price && change===0;
    if (state.level===1 || state.level==='passport') valid=valid && state.payment.length===1;
    return frozen({payment:payment,change:change,due:Math.max(0,state.price-payment),extra:Math.max(0,payment-state.price),balance:initial-payment+change,valid:valid});
  }
  function complete(state) { if (state.done || !status(state).valid) return state;return frozen(Object.assign({},state,{done:true})); }
  function restart(state) { return state.done?state:createRound(state.seed); }
  function progress(record) {
    var p=copy(record||{});p.version=1;p.skills=Array.isArray(p.skills)?p.skills.filter(function(n,i,a){return integer(n)&&n<=7&&a.indexOf(n)===i;}):[];
    p.nextActivity=integer(p.nextActivity)?Math.min(ORDER.length,p.nextActivity):0;
    p.visits=integer(p.visits)?p.visits:0;
    p.passportAnchor=integer(p.passportAnchor)&&p.passportAnchor<=p.visits?p.passportAnchor:null;
    p.passportCursor=integer(p.passportCursor)?p.passportCursor:0;
    p.completed=Array.isArray(p.completed)?p.completed.filter(function(id,i,a){return typeof id==='string'&&id&&a.indexOf(id)===i;}):[];
    p.nextLevel=ORDER[p.nextActivity]===undefined?null:ORDER[p.nextActivity];return frozen(p);
  }
  function passportSlot(o) {
    requireRule(o && integer(o.slot) && o.slot>0 && integer(o.cursor),'positive slot and nonnegative cursor required');
    return frozen({currency:o.unlocked===true && o.slot%5===0?FOREIGN[o.cursor%FOREIGN.length]:'EUR'});
  }
  function recordCompletion(p,event) {
    if (!event || event.done!==true || typeof event.id!=='string' || !event.id || p.completed.includes(event.id)) return p;
    var foreign=event.level==='passport';
    if (foreign) {
      if (!p.skills.includes(7) || p.passportAnchor===null || event.slot!==p.visits-p.passportAnchor+1) return p;
      if (passportSlot({unlocked:true,slot:event.slot,cursor:p.passportCursor}).currency!==event.currency || event.currency==='EUR') return p;
    } else if (p.nextLevel!==null && event.level!==p.nextLevel || !integer(event.level) || event.level>7) return p;
    if (!integer(p.visits+1) || foreign && !integer(p.passportCursor+1)) return p;
    var next=copy(p);next.completed.push(event.id);next.visits++;
    if (foreign) next.passportCursor++;
    else { if (!next.skills.includes(event.level)) next.skills.push(event.level);if (next.nextActivity<ORDER.length) next.nextActivity++; }
    return progress(next);
  }
  return Object.freeze({createRound:createRound,move:move,status:status,complete:complete,cancel:restart,restart:restart,progress:progress,recordCompletion:recordCompletion,passportSlot:passportSlot});
});
