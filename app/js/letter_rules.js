/* Pure LISA-18 rules preparation. No UI/audio/storage/SRS/reward or clock ownership. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LetterRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var INITIAL=[['p','P','duck','pato',2,'sound_p'],['a','A','yellow','amarelo',0,'sound_a_reduced'],['m','M','apple','maçã',2,'sound_m'],['o','O','egg','ovo',2,'sound_o_close'],['l','L','milk','leite',2,'sound_l_initial'],['v','V','cow','vaca',2,'sound_v']];
var LABELS=['o pato','amarelo','a maçã','o ovo','o leite','a vaca'];
var NEW_PLAN=['warm','A1','A2','A3','L','MV','LETTER','R'];
var STEPS=['listen','word','choice','formation','screenKey','physicalKey'];
function integer(n){return Number.isSafeInteger(n)&&n>=0;}
function requireRule(ok,message){if(!ok)throw new Error(message);}
function copy(value){if(Array.isArray(value))return value.map(copy);if(value&&typeof value==='object'){var out={};Object.keys(value).forEach(function(k){Object.defineProperty(out,k,{value:copy(value[k]),enumerable:true,writable:true,configurable:true});});return out;}return value;}
function freeze(value){if(value&&typeof value==='object'){Object.keys(value).forEach(function(k){freeze(value[k]);});Object.freeze(value);}return value;}
function mappingExists(lower){return INITIAL.some(function(m){return m[0]===lower;});}
function canonicalMapping(lower){
 var index=INITIAL.findIndex(function(m){return m[0]===lower;});requireRule(index>=0,'unsupported fixed mapping');
 var m=INITIAL[index],label=LABELS[index];
 return {lang:'pt',locale:'pt-PT',lower:m[0],upper:m[1],anchor:m[2],noun:m[3],label:label,target:{start:m[4],end:m[4]+1},nounSpan:{start:m[4],end:label.length},variant:m[5],code:'Key'+m[1]};
}
function validateMapping(mapping){
 requireRule(mapping&&mappingExists(mapping.lower),'invalid saved mapping');var expected=canonicalMapping(mapping.lower);
 Object.keys(expected).forEach(function(k){var value=expected[k],actual=mapping[k];
  requireRule(value&&typeof value==='object'?actual&&actual.start===value.start&&actual.end===value.end:actual===value,'inconsistent saved mapping '+k);
 });return expected;
}
function validateNewPlan(plan){
 requireRule(plan&&plan.kind==='new'&&plan.lang==='pt'&&typeof plan.sessionId==='string'&&plan.sessionId&&integer(plan.day),'invalid new letter plan');
 var mapping=validateMapping(plan.mapping);
 requireRule(Array.isArray(plan.plan)&&plan.plan.length===NEW_PLAN.length&&NEW_PLAN.every(function(step,index){return plan.plan[index]===step;}),'invalid saved new letter plan');
 return mapping;
}
function mappings(vocab){return freeze(INITIAL.map(function(m){var mapping=canonicalMapping(m[0]),it=vocab&&vocab[m[2]],label=it&&it.pt&&it.pt.word;requireRule(label===mapping.label,'verified PT anchor text required: '+m[2]);return mapping;}));}
function countKnown(vocab,words){return Object.keys(words||{}).filter(function(id){var it=vocab&&vocab[id],box=words[id]&&words[id].box;return !!(it&&it.pt&&typeof it.pt.word==='string'&&it.pt.word&&integer(box)&&box>=3&&box<=5);}).length;}
function progress(record){requireRule(!record||!record.lang||record.lang==='pt','unsupported letter record language');var p=copy(record||{});p.version=1;p.lang='pt';var seen=new Set(),ids=new Set();p.introduced=(Array.isArray(p.introduced)?p.introduced:[]).filter(function(r){if(!r||!mappingExists(r.mapping)||!integer(r.day)||typeof r.encounterId!=='string'||!r.encounterId||seen.has(r.mapping)||ids.has(r.encounterId))return false;seen.add(r.mapping);ids.add(r.encounterId);return true;});p.completed=(Array.isArray(p.completed)?p.completed:[]).filter(function(id,i,a){return typeof id==='string'&&id&&a.indexOf(id)===i;});p.observations=p.observations&&typeof p.observations==='object'&&!Array.isArray(p.observations)?p.observations:{};return freeze(p);}
function canIntroduce(p,day){var recent=p.introduced.filter(function(r){return r.day>=day-6&&r.day<=day;});return !recent.some(function(r){return r.day===day;})&&recent.length<2;}
function selectSession(o){
 requireRule(o&&typeof o.sessionId==='string'&&o.sessionId&&integer(o.day),'stable session identity and integer calendar day required');
 if(o.lang==='pt'&&o.cached&&o.cached.sessionId===o.sessionId&&o.cached.day===o.day&&o.cached.lang==='pt'){requireRule(o.cached.kind==='normal'||o.cached.kind==='new','invalid cached letter plan');var cached=copy(o.cached);if(cached.kind==='new')cached.mapping=validateNewPlan(cached);return freeze(cached);}
 function normal(reason){return freeze({sessionId:o.sessionId,day:o.day,lang:o.lang,kind:'normal',reason:reason,plan:copy(o.basePlan||[])});}
 if(o.lang!=='pt'||o.enabled!==true||o.small||o.reviewOnly||o.earlyStop)return normal('disabled-or-session-mode');
 if(!Number.isFinite(o.remainingMs)||o.remainingMs<120000)return normal('reserve');
 var words=o.wordsByLang&&o.wordsByLang.pt||{};if(countKnown(o.vocab,words)<20)return normal('known-gate');
 var p=progress(o.progress);if(!canIntroduce(p,o.day))return normal('introduction-limit');
 var list=mappings(o.vocab),next=list.find(function(m){var box=words[m.anchor]&&words[m.anchor].box,a=o.assets&&o.assets[m.lower];return !p.introduced.some(function(r){return r.mapping===m.lower;})&&integer(box)&&box>=3&&box<=5&&a&&a.approved===true&&a.available===true&&typeof a.reviewer==='string'&&a.reviewer.trim();});
 if(!next)return normal('no-new-eligible-mapping');
 return freeze({sessionId:o.sessionId,day:o.day,lang:'pt',kind:'new',mapping:next,plan:NEW_PLAN.slice()});
}
function createEncounter(plan,opts){var mapping=validateNewPlan(plan);return freeze({id:plan.sessionId+':'+plan.mapping.lower,day:plan.day,lang:'pt',mapping:mapping,step:'listen',physicalEnabled:!opts||opts.physicalEnabled!==false,pressed:null,attempts:0,helped:false,done:false,usedPhysical:false});}
function next(state,updates){var e=Object.assign({},state,updates||{}),index=STEPS.indexOf(state.step)+1;if(index===5&&!e.physicalEnabled)index++;e.step=STEPS[index]||'done';e.done=e.step==='done';e.pressed=null;return freeze(e);}
function advance(e,event){if(e.done||!event)return e;
 if(event.type==='help')return e.helped?e:freeze(Object.assign({},e,{helped:true}));
 if((e.step==='listen'||e.step==='word')&&event.type==='continue')return next(e);
 if(e.step==='choice'&&event.type==='choice'){
  if(typeof event.letter!=='string'||!(/^[a-z]$/).test(event.letter))return e;
  if(event.letter===e.mapping.lower)return next(e);
  var tries=e.attempts+1;return tries>=2?next(e,{attempts:tries,helped:true}):freeze(Object.assign({},e,{attempts:tries}));
 }
 if(e.step==='formation'&&(event.type==='touch'||event.type==='trace'))return next(e,{formation:event.type});
 if(e.step==='screenKey'&&event.type==='screenKey'&&event.letter===e.mapping.upper)return next(e);
 if(e.step==='physicalKey'&&event.type==='touch')return next(e);
 return e;
}
function keyboard(e,event){if(e.done||e.step!=='physicalKey'||!e.physicalEnabled||!event||event.repeat||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.code!==e.mapping.code)return e;
 if(event.type==='keydown'&&!e.pressed)return freeze(Object.assign({},e,{pressed:event.code}));
 if(event.type==='keyup'&&e.pressed===event.code)return next(e,{usedPhysical:true});return e;
}
function restoreEncounter(record){var e=copy(record);requireRule(e&&typeof e.id==='string'&&e.id&&integer(e.day)&&e.lang==='pt'&&e.mapping&&mappingExists(e.mapping.lower),'invalid encounter identity');e.mapping=validateMapping(e.mapping);requireRule((STEPS.includes(e.step)||e.step==='done')&&integer(e.attempts)&&e.attempts<=2&&e.done===(e.step==='done'),'invalid saved encounter');e.pressed=null;return freeze(e);}
function recordIntroduction(p,e){if(!e||e.lang!=='pt'||e.step==='listen'||!mappingExists(e.mapping.lower)||p.introduced.some(function(r){return r.mapping===e.mapping.lower||r.encounterId===e.id;})||!canIntroduce(p,e.day))return p;var out=copy(p);out.introduced.push({mapping:e.mapping.lower,day:e.day,encounterId:e.id});return progress(out);}
function recordCompletion(p,e){if(!e||!e.done||e.lang!=='pt'||!mappingExists(e.mapping.lower)||p.completed.includes(e.id))return p;var out=copy(p);out.completed.push(e.id);var old=out.observations[e.mapping.lower]||{},n=integer(old.completions)?old.completions:0;out.observations[e.mapping.lower]=Object.assign({},old,{completions:n+1,lastDay:e.day,helped:!!e.helped,usedPhysical:!!e.usedPhysical,soundSelectionUnhelped:!e.helped&&e.attempts===0,screenKeyLocated:true,physicalKeyLocated:!!e.usedPhysical,formation:e.formation||null});return progress(out);}
return Object.freeze({mappings:mappings,countKnown:countKnown,progress:progress,selectSession:selectSession,createEncounter:createEncounter,advance:advance,keyboard:keyboard,restoreEncounter:restoreEncounter,recordIntroduction:recordIntroduction,recordCompletion:recordCompletion});
});
