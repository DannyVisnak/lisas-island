'use strict';
/* Controller-owned real-media browser check. This worker only prepares it; execution is separate.
   Uses isolated mg_lib browser storage. Never fabricates product readiness or audio approval. */
const assert=require('node:assert/strict');
function options(args){const o={lang:'pt',base:'ru',width:1128,height:752,reduced:false,caseName:'routes'};for(const a of args){const m=/^--(lang|base|viewport|motion|case)=(.+)$/.exec(a);assert(m,'unknown option '+a);const [,k,v]=m;if(k==='lang'){assert(['pt','en','de'].includes(v));o.lang=v;}else if(k==='base'){assert(['ru','en'].includes(v));o.base=v;}else if(k==='viewport'){assert(['1128','1920'].includes(v));o.width=+v;o.height=o.width===1128?752:1080;}else if(k==='motion'){assert(['normal','reduced'].includes(v));o.reduced=v==='reduced';}else{assert(['routes','geometry','recovery'].includes(v));o.caseName=v;}}return o;}
async function install(page,o){
 await page.emulateMedia({reducedMotion:o.reduced?'reduce':'no-preference'});
 await page.evaluate(o=>{
  __test.realTime();Core.Snd.stop();Core.save.firstRun=false;Core.save.settings.enabled={pt:true,en:true,de:true};Core.save.settings.baseLang=o.base;Core.save.settings.ruHelp=false;Core.save.settings.subtitles=true;Core.lang=o.lang;
  // Only known-word intake is fixture data; readiness always comes from the shipped verified manifest.
  STORIES_DATA.pack.vocabIds.forEach(id=>{Core.L(o.lang).words[id]=Object.assign({},Core.L(o.lang).words[id],{heard:2,box:1});});
  window.__storyBrowser={lang:o.lang,media:[],fault:null,primed:false};const f=__storyBrowser;
  if(!Stories.ready(o.lang))throw Error('Shipped story readiness missing; do not fabricate readyAssets');
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   const media=this,original=media.src;
   if(f.fault&&original.endsWith(f.fault)){f.fault=null;media.src=original.replace(/[^/]+$/, '__missing_story_smoke__.ogg');}
   function record(event,e){f.media.push({event,url:original,actualUrl:media.currentSrc||media.src,fast:Core.fast,isTrusted:e?e.isTrusted:null,duration:media.duration,currentTime:media.currentTime,time:performance.now()});}
   record('play');media.addEventListener('ended',e=>record('ended',e),{once:true});media.addEventListener('error',e=>record('error',e),{once:true});return play.call(media);
  };
  document.addEventListener('pointerdown',e=>{if(e.isTrusted)f.primed=true;},{capture:true});UI.go('home');
 },o);
}
async function snapshot(page){return page.evaluate(()=>{const s=JSON.parse(JSON.stringify(Core.save));for(const L of Object.values(s.langs))delete L.stories;return {screen:UI.cur,node:UI.root&&UI.root.dataset.nodeId,phase:UI.root&&UI.root.dataset.phase,runId:UI.root&&UI.root.dataset.runId,seen:Core.L(__storyBrowser.lang).stories?.st_picnic?.seen||0,saveWithoutStories:s,media:__storyBrowser.media.slice(),fast:Core.fast,speed:Core.speed,primed:__storyBrowser.primed};});}
async function wait(page,node,phase){await page.waitForFunction(([n,p])=>UI.cur==='story'&&UI.root.dataset.nodeId===n&&UI.root.dataset.phase===p,[node,phase],{timeout:30000});}
async function tap(lib,sel){return lib.tapSel('.s-story '+sel);}
async function open(lib){await lib.tapSel('.s-home .b-story');await wait(lib.page,'n_food','choose');}
function assertMode(s){assert.equal(s.fast,false,'native media cannot use Core.fast');assert.equal(s.speed,1);assert.equal(s.primed,true,'trusted activation reached the story');}
function assertMedia(events,url){const matches=events.filter(e=>e.url.endsWith(url));assert(matches.some(e=>e.event==='play'&&e.fast===false),'native play '+url);assert(matches.some(e=>e.event==='ended'&&e.isTrusted===true&&e.fast===false&&Number.isFinite(e.duration)&&e.duration>0&&e.currentTime>=e.duration*.9),'trusted full ended '+url);}
async function route(lib,o,food,play,repeatPause){
 const page=lib.page,before=await snapshot(page);await open(lib);const run=(await snapshot(page)).runId;
 await tap(lib,'[data-choice="'+food+'"]');await wait(page,'n_food_'+food.slice(2),'pause');
 if(repeatPause){await tap(lib,'.b-speaker');await wait(page,'n_food_'+food.slice(2),'speaking');await wait(page,'n_food_'+food.slice(2),'pause');}
 await wait(page,'n_play','choose');await tap(lib,'[data-choice="'+play+'"]');await wait(page,'n_bye','end');
 const completed=await snapshot(page);assertMode(completed);assert.equal(completed.runId,run);assert.equal(completed.seen,before.seen+1,'one engagement per completed run');assert.deepEqual(completed.saveWithoutStories,before.saveWithoutStories,'no assessment/session/reward changes');
 for(const key of ['n_hello','n_food','n_food_'+food.slice(2),'n_play','n_play_'+play.slice(2),'n_bye'])assertMedia(completed.media,'/audio/story/st_picnic/'+o.lang+'/'+key+'.ogg');
 await tap(lib,'.b-speaker');await wait(page,'n_bye','speaking');await wait(page,'n_bye','end');assert.equal((await snapshot(page)).seen,completed.seen,'end replay cannot count again');
 await tap(lib,'.b-home');await page.waitForFunction(()=>UI.cur==='home');return {food,play,runId:run,seen:completed.seen};
}
async function recovery(lib,o){
 const page=lib.page,before=await snapshot(page);
 await page.evaluate(lang=>{__storyBrowser.fault='/audio/story/st_picnic/'+lang+'/n_food.ogg';},o.lang);
 await lib.tapSel('.s-home .b-story');await wait(page,'n_food','retry');let s=await snapshot(page);assert.equal(s.seen,before.seen);assert.equal(await page.locator('.s-story .st-tile').count(),0);assert(s.media.some(e=>e.event==='error'&&e.actualUrl.endsWith('__missing_story_smoke__.ogg')),'native missing-file error reached renderer');
 await tap(lib,'.b-speaker');await wait(page,'n_food','choose');
 // Fault the real auxiliary replay. Existing choices must remain usable afterward.
 await page.evaluate(lang=>{__storyBrowser.fault='/audio/story/st_picnic/'+lang+'/n_food.ogg';},o.lang);await tap(lib,'.b-speaker');await wait(page,'n_food','speaking');await wait(page,'n_food','choose');assert.equal(await page.locator('.s-story .st-tile').count(),2);
 await tap(lib,'.b-speaker');await wait(page,'n_food','speaking');await wait(page,'n_food','choose');
 await tap(lib,'.b-back');await page.waitForFunction(()=>UI.cur==='home');assert.equal((await snapshot(page)).seen,before.seen);
 // Back during a genuinely playing target line: no completion or restored old screen later.
 await lib.tapSel('.s-home .b-story');await page.waitForFunction(()=>UI.cur==='story'&&UI.root.dataset.phase==='speaking');await tap(lib,'.b-back');await page.waitForFunction(()=>UI.cur==='home');await page.waitForTimeout(700);s=await snapshot(page);assert.equal(s.seen,before.seen);assert.deepEqual(s.saveWithoutStories,before.saveWithoutStories);return {nativeFailure:true,auxiliaryRecovered:true,backCancelled:true};
}
function stableGeometry(){
 const root=UI.root;if(!root)return false;
 const animations=root.getAnimations({subtree:true}).filter(a=>a.effect&&Number.isFinite(a.effect.getComputedTiming().iterations));if(animations.some(a=>!['finished','idle'].includes(a.playState))){window.__storyGeometry=null;return false;}
 const selector=UI.cur==='home'?'.homebtns .b-big':'.topbar .btn,.st-tile,.st-end .btn';
 const targets=Array.from(root.querySelectorAll(selector)),boxes=targets.map(n=>{const b=n.getBoundingClientRect();return [b.x,b.y,b.width,b.height];}),old=window.__storyGeometry;window.__storyGeometry={root,phase:root.dataset.phase,targets,boxes};
 return !!old&&old.root===root&&old.phase===root.dataset.phase&&targets.length===old.targets.length&&targets.length>0&&targets.every((n,i)=>old.targets[i]===n&&boxes[i].every((v,j)=>Math.abs(v-old.boxes[i][j])<.5));
}
async function geometry(lib,label){
 const page=lib.page;await page.waitForFunction(stableGeometry,null,{polling:'raf',timeout:8000});
 const result=await page.evaluate(()=>{
  const root=UI.root,selector=UI.cur==='home'?'.homebtns .b-big':'.topbar .btn,.st-tile,.st-end .btn';
  function rect(n){const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {cls:n.className,x:r.x,y:r.y,w:r.width,h:r.height,hit:n===hit||n.contains(hit)};}
  const controls=Array.from(root.querySelectorAll(selector)).map(rect);
  const obstacles=Array.from(root.querySelectorAll(UI.cur==='home'?'.home-lisa,.home-gear,.path-play':'.st-lisa')).map(rect);
  return {screen:UI.cur,phase:root.dataset.phase,controls,obstacles,labels:Array.from(root.querySelectorAll('.st-label')).map(n=>({visibility:getComputedStyle(n).visibility,height:n.getBoundingClientRect().height})),reduced:matchMedia('(prefers-reduced-motion:reduce)').matches};
 });
 await lib.shot(label);
 console.log(JSON.stringify({event:'story.geometry',label,...result}));
 // All controls includes Back/Speaker. Do not hide the author's outstanding 110px deficit.
 for(const b of result.controls){assert(b.w>=110&&b.h>=110,'control below 110px '+JSON.stringify(b));assert(b.hit,'covered control '+JSON.stringify(b));assert(b.x>=0&&b.y>=0&&b.x+b.w<=lib.storyOptions.width+1&&b.y+b.h<=lib.storyOptions.height+1,'outside viewport '+JSON.stringify(b));}
 function disjoint(a,b){return a.x+a.w<=b.x+.5||b.x+b.w<=a.x+.5||a.y+a.h<=b.y+.5||b.y+b.h<=a.y+.5;}
 for(let i=0;i<result.controls.length;i++){for(let j=i+1;j<result.controls.length;j++)assert(disjoint(result.controls[i],result.controls[j]),'overlapping controls');for(const obstacle of result.obstacles)assert(disjoint(result.controls[i],obstacle),'control overlaps '+obstacle.cls);}
 return result;
}
async function geometryRun(lib,o){
 const page=lib.page,prefix='story_'+o.lang+'_'+o.width+'_'+(o.reduced?'reduced':'normal'),measurements=[];
 measurements.push(await geometry(lib,prefix+'_home'));await open(lib);measurements.push(await geometry(lib,prefix+'_food'));
 await page.evaluate(()=>{Core.save.settings.subtitles=false;});await tap(lib,'.b-back');await open(lib);const off=await geometry(lib,prefix+'_food_subtitles_off');assert(off.labels.every(l=>l.visibility==='hidden'&&l.height>0),'subtitle-off retains label geometry');measurements.push(off);
 await tap(lib,'[data-choice="c_apple"]');await wait(page,'n_food_apple','pause');await lib.shot(prefix+'_pause');await wait(page,'n_play','choose');measurements.push(await geometry(lib,prefix+'_play'));await tap(lib,'[data-choice="c_ball"]');await wait(page,'n_bye','end');measurements.push(await geometry(lib,prefix+'_end'));return measurements;
}
async function run(lib,o){lib.storyOptions=o;await install(lib.page,o);if(o.caseName==='geometry')return geometryRun(lib,o);if(o.caseName==='recovery')return recovery(lib,o);const results=[];for(const food of ['c_apple','c_banana'])for(const play of ['c_ball','c_boat'])results.push(await route(lib,o,food,play,results.length===0));assert.equal(new Set(results.map(r=>r.runId)).size,4,'restart uses distinct run identities');const final=await snapshot(lib.page);await lib.page.evaluate(()=>Core.flushNow());await lib.page.reload();await lib.page.waitForFunction(()=>window.__test&&UI.cur==='home');assert.equal(await lib.page.evaluate(lang=>Core.L(lang).stories.st_picnic.seen,o.lang),final.seen,'engagement survives actual reload');return results;}
async function main(args){const o=options(args);let lib;try{lib=await require('./mg_lib').boot({viewport:{width:o.width,height:o.height},speed:1});console.log(JSON.stringify({event:'story.start',...o}));const result=await run(lib,o);assert.equal(lib.errors.length,0,lib.errors.join('\n'));console.log(JSON.stringify({event:'story.pass',...o,result}));}catch(error){if(lib)console.error(JSON.stringify({event:'story.diagnostics',snapshot:await snapshot(lib.page).catch(e=>({error:String(e)})),errors:lib.errors}));throw error;}finally{if(lib)await lib.browser.close();}}
module.exports={options,install,snapshot,route,recovery,stableGeometry,geometry,geometryRun,run,assertMode,assertMedia};if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.stack);process.exitCode=1;});
