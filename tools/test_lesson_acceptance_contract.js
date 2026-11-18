const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/smoke_lesson_acceptance.js','utf8');
test('focused lesson state reader accepts the shared browser lib used by every case',async()=>{
  const helper=source.match(/const state=p=>[^\n]+/)[0];
  const expected={phase:'prompt',picks:[]};
  const read=vm.runInNewContext(helper+'\nstate');
  assert.deepEqual(await read({page:{evaluate:async()=>expected}}),expected);
});
test('lesson filter preserves defaults, isolates a known lesson and rejects malformed selections',()=>{
  const definition=source.match(/function selectLessons\(ids, lesson\) \{[\s\S]*?\n\}/);
  assert(definition,'lesson filter must be implemented');
  const select=vm.runInNewContext('('+definition[0]+')');
  const ids=['repka','more'];assert.equal(JSON.stringify(select(ids,null)),JSON.stringify(ids));assert.equal(JSON.stringify(select(ids,'more')),JSON.stringify(['more']));
  for(const invalid of ['',false,'unknown','more,repka',' more'])assert.throws(()=>select(ids,invalid),/Unknown or malformed/);
});
test('rapid duplicate input remains bound to its original prompt when retry replaces DOM',()=>{
 const callback=source.match(/\/\/ Rapid second input[^\n]*\n\s*await lib.page.evaluate\((.*)\);/)[1];
 let firstCalls=0,retryCalls=0;
 const first={dispatchEvent(){firstCalls++;}},retry={dispatchEvent(){retryCalls++;}};
 const ctx={window:{__acceptDuplicateTile:first},document:{querySelector(){return retry;}},PointerEvent:function(){}};
 vm.runInNewContext('('+callback+')()',ctx);
 assert.equal(retryCalls,0,'a duplicate for old prompt must not answer the newly mounted retry');assert.equal(firstCalls,1);
});
