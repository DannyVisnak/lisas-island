'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.HOUSE_STATE_ROOT||path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
function boot(saved,withRules=true){
 let stored=saved===undefined?null:JSON.stringify(saved),writes=0;
 const c={console,Date,Math,Promise,setTimeout:()=>1,clearTimeout(){},setInterval(){},document:{addEventListener(){}}};c.window=c;
 c.localStorage={getItem:()=>stored,setItem:(k,v)=>{stored=v;writes++;}};vm.createContext(c);
 for(const f of ['data.js',...(withRules&&fs.existsSync(path.join(root,'app/js/house_variant_rules.js'))?['house_variant_rules.js']:[]),'core.js']) vm.runInContext(read('app/js/'+f),c,{filename:f});
 c.reload=()=>{c.Core.flushNow();return boot(JSON.parse(stored),withRules);};
 let persists=0;const persist=c.Core.persist;c.Core.persist=()=>{persists++;persist();};c.persistCount=()=>persists;c.writeCount=()=>writes;return c;
}
function seed(){return {stars:120,xp:67,langs:{pt:{words:{bed:{box:3}},levels:{x:{done:true}}}},house:{stage:5,gifts:2,owned:['bed','spoon'],placed:{bed:'bed',spoon:1},reviewDay:18}};}
test('old save gains empty look; reload preserves all progress and styles across languages',()=>{
 let c=boot(seed());assert.deepEqual(plain(c.Core.house().look),{});for(const k of ['stars','xp','langs'])assert.deepEqual(plain(c.Core.save[k]),seed()[k]);
 assert.equal(c.Core.houseSetLook('bed','b'),true);assert.equal(c.Core.houseSetLook('roof','straw'),true);c.Core.lang='de';c=c.reload();assert.deepEqual(plain(c.Core.house().look),{bed:'b',roof:'straw'});assert.deepEqual(plain(c.Core.save.langs),seed().langs);
});
test('registry exactly matches authored keys/defaults; look reads never rewrite unknown data',()=>{
 const c=boot({...seed(),house:{...seed().house,look:{bed:'future',roof:'future',car:'c'}}});const R=c.HouseVariantRules;
 assert.equal(Object.keys(R.VARIANTS).length,22);assert.equal(R.lookOf(c.Core.house().look,'bed'),'a');assert.equal(R.lookOf(c.Core.house().look,'roof'),'redtile');assert.equal(R.lookOf(c.Core.house().look,'car'),'c');assert.equal(R.lookOf({},'__proto__'),null);assert.equal(c.Core.house().look.bed,'future');assert.equal(c.persistCount(),0);
});
test('sanitize rejects nonplain containers, malformed values and prototype keys; preserves future valid strings',()=>{
 for(const look of [null,[],false,'b',4])assert.deepEqual(plain(boot({house:{look}}).Core.house().look),{});
 const bad=JSON.parse('{"__proto__":{"polluted":true},"constructor":"b","prototype":"a","bed":"future","car":7,"ball":"","roof":"RedTile","walls":"abcdefghijklmnopq","door":"round"}');
 const c=boot({house:{look:bad}});assert.deepEqual(plain(c.Core.house().look),{bed:'future',door:'round'});assert.equal(vm.runInContext('({}).polluted',c),undefined);
});
test('restyling requires actual earned stage or owned catalog item and changes only look once',()=>{
 const c=boot(seed()),C=c.Core;const before=plain(C.save);assert.equal(C.houseSetLook('bed','c'),true);const after=plain(C.save);delete after.house.look;assert.deepEqual(after,beforeWithNoLook(before));assert.equal(c.persistCount(),1);
 for(const [key,v] of [['car','b'],['bed','future'],['__proto__','a'],['constructor','b'],['nope','a'],[{},'a'],['roof',null]])assert.equal(C.houseSetLook(key,v),false);
 C.house().stage=2;assert.equal(C.houseSetLook('walls','brick'),false);assert.equal(C.houseSetLook('base','cobble'),true);assert.equal(c.persistCount(),2);
});
function beforeWithNoLook(v){delete v.house.look;return v;}
test('House registry validates writes when renderer is present; Core boot needs no House module',()=>{
 const c=boot(seed());c.House={VARIANTS:c.HouseVariantRules.VARIANTS};assert.equal(c.Core.houseSetLook('bed','b'),true);
 const naked=boot(seed(),false);assert.ok(naked.Core);assert.equal(naked.Core.houseSetLook('bed','b'),false);
});
test('stage commits style atomically once; invalid stage is safe and legacy call retains default',()=>{
 const c=boot(),C=c.Core;assert.equal(C.houseStage(1,'meadow'),true);assert.equal(C.house().look.plot,'meadow');assert.equal(c.persistCount(),1);assert.equal(C.houseStage(1,'sand'),false);assert.equal(c.persistCount(),1);
 assert.equal(C.houseStage(2),true);assert.equal(c.HouseVariantRules.lookOf(C.house().look,'base'),'stone');const before=JSON.stringify(C.save);assert.equal(C.houseStage(3,'future'),false);assert.equal(JSON.stringify(C.save),before);assert.equal(C.houseStage(3,'brick'),true);
 for(const n of [NaN,Infinity,-Infinity,{},null,'bad'])assert.equal(C.houseStage(n,'brick'),false);
 const r=c.reload();assert.equal(r.Core.house().stage,3);assert.equal(r.Core.house().look.plot,'meadow');
});
test('gift commits item and style atomically, double claims and insufficient gift/stage are no-ops',()=>{
 const c=boot(seed()),C=c.Core;assert.equal(C.housePlace('car','car','c'),true);assert.equal(C.house().gifts,1);assert.equal(C.house().look.car,'c');assert.equal(c.persistCount(),1);
 assert.equal(C.housePlace('car','car','b'),false);assert.equal(c.persistCount(),1);assert.equal(C.housePlace('ball','ball'),true);assert.equal(c.HouseVariantRules.lookOf(C.house().look,'ball'),'a');
 const before=JSON.stringify(C.save);assert.equal(C.housePlace('chair','chair','b'),false);assert.equal(JSON.stringify(C.save),before);C.house().gifts=1;C.house().stage=4;assert.equal(C.housePlace('chair','chair','b'),false);
 C.house().stage=5;const invalidBefore=JSON.stringify(C.save);assert.equal(C.housePlace('chair','chair','future'),false);assert.equal(JSON.stringify(C.save),invalidBefore);for(const id of ['__proto__','constructor','unknown',{},null])assert.equal(C.housePlace(id,id,'b'),false);
 const r=c.reload();assert.equal(r.Core.house().look.car,'c');assert.ok(r.Core.house().owned.includes('car'));
});

