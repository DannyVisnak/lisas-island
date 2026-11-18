/* LISA-06 playable shop. Layout, art, copy and fixed rounds: Opus 5.5 final native contract. */
(function(){
'use strict';
var C=ShopContract,A=ShopActivity,R=ShopRules,el=Core.el,D=Core.D;
MG.register({id:'shop',worlds:['numbers','food'],title:'Shop',color:'#ef6c00',scene:'meadow',icon:C.iconSvg.node,start:async function(root,ctx){
 var flow=ctx.flow,lang=ctx.lang,L=Core.L(lang);if(!L.minigames)L.minigames={};
 var old=L.minigames.shop||{},prog=A.migrate(old);if(JSON.stringify(old)!==JSON.stringify(prog)){L.minigames.shop=prog;Core.persist();}
 var activity=A.select(prog,lang),roundIndex=-1,state=null,phase='price',roundToken=0,inputVersion=0,closing=false,resolveRound=null,handles=[],keys=[],moneyNodes={},goods=[],grocery=null,currentSpec=null,firstBasket=true,firstPrice=true,firstPay=true,extraSaid=false,hadBasket=false,noteSaid=false;
 ctx.chrome({total:activity.rounds.length,lisa:false});ctx.placeLisa({left:1195,top:585,width:150});
 function add(parent,cls,html){var n=el('div',cls,html);parent.appendChild(n);return n;}
 add(root,'mgs-counter');var basket=add(root,'mgs-basket');
 var BASKET_BACK='<svg viewBox="0 0 380 240" xmlns="http://www.w3.org/2000/svg"><ellipse cx="190" cy="62" rx="178" ry="42" fill="#6d4423"/></svg>';
 var BASKET_FRONT='<svg viewBox="0 0 380 240" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M6 62 Q190 128 374 62 L340 220 Q190 250 40 220Z" fill="#d49a4a"/>' +
  '<path d="M30 112 Q190 160 350 112 M38 150 Q190 196 342 150 M44 186 Q190 230 336 186" stroke="#a9742c" stroke-width="7" fill="none" stroke-linecap="round"/>' +
  '<path d="M96 100 L84 226 M150 112 L144 236 M210 114 L214 238 M266 106 L282 228" stroke="#a9742c" stroke-width="6" stroke-linecap="round"/>' +
  '<path d="M4 62 Q190 130 376 62" stroke="#f1c27a" stroke-width="16" fill="none" stroke-linecap="round"/></svg>';
 add(basket,'mgs-bback',BASKET_BACK);var inside=add(basket,'mgs-in');add(basket,'mgs-bfront',BASKET_FRONT);
 var shelf=add(root,'mgs-shelf',C.iconSvg.shelf),board=add(root,'mgs-board'),bitem=add(board,'mgs-bitem'),num=add(board,'mgs-num'),frames=add(board,'mgs-frames');
 function frame(name,icon){var f=add(frames,'mgs-frame');f.dataset.f=name;add(f,'mgs-ic',icon);return {node:f,dots:add(f,'mgs-dots')};}
 var priceFrame=frame('price',C.iconSvg.priceTag),backFrame=frame('back',C.iconSvg.backArrow);
 var till=add(root,'mgs-till');add(till,'mgs-tillart',C.iconSvg.till);var drawer=add(till,'mgs-drawer'),bell=add(till,'mgs-bell',C.iconSvg.bell),pay=add(root,'mgs-pay'),change=add(root,'mgs-change'),wallet=add(root,'mgs-wallet'),layer=add(root,'mgs-layer'),payCount=8,changeLeft=0;
 if(activity.currency==='JPY')pay.classList.add('mgs-tray');if(activity.level===7)root.classList.add('mgs-l7');if(activity.level===0||activity.level===1||activity.level==='passport')root.classList.add('mgs-nodots');
 function alive(token){return !flow.dead&&!ctx.finished&&(token===undefined||token===roundToken);}
 function enabled(){return alive()&&!closing&&!ctx.locked&&!ctx.prompting();}
 function setPhase(p){phase=p;['basket','price','pay','change','done'].forEach(function(x){root.classList.remove('mgs-ph-'+x);});root.classList.add('mgs-ph-'+p);}
 function helpKey(){return phase==='basket'?'lisa_shop_basket':phase==='change'?'lisa_shop_change':activity.level===1||activity.level==='passport'||(currentSpec&&currentSpec.type==='find')?'lisa_shop_find':'lisa_shop_count';}
 var baseRu=ctx.ruUrl,baseAsk=ctx.askUrl;
 ctx.ruUrl=function(k){var map={intro:'lisa_shop_intro',done:hadBasket?'lisa_shop_finish':null,help:helpKey()};return Object.prototype.hasOwnProperty.call(map,k)?(map[k]?baseRu(map[k]):null):baseRu(k);};
 function amount(v){if(activity.level===0)return ctx.wordUrl('n'+(v||state.price));return Core.url.ui(lang,A.amountKey(state.currency,state.unit,v===undefined?state.price:v));}
 ctx.askUrl=function(t){return phase==='basket'&&D.items[t]?baseAsk(t):amount();};
 function prompt(list){return ctx.prompt(list.filter(function(x){return x!==null&&x!==undefined;}));}
 function cleanupRound(){handles.forEach(function(h){h.destroy();});handles=[];keys.forEach(function(k){k.node.removeEventListener('keydown',k.fn);});keys=[];moneyNodes={};goods=[];layer.innerHTML='';shelf.innerHTML=C.iconSvg.shelf;}
 flow.onKill(function(){roundToken++;cleanupRound();if(resolveRound){var r=resolveRound;resolveRound=null;r();}});
 function accessible(n,label,fn){n.setAttribute('role','button');n.setAttribute('tabindex','0');n.setAttribute('aria-label',label);var key=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)fn();}};n.addEventListener('keydown',key);keys.push({node:n,fn:key});}
 function art(parent,value){
  if(activity.level==='passport'){
   var cardData=C.coinSvgAssets.passportCards[activity.currency],d=cardData[value],card=add(parent,'mgs-card');card.style.setProperty('--pc',cardData.accent);add(card,'mgs-card-chip',C.coinSvgAssets.chips[d[2]]);var n=el('b','mgs-card-n');n.textContent=d[0];card.appendChild(n);var u=el('i','mgs-card-u');u.textContent=d[1];card.appendChild(u);return;
  }
  if(activity.level!==0&&C.noteAssets&&C.noteAssets[value]){var na=C.noteAssets[value],img=el('img','mgs-note');img.src=na.src;img.width=na.w;img.height=na.h;img.alt='';img.draggable=false;img.setAttribute('aria-hidden','true');parent.appendChild(img);return;}
  var name=activity.level===0?'counter':value>=100?'eur_'+value/100:'eur_c'+value;
  var a=add(parent,'mgs-art',C.coinSvgAssets[name]);a.style.setProperty('--d',C.moneySizes[name]);
 }
 function dots(box,n,on,kind){box.innerHTML='';for(var i=0;i<Math.min(10,n);i++)add(box,'mgs-dot'+(kind?' '+kind:'')+(i<on?' on':''));}
 function unitValue(v){return state.unit==='major'?v/100:v;}
 function span(v){return activity.level!==0&&activity.level!=='passport'&&C.noteAssets&&C.noteAssets[v]?C.noteAssets[v].span:1;}
 function valueOf(id){return state.money.find(function(m){return m.id===id;}).value;}
 function cellsBefore(list,id){var c=0,n=list.indexOf(id);for(var k=0;k<n;k++)c+=span(valueOf(list[k]));return c;}
 function tillCell(id){var c=0,ids=state.money.filter(function(m){return m.owner==='till';}).map(function(m){return m.id;});for(var k=0;k<ids.length;k++){var s=span(valueOf(ids[k]));if(s>1&&c%3+s>3)c+=3-c%3;if(ids[k]===id)return c;c+=s;}return c;}
 function location(m){if(m.owner==='wallet')return state.payment.includes(m.id)?'payment':'wallet';return state.change.includes(m.id)?'change':'till';}
 function render(){
  var s=R.status(state);till.classList.toggle('mgs-open',phase==='change');change.classList.toggle('on',phase==='change'||currentSpec.type==='exchange'||activity.level===7);
  Object.keys(moneyNodes).forEach(function(id){var o=moneyNodes[id],m=o.money,loc=location(m),i,x,y;
   if(loc==='wallet'){i=o.walletIndex;x=3.8+i*14;y=62.4;}else if(loc==='payment'){i=cellsBefore(state.payment,id);x=3.8+i*14;y=47.4;}else if(loc==='change'){i=cellsBefore(state.change,id);x=changeLeft+.8+i*14;y=47.4;}else{i=tillCell(id);x=84.8+(i%3)*14;y=16+Math.floor(i/3)*14;}
   o.node.style.left=x+'rem';o.node.style.top=y+'rem';o.node.dataset.zone=loc;o.node.classList.toggle('mgs-hide',loc==='till'&&phase!=='change');o.handle.disable(closing||phase==='basket'||phase==='price'||phase==='done'||(phase==='change'&&m.owner==='wallet')||(phase==='pay'&&m.owner==='till'));o.handle.reset();
  });
  dots(priceFrame.dots,activity.level==='passport'||unitValue(state.price)>10?0:unitValue(state.price),unitValue(Math.min(s.payment,state.price)));
  var owed=currentSpec.type==='exchange'?(phase==='change'?state.price:0):s.extra;
  backFrame.node.classList.toggle('on',owed>0||phase==='change');dots(backFrame.dots,unitValue(owed),phase==='change'?unitValue(s.change):0,phase==='change'?'owe':'extra');
  if(phase==='change'&&s.change>owed)for(var j=0;j<Math.min(10,unitValue(s.change-owed));j++)add(backFrame.dots,'mgs-dot extra');
 }
 function hintCandidate(){if(!state)return null;var s=R.status(state),loc=phase==='change'?'till':'wallet',remaining=phase==='change'?(currentSpec.type==='exchange'?state.price:s.extra)-s.change:s.due;
  var candidates=Object.keys(moneyNodes).map(function(k){return moneyNodes[k];}).filter(function(o){return location(o.money)===loc&&(activity.level===1||activity.level==='passport'||currentSpec.type==='find'?o.money.value===state.price:o.money.value<=remaining);});
  if(phase==='pay'&&s.extra>0)candidates=Object.keys(moneyNodes).map(function(k){return moneyNodes[k];}).filter(function(o){return location(o.money)==='payment'&&o.money.value===s.extra;});
  candidates.sort(function(a,b){return b.money.value-a.money.value;});return candidates[0]&&candidates[0].node;
 }
 function pulseDue(){priceFrame.dots.children.forEach?priceFrame.dots.children.forEach(function(n){if(!n.classList.contains('on'))n.classList.add('due');}):Array.from(priceFrame.dots.children).forEach(function(n){if(!n.classList.contains('on'))n.classList.add('due');});}
 ctx.onPeek(function(){if(!enabled())return;if(phase==='basket'){var good=goods.find(function(o){return o.id===grocery;});if(good)ctx.wiggle(good.node,'mgpeek');prompt([ctx.askUrl(grocery)]);}else{ctx.wiggle(hintCandidate(),'mgpeek');var s=R.status(state);if(phase==='pay'&&s.payment>0&&s.due>0){pulseDue();prompt([ctx.ruUrl('lisa_shop_more')]);}else prompt([amount()]);}});
 ctx.onAssist(function(){if(phase==='basket'){var g=goods.find(function(o){return o.id===grocery;});if(g)ctx.glow(g.node);}else{ctx.glow(hintCandidate());pulseDue();Array.from(priceFrame.dots.children).forEach(function(n,i){var token=roundToken;flow.wait(i*150).then(function(){if(alive(token))n.classList.add('count');});});}});
 ctx.onHelp(function(){});
 async function completeRound(token){if(!alive(token)||closing)return;var next=R.complete(state);if(!next.done)return;closing=true;state=next;ctx.lock(true);render();await flow.wait(350);if(!alive(token))return;
  if(roundIndex===activity.rounds.length-1){var saved=A.record(L.minigames.shop,activity);L.minigames.shop=saved;Core.persist();}
  if(activity.level!==0&&activity.level!==1&&activity.level!=='passport'&&currentSpec.type!=='change'&&currentSpec.type!=='find')await prompt([ctx.ruUrl('lisa_shop_exact')]);if(!alive(token))return;
  await ctx.correct(pay,null);if(!alive(token))return;var done=resolveRound;resolveRound=null;if(done)done();
 }
 async function enterChange(token){if(!alive(token))return;setPhase('change');render();ctx.setTarget('r'+roundIndex,change);ctx.setPromptTargets([change,drawer]);await prompt([ctx.ruUrl(activity.level===7?'lisa_shop_change':state.money.some(function(m){return m.owner==='till'&&span(m.value)>1;})?'lisa_shop_note':'lisa_shop_swap')]);if(alive(token))render();}
 function move(id,to){if(!enabled()||!['pay','change'].includes(phase))return false;var o=moneyNodes[id];if(!o||phase==='change'&&o.money.owner==='wallet'||phase==='pay'&&o.money.owner==='till')return false;
  var next=R.move(state,id,to);if(next===state)return false;
  var s=R.status(next);if(activity.level===0&&s.payment>state.price){Core.Snd.sfx('boop');return false;}
  if((activity.level===1||activity.level==='passport'||currentSpec.type==='find')&&to==='payment'&&o.money.value!==state.price){ctx.wiggle(o.node);Core.Snd.sfx('pop');prompt([amount(o.money.value)]);return false;}
  state=next;inputVersion++;render();o.node.classList.add('mgs-land');var token=roundToken;
  if(phase==='pay'&&currentSpec.type==='exchange'&&s.payment===state.price){enterChange(token);return true;}
  if(activity.level!==7&&s.valid||phase==='change'&&s.valid){completeRound(token);return true;}
  if(phase==='pay'&&s.extra>0&&!extraSaid&&activity.level!==7){var v=inputVersion;flow.wait(1200).then(function(){if(alive(token)&&enabled()&&inputVersion===v&&R.status(state).extra>0){extraSaid=true;prompt([ctx.ruUrl('lisa_shop_extra')]);}});}
  return true;
 }
 function tapMoney(m){var loc=location(m);return move(m.id,loc==='wallet'?'payment':loc==='payment'?'wallet':loc==='till'?'change':'till');}
 async function ring(){if(!enabled()||phase!=='pay'||activity.level!==7)return;var token=roundToken,s=R.status(state);ctx.wiggle(bell,'mgs-ring');if(s.due>0){pulseDue();await prompt([ctx.ruUrl('lisa_shop_more')]);}else if(s.extra===0){ctx.lock(true);await prompt([ctx.ruUrl('lisa_shop_exact')]);if(alive(token)){ctx.lock(false);completeRound(token);}}else await enterChange(token);}
 // Bell persists through rounds; its owned handler is kept separately from round controls.
 bell.setAttribute('role','button');bell.setAttribute('tabindex','0');bell.setAttribute('aria-label',Core.baseText('lisa_shop_pay'));
 var bellHandle=MG.drag(bell,{onTap:ring});flow.onKill(function(){bellHandle.destroy();bell.removeEventListener('keydown',bellKey);});function bellKey(e){if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();ring();}}bell.addEventListener('keydown',bellKey);
 function fillBasket(){inside.innerHTML='';var n=activity.level===0?state.price:1,slots=[[2,8],[10.5,7],[19,8],[6,3],[15,3]];for(var i=0;i<n;i++){var g=add(inside,activity.level===0?'mgs-inmini':'mgs-inslot');if(activity.level===0){g.style.left=slots[i][0]+'rem';g.style.top=slots[i][1]+'rem';}g.appendChild(Core.Pic.el(Core.item(grocery)));}}
 async function basketPhase(token){
  var known=Core.worldItems('food').filter(function(id){return D.items[id]&&Core.SRS.peek(lang,id).box>=1;}),pool=Core.worldItems('food').filter(function(id){return D.items[id]&&D.items[id][lang];});grocery=known[roundIndex%Math.max(1,known.length)]||pool[roundIndex%pool.length];
  if(!grocery)return;hadBasket=true;if(activity.level===0||!known.length){fillBasket();return;}
  setPhase('basket');var choices=Core.shuffle([grocery].concat(Core.shuffle(pool.filter(function(id){return id!==grocery;})).slice(0,3))),pickedResolve,picked=new Promise(function(r){pickedResolve=r;});
  choices.forEach(function(id,i){var node=add(shelf,'mgs-good');node.dataset.item=id;node.style.left=[5,29,53,77][i]+'rem';node.appendChild(Core.Pic.el(Core.item(id)));goods.push({node:node,id:id});
   async function choose(){if(!enabled()||phase!=='basket')return false;if(id!==grocery){await ctx.other(node,id);return false;}ctx.lock(true);await ctx.correct(node,id,{count:false});if(!alive(token))return false;node.classList.add('mgs-taken');fillBasket();pickedResolve();return true;}
   accessible(node,D.items[id][lang].word,choose);handles.push(MG.drag(node,{targets:[basket],pad:30,point:'center',onTap:choose,onDrop:function(t){return t?choose():false;}}));
  });ctx.setTarget(grocery,goods.find(function(g){return g.id===grocery;}).node);ctx.setPromptTargets(goods.map(function(g){return g.node;}));await prompt([firstBasket?ctx.ruUrl('lisa_shop_basket'):null,250,Core.url.q(lang,grocery)]);firstBasket=false;if(!alive(token))return;await Promise.race([picked,new Promise(function(resolve){flow.onKill(resolve);})]);
 }
 function buildMoney(){var order=Core.shuffle(state.money.filter(function(m){return m.owner==='wallet';})),walletIndex={},cell=0;order.forEach(function(m){walletIndex[m.id]=cell;cell+=span(m.value);});
  state.money.forEach(function(m){var node=add(layer,'mgs-money'+(span(m.value)>1?' mgs-notecell':''));node.dataset.money=m.id;node.dataset.value=String(m.value);art(node,m.value);var vd=add(node,'mgs-vd');for(var i=0;i<Math.min(10,unitValue(m.value));i++)vd.appendChild(el('i'));
   accessible(node,activity.level===0?'1':(D.ui[lang][A.amountKey(state.currency,state.unit,m.value)]||''),function(){tapMoney(m);});
   var h=MG.drag(node,{targets:function(){return m.owner==='wallet'?[pay,wallet]:[change,drawer];},pad:0,point:'center',onTap:function(){tapMoney(m);},onDrop:function(t){return !t?false:move(m.id,t===pay?'payment':t===wallet?'wallet':t===change?'change':'till');}});handles.push(h);moneyNodes[m.id]={node:node,money:m,handle:h,walletIndex:walletIndex[m.id]};
  });render();
 }
 ctx.expose({state:function(){var s=state?R.status(state):{};return {activity:activity.name,activityId:activity.id,level:activity.level,currency:activity.currency,round:roundIndex,phase:phase,price:state&&state.price,payment:s.payment,change:s.change,valid:s.valid,money:state&&state.money,paymentIds:state&&state.payment,changeIds:state&&state.change};}});
 setPhase('price');ctx.lock(true);
 var intro=[ctx.ruUrl('lisa_shop_intro')];if(activity.name==='passport'){intro=[ctx.ruUrl('lisa_shop_travel'),ctx.ruUrl('lisa_cur_'+activity.currency.toLowerCase()),250,Core.url.ui(lang,'shop_cur_'+activity.currency.toLowerCase()),250,ctx.ruUrl(A.fact(activity.currency))];}else if(prog.visits===0)intro.push(ctx.ruUrl('lisa_shop_euro'),250,Core.url.ui(lang,'shop_cur_eur'),ctx.ruUrl('lisa_fact_pt'));else if(activity.level===1)intro.push(ctx.ruUrl('lisa_shop_cent'));else if(activity.level===3)intro.push(ctx.ruUrl('lisa_shop_swap'));
 await prompt(intro);if(!alive())return;
 await ctx.run({targets:activity.rounds.map(function(_,i){return 'r'+i;}),intro:false,ask:false,play:async function(_,i){
  cleanupRound();roundIndex=i;roundToken++;var token=roundToken;closing=false;extraSaid=false;inputVersion=0;currentSpec=activity.rounds[i];state=R.createRound(A.round(activity,i));setPhase('price');
  payCount=state.seed.till.length?state.seed.wallet.reduce(function(c,m){return c+span(m.value);},0):8;var payWidth=payCount*14+1.2;changeLeft=3+payWidth+.8;pay.style.width=payWidth+'rem';change.style.left=changeLeft+'rem';change.style.width=(8-payCount)*14+1.2+'rem';inside.innerHTML='';buildMoney();
  if(currentSpec.basket){await basketPhase(token);if(!alive(token))return;}
  setPhase('price');ctx.setTarget('r'+i,pay);ctx.setPromptTargets([pay,board]);bitem.innerHTML='';if(currentSpec.basket&&grocery)bitem.appendChild(Core.Pic.el(Core.item(grocery)));else art(bitem,state.price);
  num.innerHTML='';var b=el('b');b.textContent=activity.level==='passport'?C.coinSvgAssets.passportCards[activity.currency][state.price][0]:String(unitValue(state.price));num.appendChild(b);var u=el('i');u.textContent=activity.level===0?'':activity.level==='passport'?C.coinSvgAssets.passportCards[activity.currency][state.price][1]:state.unit==='major'?'€':'c';num.appendChild(u);render();var noteNow=!noteSaid&&state.money.some(function(m){return span(m.value)>1;});await prompt([noteNow?ctx.ruUrl('lisa_shop_note'):null,noteNow?250:null,firstPrice?ctx.ruUrl('lisa_shop_price'):null,250,amount()]);firstPrice=false;if(noteNow)noteSaid=true;if(!alive(token))return;
  setPhase('pay');ctx.setTarget('r'+i,pay);ctx.setPromptTargets(Object.keys(moneyNodes).map(function(id){return moneyNodes[id].node;}));render();var done=new Promise(function(resolve){resolveRound=resolve;});if(firstPay){await prompt([ctx.ruUrl('lisa_shop_pay')]);firstPay=false;}if(!alive(token))return;await done;
 }});
 if(!flow.dead)setPhase('done');
}});
})();
