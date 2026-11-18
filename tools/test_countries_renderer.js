'use strict';
const test=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Node {constructor(tag,cls='',html=''){this.tagName=tag;this.className=cls;this.innerHTML=html;this.children=[];this.style={};this.dataset={};this.handlers={};this.classList={add:(...cs)=>{for(const c of cs)if(!this.className.split(' ').includes(c))this.className+=' '+c;},remove:(...cs)=>{this.className=this.className.split(' ').filter(c=>!cs.includes(c)).join(' ');},contains:c=>this.className.split(' ').includes(c),toggle:(c,on)=>{if(on)this.classList.add(c);else this.classList.remove(c);}};}
appendChild(n){this.children.push(n);n.parentNode=this;return n;}remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}setAttribute(k,v){this[k]=v;}addEventListener(k,v){this.handlers[k]=v;}cloneNode(){return new Node(this.tagName,this.className,this.innerHTML);}}
const tick=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function boot(){let now=0,timers=[],L={countries:{pending:null,completed:{}},words:{}},events=[];
 const c={window:null,console,Date,document:{createElement:t=>new Node(t)}};c.window=c;
 const flow={dead:false,timers:[],onKill(fn){this.killFn=fn;},say:async list=>{events.push(['say',...list]);return true;},wait:ms=>new Promise(res=>timers.push({at:now+ms,res})),after(ms,fn){timers.push({at:now+ms,res:fn});},every(ms,fn){const again=()=>{if(!flow.dead){fn();timers.push({at:now+ms,res:again});}};timers.push({at:now+ms,res:again});},kill(){this.dead=true;if(this.killFn)this.killFn();}};
 const advance=async ms=>{now+=ms;for(let i=0;i<20;i++){const due=timers.filter(t=>t.at<=now);timers=timers.filter(t=>t.at>now);for(const t of due)if(!flow.dead)t.res();await tick();if(!timers.some(t=>t.at<=now))break;}};
 const D={langs:['pt','en','de'],items:{},ui:{en:{},ru:{},pt:{},de:{}},uiAudio:{pt:[],en:[],ru:[],de:[]},packs:{countries:{countries:[],readyAssets:{}}}};
 c.Core={D,speed:1,save:{settings:{ruHelp:true}},baseLang:()=> 'en',curLang:()=> 'pt',L:()=>L,el:(t,cl,h)=>new Node(t,cl,h),tap:(n,fn)=>n.onclick=fn,persist(){events.push(['persist']);},url:{w:(l,id)=>'audio/'+l+'/'+id+'.ogg',q:(l,id)=>'audio/'+l+'/'+id+'_q.ogg',ui:(l,key)=>'audio/ui/'+l+'_'+key+'.ogg',gloss:(id,l)=>c.Core.save.settings.ruHelp?'audio/en/'+id+'.ogg':null},ruUrl:key=>c.Core.save.settings.ruHelp?'audio/ui/en_'+key+'.ogg':null,sayRu:(f,key)=>c.Core.save.settings.ruHelp?f.say(['audio/ui/en_'+key+'.ogg']):Promise.resolve(),SRS:{touch:(lang,id)=>events.push(['touch',id]),answer:(lang,id,first)=>events.push(['answer',id,first])},Snd:{stop(){events.push(['stop']);},sfx(name){events.push(['sfx',name]);}},shuffle:xs=>xs.slice(),pic:()=>new Node('img')};
 c.UI={screens:{},p:{path:true,lang:'pt'},flow,go:(name,p)=>events.push(['go',name,p]),btn:(cl,h,fn)=>{const n=new Node('div','btn '+cl,h);n.onclick=fn;return n;},backBtn:fn=>{const n=new Node('div','btn b-back');n.onclick=fn;return n;},speakerBtn:fn=>{const n=new Node('div','btn b-speaker');n.onclick=fn;return n;}};
 c.Path={selectCountry:(lang,id)=>{L.countries.pending=id;events.push(['select',id]);},session:()=>L.path,finishStep:async(f,o)=>events.push(['finish',o]),home:()=>events.push(['home'])};
 c.Lisa={make:()=>{const n=new Node('div','lisa');n.pose=()=>{};return n;}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('app/js/country_rules.js','utf8'),c);vm.runInContext(fs.readFileSync('app/js/countries_art.js','utf8'),c);
 for(const country of c.CountryRules.catalog){D.packs.countries.countries.push(JSON.parse(JSON.stringify(country)));for(const id of country.ids)D.items[id]={id,pic:{src:'img/'+id+'.svg'},pt:{word:id},en:{word:id},de:{word:id}};}
 if(fs.existsSync('app/js/countries.js'))vm.runInContext(fs.readFileSync('app/js/countries.js','utf8'),c);else c.Countries={};
 const S={country:{id:'pt',lang:'pt',token:'trip-1',ids:Array.from(c.CountryRules.catalog[0].ids)},newA:Array.from(c.CountryRules.catalog[0].ids),plan:['CF','A1','A2','CP','R'],step:3,ret:{},paid:{}};L.path=S;
 return {c,C:c.Countries,D,L,S,events,flow,advance,host:new Node('section')};
}
test('real renderer registers album/journey/postcard and needs actual readiness inventory',()=>{const {C,c}=boot();a.equal(typeof c.UI.screens.countries,'function');a.equal(typeof c.UI.screens.cflight,'function');a.equal(typeof c.UI.screens.cpostcard,'function');a.equal(C.ready('pt','pt'),false);a.ok(C.requiredAssets('pt','pt').includes('audio/pt/country_sardine_q.ogg'));});
test('bounded audio unlocks on rejection or four-second stalled playback and cancels stale work',async()=>{const {C,flow,advance}=boot();flow.say=()=>new Promise(()=>{});let released=false;C.speakBounded(flow,['test'],4000).then(()=>released=true);await advance(3999);a.equal(released,false);await advance(1);a.equal(released,true);flow.say=()=>Promise.reject(Error('missing'));await C.speakBounded(flow,['missing'],4000);});
test('postcard uses exact fixed four IDs twice without adjacent repeat and seeded slots',()=>{const {C,S}=boot();const one=C.postcardPlan(S),two=C.postcardPlan(S);a.equal(JSON.stringify(one),JSON.stringify(two));a.equal(one.sequence.length,8);for(const id of S.country.ids)a.equal(one.sequence.filter(x=>x===id).length,2);a.ok(one.sequence.every((id,i)=>i===0||id!==one.sequence[i-1]));a.deepEqual(new Set(one.slots),new Set(S.country.ids));});
test('actual round locks prompt, counts help without promotion, rejects stale flow and only feeds approved food',async()=>{const {C,flow,host,S,events,advance,L}=boot();const round=C.postcardRound(flow,host,{lang:'pt',session:S});await tick();await advance(1000);await tick();a.equal(round.state.locked,false);const target=round.state.target;await round.help();await tick();const answered=round.answer(target);await tick();await advance(1000);await answered;a.ok(events.some(e=>e[0]==='touch'&&e[1]===target));a.ok(!events.some(e=>e[0]==='answer'&&e[1]===target));flow.kill();const count=events.length;await round.answer(target);a.equal(events.length,count);a.equal(L.path,S);});
test('stalled postcard prompt ignores taps until bounded release',async()=>{const {C,flow,host,S,advance,events}=boot();flow.say=()=>new Promise(()=>{});const round=C.postcardRound(flow,host,{lang:'pt',session:S});await advance(8000);await tick();a.equal(round.state.locked,true);await round.answer(S.country.ids[0]);a.ok(!events.some(e=>e[0]==='answer'));await advance(4000);a.equal(round.state.locked,false);});
test('album word replay never calls SRS and selection preserves the live session',async()=>{const {C,L,S,events,flow}=boot();L.countries.completed.pt=true;await C.replayWord(flow,'pt','pt','sea');a.ok(events.some(e=>e[0]==='say'&&e[1]==='audio/pt/sea.ogg'));a.ok(!events.some(e=>e[0]==='answer'||e[0]==='touch'));a.equal(L.path,S);});
test('creative food and greeting metadata are exact Opus values',()=>{const {C}=boot();const metadata=JSON.parse(fs.readFileSync('tools/fixtures/approved/countries-metadata.json'));a.deepEqual(JSON.parse(JSON.stringify(C.metadata)),metadata);a.equal(C.isFood('eg','country_camel'),false);a.equal(C.isFood('pt','sea'),false);a.equal(C.isFood('pt','country_sardine'),true);});

