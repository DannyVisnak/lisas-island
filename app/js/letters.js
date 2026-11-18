/* LISA-18. Exact Opus geometry/copy; reviewed LetterRules owns encounter transitions.
   No SRS/word mutation: letter observations and path step rewards are separate. */
(function(){
'use strict';
var Letters=window.Letters={},R=window.LetterRules,D=window.LETTERS_DATA;
function progress(){return R.progress(Core.L('pt').letters);}
function persist(S,e){S.letter.encounter=e;Core.persist();}
function asset(id){return 'audio/pt/'+id+'.ogg';}
function exists(id){var u=asset(id),bad=Core.Snd.cache&&Core.Snd.cache[u];return (Core.D.letterAudio||[]).indexOf('pt/'+id)>=0&&!(bad&&bad._bad);}
function review(id){var a=(Core.save.letterAudioReview||{})['pt/'+id];return a&&a.status==='approved'&&typeof a.reviewer==='string'&&a.reviewer.trim()&&(a.reviewerKind==='parent'||a.reviewerKind==='native-pt-pt')&&a.date;}
Letters.track=function(m){if(!exists(m.anchor)||!exists('word_'+m.anchor+'_bare')||!review('word_'+m.anchor+'_bare'))return 'none';return exists(m.variant)&&review(m.variant)?'sound':'bare';};
Letters.runtimeTrack=function(S){var t=Letters.track(S.letter.plan.mapping);if(t==='none')return t;if(S.letter.track==='bare')return 'bare';if(t==='bare')S.letter.track='bare';return t;};
Letters.planSession=function(S,lang,remainingMs){
 if(S.letter)return S.letter.plan;
 var assets={};if(lang==='pt')R.mappings(Core.D.items).forEach(function(m){if(Letters.track(m)!=='none'){var a=Core.save.letterAudioReview['pt/word_'+m.anchor+'_bare'];assets[m.lower]={approved:true,available:true,reviewer:a.reviewer};}});
 var p=R.selectSession({sessionId:S.day+':'+S.startedAt+':'+lang,day:Core.today(),lang:lang,enabled:Core.save.settings.letters===true,small:!!Core.save.settings.pathSmall,reviewOnly:!!S.review,earlyStop:!!S.early,remainingMs:remainingMs,vocab:Core.D.items,wordsByLang:{pt:Core.L('pt').words},progress:progress(),assets:assets,basePlan:S.plan});
 S.letter=p.kind==='new'?{plan:p,track:Letters.track(p.mapping),encounter:null}:null;if(S.letter)S.plan=p.plan.slice();return p;
};
Letters.open=function(S){var e=S.letter.encounter?R.restoreEncounter(S.letter.encounter):R.createEncounter(S.letter.plan,{physicalEnabled:Core.save.settings.physicalKeys!==false});persist(S,e);return e;};
Letters.transition=function(S,e,event){var n=R.advance(e,event);if(e.step==='listen'&&n.step!=='listen')Core.L('pt').letters=R.recordIntroduction(progress(),n);persist(S,n);return n;};
Letters.complete=function(S,e){
 if(!e.done)return false;var prior=Core.L('pt').letters;if(prior&&Array.isArray(prior.completed)&&prior.completed.indexOf(e.id)>=0)return true;
 var p=R.recordCompletion(progress(),e),obs=p.observations[e.mapping.lower];
 if(obs){p=JSON.parse(JSON.stringify(p));obs=p.observations[e.mapping.lower];obs.track=S.letter.track;if(S.letter.track==='bare'){obs.bareWordSelectionUnhelped=obs.soundSelectionUnhelped;obs.soundSelectionUnhelped=null;}}
 Core.L('pt').letters=p;persist(S,e);return true;
};
Letters.recover=async function(S,flow){if(flow.dead||!S.letter)return;S.letter=null;S.step++;Core.persist();var u=Core.lisaLine('next');if(u)await flow.say([u]);if(!flow.dead)Path.go();};
function line(key){return Core.baseUrl('lisa_letters_'+key);}
function name(key,v){var t=D.layout.a11yLabels[key][Core.baseLang()];return v?t.replace('{x}',v).replace('{X}',v):t;}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
Letters.wordMarkup=function(m){var a=m.label.slice(0,m.nounSpan.start).trim(),n=m.label.slice(m.nounSpan.start),i=m.target.start-m.nounSpan.start,c=' style="color:'+Core.vocabLabel('pt',{pt:{word:m.label}}).color+'"';return (a?'<span class="lt-art"'+c+'>'+esc(a)+'</span>':'')+'<span class="lt-noun"'+c+'>'+esc(n.slice(0,i))+'<span class="lt-t">'+esc(n[i])+'</span>'+esc(n.slice(i+1))+'</span>';};
UI.screens.letters=function(flow,root,p){
 var S=Path.session(p.lang),record=S&&S.letter;if(!record){Path.go();return;}
 var firstEntry=!record.encounter;
 var e;try{e=Letters.open(S);}catch(err){Letters.recover(S,flow);return;}
 if(Letters.runtimeTrack(S)==='none'){Letters.recover(S,flow);return;}
 var host=root;
 var lisa=Lisa.make({cls:'path-lisa'});root.appendChild(lisa);
 lisa.style.left='1.2rem';lisa.style.top='59.9rem';lisa.style.width='15rem';lisa.style.height='16.9rem';lisa.style.pointerEvents='none';
 var stageFlow=null,stageRoot=null,stageSerial=0,locked=false,chainSerial=0;
 flow.onKill(function(){if(stageFlow)stageFlow.kill();Core.Snd.stop();});
 function button(cls,html,label,fn,container){var b=Core.el('div',cls,html);b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label',label);Core.tap(b,function(){if(!flow.dead)fn(b);});b.addEventListener('keydown',function(ev){if((ev.key==='Enter'||ev.key===' ')&&!ev.repeat){ev.preventDefault();if(!flow.dead)fn(b);}});(container||host).appendChild(b);return b;}
 var back=button('btn lt-btn lt-back','<span class="ic">'+Lisa.ico.back+'</span>',name('back'),function(){persist(S,e);Path.home();});
 var speaker=button('btn lt-btn lt-speaker','<span class="ic">'+Lisa.ico.speaker+'</span>',name('speaker'),function(){replay(false);});
 var help=button('btn lt-btn lt-help','<span class="ic">'+Lisa.ico.bulb+'</span>',name('help'),function(){helpStage();});
 host.appendChild(Core.el('div','lt-flag','<img src="'+Core.D.uiImg.flag_pt+'" alt="">'));
 var dots=Core.el('div','lt-dots');host.appendChild(dots);
 function target(){return asset(S.letter.track==='sound'?e.mapping.variant:'word_'+e.mapping.anchor+'_bare');}
 function pulse(){var t=host.querySelector('.lt-t');if(t){t.classList.remove('lt-pulse');void t.offsetWidth;t.classList.add('lt-pulse');}}
 async function audio(parts,token){
  if(flow.dead||!stageFlow||stageFlow.dead||token!==stageSerial)return false;
  var oldTrack=S.letter.track,currentTrack=Letters.runtimeTrack(S);
  if(currentTrack==='none'){Letters.recover(S,flow);return false;}
  if(oldTrack!==currentTrack){Core.persist();render();return false;}
  var chain=++chainSerial,localFlow=stageFlow,ok=await localFlow.say(parts.filter(function(x){return x!==null&&x!==undefined;}));
  if(flow.dead||localFlow.dead||token!==stageSerial||chain!==chainSerial)return false;
  var afterTrack=Letters.runtimeTrack(S);
  if(afterTrack==='none'){Letters.recover(S,flow);return false;}
  if(afterTrack!==currentTrack){Core.persist();render();return false;}
  if(!ok){Letters.recover(S,flow);return false;}
  return true;
 }
 function transition(event){if(locked||flow.dead)return;var old=e;e=Letters.transition(S,e,event);if(e.step!==old.step)render();}
 function later(ms,fn){return stageFlow.after(ms,fn);}
 function good(event,ms){if(locked)return;locked=true;Core.Snd.sfx('good');lisa.pose('cheer');later(ms||700,function(){locked=false;transition(event);});}
 function idle(fn1,fn2,fn3){later(8000,fn1);later(16000,fn2);later(26000,fn3);}
 async function replay(intro){
  var token=stageSerial,step=e.step,m=e.mapping,parts=[];
  if(step==='listen'){
   if(intro)parts.push(line('intro'),400);
   if(S.letter.track==='sound')parts.push(line('listen'),300,target(),600,target());
   else {parts.push(asset(m.anchor),500);if(m.anchor!=='yellow')parts.push(target());}
  }else if(step==='word'){parts=[line('word'),200,target()];pulse();}
  else if(step==='choice')parts=[line('tap'),200,target()];
  else if(step==='formation'){demo();parts=[line('trace'),line('tap_instead')];}
  else if(step==='screenKey')parts=[line('case'),300,line('screen_key'),200,target()];
  else if(step==='physicalKey')parts=[line('real_key')];
  if(await audio(parts,token)){
   if(step==='listen'||step==='word'){var next=host.querySelector('.lt-next');if(next)next.classList.remove('lt-off');var own=chainSerial;later(3000,function(){if(own===chainSerial)transition({type:'continue'});});}
  }
 }
 function helpStage(){
  if(locked)return;
  if(e.step==='listen'||e.step==='word'){replay(false);return;}
  if(e.step==='formation'){var ink=host.querySelector('.lt-ink-group');if(ink)ink.innerHTML='';traceVisited.clear();replay(false);return;}
  transition({type:'help'});var t=host.querySelector('[data-target="true"]');if(t)t.classList.add('lt-glow');
  audio([line(e.step==='physicalKey'?'real_key':'show')],stageSerial);
 }
 var svg=null,traceVisited=new Set(),samplePoints=[],demoPaths=[];
 function demo(){
  if(!svg)return;var token=stageSerial,offset=0;demoPaths.forEach(function(path,i){var length=path.getTotalLength(),duration=Math.max(600,length*2.4);path.style.strokeDasharray=length;path.style.strokeDashoffset=length;path.style.transition='none';later(offset,function(){if(token!==stageSerial)return;path.style.transition='stroke-dashoffset '+duration/Core.speed+'ms linear';path.style.strokeDashoffset=0;var start=svg.querySelector('.lt-start');start.setAttribute('cx',D.formationPaths.glyphs[e.mapping.lower].start[i][0]);start.setAttribute('cy',D.formationPaths.glyphs[e.mapping.lower].start[i][1]);});offset+=duration;});
 }
 function formation(){
  var card=Core.el('div','lt-el card lt-form');stageRoot.appendChild(card);var paths=D.formationPaths.glyphs[e.mapping.lower];
  card.innerHTML='<svg viewBox="0 0 400 400"><path class="lt-rule" d="M20 65H380 M20 150H380 M20 372H380"/><path class="lt-rule lt-base" d="M20 300H380"/>'+paths.strokes.map(function(d){return '<path class="lt-guide" d="'+d+'"/>';}).join('')+paths.strokes.map(function(d){return '<path class="lt-demo" d="'+d+'"/>';}).join('')+'<g class="lt-ink-group"></g><circle class="lt-start" r="10" cx="'+paths.start[0][0]+'" cy="'+paths.start[0][1]+'"/></svg>';
  svg=card.firstChild;demoPaths=Array.from(svg.querySelectorAll('.lt-demo'));traceVisited=new Set();samplePoints=[];
  var total=demoPaths.reduce(function(n,path){return n+path.getTotalLength();},0);
  for(var i=0;i<24;i++){var at=total*i/23;for(var j=0;j<demoPaths.length;j++){var len=demoPaths[j].getTotalLength();if(at<=len||j===demoPaths.length-1){samplePoints.push(demoPaths[j].getPointAtLength(Math.min(at,len)));break;}at-=len;}}
  var pointer=null,poly=null,points=[];
  function point(ev){var pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse());}
  function move(ev){if(pointer!==ev.pointerId||locked)return;ev.preventDefault();var pt=point(ev);points.push(pt.x+','+pt.y);poly.setAttribute('points',points.join(' '));samplePoints.forEach(function(s,i){if(Math.hypot(s.x-pt.x,s.y-pt.y)<=60)traceVisited.add(i);});if(traceVisited.size/24>=.6){svg.querySelector('.lt-ink-group').innerHTML=paths.strokes.map(function(d){return '<path class="lt-done-glyph" d="'+d+'"/>';}).join('');pointer=null;good({type:'trace'});}}
  svg.addEventListener('pointerdown',function(ev){if(locked)return;pointer=ev.pointerId;points=[];poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');poly.setAttribute('class','lt-ink');svg.querySelector('.lt-ink-group').appendChild(poly);try{svg.setPointerCapture(pointer);}catch(err){}move(ev);});svg.addEventListener('pointermove',move);['pointerup','pointercancel','lostpointercapture'].forEach(function(type){svg.addEventListener(type,function(ev){if(pointer===ev.pointerId)pointer=null;});});
  button('lt-el card lt-tapalt lt-hit',e.mapping.lower,name('tapInstead'),function(){good({type:'touch'},500);},stageRoot);
  idle(demo,function(){audio([line('tap_instead')],stageSerial);},function(){transition({type:'touch'});});
 }
 function render(){
  stageSerial++;chainSerial++;if(stageFlow)stageFlow.kill();Core.Snd.stop();stageFlow=new Core.Flow();locked=false;svg=null;demoPaths=[];if(stageRoot)stageRoot.remove();stageRoot=Core.el('div','lt-stage');host.appendChild(stageRoot);host.dataset.step=e.step;host.dataset.track=S.letter.track;host.dataset.letter=e.mapping.lower;
  var names=['listen','word','choice','formation','screenKey'];if(e.physicalEnabled)names.push('physicalKey');dots.innerHTML=names.map(function(n,i){return '<i class="'+(n===e.step?'lt-now':i<names.indexOf(e.step)?'lt-past':'')+'"></i>';}).join('');
  lisa.pose(e.step==='choice'?'tilt':e.step==='listen'?'idle':'point');
  var m=e.mapping;
  if(e.done){finish();return;}
  if(e.step==='listen'||e.step==='word')button('btn lt-btn b-skip lt-next lt-off','<span class="ic">'+Lisa.ico.next+'</span>',name('next'),function(){var n=host.querySelector('.lt-next');if(n&&!n.classList.contains('lt-off'))transition({type:'continue'});},stageRoot);
  if(e.step==='listen'){
   if(S.letter.track==='sound')button('lt-el lt-sound lt-hit',Lisa.ico.speaker,name('sound'),function(){replay(false);},stageRoot);
   else {var pic=button('lt-el card lt-pic lt-mid lt-hit','',name('picture'),function(){replay(false);},stageRoot);pic.appendChild(Core.Pic.el(Core.D.items[m.anchor]));}
  }else if(e.step==='word'){
   var picture=button('lt-el card lt-pic lt-side lt-hit','',name('picture'),function(){pulse();audio([target()],stageSerial);},stageRoot);picture.appendChild(Core.Pic.el(Core.D.items[m.anchor]));button('lt-el lt-word lt-hit',Letters.wordMarkup(m),name('picture'),function(){pulse();audio([target()],stageSerial);},stageRoot);
  }else if(e.step==='choice'){
   var conf=D.layout.stages.choice,lower=m.lower,other=conf.distractor[lower];['left','right'].forEach(function(side){var v=conf.targetSide[lower]===side?lower:other;var b=button('lt-el card lt-choice '+(side==='left'?'lt-l':'lt-r')+' lt-hit',v,name('choice',v),function(){if(locked)return;if(v===lower){b.classList.add('lt-ok');good({type:'choice',letter:v});}else if(e.attempts===0){b.classList.add('lt-soft');transition({type:'choice',letter:v});audio([line('relisten'),200,target()],stageSerial);}else{var t=host.querySelector('[data-target="true"]');t.classList.add('lt-glow');locked=true;var token=stageSerial;audio([line('show')],token).then(function(){if(token===stageSerial&&!flow.dead){locked=false;transition({type:'choice',letter:v});}});}},stageRoot);b.dataset.target=String(v===lower);});
   idle(function(){replay(false);},helpStage,function(){transition({type:'help'});transition({type:'choice',letter:lower});});
  }else if(e.step==='formation')formation();
  else if(e.step==='screenKey'){
   stageRoot.appendChild(Core.el('div','lt-el lt-case','<span class="lt-case-low">'+m.lower+'</span><svg class="lt-case-arrow" viewBox="0 0 100 60"><path d="M0 20H65V0L100 30 65 60V40H0Z"/></svg><span class="lt-key lt-cap">'+m.upper+'</span>'));
   var tray=Core.el('div','lt-el card lt-tray');stageRoot.appendChild(tray);var misses=0,press=function(b,v){if(locked)return;b.classList.add('lt-down');later(120,function(){b.classList.remove('lt-down');});if(v!==m.upper){misses++;if(misses>=2)helpStage();else host.querySelector('[data-target="true"]').classList.add('nudge');return;}locked=true;tray.innerHTML='<b>'+m.lower+'</b>';Core.Snd.sfx('good');var token=stageSerial;audio([line('found')],token).then(function(){if(token===stageSerial&&!flow.dead){locked=false;transition({type:'screenKey',letter:v});}});};
   D.layout.stages.screenKey.crops[m.lower].forEach(function(v,i){var b=button('lt-el lt-key lt-crop lt-k'+i+' lt-hit',v,name('key',v),function(node){press(node,v);},stageRoot);b.dataset.target=String(v===m.upper);});
   idle(function(){replay(false);},helpStage,function(){transition({type:'help'});press(host.querySelector('[data-target="true"]'),m.upper);});
  }else if(e.step==='physicalKey'){
   var cap=Core.el('div','lt-el lt-key lt-big',m.upper);cap.dataset.target='true';stageRoot.appendChild(cap);stageRoot.appendChild(Core.el('div','lt-el lt-arrow','<svg viewBox="0 0 100 100"><path d="M30 0H70V55H100L50 100 0 55H30Z"/></svg>'));var out=Core.el('div','lt-el card lt-tray lt-phys');stageRoot.appendChild(out);
   function success(n){if(locked)return;locked=true;e=n;persist(S,e);out.innerHTML='<b>'+m.lower+'</b>';Core.Snd.sfx('good');var token=stageSerial;audio([line('found')],token).then(function(){if(token===stageSerial&&!flow.dead){locked=false;render();}});}
   function key(ev){if(locked)return;var n=R.keyboard(e,ev);if(n!==e){if(ev.code===m.code)ev.preventDefault();if(n.done)success(n);else {e=n;persist(S,e);}}}
   document.addEventListener('keydown',key);document.addEventListener('keyup',key);stageFlow.onKill(function(){document.removeEventListener('keydown',key);document.removeEventListener('keyup',key);});
   function touch(){success(R.advance(e,{type:'touch'}));}button('lt-el lt-key lt-touchalt lt-hit',m.upper,name('touchInstead'),touch,stageRoot);
   idle(function(){audio([line('touch_instead')],stageSerial);},helpStage,touch);
  }
  replay(firstEntry&&e.step==='listen');firstEntry=false;
 }
 async function finish(){if(locked)return;locked=true;lisa.pose('cheer');await audio([line('finish')],stageSerial);if(flow.dead||!S.letter)return;Letters.complete(S,e);if(S.plan[S.step]==='LETTER')await Path.finishStep(flow);}
 render();
};
})();
