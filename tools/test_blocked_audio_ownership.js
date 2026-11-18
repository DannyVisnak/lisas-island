'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function runtime(){const gestures={},played=[];let rejectLate=null;
 class Audio{constructor(){this.events={};this.duration=1;}addEventListener(k,f){(this.events[k] ||= []).push(f);}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(x=>x!==f);}pause(){}play(){played.push(this.src);if(this.src==='late'){return new Promise((_,rej)=>rejectLate=rej);}if(this.src==='allowed'){queueMicrotask(()=>{for(const f of this.events.ended||[])f();});return Promise.resolve();}const e=new Error('gesture required');e.name='NotAllowedError';return Promise.reject(e);}}
 const c={window:{localStorage:{getItem:()=>null,setItem(){}}},document:{addEventListener:(k,f)=>gestures[k]=f},Audio,Date,console,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1};vm.createContext(c);vm.runInContext(fs.readFileSync('app/js/data.js','utf8'),c);vm.runInContext(fs.readFileSync('app/js/core.js','utf8'),c);
 return {C:c.window.Core,played,gesture:()=>gestures.pointerdown(),rejectLate:()=>{const e=new Error('late reject');e.name='NotAllowedError';rejectLate(e);}};
}
test('blocked home retry is cancelled on navigation before EN/helpOFF first gesture',async()=>{
 const r=runtime();await r.C.Snd.say(['audio/ui/ru_welcome.ogg'],{retry:true});assert.ok(r.C.Snd.pendingList);r.C.Snd.stop();r.C.save.settings.baseLang='en';r.C.save.settings.ruHelp=false;r.gesture();await Promise.resolve();assert.deepEqual(r.played,['audio/ui/ru_welcome.ogg']);assert.equal(r.C.Snd.pendingList,null);
});
test('blocked retry remains available on same screen',async()=>{
 const r=runtime();await r.C.Snd.say(['audio/ui/ru_welcome.ogg'],{retry:true});r.gesture();await Promise.resolve();assert.deepEqual(r.played,['audio/ui/ru_welcome.ogg','audio/ui/ru_welcome.ogg']);
});
test('late rejected cancelled audio cannot mark current chain blocked',async()=>{
 const r=runtime();const old=r.C.Snd.say(['late'],{retry:true});r.C.Snd.stop();r.rejectLate();await old;await Promise.resolve();await r.C.Snd.say(['allowed'],{retry:true});assert.equal(r.C.Snd.pendingList,null);assert.ok(!r.C.Snd._blocked);
});
