/* Pure prerecorded-story control. No audio playback, persistence or assessment. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StoryRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const id = v => typeof v === 'string' && v.trim().length > 0;
const ids = v => Array.isArray(v) && v.every(id) && new Set(v).size === v.length;
function freeze(v) {
  if (v && typeof v === 'object') {Object.values(v).forEach(freeze);Object.freeze(v);}
  return v;
}
function validate(story) {
  const errors = [];
  const bad = code => errors.push(code);
  if (!object(story)) return {valid:false,errors:['story']};
  if (![story.id,story.targetLocale,story.start].every(id) || !(id(story.revision) || (Number.isSafeInteger(story.revision) && story.revision > 0))) bad('identity');
  if (!ids(story.vocabIds)) bad('vocabIds');
  if (!Array.isArray(story.nodes) || !story.nodes.length) return {valid:false,errors:errors.concat('nodes')};
  const nodes = new Map();
  for (const n of story.nodes) {
    if (!object(n) || !id(n.id)) {bad('node-identity');continue;}
    if (nodes.has(n.id)) bad('duplicate-node');
    nodes.set(n.id,n);
    if (!Array.isArray(n.audioKeys) || !n.audioKeys.length || !n.audioKeys.every(id)) bad('audioKeys');
    if (n.end !== undefined && n.end !== true) bad('end');
    if (n.next !== undefined && !id(n.next)) bad('next');
    if (n.choices !== undefined && !Array.isArray(n.choices)) bad('choices');
    const choices = Array.isArray(n.choices) ? n.choices : [];
    if (Number(n.end === true) + Number(n.next !== undefined) + Number(choices.length > 0) !== 1) bad('branch');
    const seen = new Set();
    for (const c of choices) {
      if (!object(c) || !id(c.id) || !id(c.next)) {bad('choice');continue;}
      if (seen.has(c.id)) bad('duplicate-choice');
      seen.add(c.id);
      if (c.vocabId !== undefined && (!id(c.vocabId) || !Array.isArray(story.vocabIds) || !story.vocabIds.includes(c.vocabId))) bad('vocab-reference');
    }
  }
  if (!nodes.has(story.start)) bad('start');
  // Structural errors stop traversal; malformed content never becomes a playable graph.
  if (errors.length) return {valid:false,errors};
  const edges = n => n.next !== undefined ? [n.next] : (n.choices || []).map(c => c.next);
  for (const n of nodes.values()) if (edges(n).some(next => !nodes.has(next))) bad('missing-target');
  if (errors.length) return {valid:false,errors};
  const reached = new Set(), pending = [story.start];
  while (pending.length) {const key=pending.pop();if(reached.has(key))continue;reached.add(key);pending.push(...edges(nodes.get(key)));}
  if (reached.size !== nodes.size) bad('unreachable-node');
  // Every authored route must terminate; cycles remain invalid even with an exit.
  const finishable = new Set(story.nodes.filter(n => n.end === true).map(n => n.id));
  let changed = true;
  while (changed) {changed=false;for(const n of nodes.values())if(!finishable.has(n.id)&&edges(n).every(key=>finishable.has(key))){finishable.add(n.id);changed=true;}}
  if ([...reached].some(key => !finishable.has(key))) bad('no-terminal-route');
  return {valid:errors.length===0,errors};
}
function start(story, runId) {
  const result = validate(story);
  if (!result.valid) throw new TypeError('Invalid story: ' + result.errors.join(','));
  // Owner supplies a fresh identity for every run; no global counter/storage here.
  if (!id(runId)) throw new TypeError('Fresh runId required');
  const snapshot = JSON.parse(JSON.stringify(story));
  return freeze({story:snapshot,runId,epoch:1,nodeId:story.start,audioIndex:0,phase:'narrating',history:[]});
}
const node = s => s.story.nodes.find(n => n.id === s.nodeId);
const scope = s => ({runId:s.runId,epoch:s.epoch,nodeId:s.nodeId});
const play = s => ({type:'play-audio',...scope(s),audioIndex:s.audioIndex,audioKey:node(s).audioKeys[s.audioIndex]});
const stop = s => ({type:'stop-audio',...scope(s)});
const output = (state,effects=[]) => freeze({state,effects});
function enter(s,nodeId,history) {
  const next = freeze({...s,nodeId,history,epoch:s.epoch+1,audioIndex:0,phase:'narrating'});
  return output(next,[stop(s),play(next)]);
}
function reduce(s,e) {
  const unchanged = () => output(s);
  if (!object(e) || s.phase==='cancelled' || s.phase==='completed' || e.runId!==s.runId || e.epoch!==s.epoch || e.nodeId!==s.nodeId) return unchanged();
  const n = node(s);
  if (e.type === 'cancel') return output(freeze({...s,phase:'cancelled',epoch:s.epoch+1}),[stop(s)]);
  if (e.type === 'back' && s.history.length) return enter(s,s.history[s.history.length-1],s.history.slice(0,-1));
  if (e.type === 'replay' || (e.type === 'retry' && s.phase === 'audio-error')) return enter(s,s.nodeId,s.history);
  if ((e.type === 'audio-ended' || e.type === 'audio-failed') && s.phase === 'narrating' && e.audioIndex===s.audioIndex && e.audioKey===n.audioKeys[s.audioIndex]) {
    if (e.type === 'audio-failed') return output(freeze({...s,phase:'audio-error'}),[stop(s)]);
    if (s.audioIndex+1 < n.audioKeys.length) {
      const next=freeze({...s,audioIndex:s.audioIndex+1});return output(next,[play(next)]);
    }
    if (n.end === true) return output(freeze({...s,phase:'completed'}),[{type:'complete-engagement',runId:s.runId,storyId:s.story.id,revision:s.story.revision,targetLocale:s.story.targetLocale}]);
    return output(freeze({...s,phase:n.next!==undefined?'advance':'choice'}));
  }
  if (e.type==='advance' && s.phase==='advance') return enter(s,n.next,s.history.concat(s.nodeId));
  if (e.type==='choose' && s.phase==='choice') {
    const choice=n.choices.find(c=>c.id===e.choiceId);
    if (choice) return enter(s,choice.next,s.history.concat(s.nodeId));
  }
  return unchanged();
}
return Object.freeze({validate,start,reduce});
});
