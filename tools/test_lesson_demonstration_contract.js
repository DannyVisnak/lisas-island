const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('demonstration observes the persistent stage across screen root replacement',()=>{
 const source=fs.readFileSync(__dirname+'/smoke_lesson_demonstration.js','utf8');
 const setup=source.match(/window\.__demoObserver=new MutationObserver\(sample\);__demoObserver\.observe\([^;]+;/)[0];
 const root={},stage={};let target;
 const ctx={UI:{root,stage},sample(){},MutationObserver:function(){this.observe=(node)=>{target=node;};}};ctx.window=ctx;
 vm.runInNewContext(setup,ctx);ctx.UI.root={};assert.equal(target,stage,'observer must survive UI.go replacing UI.root');
});
