'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {waitRunProgress,readRunSnapshot}=require('./run_progress_contract');
const snapshot=(x,state='run')=>({x,state,checkpointX:220,mounted:true});
function simulation(samples){let time=0,n=0;return {read:async()=>samples[Math.min(n++,samples.length-1)],options:{now:()=>time,sleep:async ms=>{time+=ms;},intervalMs:50,timeoutMs:5000}};}
test('observed >300 forward progress survives a later legitimate reset',async()=>{
 const s=simulation([snapshot(220),snapshot(440),snapshot(550),snapshot(220,'bounce')]);const result=await waitRunProgress(s.read,s.options);assert.ok(result,'real forward-progress result required');assert.equal(result.baseline.x,220);assert.equal(result.observed.x,550);assert.equal(result.delta,330);
});
test('stationary, exact300 and bounce-only motion never satisfy running contract',async()=>{
 for(const samples of [[snapshot(220)],[snapshot(220),snapshot(520)],[snapshot(220),snapshot(600,'bounce'),snapshot(220)]]){const s=simulation(samples);await assert.rejects(waitRunProgress(s.read,s.options),/progress.*300/);}
});
test('post-recovery baseline and bounded <=5s contract are explicit',async()=>{
 const s=simulation([snapshot(220,'bounce'),snapshot(600)]);await assert.rejects(waitRunProgress(s.read,s.options),/post-recovery.*run/);
 await assert.rejects(waitRunProgress(async()=>snapshot(220),{timeoutMs:5001}),/5000/);
});
test('snapshot executes in browser scope, never reads Node-side __runState',async()=>{
 const page={evaluate:fn=>vm.runInNewContext('('+fn.toString()+')()',{window:{__runState:{state:'run',lisa:{x:345},checkpointX:220},UI:{cur:'run',flow:{dead:false}}}})};
 const r=await readRunSnapshot(page);assert.equal(r.x,345);assert.equal(r.mounted,true);assert.equal(r.checkpointX,220);
});