test('automatic idle help speaks once until real input starts a new idle period',async()=>{const {C,flow,host,S,advance,events}=boot();const round=C.postcardRound(flow,host,{lang:'pt',session:S});await tick();await advance(1000);for(let i=0;i<65;i++)await advance(500);const questions=events.filter(e=>e[0]==='say'&&String(e[1]).endsWith('_q.ogg'));a.equal(questions.length,2);a.equal(round.state.helped,true);});
test('readiness becomes true only when every required local asset is inventoried',()=>{const {C,D}=boot();const all=C.requiredAssets('pt','pt');D.packs.countries.readyAssets=all;a.equal(C.ready('pt','pt'),true);D.packs.countries.readyAssets=all.filter(p=>!p.endsWith('country_sardine_q.ogg'));a.equal(C.ready('pt','pt'),false);});
test('saved postcard index resumes exact remaining sequence and stale language cannot write',async()=>{const {C,flow,host,S,c,events,advance}=boot();S.countryRound={token:S.country.token,index:4};const round=C.postcardRound(flow,host,{lang:'pt',session:S});await tick();a.equal(round.state.index,4);a.equal(round.state.target,C.postcardPlan(S).sequence[4]);c.Core.curLang=()=> 'de';const count=events.length;await round.answer(round.state.target);a.equal(events.length,count);});
test('postcard answers cannot reach Lisa for non-food and complete only once',async()=>{const {C,flow,host,S,events,advance}=boot();const round=C.postcardRound(flow,host,{lang:'pt',session:S});await tick();await advance(1000);for(let i=0;i<8;i++){const target=round.state.target;const p=round.answer(target);const flies=host.children[0].children.filter(n=>n.classList.contains('c-fly'));a.equal(flies.length,C.isFood('pt',target)?1:0,'food-only fly '+target);await tick();await advance(1000);if(i===7){await advance(700);await tick();}await p;}a.equal(events.filter(e=>e[0]==='finish').length,1);await round.answer(S.country.ids[0]);a.equal(events.filter(e=>e[0]==='finish').length,1);});

