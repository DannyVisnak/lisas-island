'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('real ctx.run stops before the next round and finish after Back kills its flow',async()=>{
 const src=fs.readFileSync(__dirname+'/../app/js/minigames.js','utf8'),start=src.indexOf('ctx.run = async function'),end=src.indexOf('\n  };',start)+5;
 let played=0,finished=0;const flow={dead:false},ctx={dots:{},setTarget(){},progress(){},quiet:async()=>{},lock(){},finish:async()=>finished++},scope={ctx,flow,p:{},idx:0};vm.runInNewContext(src.slice(start,end),scope);
 await ctx.run({targets:['r0','r1'],intro:false,ask:false,play:async()=>{played++;flow.dead=true;}});assert.equal(played,1);assert.equal(finished,0);
});
