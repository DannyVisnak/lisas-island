'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(file==='app/js/path.js' && process.env.LISA_PATH_SOURCE ? process.env.LISA_PATH_SOURCE : path.join(process.env.LISA_SOURCE_ROOT || path.join(__dirname,'..'), file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function boot(saved) {
  let stored = saved && JSON.stringify(saved);
  const c = { console, Date, Math, Promise, setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    document: { hidden: false, addEventListener() {} }, Lisa: { ico: {} }, UI: { screens: {}, p: {}, makeSeq: (ids, n) => Array.from({length:n}, (_,i) => ids[i % ids.length]), go(screen,p) { this.last = {screen,p}; } } };
  c.window = c; c.localStorage = { getItem: () => stored, setItem: (key, value) => { stored = value; } };
  vm.createContext(c);
  for (const file of ['app/js/data.js','app/js/core.js','app/js/path.js']) vm.runInContext(read(file), c, { filename:file });
  c.reload = () => { c.Core.flushNow(); return boot(JSON.parse(stored)); };
  return c;
}

const node=()=>({children:[],style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},appendChild(n){this.children.push(n);return n;},addEventListener(){},pose(){},react(){}});
function setup(saved){const c=boot(saved);c.document.createElement=node;c.UI.scene=()=>{};c.Lisa.make=node;c.UI.homeBtn=node;c.UI.celebrate=async()=>{};c.Core.Snd.sfx=()=>{};c.Core.lisaLine=()=>null;c.UI.overlay=node();return c;}
const flow=()=>({wait:()=>new Promise(()=>{}),say:async()=>{},after(){}});
function enter(c){c.UI.screens.pritual(flow(),node(),{lang:'pt'});}
function report(name,values){console.log(JSON.stringify({name,...values}));}

async function meet(mode){const m=setup(),S=m.Path.newSession('pt');m.UI.p={path:true,lang:'pt'};S.plan=['A1','R'];S.step=0;m.Core.save.settings.sessionMin=10;S.playedMs=mode==='before'?600000:599999;let introduced=[],prompts=[];const original=m.Core.SRS.intro;m.Core.SRS.intro=function(lang,id){introduced.push(id);original(lang,id);};m.UI.chrome=()=>({dots:node(),help:node(),speaker:node(),area:node(),lisa:node()});m.Core.Pic.el=node;m.Core.vocabLabelEl=node;m.Core.sayRu=async()=>{};m.UI.idle=()=>{};const f={wait:async()=>{},prompt:async(area,audio)=>{prompts.push(...audio);if(mode==='during'&&introduced.length===1)S.playedMs=600000;},promptActive:()=>false,say:async()=>{},after(ms,fn){fn();return 1;}};m.UI.screens.pmeet(f,node(),{lang:'pt',words:S.newA});await new Promise(setImmediate);return {m,S,introduced,prompts};}
test('cap crossed during first Meet word finishes its audio and introduces no next word',async()=>{const r=await meet('during');assert.equal(r.introduced.length,1);assert.equal(r.prompts.filter(x=>typeof x==='string').length,4);assert.equal(r.prompts.filter(x=>x===r.m.Core.url.w('pt',r.introduced[0])||x===r.m.Core.url.q('pt',r.introduced[0])).length,3);assert.equal(r.m.UI.last.screen,'pritual');});
test('cap already reached before Meet introduces no word or audio',async()=>{const r=await meet('before');assert.deepEqual(r.introduced,[]);assert.deepEqual(r.prompts,[]);assert.equal(r.m.UI.last.screen,'pritual');});
test('below cap Meet preserves all four introductions and existing audio sequence',async()=>{const r=await meet('below');assert.equal(r.introduced.length,4);assert.equal(r.prompts.filter(x=>typeof x==='string').length,16);for(const id of r.introduced)assert.equal(r.prompts.filter(x=>x===r.m.Core.url.w('pt',id)||x===r.m.Core.url.q('pt',id)).length,3);});
