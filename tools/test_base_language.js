'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('app/js/core.js', 'utf8');
function boot(saved, full) {
 const store = {value: saved && JSON.stringify(saved)};
 const context = {window: {GAME_DATA: {}, localStorage: {getItem: () => store.value, setItem: (k,v) => store.value=v}}, document:{addEventListener(){}}, setTimeout:()=>0, clearTimeout(){}, setInterval(){}, console, Date};
 vm.runInNewContext(fs.readFileSync('app/js/data.js','utf8'), context);
 // Storage/data helpers and base routing run without browser/audio initialization.
 vm.runInNewContext(full ? source : source.slice(0, source.indexOf('Core.enabledLangs =')) + '\n})();', context);
 return {C:context.window.Core, store};
}
test('old progress migrates to Russian base without changing records',()=>{
 const old={stars:87,langs:{pt:{words:{cat:{box:4}},lessons:{float:{seen:3}},levels:{animals:2}}},settings:{ruHelp:false}};
 const {C,store}=boot(old); assert.equal(C.save.settings.baseLang,'ru'); assert.equal(C.save.stars,87); assert.equal(JSON.stringify(C.save.langs),JSON.stringify(old.langs)); assert.equal(C.save.settings.ruHelp,false);
 C.save.settings.baseLang='en'; C.flushNow(); const restored=boot(JSON.parse(store.value)).C; assert.equal(restored.save.settings.baseLang,'en'); assert.equal(JSON.stringify(restored.save.langs),JSON.stringify(old.langs));
});
test('base instruction text and asset stay independent from target language',()=>{
 const {C}=boot(); C.save.settings.baseLang='en'; C.lang='de'; assert.equal(C.baseLang(),'en'); assert.equal(C.baseText('welcome'),'Hello! Let\'s play!');
 C.D.uiAudio={en:['welcome'],ru:['welcome']}; assert.equal(C.baseUrl('welcome'),'audio/ui/en_welcome.ogg'); assert.equal(C.baseUrl('missing'),null); C.save.settings.ruHelp=false; assert.equal(C.baseUrl('welcome'),null);
});
test('English gloss uses existing English word and suppresses duplicates',()=>{
 const {C}=boot(); C.save.settings.baseLang='en'; assert.equal(C.glossText('cat','pt'),C.item('cat').en.word); assert.equal(C.url.gloss('cat','de'),'audio/en/cat.ogg'); assert.equal(C.glossText('cat','en'),''); assert.equal(C.url.gloss('cat','en'),null);
 C.save.settings.baseLang='ru'; assert.equal(C.glossText('cat','en'),C.item('cat').ru); assert.equal(C.url.gloss('cat','en'),'audio/ru/cat.ogg');
});
test('null preload never attempts to construct an Audio element',()=>{
 const {C}=boot(); const portion=source.slice(source.indexOf('var Snd = Core.Snd'),source.indexOf('function playOne'));
 let calls=0; vm.runInNewContext(portion+'\nSnd.preload(null);', {Core:C,Audio:function(){calls++;},window:{},console}); assert.equal(calls,0);
});
test('lesson missing base audio still pads narration time',async()=>{
 const lesson=fs.readFileSync('app/js/lesson.js','utf8'); const start=lesson.indexOf('  async function speak('),end=lesson.indexOf('\n  function runAnim',start);
 const waits=[]; const context={uiText:()=> 'A line without audio',uiUrl:()=>null,Lesson:{MS_PER_CHAR:70},st:{},Core:{fast:false,speed:1},loadDuration:async()=>null,runAnim:async()=>{},flow:{say:async()=>true,wait:async(ms)=>waits.push(ms)},Date,Promise};
 const speak=vm.runInNewContext('('+lesson.slice(start,end).trim()+')',context); await speak('missing'); assert.equal(waits.length,1); assert.ok(waits[0]>=900);
});
test('all released-base Russian instruction keys retain English counterparts; all61 Opus follow-on keys are supplied',()=>{
 const lines=fs.readFileSync('content/ui.tsv','utf8').split('\n').filter(l=>l.trim()&&!l.startsWith('#')).map(l=>l.split('\t'));
 const seen=new Set(); for(const r of lines){const key=r[1]+'/'+r[0]; assert.ok(!seen.has(key),'duplicate '+key); seen.add(key);}
 const held=JSON.parse(fs.readFileSync('tools/held_english_followon_keys.json','utf8')); assert.equal(held.length,0);
 const shopHeld=JSON.parse(fs.readFileSync('tools/held_english_shop_keys.json','utf8'));
 const inactive=Object.keys(shopHeld); assert.deepEqual(inactive.sort(),['lisa_fact_de','lisa_fact_jp2','lisa_shop_budget','lisa_shop_left']);
 const missing=lines.filter(r=>r[1]==='ru'&&!seen.has('en/'+r[0])).map(r=>r[0]).sort();
 assert.deepEqual(missing,held.concat(inactive).sort(),'only exact authored inactive Shop keys may lack English');
 for(const r of lines.filter(r=>r[1]==='ru'&&!held.concat(inactive).includes(r[0]))) assert.ok(seen.has('en/'+r[0]),'missing English '+r[0]);
});
test('parent progress gloss follows selected base language',()=>{
 const parent=fs.readFileSync('app/js/parent.js','utf8'); assert.ok(!parent.includes('D.items[id].ru'),'parent word list must not force Russian gloss');
});
test('lesson English number cues retain separate ordered word positions',()=>{
 const lesson=fs.readFileSync('app/js/lesson.js','utf8'); const start=lesson.indexOf('function cueWord('); assert.ok(start>=0,'localized cue lookup exists'); const end=lesson.indexOf('\n}',start)+2;
 const cueWord=vm.runInNewContext('('+lesson.slice(start,end)+')',{Core:{baseLang:()=> 'en'}});
 const {C}=boot(); C.save.settings.baseLang='en'; const text=C.baseText('cs_stones_5'); const words=['Пять','шесть','семь','восемь','девять','десять'].map(cueWord); const indexes=words.map(w=>text.indexOf(w)); assert.ok(indexes.every(i=>i>=0)); assert.equal(new Set(indexes).size,6); assert.deepEqual(indexes.slice().sort((a,b)=>a-b),indexes);
});

test('legacy narration aliases select English for every target and respect help off',async()=>{
 const {C}=boot(null,true); C.save.settings.baseLang='en'; C.D.uiAudio.en=['welcome','lisa_hi1'];
 const said=[]; const flow={say:async list=>said.push(Array.from(list)),wait:async()=>{}};
 for(const lang of ['en','pt','de']) { C.lang=lang; await C.sayRu(flow,'welcome'); assert.equal(said.at(-1)[0],'audio/ui/en_welcome.ogg'); assert.equal(C.ruUrl('welcome'),'audio/ui/en_welcome.ogg'); assert.equal(C.lisaLine('hi'),'audio/ui/en_lisa_hi1.ogg'); }
 C.save.settings.ruHelp=false; await C.sayRu(flow,'welcome',['audio/pt/cat.ogg']); assert.deepEqual(said.at(-1),['audio/pt/cat.ogg']); assert.equal(C.lisaLine('hi'),null);
 C.save.settings.ruHelp=true; C.save.settings.baseLang='ru'; assert.equal(C.ruUrl('welcome'),'audio/ui/ru_welcome.ogg');
});
