/* LISA-13 renderer logic. Layout, art, timing and metadata: exact Opus 17-Nov contract. */
(function () {
'use strict';
var C = window.Countries = {}, D = Core.D, A = CountryArt, el = Core.el, tap = Core.tap, Snd = Core.Snd;
C.metadata = {"food":{"pt":["country_sardine","country_custard_tart"],"ru":["country_pancakes"],"de":["country_pretzel","country_sausage"],"eng":["country_tea"],"it":["country_pizza","country_pasta","icecream"],"fr":["country_baguette","country_croissant","cheese"],"jp":["country_sushi","country_rice_ball"],"br":["banana"],"cn":["country_dumplings"],"eg":[],"au":[],"us":["country_burger"]},"greetingSrc":{"pt":"audio/pt/hello.ogg","ru":"audio/ru/hello.ogg","de":"audio/de/hello.ogg","eng":"audio/en/hello.ogg","au":"audio/en/hello.ogg","us":"audio/en/hello.ogg","it":"audio/countries/country_hello_it.ogg","fr":"audio/countries/country_hello_fr.ogg","jp":"audio/countries/country_hello_jp.ogg","br":"audio/countries/country_hello_br.ogg","cn":"audio/countries/country_hello_cn.ogg","eg":"audio/countries/country_hello_eg.ogg"},"art":"journey class, palette and window/preview picture are in CountryArt.TRIP (countries_art.js); countries.json may mirror journey only if the builder needs it in tests."};
function row(id) { return D.packs && D.packs.countries && D.packs.countries.countries.find(function(c){return c.id === id;}); }
function ids(id) { var c = row(id); return c && c.ids || []; }
function image(id, cls) { var n = el('img',cls || ''); n.src = D.items[id].pic.src; n.alt = ''; n.draggable = false; return n; }
function node(parent,cls,html) { var n=el('div',cls,html); parent.appendChild(n); return n; }
function live(flow,S,lang) { return !flow.dead && UI.flow === flow && Core.curLang() === lang && (!S || (Path.session(lang) === S && S.country && S.country.lang === lang)); }
function speak(flow,key,cap) { return Core.sayRu({say:function(list){return C.speakBounded(flow,list,cap || A.PHASE_MS.introCap);},wait:function(){return Promise.resolve(false);}},key); }
C.requiredAssets = function(lang,id) {
  var c=row(id); if (!c || !A.TRIP[id]) return [];
  var paths=['css/countries.css','js/countries_art.js',A.viewSrc(id),'audio/ui/'+lang+'_country_name_'+id+'.ogg',C.metadata.greetingSrc[id]];
  c.ids.forEach(function(x){var item=D.items[x]; if(item)paths.push(item.pic.src); paths.push(Core.url.w(lang,x),Core.url.q(lang,x)); if(Core.save.settings.ruHelp && Core.baseLang() !== lang)paths.push(Core.url.gloss(x,lang));});
  if(Core.save.settings.ruHelp) ['choose','board','postcard','done','album','intro_'+id].forEach(function(k){paths.push('audio/ui/'+Core.baseLang()+'_lisa_country_'+k+'.ogg');});
  return paths.filter(function(p,i,x){return p && x.indexOf(p) === i;});
};
C.ready = function(lang,id) {
  var c=row(id), pack=D.packs && D.packs.countries;
  if (!c || !pack || !Array.isArray(pack.readyAssets) || !A.TRIP[id] || !['pt','en','de'].includes(lang)) return false;
  var canonical=CountryRules.catalog.find(function(x){return x.id===id;});
  if (!canonical || c.ids.length!==4 || !c.ids.every(function(x,i){return x===canonical.ids[i] && D.items[x] && D.items[x][lang];}))return false;
  var need=C.requiredAssets(lang,id);
  return need.length>0 && need.every(function(p){return pack.readyAssets.indexOf(p)>=0;});
};
C.speakBounded = function(flow,list,cap) {
  return new Promise(function(resolve){
    var settled=false;
    function done(ok){if(settled)return;settled=true;resolve(!flow.dead && ok);}
    flow.onKill(function(){done(false);});
    flow.after(cap,function(){if(settled)return;if(UI.flow===flow && !flow.dead)Snd.stop();done(false);});
    try { Promise.resolve(flow.say(list.filter(Boolean))).then(function(v){done(v!==false);},function(){done(false);}); } catch(e){done(false);}
  });
};
C.isFood=function(id,item){return (C.metadata.food[id] || []).indexOf(item)>=0;};
C.replayWord=async function(flow,lang,country,id){
  if(flow.dead || UI.flow !== flow || Core.curLang() !== lang)return false;
  var save=Core.save,L=Core.L(lang),words=L.words,w=words && words[id];
  CountryRules.replay(L,country,id);
  var ok=await C.speakBounded(flow,[Core.url.w(lang,id)],A.PHASE_MS.nameCap);
  if(ok !== true || flow.dead || UI.flow !== flow || Core.curLang() !== lang || Core.save !== save || Core.L(lang) !== L || L.words !== words || !w || words[id] !== w)return false;
  var heard=Number.isSafeInteger(w.heard) && w.heard>=0 ? w.heard : 0;
  if(heard < Number.MAX_SAFE_INTEGER){w.heard=heard+1;Core.persist();}
  return true;
};
function preview(parent,id,cls,uid){var n=node(parent,cls,A.backdrop(id,uid));var mark=el('img','c-mark');mark.src=A.viewSrc(id);mark.alt='';n.appendChild(mark);return n;}
function stamp(parent,id,collected,cls){var n=node(parent,cls || 'c-stamp',collected?A.svg.stamp:A.svg.stampEmpty);if(collected)n.style.color=A.TRIP[id].accent;return n;}
UI.screens.countries=function(flow,root,p){
  var lang=Core.curLang(), page=0, focused=null,detail=null,leaving=false;
  var host=node(root,'c-album'),bar=node(host,'topbar'),grid=node(host,'c-grid'),dots=node(host,'c-dots'),detailBox=node(host,'c-detail');
  function back(){if(leaving||flow.dead)return;if(detail){detail=null;host.classList.remove('detail');detailBox.innerHTML='';}else UI.go('house',{from:p.houseFrom});}
  bar.appendChild(UI.backBtn(back));bar.appendChild(UI.speakerBtn(function(){if(!leaving)speak(flow,detail?'lisa_country_album':'lisa_country_choose');}));
  var prev=UI.btn('c-page prev',A.svg.arrowL,function(){if(page===0||leaving)return;page--;focused=null;render('c-slideb');});
  var next=UI.btn('c-page next',A.svg.arrowR,function(){if(page===1||leaving)return;page++;focused=null;render('c-slide');});host.appendChild(prev);host.appendChild(next);
  function choose(id,card){if(leaving||flow.dead)return;leaving=true;Path.selectCountry(lang,id);card.classList.add('pending');node(card,'c-badge',A.svg.planeMini);Snd.sfx('whoosh');flow.after(A.PHASE_MS.album,function(){if(!flow.dead)UI.go('house',{from:p.houseFrom});});}
  function openDetail(id){detail=id;host.classList.add('detail');detailBox.innerHTML='';preview(detailBox,id,'c-dview','detail'+id);stamp(detailBox,id,true);var objs=node(detailBox,'c-dobjs');ids(id).forEach(function(x){var tile=node(objs,'c-dobj');tile.appendChild(image(x));tap(tile,function(){if(flow.dead||leaving)return;tile.classList.add('c-say');C.replayWord(flow,lang,id,x).then(function(){if(!flow.dead)tile.classList.remove('c-say');});});});detailBox.appendChild(UI.btn('c-dgo',A.svg.planeMini,function(){choose(id,detailBox);}));speak(flow,'lisa_country_album');}
  function render(anim){grid.innerHTML='';grid.className='c-grid '+(anim || '');dots.innerHTML='';prev.classList.toggle('off',page===0);next.classList.toggle('off',page===1);for(var i=0;i<2;i++)node(dots,'c-dot'+(i===page?' on':''));var state=CountryRules.migrateLanguage(Core.L(lang)).countries;
    A.ORDER.slice(page*6,page*6+6).forEach(function(id){var collected=state.completed[id]===true,card=node(grid,'c-card c-in '+(collected?'collected':'unvisited')+(state.pending===id?' pending':'')+(focused===id?' focus':''));card.dataset.country=id;preview(card,id,'c-prev','album'+id);stamp(card,id,collected);if(state.pending===id)node(card,'c-badge',A.svg.planeMini);if(collected){var minis=node(card,'c-minis');ids(id).forEach(function(x){minis.appendChild(image(x));});}if(focused===id)card.appendChild(UI.btn('c-go',A.svg.planeMini,function(){choose(id,card);}));tap(card,function(){if(leaving||flow.dead)return;if(focused===id&&collected){openDetail(id);return;}focused=id;C.speakBounded(flow,[Core.url.ui(lang,'country_name_'+id)],A.PHASE_MS.nameCap);render();});});
  }
  render();speak(flow,'lisa_country_choose');
};
C.journey=function(S,lang){UI.go('cflight',{path:true,lang:lang,session:S,token:S.country.token});};
C.postcard=function(S,lang){UI.go('cpostcard',{path:true,lang:lang,session:S,token:S.country.token});};
UI.screens.cflight=function(flow,root,p){
  var S=p.session || Path.session(p.lang),lang=p.lang;
  if(!S || !S.country || p.token!==S.country.token || !live(flow,S,lang) || S.plan[S.step]!=='CF'){if(!flow.dead&&UI.flow===flow)Path.home();return;}
  if(!C.ready(lang,S.country.id)){if(Path.countryUnavailable(lang,S,p.token,'CF'))Path.go();else Path.home();return;}
  var id=S.country.id,host=node(root,'c-journey'),bar=node(host,'topbar');bar.appendChild(UI.backBtn(function(){if(live(flow,S,lang))Path.home();}));
  node(host,'c-landing',A.svg.landing);node(host,'c-skycl k1',A.svg.cloud);node(host,'c-skycl k2',A.svg.cloud);
  var globe=node(host,'c-globe',A.svg.globe);node(node(globe,'c-orbit'),'c-mini',A.svg.planeMini);
  var win=node(host,'c-window'),view=preview(win,id,'c-view','flight'+id);node(view,'c-cl k1',A.svg.cloud);node(view,'c-cl k2',A.svg.cloud);win.innerHTML+=A.svg.window;
  var plane=node(host,'c-plane',A.svg.plane),box=node(host,'c-lisabox'),lisa=Lisa.make({});box.appendChild(lisa);
  var arrive=node(host,'c-arrive',A.backdrop(id,'arrive'+id));var mark=el('img','c-mark');mark.src=A.viewSrc(id);mark.alt='';arrive.appendChild(mark);var arriveLisa=node(arrive,'c-lisabox');arriveLisa.appendChild(Lisa.make({}));
  var boarded=false,earlyBoard;var early=new Promise(function(res){earlyBoard=res;});tap(plane,function(){if(!boarded&&live(flow,S,lang)){boarded=true;Snd.stop();earlyBoard();}});
  (async function(){
    await Promise.race([speak(flow,'lisa_country_board',A.PHASE_MS.boardCap),early]);if(!live(flow,S,lang))return;boarded=true;host.classList.add('boarded');await flow.wait(A.PHASE_MS.hop);if(!live(flow,S,lang))return;
    host.classList.add('up','air');await flow.wait(A.PHASE_MS.takeoff);if(!live(flow,S,lang))return;
    host.classList.add('globe');globe.classList.add('on');var timing=A.JOURNEY_MS[A.TRIP[id].journey],duration=Math.min(timing.globe,A.GLOBE_MAX_MS);flow.after(Math.max(0,duration-300),function(){globe.classList.remove('on');});flow.after(duration,function(){globe.remove();});await flow.wait(duration);if(!live(flow,S,lang))return;
    host.classList.remove('globe');host.classList.add('window');win.classList.add('on');await flow.wait(timing.cruise);if(!live(flow,S,lang))return;
    host.classList.remove('window','up');win.classList.remove('on');host.classList.add('descend');await flow.wait(16);if(!live(flow,S,lang))return;host.classList.remove('descend','air');host.classList.add('down');await flow.wait(A.PHASE_MS.land);if(!live(flow,S,lang))return;
    arrive.classList.add('on');await flow.wait(A.PHASE_MS.arriveFade);if(!live(flow,S,lang))return;
    await C.speakBounded(flow,[Core.url.ui(lang,'country_name_'+id)],A.PHASE_MS.nameCap);if(!live(flow,S,lang))return;await flow.wait(A.PHASE_MS.gap);await speak(flow,'lisa_country_intro_'+id,A.PHASE_MS.introCap);if(!live(flow,S,lang))return;await flow.wait(A.PHASE_MS.gap);await C.speakBounded(flow,[C.metadata.greetingSrc[id]],A.PHASE_MS.greetCap);if(!live(flow,S,lang))return;
    var choices=node(arrive,'c-accs'),chosen=false;function apply(acc){if(chosen||!live(flow,S,lang))return;chosen=true;choices.classList.add('done');node(arriveLisa,'c-prop '+acc,A.svg[acc]);flow.after(A.PHASE_MS.accDone,function(){if(live(flow,S,lang)&&S.plan[S.step]==='CF')Path.finishStep(flow,{countryToken:p.token});});}
    A.ACC.forEach(function(acc){var n=node(choices,'c-acc',A.svg[acc]);tap(n,function(){n.classList.add('chosen');apply(acc);});});flow.after(A.PHASE_MS.accIdle,function(){apply(A.ACC_DEFAULT);});
  })();
};
function seeded(list,seed){var out=list.slice(),n=2166136261;String(seed).split('').forEach(function(c){n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;});for(var i=out.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;var j=n%(i+1),x=out[i];out[i]=out[j];out[j]=x;}return out;}
C.postcardPlan=function(S){var words=S.country.ids.slice(),one=seeded(words,S.country.token+'first'),two=seeded(words,S.country.token+'second');if(two[0]===one[3])two.push(two.shift());return {sequence:one.concat(two),slots:seeded(words,S.country.token+'slots')};};
C.postcardRound=function(flow,root,p){
  var S=p.session,lang=p.lang,id=S.country.id,token=S.country.token,plan=C.postcardPlan(S),seq=plan.sequence;
  var host=node(root,'c-pcscreen'),bar=node(host,'topbar'),card=node(host,'c-postcard',A.backdrop(id,'postcard'+token)),pcStamp=stamp(card,id,false,'c-pcstamp'),lisaBox=node(host,'c-lisabox c-pc-lisa'),lisa=Lisa.make({});lisaBox.appendChild(lisa);
  var prog=node(host,'c-prog'),tiles={},dots=[];for(var di=0;di<8;di++)dots.push(prog.appendChild(el('i','')));
  var saved=S.countryRound,idx=saved&&saved.token===token&&Number.isSafeInteger(saved.index)&&saved.index>=0&&saved.index<=8?saved.index:0;
  var state={index:idx,target:seq[idx] || null,locked:true,helped:false,done:false},question=0,idle=0,peeked=false,autoHelp=false;
  function owns(){return live(flow,S,lang)&&S.country.token===token&&S.plan[S.step]==='CP';}
  function clean(){Object.keys(tiles).forEach(function(x){tiles[x].classList.remove('right','wrong','hint','nudge','away');});}
  function resetIdle(){idle=0;peeked=false;autoHelp=false;}
  function lock(v){state.locked=v;card.classList.toggle('locked',v);}
  async function ask(help){if(!owns()||state.done||!state.target)return;var q=++question;if(help)state.helped=true;lock(true);await C.speakBounded(flow,[Core.url.q(lang,state.target)],A.PHASE_MS.promptCap);if(owns()&&question===q&&!state.done){lock(false);if(!help)resetIdle();}}
  async function help(){if(!owns()||state.locked||state.done)return;state.helped=true;tiles[state.target].classList.add('hint');await ask(true);}
  bar.appendChild(UI.backBtn(function(){if(owns())Path.home();}));bar.appendChild(UI.speakerBtn(help));
  plan.slots.forEach(function(word,i){var slot=A.SLOTS[i],n=node(card,'c-obj');n.style.left=(slot.x-slot.s/2)/10+'rem';n.style.top=(slot.y-slot.s/2)/10+'rem';n.style.width=n.style.height=slot.s/10+'rem';n.dataset.id=word;node(n,'c-pic').appendChild(image(word));tiles[word]=n;tap(n,function(){answer(word);});});
  async function finish(){if(!owns()||state.done)return;state.done=true;lock(true);pcStamp.style.color=A.TRIP[id].accent;pcStamp.classList.add('c-drop');await flow.wait(700);if(!owns())return;await speak(flow,'lisa_country_done');if(owns())await Path.finishStep(flow,{countryToken:token});}
  async function answer(word){
    if(!owns()||state.locked||state.done||!tiles[word])return false;resetIdle();lock(true);
    if(word!==state.target){state.helped=true;tiles[word].classList.add('wrong');await C.speakBounded(flow,[Core.url.w(lang,word)],A.PHASE_MS.nameCap);if(!owns())return false;tiles[word].classList.remove('wrong');lock(false);return false;}
    var target=state.target,n=tiles[target];n.classList.add('right');if(state.helped)Core.SRS.touch(lang,target);else Core.SRS.answer(lang,target,true);
    if(C.isFood(id,target)){var fly=node(host,'c-fly');fly.appendChild(image(target));var slot=A.SLOTS[plan.slots.indexOf(target)];fly.style.left=(18.3+(slot.x-slot.s/2)/10)+'rem';fly.style.top=(17+(slot.y-slot.s/2)/10)+'rem';fly.style.width=fly.style.height=slot.s/10+'rem';n.classList.add('away');lisaBox.classList.add('c-chew');flow.after(16,function(){if(!owns())return;fly.style.transform='translate('+(A.MOUTH.left-(18.3+slot.x/10))+'rem,'+(A.MOUTH.top-(17+slot.y/10))+'rem) scale(.2)';fly.style.opacity='0';});flow.after(A.PHASE_MS.next,function(){fly.remove();n.classList.remove('away');lisaBox.classList.remove('c-chew');});}
    await C.speakBounded(flow,[Core.url.w(lang,target)],A.PHASE_MS.nameCap);if(!owns())return false;var gloss=Core.url.gloss(target,lang);if(state.helped&&gloss)await C.speakBounded(flow,[gloss],A.PHASE_MS.nameCap);if(!owns())return false;
    dots[state.index].classList.add('on');state.index++;S.countryRound={token:token,index:state.index};Core.persist();await flow.wait(A.PHASE_MS.next);if(!owns())return false;clean();if(state.index>=seq.length){await finish();return true;}state.target=seq[state.index];state.helped=false;await ask(false);return true;
  }
  flow.every(500,function(){if(!owns()||state.locked||state.done)return;idle+=500;if(!peeked&&idle>=A.PHASE_MS.peek){peeked=true;tiles[state.target].classList.add('nudge');}if(!autoHelp&&idle>=A.PHASE_MS.help){autoHelp=true;help();}});
  (async function(){for(var i=0;i<state.index;i++)dots[i].classList.add('on');await speak(flow,'lisa_country_postcard');if(!owns())return;if(state.index>=8){await finish();return;}await ask(false);})();
  return {state:state,answer:answer,help:help};
};
UI.screens.cpostcard=function(flow,root,p){var S=p.session || Path.session(p.lang);
 if(!S || !S.country || p.token!==S.country.token || !live(flow,S,p.lang) || S.plan[S.step]!=='CP'){if(!flow.dead&&UI.flow===flow)Path.home();return;}
 if(!C.ready(p.lang,S.country.id)){if(Path.countryUnavailable(p.lang,S,p.token,'CP'))Path.go();else Path.home();return;}
 C.postcardRound(flow,root,{lang:p.lang,session:S});};
})();
