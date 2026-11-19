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


async function exposures(help,base,tapFirst=false){const m=setup();m.Core.save.settings.ruHelp=help;m.Core.save.settings.baseLang=base;const S=m.Path.newSession('pt');m.UI.p={path:true,lang:'pt'};S.plan=['A1','R'];S.step=0;const prompts=[],guidance=[],taps=[];let waits=0;m.UI.chrome=()=>({dots:node(),help:node(),speaker:node(),area:node(),lisa:node()});m.Core.Pic.el=node;m.Core.vocabLabelEl=node;m.Core.tap=(card,fn)=>taps.push(fn);vm.runInContext(read('app/js/path.js'),m,{filename:'app/js/path.js'});m.Core.sayRu=async(flow,key)=>guidance.push(key);m.UI.idle=()=>{};const f={wait:async()=>{},prompt:async(area,audio)=>{prompts.push(...audio);},promptActive:()=>false,say:async()=>{},after(ms,fn){if(ms===6500&&tapFirst&&waits++===0)taps[0]();fn();return 1;}};m.UI.screens.pmeet(f,node(),{lang:'pt',words:S.newA});await new Promise(setImmediate);return {m,S,prompts,guidance};}
for(const [help,base] of [[true,'ru'],[false,'ru'],[true,'en'],[false,'en']])test('no-tap first and later words get three L2 presentations; help='+help+' base='+base,async()=>{const r=await exposures(help,base);for(const id of r.S.newA){const word=r.m.Core.url.w('pt',id),question=r.m.Core.url.q('pt',id);assert.equal(r.prompts.filter(u=>u===word||u===question).length,3,id);assert.equal(r.prompts.filter(u=>u===word).length,2,id);assert.equal(r.prompts.filter(u=>u===question).length,1,id);}assert.deepEqual(r.guidance,['explore']);});
test('optional first-picture tap still adds existing additional target replay',async()=>{const r=await exposures(true,'ru',true),id=r.S.newA[0];assert.equal(r.prompts.filter(u=>u===r.m.Core.url.w('pt',id)||u===r.m.Core.url.q('pt',id)).length,4);});
