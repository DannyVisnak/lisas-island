'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {options,audioProblems}=require('./smoke_base_language');
test('one case and one verified viewport selected with safe defaults',()=>{
 assert.deepEqual(options([]),{caseName:'settings',width:1128,height:752});
 assert.deepEqual(options(['--case=labels','--viewport=1920']),{caseName:'labels',width:1920,height:1080});
 assert.throws(()=>options(['--case=all']));assert.throws(()=>options(['--viewport=100']));assert.throws(()=>options(['--case=labels','--case=lessons']));assert.throws(()=>options(['--unknown']));
});
test('audio audit distinguishes base speech, target words, null chains and wrong language',()=>{
 const events=[{kind:'say',urls:['audio/ui/en_cs_check.ogg']},{kind:'say',urls:['audio/pt/water.ogg']},{kind:'say',urls:['audio/pt/water.ogg']},{kind:'preload',urls:['audio/pt/water.ogg']}];
 assert.deepEqual(audioProblems(events,{base:'en',help:true,target:'audio/pt/water.ogg',wordPlays:2}),[]);
 assert.ok(audioProblems(events,{base:'ru',help:true}).some(x=>x.includes('wrong base')));
 assert.ok(audioProblems(events,{base:'en',help:false}).some(x=>x.includes('base speech')));
 assert.ok(audioProblems([{kind:'say',urls:[null]},{kind:'say',urls:[]}],{base:'en',help:false}).some(x=>x.includes('null/empty')));
 assert.ok(audioProblems(events,{base:'en',help:true,target:'audio/pt/water.ogg',wordPlays:1}).some(x=>x.includes('target count')));
});
test('lesson choice point preserves true geometry, visibility and original-node hit',()=>{
 const {lessonTapPoint}=require('./smoke_base_language');assert.equal(typeof lessonTapPoint,'function');
 const sample={connected:true,visible:true,width:160,height:170,left:12,top:21,hit:true};assert.deepEqual(lessonTapPoint(sample),{x:92,y:106});for(const delta of [{connected:false},{visible:false},{width:149},{height:149},{hit:false}])assert.throws(()=>lessonTapPoint({...sample,...delta}));
});
test('lesson tap uses same original node and real touchscreen without stability scrolling',async()=>{
 const {tapLessonChoice}=require('./smoke_base_language'),calls=[];const node={evaluate:async()=>({connected:true,visible:true,hit:true,left:20,top:30,width:160,height:180}),dispose:async()=>calls.push('dispose')};
 const page={locator:()=>({first:()=>({elementHandle:async()=>node,scrollIntoViewIfNeeded:()=>assert.fail('infinite pulse must not await stable scroll')})}),waitForFunction:async(fn,arg)=>assert.equal(arg,node),touchscreen:{tap:async(x,y)=>calls.push([x,y])}};
 await tapLessonChoice(page);assert.deepEqual(calls,[[100,120],'dispose']);
});
test('card measurements wait for own finite transform but ignore looping descendant rays',()=>{
 const {finiteOwnAnimationsSettled}=require('./smoke_base_language');assert.equal(typeof finiteOwnAnimationsSettled,'function');let phase='running';const card={isConnected:true,getAnimations:o=>{assert.deepEqual(o,{subtree:false});return [{playState:phase,effect:{target:card,getComputedTiming:()=>({iterations:1})}},{playState:'running',effect:{target:{kind:'rays'},getComputedTiming:()=>({iterations:Infinity})}}];}};
 assert.equal(finiteOwnAnimationsSettled(card),false,'transformed scale must settle before footprint compare');phase='finished';assert.equal(finiteOwnAnimationsSettled(card),true,'end scale is comparable despite looping rays');card.isConnected=false;assert.equal(finiteOwnAnimationsSettled(card),false);
});
