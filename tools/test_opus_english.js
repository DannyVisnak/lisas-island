const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('all 376 exact Opus rows exist without duplicate or rewritten text',()=>{const rows=fs.readFileSync('content/ui.tsv','utf8').split('\n').filter(x=>x&&!x.startsWith('#')).map(x=>x.split('\t'));for(const [key,lang,text] of JSON.parse(fs.readFileSync('tools/fixtures/approved/english-rows.json'))){const found=rows.filter(x=>x[0]===key&&x[1]===lang);assert.equal(found.length,1,key);assert.equal(found[0][2],text,key);}});

function cueHarness(base,text,duration=10000,url='en.ogg') {
 const source=fs.readFileSync('app/js/lesson.js','utf8'),scheduled=[],acts=[],spoken=[],waits=[];
 const c={Core:{baseLang:()=>base,fast:false,speed:1},uiText:()=>text,uiUrl:()=>url,Lesson:{MS_PER_CHAR:70},st:{},loadDuration:async()=>duration,runAnim:async name=>acts.push(name),flow:{after:(ms,fn)=>{scheduled.push(ms);fn();},say:async urls=>{spoken.push(urls);return !!url;},wait:async ms=>waits.push(ms)},Date,Promise};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function cueWord'),source.indexOf('/* real duration')),c);
 const start=source.indexOf('  async function speak('),end=source.indexOf('\n  function runAnim',start);
 return {c,scheduled,acts,spoken,waits,speak:vm.runInContext('('+source.slice(start,end).trim()+')',c)};
}
test('actual English Repka and More speech schedules each cue at its exact approved phrase',async()=>{
 const rows=JSON.parse(fs.readFileSync('tools/fixtures/approved/english-rows.json')),texts=Object.fromEntries(rows.map(r=>[r[0],r[2]]));
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('app/js/lessons_data.js','utf8'),ctx);
 for(const id of ['repka','more'])for(const b of ctx.window.LESSON_DATA.lessons[id].beats){if(!b.cues)continue;const h=cueHarness('en',texts[b.line]);await h.speak(b.line,b.cues);assert.equal(h.scheduled.length,b.cues.length);for(let i=0;i<b.cues.length;i++){const phrase=h.c.cueWord(b.cues[i].word,b.line);assert.ok(texts[b.line].includes(phrase),b.line+': '+phrase);assert.equal(h.scheduled[i],h.c.cueFrac(texts[b.line],phrase)*10000);}assert.deepEqual(h.acts,Array.from(b.cues,c=>c.anim));}
});
test('Russian anchors stay literal and missing/help-off narration pads while cue animation still runs',async()=>{
 const h=cueHarness('ru','Раз, два, три',null,null);assert.equal(h.c.cueWord('Раз','cs_more_4'),'Раз');await h.speak('cs_more_4',[{word:'два',anim:'count'}]);assert.equal(h.spoken.length,0);assert.equal(h.waits.length,1);assert.ok(h.waits[0]>=900);assert.deepEqual(h.acts,['count']);
});
