'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Rules=require('../app/js/country_rules.js');
function boot(saved){
 let stored=saved&&JSON.stringify(saved),writes=0;
 const c={window:null,document:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},setInterval(){},Date,console,UI:{screens:{},p:{lang:'pt'},go(){}},Lisa:{ico:{}}};c.window=c;
 c.localStorage={getItem:()=>stored,setItem:(k,v)=>{stored=v;writes++;}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('app/js/data.js','utf8'),c);c.CountryRules=Rules;
 c.GAME_DATA.packs={countries:{items:Rules.catalog.flatMap(x=>x.ids).filter(id=>id.startsWith('country_')),countries:Rules.catalog}};
 for(const id of c.GAME_DATA.packs.countries.items)c.GAME_DATA.items[id]={id,world:'countries',pic:{type:'emoji',src:'img/'+id+'.svg'},pt:{word:id},en:{word:id},de:{word:id}};
 vm.runInContext(fs.readFileSync('app/js/core.js','utf8'),c);vm.runInContext(fs.readFileSync('app/js/path.js','utf8'),c);
 return {c,C:c.Core,P:c.Path,stored:()=>stored,writes:()=>writes};
}
const plain=x=>JSON.parse(JSON.stringify(x));
function ready(c){c.Countries={ready:()=>true,journey(){},postcard(){}};}
test('Core resolves optional choices and counts introduced words without sequential unlock changes',()=>{
 const {C}=boot();const n=C.D.worlds.length;a.equal(C.worldItems('countries').length,41);a.deepEqual(plain(C.worldItems('bad')),[]);
 C.L('pt').words.country_panda={box:2,due:0};a.ok(C.SRS.introduced('pt').includes('country_panda'));a.ok(C.choices('pt','country_panda',3).length>=2);a.equal(C.D.worlds.length,n);a.equal(C.totalWords,Object.keys(C.D.items).length);
});
test('save sanitation preserves legacy fields but removes unknown countries',()=>{const {C}=boot({langs:{pt:{words:{cat:{box:3}},custom:7,countries:{pending:'bad',completed:{pt:true,bad:true}}}}});a.deepEqual(plain(C.L('pt').countries),{pending:null,completed:{pt:true}});a.equal(C.L('pt').custom,7);a.equal(C.L('pt').words.cat.box,3);});
test('Path preserves pending until real readiness and excludes optional queued words',()=>{
 const {C,P}=boot();a.equal(typeof P.selectCountry,'function');P.selectCountry('pt','pt');const s=P.newSession('pt');a.ok(!s.country);a.equal(C.L('pt').countries.pending,'pt');a.ok(!P.pickNew('pt',4,[],['country_panda']).includes('country_panda'));
});
test('production planning replaces A, keeps B distinct, resume immutable and sleeping blocked',()=>{
 const {c,C,P}=boot();ready(c);P.selectCountry('pt','pt');const s=P.newSession('pt');a.equal(s.country.id,'pt');a.deepEqual(plain(s.newA),Rules.catalog[0].ids);a.ok(s.plan.includes('CF'));a.ok(s.plan.includes('CP'));a.ok(!s.plan.includes('A3'));
 P.selectCountry('pt','jp');a.equal(P.ensure('pt'),s);a.equal(C.L('pt').countries.pending,'jp');
 C.L('en').path={day:s.day,done:true};const old=C.L('pt').path;a.equal(P.newSession('pt'),null);a.equal(C.L('pt').path,old);
});
test('country trip allowed when base exhausted; true due-review holds selection',()=>{
 const {c,C,P}=boot();ready(c);for(const id of Object.keys(C.D.items))if(C.D.items[id].world!=='countries')C.L('pt').words[id]={box:2,due:99999999};P.selectCountry('pt','pt');a.equal(P.newSession('pt').country.id,'pt');
 const other=boot();ready(other.c);other.C.SRS.dueList=()=>Array(13).fill('cat');other.P.selectCountry('pt','pt');a.equal(other.P.newSession('pt').review,true);a.equal(other.C.L('pt').countries.pending,'pt');
});
test('postcard production commit is current-plan/language guarded, persisted once, SRS unchanged',()=>{
 const {c,C,P,writes}=boot();ready(c);P.selectCountry('pt','pt');const s=P.newSession('pt');s.step=s.plan.indexOf('CP');for(const id of s.newA)s.ret[id]=2;
 const words=plain(C.L('pt').words),stars=C.save.stars,writeBefore=writes();a.equal(P.completeCountry('pt','wrong'),false);a.equal(P.completeCountry('de',s.country.token),false);a.equal(P.completeCountry('pt',s.country.token),true);a.equal(C.save.stars,stars+1);a.equal(writes(),writeBefore+1);a.equal(C.L('pt').countries.completed.pt,true);a.deepEqual(plain(C.L('pt').words),words);a.equal(P.completeCountry('pt',s.country.token),false);
});
test('rollover restores unpaid trip unless newer selection supersedes it',()=>{const {c,C,P}=boot();ready(c);P.selectCountry('pt','pt');const s=P.newSession('pt');s.day='2000-01-01';c.Countries=null;P.newSession('pt');a.equal(C.L('pt').countries.pending,'pt');});

test('direct newSession cannot replace an active plan after a future selection',()=>{const {c,C,P}=boot();ready(c);P.selectCountry('pt','pt');const s=P.newSession('pt');P.selectCountry('pt','jp');a.equal(P.newSession('pt'),s);a.equal(C.L('pt').countries.pending,'jp');});

test('actual approved castle rows never appear as same-word distractors',()=>{
 const {C}=boot();
 const rows=['content/vocab.tsv','content/packs/countries_vocab.tsv'].flatMap(p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split('\t')));
 for(const id of ['castle','country_castle']) {const row=rows.find(r=>r[1]===id);a.ok(row,'approved row '+id);for(const [lang,index] of [['en',3],['pt',4],['de',5]])C.D.items[id][lang].word=row[index];}
 for(const lang of ['pt','en','de'])for(const target of ['castle','country_castle']) {const other=target==='castle'?'country_castle':'castle';const choices=C.choices(lang,target,4,[other]);if(C.D.items[target][lang].word.toLowerCase()===C.D.items[other][lang].word.toLowerCase())a.ok(!choices.includes(other),lang+' duplicate noun');}
});

test('exact Opus ambiguity exclusions reject lookalike distractors in both directions',()=>{const {C}=boot();const pairs=[['fish','country_sardine'],['ball','country_football'],['teddy','country_bear'],['tree','country_forest'],['boat','country_gondola'],['bread','country_baguette'],['cake','country_custard_tart'],['flower','country_cherry_blossom']];for(const [x,y] of pairs)for(const [target,other] of [[x,y],[y,x]]){a.ok(C.item(target)&&C.item(other));a.ok(!C.choices('pt',target,4,[other]).includes(other),target+' vs '+other);}});
