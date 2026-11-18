/* Prerecorded touch story. Words, icons, geometry and timing: Opus 5.5, 18-Nov-2026. */
(function(){
'use strict';
var Stories=window.Stories={},D=window.STORIES_DATA,R=window.StoryRules,Snd=Core.Snd,el=Core.el,serial=0;
Stories.requiredAssets=function(lang){return D.pack.nodes.reduce(function(all,n){return all.concat(n.audioKeys.map(function(k){return D.pack.audioPath.replace('{locale}',lang).replace('{key}',k);}));},[]);};
Stories.ready=function(lang){
 if(D.pack.targetLocales.indexOf(lang)<0)return false;
 var L=Core.L(lang),ready=D.readyAssets||[];
 return D.pack.vocabIds.every(function(id){var item=Core.item(id),word=L.words&&L.words[id];return item&&item[lang]&&word&&word.heard>0;})&&Stories.requiredAssets(lang).every(function(p){return ready.indexOf(p)>=0;});
};
Lisa.ico.story = '<svg viewBox="0 0 100 100"><path d="M50 26 Q32 14 10 18 V80 Q32 76 50 88 Z" fill="#fff4e0" stroke="#ff9b3d" stroke-width="5" stroke-linejoin="round"/><path d="M50 26 Q68 14 90 18 V80 Q68 76 50 88 Z" fill="#fff" stroke="#ff9b3d" stroke-width="5" stroke-linejoin="round"/><path d="M60 40 L66 30 L72 40 Z" fill="#ff9b3d"/><path d="M74 40 L80 30 L84 42 Z" fill="#ff9b3d"/><ellipse cx="72" cy="50" rx="12" ry="9" fill="#ff9b3d"/><path d="M20 38 H40 M20 50 H40 M20 62 H36" stroke="#cfc5b2" stroke-width="4" stroke-linecap="round"/></svg>';
Lisa.ico.again = '<svg viewBox="0 0 100 100"><path d="M78 50 A28 28 0 1 1 64 25" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M56 10 L78 22 L60 40 Z" fill="#fff"/></svg>';
UI.screens.story=function(flow,root){
 var lang=Core.curLang();if(!Stories.ready(lang)){UI.go('home');return;}
 var state=R.start(Object.assign({},D.pack,{targetLocale:lang}),'story:'+Date.now()+':'+(++serial));
 var closed=false,busy=false,recorded=false,audioSerial=0,pauseSerial=0,phase='speaking';
 UI.scene(root,D.pack.scene);
 var lisa=Lisa.make({cls:'st-lisa'});root.appendChild(lisa);
 var choices=el('div','st-choices');root.appendChild(choices);
 var bar=el('div','topbar');root.appendChild(bar);
 var back=UI.backBtn(function(){if(alive())UI.go('home');});bar.appendChild(back);
 var speaker=UI.speakerBtn(replay);bar.appendChild(speaker);
 function alive(){return !closed&&!flow.dead&&UI.flow===flow&&Core.curLang()===lang;}
 function node(){return state.story.nodes.find(function(n){return n.id===state.nodeId;});}
 function scope(){return {runId:state.runId,epoch:state.epoch,nodeId:state.nodeId};}
 function owns(s,t){return alive()&&audioSerial===t&&s.runId===state.runId&&s.epoch===state.epoch&&s.nodeId===state.nodeId;}
 function show(p){phase=p;root.dataset.phase=p;root.dataset.nodeId=state.nodeId;root.dataset.runId=state.runId;root.dataset.epoch=String(state.epoch);}
 function record(){
  if(!alive()||recorded)return;recorded=true;
  var L=Core.L(lang);if(!L.stories||typeof L.stories!=='object'||Array.isArray(L.stories))L.stories={};
  var old=L.stories.st_picnic,seen=old&&Number.isSafeInteger(old.seen)&&old.seen>=0?old.seen:0;
  L.stories.st_picnic={seen:Math.min(Number.MAX_SAFE_INTEGER,seen+1),last:Date.now()};Core.persist();
 }
 function apply(type,extra){
  var result=R.reduce(state,Object.assign({type:type},scope(),extra||{}));state=result.state;
  result.effects.forEach(function(e){if(e.type==='stop-audio')Snd.stop();else if(e.type==='complete-engagement')record();});
 }
 function path(key){return D.pack.audioPath.replace('{locale}',lang).replace('{key}',key);}
 // Snd.say also returns true on its safety timer. Only this clip's real ended event acknowledges narration.
 async function clip(url,s,t){
  var playback,media,ended=false;
  function onEnd(e){if(e.isTrusted===true&&media.ended===true&&Number.isFinite(media.duration)&&media.duration>0&&Number.isFinite(media.currentTime)&&media.currentTime>=media.duration-.05)ended=true;}
  try{
   if(Core.fast===true)return false;
   // Native dispatch may run microtasks between listeners. Observe ended before Core resolves say().
   Snd.preload(url);media=Snd.cache&&Snd.cache[url];
   if(!media)return false;
   media.addEventListener('ended',onEnd);
   playback=Snd.say([url]);
   var ok=await playback;
   if(!owns(s,t))return null;
   if(ok!==true||!ended){Snd.stop();return false;}
   return true;
  }catch(err){if(owns(s,t)){Snd.stop();return false;}return null;}
  finally{if(media)media.removeEventListener('ended',onEnd);}
 }
 function retryPulse(){UI.pulse(speaker);}
 function afterNarration(){
  if(!alive())return;
  busy=false;
  if(state.phase==='choice'){showChoices();return;}
  if(state.phase==='completed'){showEnd();return;}
  if(state.phase==='advance'){
   var n=node();
   if(n.pauseAfterMs){
    show('pause');lisa.pose('tilt');var ticket=++pauseSerial,s=scope();
    flow.after(n.pauseAfterMs,function(){if(!alive()||ticket!==pauseSerial||s.epoch!==state.epoch||s.nodeId!==state.nodeId)return;lisa.pose('idle');advance();});
   }else advance();
  }
 }
 async function narrate(withHelp){
  if(!alive())return;
  busy=true;show('speaking');choices.innerHTML='';choices.classList.remove('st-pulse');
  var n=node(),s=scope(),ticket=++audioSerial;
  if(UI.idleReset)UI.idleReset(flow);
  if(withHelp&&n.help&&Core.save.settings.ruHelp&&Core.baseLang()!==lang){
   var help=D.pack.helpPath.replace('{base}',Core.baseLang()).replace('{key}',n.help);
   if((D.readyAssets||[]).indexOf(help)>=0){await clip(help,s,ticket);if(!owns(s,ticket))return;}
  }
  lisa.pose(n.pose);
  while(owns(s,ticket)&&state.phase==='narrating'){
   var index=state.audioIndex,key=n.audioKeys[index],ok=await clip(path(key),s,ticket);
   if(ok===null||!owns(s,ticket))return;
   apply(ok?'audio-ended':'audio-failed',{audioIndex:index,audioKey:key});
   if(!ok){busy=false;show('retry');retryPulse();return;}
  }
  if(owns(s,ticket))afterNarration();
 }
 function advance(){if(!alive())return;pauseSerial++;apply('advance');narrate(true);}
 function choose(c,tile){
  if(!alive()||busy||phase!=='choose'||state.phase!=='choice')return;
  busy=true;pauseSerial++;var tiles=Array.prototype.slice.call(choices.children);
  tiles.forEach(function(t){t.classList.add(t===tile?'st-picked':'st-dim');});
  apply('choose',{choiceId:c.id});show('speaking');var epoch=state.epoch;
  if(node().feed)flow.after(200,function(){if(alive()&&state.epoch===epoch)tile.classList.add('st-feed');});
  flow.after(node().feed?800:200,function(){if(alive()&&state.epoch===epoch)narrate(true);});
 }
 function showChoices(){
  show('choose');choices.innerHTML='';
  node().choices.forEach(function(c){
   var t=el('div','st-tile');t.dataset.choice=c.id;
   t.appendChild(Core.Pic.el(Core.item(c.vocabId)));
   t.appendChild(Core.vocabLabelEl(lang,Core.item(c.vocabId),'','vocab-label st-label'));
   Core.tap(t,function(){choose(c,t);});choices.appendChild(t);
  });
 }
 function showEnd(){
  show('end');choices.innerHTML='';var end=el('div','st-end');
  end.appendChild(UI.btn('b-story-again','<span class="ic">'+Lisa.ico.again+'</span>',function(){if(alive()&&!busy)UI.go('story');}));
  end.appendChild(UI.homeBtn(function(){if(alive())UI.go('home');}));root.appendChild(end);
 }
 async function auxiliary(){
  var previous=phase,s=scope(),ticket=++audioSerial;busy=true;show('speaking');
  var url=path(node().audioKeys[state.audioIndex]);if(Snd.cache&&Snd.cache[url]&&Snd.cache[url]._bad)delete Snd.cache[url];
  var ok=await clip(url,s,ticket);
  if(ok===null||!owns(s,ticket))return;
  busy=false;show(previous);if(!ok)retryPulse();
 }
 function replay(){
  if(!alive()||busy)return;
  if(phase==='choose'||phase==='end'){auxiliary();return;}
  if(phase==='pause'||phase==='retry'){
   pauseSerial++;lisa.pose('idle');
   var url=path(node().audioKeys[state.audioIndex]);if(Snd.cache&&Snd.cache[url]&&Snd.cache[url]._bad)delete Snd.cache[url];
   apply(phase==='retry'?'retry':'replay');narrate(false);
  }
 }
 flow.onKill(function(){closed=true;audioSerial++;pauseSerial++;state=R.reduce(state,Object.assign({type:'cancel'},scope())).state;lisa.pose('idle');Snd.stop();});
 UI.idle(flow,{visualMs:8000,speakMs:8000,active:function(){return alive()&&!busy&&(phase==='choose'||phase==='retry');},visual:function(){
  if(phase==='retry'){retryPulse();return;}choices.classList.remove('st-pulse');void choices.offsetWidth;choices.classList.add('st-pulse');
 },speak:function(){if(alive()&&!busy&&phase==='choose')auxiliary();}});
 narrate(true);
};
})();