test('all five earned parts and seventeen owned items restyle and reload with progress byte equal',()=>{
 const ids=['bed','ball','car','chair','backpack','bath','toilet','tv','cake','book','teddy','pencil','balloon','flower','key','spoon','plane'];
 const parts={plot:'dirt',base:'stone',walls:'plaster',roof:'redtile',door:'arch'};
 const data=seed();data.house.owned=ids;let c=boot(data),C=c.Core;const before=JSON.stringify(beforeWithNoLook(plain(C.save)));
 assert.deepEqual(Object.keys(c.HouseVariantRules.VARIANTS).sort(),Object.keys(parts).concat(ids).sort());
 for(const key of Object.keys(parts)){assert.equal(c.HouseVariantRules.VARIANTS[key].def,parts[key]);}
 for(const key of Object.keys(c.HouseVariantRules.VARIANTS)){
  for(const v of c.HouseVariantRules.VARIANTS[key].list){assert.equal(C.houseSetLook(key,v),true);assert.equal(c.HouseVariantRules.lookOf(C.house().look,key),v);}
 }
 assert.equal(JSON.stringify(beforeWithNoLook(plain(C.save))),before);assert.equal(c.persistCount(),66);
 c=c.reload();assert.equal(Object.keys(c.Core.house().look).length,22);assert.equal(JSON.stringify(beforeWithNoLook(plain(c.Core.save))),before);
});
