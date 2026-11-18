'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('combined narration acceptance explicitly selects Russian with help enabled',async()=>{
 const source=fs.readFileSync('tools/smoke_lesson_acceptance.js','utf8');const start=source.indexOf('async function start('),end=source.indexOf('\nasync function prompt(',start);assert.ok(start>=0&&end>start);
 const c={Core:{save:{settings:{enabled:{pt:true},baseLang:'en',ruHelp:false}},Snd:{say(){}},SRS:{peek:()=>({box:0})}},Lesson:{seen:()=>0,word:()=> 'water'},__test:{go(){}}};c.window=c;vm.createContext(c);
 const lib={page:{evaluate:async(fn,arg)=>{c.packet=arg;return vm.runInContext('('+fn.toString()+')(packet)',c);},waitForFunction:async()=>{}}};
 const run=vm.runInContext('('+source.slice(start,end)+')',c);await run(lib,'repka','pt');
 assert.equal(c.Core.save.settings.ruHelp,true,'narration URL assertions require help ON');assert.equal(c.Core.save.settings.baseLang,'ru','approved RU branches must not depend on preceding base setting');
});
