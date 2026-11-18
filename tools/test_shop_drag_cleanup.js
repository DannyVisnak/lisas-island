'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('destroy an active MG.drag releases all window pointer listeners and its pending snap timer',()=>{
 const events=new Map(),timers=new Set();let next=0;const c={window:null,Core:{D:{},Snd:{unlock(){}},speed:1},UI:{screens:{}},setTimeout:fn=>{timers.add(++next);return next;},clearTimeout:id=>timers.delete(id)};c.window=c;c.addEventListener=(n,f)=>events.set(n,f);c.removeEventListener=(n,f)=>{if(events.get(n)===f)events.delete(n);};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../app/js/minigames.js','utf8'),c);
 let local={};const n={classList:{add(){},remove(){},toggle(){}},style:{},addEventListener:(k,f)=>local[k]=f,removeEventListener:k=>delete local[k]};const h=c.MG.drag(n,{});local.pointerdown({pointerType:'touch',pointerId:1,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});assert.equal(events.size,3);h.destroy();assert.equal(events.size,0);assert.equal(Object.keys(local).length,0);assert.equal(timers.size,0);
});
