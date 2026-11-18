'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'smoke_lesson.js'),'utf8');
function fixture(counts=['3','3'],options={}){
 let snapshots=0,seen=0,mounted=true,current,doneCallback,scene,state,finished=false;const sleeps=[],shots=[],reads=[],checks=[];
 const tile={dataset:{choice:'large'},getBoundingClientRect:()=>({left:100,top:100,width:200,height:200}),closest:()=>tile};
 function makeScene(values){const obj={querySelector(sel){reads.push({sel,mounted,original:obj===scene});if(!mounted)return null;return {dataset:{count:values[sel==='.ls-more-left'?0:1]}};}};Object.defineProperty(obj,'isConnected',{get:()=>mounted&&current?.S.box===obj});return obj;}
 function makeHook(id,box){return {id,S:{box},state(){snapshots++;if(options.noFinal&&snapshots>=3)state={...state,phase:'word',done:true};return JSON.parse(JSON.stringify(state));}};}
 const c={console,Date,Promise,module:{exports:{}},process:{argv:[]},window:null};c.window=c;
 function finish(){if(finished)return;finished=true;seen=1;c.Core.L().lessons.more={seen:1,last:1};doneCallback();}
 async function sleep(ms){sleeps.push(ms);if(ms===600&&snapshots>=3)finish();if(ms===600&&snapshots===2&&options.replacement){const replacement=makeScene(['3','3']);current=makeHook(options.replacement,replacement);c.__lessonTest=current;finish();}if(ms===900&&options.noFinal)finish();}
 const lib={expect(ok,message){checks.push(message);assert(ok,message);},fail(message){assert.fail(message);},page:{async evaluate(fn,arg){c.__arg=arg;return vm.runInContext('('+fn.toString()+')(__arg)',c);},waitForFunction:async()=>true,screenshot:async o=>shots.push(o.path),touchscreen:{tap:async()=>{state.beat=6;state.phase='beat';state.picks.push({choice:'large',auto:false});}}}};
 c.Core={curLang:()=> 'pt',Snd:{say:async()=>true},L:()=>c.record};c.record={lessons:{}};c.Lesson={seen:()=>seen};c.UI={};
 c.__test={go(name,p){if(name==='lesson'){state={id:p.id,beat:2,phase:'prompt',picks:[],done:false};scene=makeScene(counts);current=makeHook(p.id,scene);c.__lessonTest=current;doneCallback=p.done;c.Core.Snd.say(['audio/ui/ru_cs_check.ogg','audio/ui/ru_cs_more_4.ogg']);}else{mounted=false;c.__lessonTest=null;}}};
 c.document={querySelectorAll:()=>[tile,{...tile}],querySelector(sel){if(sel.includes('ls-tile'))return tile;if(!mounted)return null;return scene.querySelector(sel);},elementFromPoint:()=>tile};
 const requireFixture=name=>name==='./mg_lib'?{boot:()=>assert.fail('unit fixture must never launch a browser'),sleep,SHOTS:'/fixture/shots',ROOT:'/fixture'}:require(name);requireFixture.main={};c.require=requireFixture;
 vm.createContext(c);vm.runInContext(source,c);
 return {run:()=>c.module.exports.playLesson(lib,'more',{width:1920,height:1080},true),reads,sleeps,shots,checks};
}
test('actual lesson harness retains witnessed final 3,3 when existing screenshot delay unmounts the scene',async()=>{
 const f=fixture();await f.run();assert(f.reads.some(r=>r.mounted&&r.original&&r.sel==='.ls-more-left'),'original final DOM observed before teardown');assert(f.sleeps.includes(600),'existing screenshot delay retained');assert(f.shots.some(p=>p.endsWith('lesson_more_summary_1920.png')));assert(f.checks.some(s=>s.includes('onDone')));assert(f.checks.some(s=>s.includes('larger-basket choice')));
});
test('wrong actual 3,2 counts still fail rather than synthesizing or skipping 3,3',async()=>{await assert.rejects(fixture(['3','2']).run(),/both baskets end with three apples/);});
test('completion with no witnessed final basket state must fail',async()=>{await assert.rejects(fixture(['3','3'],{noFinal:true}).run(),/witness.*3,3|3,3.*witness/);});
test('a replacement lesson scene cannot supply the original scene final-count witness',async()=>{for(const replacement of ['more','stones'])await assert.rejects(fixture(['3','2'],{replacement}).run(),/witness.*3,3|3,3.*witness/);});
