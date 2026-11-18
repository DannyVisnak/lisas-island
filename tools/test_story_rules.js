'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const modulePath = require('node:path').join(__dirname, '../app/js/story_rules.js');
const Rules = fs.existsSync(modulePath) ? require(modulePath) : {};
const fixture = () => ({id:'s0',revision:'r0',targetLocale:'pt-PT',vocabIds:['v0'],start:'n0',nodes:[
 {id:'n0',audioKeys:['a0','a0'],choices:[{id:'c0',next:'n1',vocabId:'v0'},{id:'c1',next:'n2'}]},
 {id:'n1',audioKeys:['a1'],next:'n3'},
 {id:'n2',audioKeys:['a2'],next:'n3'},
 {id:'n3',audioKeys:['a3'],end:true}
]});
function start(story=fixture(),run='u0') { assert.equal(typeof Rules.start,'function','pure start operation exists'); return Rules.start(story,run); }
function event(s,type,extra={}) {return {type,runId:s.runId,epoch:s.epoch,nodeId:s.nodeId,...extra};}
function send(s,type,extra={}) {assert.equal(typeof Rules.reduce,'function','pure reducer exists');return Rules.reduce(s,event(s,type,extra));}
function ended(s) {return send(s,'audio-ended',{audioIndex:s.audioIndex,audioKey:s.story.nodes.find(n=>n.id===s.nodeId).audioKeys[s.audioIndex]});}
function heard(s) {while(s.phase==='narrating')s=ended(s).state;return s;}
function validate(s) {assert.equal(typeof Rules.validate,'function','graph validator exists');return Rules.validate(s);}
test('valid opaque branching graph and immutable isolated initial state',()=>{
 const story=fixture();assert.deepEqual(validate(story),{valid:true,errors:[]});const s=start(story);
 assert.equal(s.phase,'narrating');assert.equal(s.nodeId,'n0');assert.equal(s.audioIndex,0);assert.equal(s.epoch,1);
 story.nodes[0].audioKeys[0]='changed';assert.equal(s.story.nodes[0].audioKeys[0],'a0');assert(Object.isFrozen(s));assert(Object.isFrozen(s.story.nodes[0].choices));
 assert.throws(()=>start(fixture(),''));
});
test('malformed identities, missing targets, ambiguous branches and invalid vocabulary fail closed',()=>{
 const mutations=[s=>s.nodes.push({...s.nodes[0]}),s=>s.nodes[0].choices.push({...s.nodes[0].choices[0]}),s=>s.nodes[0].choices[0].next='missing',s=>s.start='missing',s=>s.nodes[0].next='n1',s=>s.nodes[3].next='n0',s=>s.nodes[0].choices[0].vocabId='missing',s=>s.nodes[1].audioKeys=[],s=>delete s.nodes[1].next,s=>s.vocabIds.push('v0'),s=>s.nodes[3].end=false,s=>s.revision='',s=>s.targetLocale='',s=>s.nodes[0].choices[0].id=''];
 for(const mutate of mutations){const story=fixture();mutate(story);const result=validate(story);assert.equal(result.valid,false);assert(result.errors.length);assert.throws(()=>start(story));}
 for(const malformed of [null,{},[],{nodes:[null]}])assert.equal(validate(malformed).valid,false);
});
test('unreachable nodes and reachable cycles without terminal exits are rejected',()=>{
 const disconnected=fixture();disconnected.nodes.push({id:'nx',audioKeys:['ax'],end:true});assert.equal(validate(disconnected).valid,false);
 const trapped=fixture();trapped.nodes[1].next='n1';assert.equal(validate(trapped).valid,false);
});
test('every declared branch is touch complete after acknowledged narration',()=>{
 for(const [choice,node] of [['c0','n1'],['c1','n2']]){
  let s=heard(start());s=send(s,'choose',{choiceId:choice}).state;assert.equal(s.nodeId,node);
  s=heard(s);assert.equal(s.phase,'advance');s=send(s,'advance').state;assert.equal(s.nodeId,'n3');assert.equal(s.phase,'narrating');
  const done=ended(s);assert.equal(done.state.phase,'completed');assert.deepEqual(done.effects,[{type:'complete-engagement',runId:'u0',storyId:'s0',revision:'r0',targetLocale:'pt-PT'}]);
  assert.deepEqual(send(done.state,'audio-ended',{audioIndex:0,audioKey:'a3'}),{state:done.state,effects:[]});
 }
});
test('audio pending locks all choices and never implicitly advances',()=>{
 const s=start();for(const type of ['choose','advance','result','timeout'])assert.deepEqual(send(s,type,{choiceId:'c0'}),{state:s,effects:[]});
 const ready=heard(s);assert.equal(ready.phase,'choice');assert.deepEqual(send(ready,'choose',{choiceId:'missing'}),{state:ready,effects:[]});assert.equal(send(ready,'advance').state,ready);
});
test('each clip acknowledgement is indexed even when keys repeat',()=>{
 const s=start();const first=ended(s);assert.equal(first.state.audioIndex,1);assert.equal(first.state.phase,'narrating');assert.equal(first.effects[0].type,'play-audio');
 assert.deepEqual(Rules.reduce(first.state,event(s,'audio-ended',{audioIndex:0,audioKey:'a0'})),{state:first.state,effects:[]});
 assert.equal(send(s,'audio-ended',{audioIndex:0,audioKey:'wrong'}).state,s);assert.equal(ended(first.state).state.phase,'choice');
});
test('stale run, node, epoch and duplicate touch transitions cannot affect the new node',()=>{
 const ready=heard(start()),choice=event(ready,'choose',{choiceId:'c0'}),next=Rules.reduce(ready,choice).state;
 for(const e of [choice,event(next,'audio-ended',{runId:'old',audioIndex:0,audioKey:'a1'}),event(next,'audio-ended',{nodeId:'n0',audioIndex:0,audioKey:'a1'}),event(next,'audio-ended',{epoch:0,audioIndex:0,audioKey:'a1'})])assert.equal(Rules.reduce(next,e).state,next);
 assert.equal(send(next,'result',{choiceId:'c1'}).state,next);
});
test('replay invalidates old audio acknowledgements and relocks choices',()=>{
 const s=start(),old=event(s,'audio-ended',{audioIndex:0,audioKey:'a0'});const replay=send(s,'replay');assert(replay.state.epoch>s.epoch);assert.equal(replay.state.audioIndex,0);assert.equal(replay.effects[0].type,'stop-audio');assert.equal(replay.effects[1].type,'play-audio');assert.equal(Rules.reduce(replay.state,old).state,replay.state);
 assert.equal(send(heard(replay.state),'replay').state.phase,'narrating');
});
test('real audio failure stays blocked until retry with a fresh epoch',()=>{
 const s=start(),failed=send(s,'audio-failed',{audioIndex:0,audioKey:'a0'}).state;assert.equal(failed.phase,'audio-error');
 for(const type of ['choose','advance','audio-ended'])assert.equal(send(failed,type,{choiceId:'c0',audioIndex:0,audioKey:'a0'}).state,failed);
 const retry=send(failed,'retry').state;assert.equal(retry.phase,'narrating');assert(retry.epoch>failed.epoch);assert.equal(send(retry,'retry').state,retry);
});
test('back from audio failure returns only to visited predecessor and cancels pending audio',()=>{
 const ready=heard(start()),branch=send(ready,'choose',{choiceId:'c1'}).state,failed=send(branch,'audio-failed',{audioIndex:0,audioKey:'a2'}).state;
 const back=send(failed,'back');assert.equal(back.state.nodeId,'n0');assert.equal(back.state.phase,'narrating');assert(back.state.epoch>branch.epoch);assert.equal(back.effects[0].type,'stop-audio');assert.equal(send(start(),'back').state.nodeId,'n0');
});
test('end node audio failure never emits a completion notification',()=>{
 let s=send(heard(start()),'choose',{choiceId:'c0'}).state;s=send(heard(s),'advance').state;
 const failed=send(s,'audio-failed',{audioIndex:0,audioKey:'a3'});assert.equal(failed.state.phase,'audio-error');assert(!failed.effects.some(e=>e.type==='complete-engagement'));
 const retry=send(failed.state,'retry').state;assert.equal(ended(retry).effects.filter(e=>e.type==='complete-engagement').length,1);
});
test('cancel is terminal and restart with a separate run rejects all old callbacks',()=>{
 const s=start(),cancelled=send(s,'cancel');assert.equal(cancelled.state.phase,'cancelled');assert.equal(cancelled.effects[0].type,'stop-audio');
 for(const type of ['replay','retry','choose','advance','audio-ended','cancel','back'])assert.deepEqual(send(cancelled.state,type,{audioIndex:0,audioKey:'a0'}),{state:cancelled.state,effects:[]});
 const restarted=start(fixture(),'u1');assert.equal(Rules.reduce(restarted,event(s,'audio-ended',{audioIndex:0,audioKey:'a0'})).state,restarted);
});
test('events never mutate inputs and unsupported or malformed events are ignored',()=>{
 const s=start(),before=JSON.stringify(s);ended(s);send(s,'replay');assert.equal(JSON.stringify(s),before);
 for(const e of [null,{},[],{type:'audio-ended'}])assert.deepEqual(Rules.reduce(s,e),{state:s,effects:[]});
 assert.equal(Object.keys(s).some(k=>/score|mastery|reward|srs/i.test(k)),false);
});
test('positive integer story revisions are retained in completion identity',()=>{
 const story=fixture();story.revision=1;assert.deepEqual(validate(story),{valid:true,errors:[]});
 let s=send(heard(start(story)),'choose',{choiceId:'c0'}).state;s=send(heard(s),'advance').state;
 assert.equal(ended(s).effects[0].revision,1);
 for(const revision of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,null]){story.revision=revision;assert.equal(validate(story).valid,false);}
});
test('a cycle remains invalid even when another declared branch reaches an end',()=>{
 const story=fixture();story.nodes[1]={id:'n1',audioKeys:['a1'],choices:[{id:'cx',next:'n0'},{id:'cy',next:'n3'}]};
 assert.equal(validate(story).valid,false);assert.throws(()=>start(story));
});
