'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const H=require('./house_smoke_helpers');
test('bbox comparison has zero tolerance and preserves each bbox field',()=>{
 const b={x:1,y:2,width:440,height:40};a.equal(H.bboxEqual(b,{...b}),true);for(const k of Object.keys(b))a.equal(H.bboxEqual(b,{...b,[k]:b[k]+0.00001}),false);a.equal(H.bboxEqual(b,{x:1,y:2,width:440}),false);
});
test('original-node pointer point requires hit ownership and minimum size',()=>{
 const r={connected:true,visible:true,hit:true,left:7,top:13,width:110,height:111};a.deepEqual(H.tapPoint(r,110),{x:62,y:68.5});for(const bad of [{hit:false},{connected:false},{visible:false},{width:109.99},{height:109.99}])a.throws(()=>H.tapPoint({...r,...bad},110));
});
test('finite animation settling ignores infinite loops and waits for finite original-node pop',()=>{
 const fake={isConnected:true,getAnimations:()=>[{playState:'running',effect:{getComputedTiming:()=>({iterations:Infinity})}},{playState:'running',effect:{getComputedTiming:()=>({iterations:1})}}]};a.equal(H.finiteAnimationsSettled(fake),false);fake.getAnimations=()=>[{playState:'running',effect:{getComputedTiming:()=>({iterations:Infinity})}},{playState:'finished',effect:{getComputedTiming:()=>({iterations:1})}}];a.equal(H.finiteAnimationsSettled(fake),true);fake.isConnected=false;a.equal(H.finiteAnimationsSettled(fake),false);
});
test('save comparison strips only look; rewards/gifts/owned/SRS changes remain detectable',()=>{
 const seed={stars:5,xp:3,house:{look:{bed:'a'},gifts:1,owned:['bed']},langs:{pt:{words:{bed:{heard:2,box:3}}}}};const restyled=JSON.parse(JSON.stringify(seed));restyled.house.look.bed='b';a.deepEqual(H.withoutLook(restyled),H.withoutLook(seed));restyled.house.gifts--;a.notDeepEqual(H.withoutLook(restyled),H.withoutLook(seed));
});
test('new-prompt audit preserves once-per-visit and distinguishes help/missing inventory',()=>{
 const events=[{urls:['audio/ui/en_house_pick.ogg',300,'audio/pt/bed.ogg']},{urls:['audio/pt/car.ogg']}];a.equal(H.promptCount(events,'en'),1);a.equal(H.promptCount(events,'ru'),0);a.equal(H.promptCount(events.concat(events),'en'),2);
});
test('classic variants derive from authored registry, not a new catalog',()=>{
 const registry={plot:{def:'dirt'},roof:{def:'redtile'}};a.equal(H.classicVariant(registry,'plot'),'dirt');a.throws(()=>H.classicVariant(registry,'missing'));
});
test('selectable harness imports without a browser or execution',()=>{
 const smoke=require('./smoke_house_variants');a.equal(typeof smoke.runCase,'function');a.equal(typeof smoke.run,'function');a.ok(smoke.CASES.includes('legacy-art'));a.ok(smoke.CASES.includes('bbox'));
});

test('stable pointer helper waits on and samples the same original node and disposes its handle',async()=>{
 const calls=[],node={evaluate:async()=>({connected:true,visible:true,hit:true,left:10,top:20,width:110,height:120}),dispose:async()=>calls.push('dispose')};
 const page={locator:s=>({first:()=>({elementHandle:async()=>{calls.push(s);return node;}})}),waitForFunction:async(fn,arg)=>{if(fn===H.finiteAnimationsSettled)a.equal(arg,node);else a.equal(arg.n,node);}};
 const lib={page,tapAt:async(x,y)=>calls.push([x,y])};await H.tapStable(lib,'.hvar',{min:110});a.deepEqual(calls,['.hvar','dispose',[65,80]]);
});
test('browser module cannot bypass stage/gift commits or use DOM click / create a browser',()=>{
 const fs=require('node:fs');for(const file of ['house_smoke_helpers.js','smoke_house_variants.js']){const source=fs.readFileSync(require.resolve('./'+file),'utf8');a.doesNotMatch(source,/Core\.house(?:Stage|Place)\s*\(/);a.doesNotMatch(source,/\.click\s*\(/);a.doesNotMatch(source,/\.(?:launch|newContext)\s*\(/);}
});
test('legacy pixel receipts require every exact region once and reject even one differing pixel',()=>{
 const captures=[{name:'s0',regions:[{selector:'#frame'}]},{name:'s5',regions:[{selector:'.house-stage'},{selector:'.house-tray'}]}];
 const rows=[{name:'s0',selector:'#frame',mismatchedPixels:0},{name:'s5',selector:'.house-stage',mismatchedPixels:0},{name:'s5',selector:'.house-tray',mismatchedPixels:0}];
 a.doesNotThrow(()=>H.validateLegacyComparison(captures,rows));a.throws(()=>H.validateLegacyComparison(captures,rows.slice(1)));a.throws(()=>H.validateLegacyComparison(captures,[...rows,rows[0]]));a.throws(()=>H.validateLegacyComparison(captures,rows.map((r,i)=>({...r,mismatchedPixels:i?0:1}))));
});
test('P3 keeps picture clear and rejects an overgrown border exception without shrinking buttons',()=>{
 const picture={top:108,borderTop:100},button={left:10,right:120,top:-4,bottom:106,width:110,height:110};
 a.doesNotThrow(()=>H.validateP3Boundary(button,picture,10));
 a.throws(()=>H.validateP3Boundary({...button,bottom:108.02},picture,10),'even a .02px photo overlap fails');
 a.throws(()=>H.validateP3Boundary({...button,bottom:106.501},picture,10),'intrusion larger than .6rem+.5px fails');
 a.throws(()=>H.validateP3Boundary({...button,width:109.999},picture,10),'110px floor stays strict');
 a.throws(()=>H.validateP3Boundary({...button,height:109.999},picture,10));
});
test('P3 requires own-center hit for active buttons, records disabled buttons without fake hit ownership',()=>{
 const picture={top:108,borderTop:100},rect={left:10,right:120,top:-4,bottom:106,width:110,height:110};
 a.doesNotThrow(()=>H.validateP3Button({rect,active:true,hit:true},picture,10));a.throws(()=>H.validateP3Button({rect,active:true,hit:false},picture,10));
 a.doesNotThrow(()=>H.validateP3Button({rect,active:false,hit:false},picture,10));a.throws(()=>H.validateP3Button({rect:{...rect,bottom:109},active:false,hit:false},picture,10),'disabled geometry is still checked');
});