test('real journey runs name then base intro then declared greeting and defaults accessory once',async()=>{const {C,c,D,S,host,flow,events,advance}=boot();D.packs.countries.readyAssets=C.requiredAssets('pt','pt');S.step=0;c.UI.screens.cflight(flow,host,{lang:'pt',session:S,token:S.country.token});for(let i=0;i<350;i++)await advance(100);const clips=events.filter(e=>e[0]==='say').map(e=>e[1]);const name=clips.indexOf('audio/ui/pt_country_name_pt.ogg'),intro=clips.indexOf('audio/ui/en_lisa_country_intro_pt.ogg'),greet=clips.indexOf('audio/pt/hello.ogg');a.ok(name>=0&&intro>name&&greet>intro);a.equal(events.filter(e=>e[0]==='finish').length,1);a.ok(!host.children[0].children.some(n=>n.classList.contains('c-globe')));});
test('leaving a journey cancels all later phase and completion callbacks',async()=>{const {C,c,D,S,host,flow,events,advance}=boot();D.packs.countries.readyAssets=C.requiredAssets('pt','pt');S.step=0;c.UI.screens.cflight(flow,host,{lang:'pt',session:S,token:S.country.token});await tick();flow.kill();for(let i=0;i<40;i++)await advance(1000);a.ok(!events.some(e=>e[0]==='finish'));});

test('actual food clone ends with its centre at the authored Lisa mouth point',async()=>{
 const {C,c,S,host,flow,advance}=boot();
 const plan=C.postcardPlan(S),index=plan.sequence.findIndex(id=>C.isFood(S.country.id,id));
 a.ok(index>=0,'approved country fixture has a food prompt');
 S.countryRound={token:S.country.token,index};
 const round=C.postcardRound(flow,host,{lang:'pt',session:S});
 await tick();await advance(1000);a.equal(round.state.locked,false);
 const answered=round.answer(round.state.target);await tick();
 const fly=host.children[0].children.find(n=>n.classList.contains('c-fly'));
 a.ok(fly,'actual answer creates the food clone');
 await advance(16);
 const numericRem=value=>{a.match(value,/^-?[\d.]+rem$/);return Number.parseFloat(value);};
 const left=numericRem(fly.style.left),top=numericRem(fly.style.top),width=numericRem(fly.style.width),height=numericRem(fly.style.height);
 const transform=/^translate\((-?[\d.]+)rem,\s*(-?[\d.]+)rem\)\s+scale\(([\d.]+)\)$/.exec(fly.style.transform);
 a.ok(transform,'read the actual emitted translate/scale transform');
 const dx=Number(transform[1]),dy=Number(transform[2]),scale=Number(transform[3]);
 a.equal(scale,0.2,'authored clone scale');
 // Default CSS transform origin is the box centre. Scaling about that origin
 // leaves its centre fixed; the actual translate moves that centre by dx/dy.
 const actualCentre={x:left+width/2+dx,y:top+height/2+dy};
 a.ok(Math.abs(actualCentre.x-c.CountryArt.MOUTH.left)<1e-9,'food end centre x '+actualCentre.x+' must equal mouth '+c.CountryArt.MOUTH.left);
 a.ok(Math.abs(actualCentre.y-c.CountryArt.MOUTH.top)<1e-9,'food end centre y '+actualCentre.y+' must equal mouth '+c.CountryArt.MOUTH.top);
 await advance(1000);await answered;
});
