const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/smoke_lesson_retry_cancel.js','utf8');
const definition=source.match(/function canceledLessonCalls\(calls\) \{[\s\S]*?\n\}/);
const check=source.match(/assert.equal\([^;\n]+no continuation narration after Back[^;\n]+;/)[0];
const initial=['audio/ui/ru_cs_hist_tiles_1.ogg','audio/ui/ru_cs_hist_tiles_4x.ogg'];
function verify(calls){const ctx={assert,r:{calls},after:{calls:initial.length,lessonCalls:initial.length}};vm.runInNewContext((definition?definition[0]+'\n':'')+check,ctx);}
test('actual cancellation assertion permits destination home invitation',()=>{assert.doesNotThrow(()=>verify(initial.concat('audio/ui/ru_lisa_play.ogg')));});
test('actual cancellation assertion still rejects canceled lesson narration and end-card work',()=>{
 for(const stale of ['audio/ui/ru_cs_hist_tiles_5.ogg','audio/ui/ru_cs_hist_name.ogg','audio/pt/azulejo.ogg'])assert.throws(()=>verify(initial.concat(stale)),/no continuation narration/);
});
