'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=process.env.HOUSE_RENDER_ROOT||path.resolve(__dirname,'..');
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.className='';this.style={};this.dataset={};this.attrs={};this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=Array.from(new Set(this.className.split(/\s+/).concat(cs))).filter(Boolean).join(' ');},remove:(...cs)=>{this.className=this.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle:(c,on)=>{if(on===undefined)on=!this.classList.contains(c);on?this.classList.add(c):this.classList.remove(c);}};}
 appendChild(n){this.children.push(n);n.parentNode=this;return n;} removeChild(n){this.children=this.children.filter(x=>x!==n);n.parentNode=null;}remove(){if(this.parentNode)this.parentNode.removeChild(this);}
 setAttribute(k,v){this.attrs[k]=v;if(k==='class')this.className=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(){}get firstChild(){return this.children[0]||null;}
 set innerHTML(html){this._html=html;this.children=[];let stack=[this];for(const m of html.matchAll(/<(\/?)([\w:-]+)\b([^>]*?)(\/?)>/g)){if(m[1]){if(stack.length>1)stack.pop();continue;}const n=new Node(m[2]);for(const q of m[3].matchAll(/([\w:-]+)="([^"]*)"/g))n.setAttribute(q[1],q[2]);stack[stack.length-1].appendChild(n);if(!m[4]&&!['img','br'].includes(m[2]))stack.push(n);}}
 get innerHTML(){return this._html||'';}querySelectorAll(sel){let out=[];for(const c of this.children){if(sel.startsWith('.')?sel.slice(1).split('.').every(x=>c.classList.contains(x)):c.tagName===sel.toUpperCase())out.push(c);out.push(...c.querySelectorAll(sel));}return out;}querySelector(sel){return this.querySelectorAll(sel)[0]||null;}getBoundingClientRect(){return {left:0,top:0,width:120,height:120,right:120,bottom:120};}get offsetWidth(){return 120;}
}
async function ticks(){for(let i=0;i<80;i++)await Promise.resolve();}
async function boot(saved,options={}){
 let stored=JSON.stringify(saved),events=[];const document={createElement:t=>new Node(t),addEventListener(){},documentElement:new Node('html')};
 const c={console,Date,Math,Promise,document,setTimeout:()=>1,clearTimeout(){},setInterval(){},getComputedStyle:()=>({fontSize:'10'}),Image:function(){return new Node('img');}};c.window=c;c.localStorage={getItem:()=>stored,setItem:(k,v)=>stored=v};vm.createContext(c);
 for(const f of ['data.js','house_variant_rules.js','core.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,'app/js',f),'utf8'),c,{filename:f});
 if(options.pickAvailable!==undefined)c.Core.D.uiAudio.en=Array.from(c.Core.D.uiAudio.en).filter(k=>k!=='house_pick').concat(options.pickAvailable?['house_pick']:[]);
 const C=c.Core;C.tap=(n,f)=>n.onclick=f;C.lang='pt';C.Snd.say=async list=>{events.push(['say',Array.from(list)]);return true;};C.Snd.sfx=s=>events.push(['sfx',s]);
 const btn=(cl,html,fn)=>{const n=C.el('div','btn '+cl,html);n.onclick=fn;return n;};
 c.UI={screens:{},scene(){},btn,backBtn:f=>btn('b-back','',f),speakerBtn:f=>btn('b-speaker','',f),idle(){},pulse(){},go:(...args)=>events.push(['go',args])};
 c.Lisa={make:()=>{const n=new Node('div');n.pose=()=>{};n.react=()=>{};return n;}};c.FX={burst(){}};
 const flow={dead:false,wait:async()=>{},say:async list=>{events.push(['say',Array.from(list)]);return true;},after(){},onKill(fn){this.killFn=fn;},kill(){this.dead=true;if(this.killFn)this.killFn();}};
 vm.runInContext(fs.readFileSync(path.join(ROOT,'app/js/house.js'),'utf8'),c,{filename:'house.js'});const root=new Node('section');c.UI.screens.house(flow,root,{from:'map'});await ticks();return {c,C,root,flow,events,state:()=>c.__houseTest.state(),saved:()=>{C.flushNow();return JSON.parse(stored);}};
}
const seed=(stage,gifts=0,owned=[])=>({stars:42,house:{stage,gifts,owned,placed:{},reviewDay:-1},settings:{baseLang:'en'}});
const plain=v=>JSON.parse(JSON.stringify(v));
test('due stages wait for variant taps and commit sequentially exactly once; leaving does not commit',async()=>{
 let b=await boot(seed(3));a.equal(b.state().stage,3);a.equal(b.state().picker,'stage');a.deepEqual(plain(b.state().varCards),['redtile','bluetile','straw']);a.equal(b.C.house().look.roof,undefined);
 const card=b.root.querySelectorAll('.hvar')[1];card.onclick();card.onclick();await ticks();a.equal(b.state().stage,4);a.equal(b.C.house().look.roof,'bluetile');a.equal(b.state().picker,'stage');
 b.root.querySelectorAll('.hvar')[2].onclick();await ticks();a.equal(b.state().stage,5);a.equal(b.state().mode,'room');a.equal(b.C.house().look.door,'shutter');
 b=await boot(seed(0));a.equal(b.state().stage,0);b.root.querySelector('.b-back').onclick();b.flow.kill();a.equal(b.saved().house.stage,0);
});
test('gift noun and style pickers grant no exposure until single atomic commit; restyle grants none',async()=>{
 const b=await boot(seed(5,1)),C=b.C;b.root.querySelector('.hgift').onclick();await ticks();const id=b.state().cards[0];a.equal(C.SRS.peek('pt',id).heard||0,0);
 b.root.querySelector('.hcard').onclick();await ticks();a.equal(b.state().picker,'style');a.equal(C.house().gifts,1);a.equal(C.house().owned.length,0);a.equal(C.SRS.peek('pt',id).heard||0,0);
 const chosen=b.root.querySelectorAll('.hvar')[1];chosen.onclick();chosen.onclick();await ticks();a.equal(C.house().gifts,0);a.deepEqual(Array.from(C.house().owned),[id]);a.equal(C.house().look[id],'b');a.equal(C.SRS.peek('pt',id).heard,1);a.ok(b.root.querySelector('.hitem').querySelector('img').src.endsWith('/'+id+'_b.svg'));
 b.root.querySelector('.b-hstyle').onclick();b.root.querySelector('.hitem').onclick();await ticks();const before=plain(C.save);b.root.querySelectorAll('.hvar')[2].onclick();await ticks();const after=plain(C.save);delete before.house.look;delete after.house.look;a.deepEqual(after,before);a.equal(C.house().look[id],'c');a.equal(C.SRS.peek('pt',id).heard,1);
});
test('leaving gift style picker spends nothing; normal owned item tap preserves old heard behavior',async()=>{
 let b=await boot(seed(5,1));b.root.querySelector('.hgift').onclick();await ticks();b.root.querySelector('.hcard').onclick();await ticks();b.root.querySelector('.b-back').onclick();b.flow.kill();a.equal(b.saved().house.gifts,1);a.deepEqual(b.saved().house.owned,[]);
 b=await boot(seed(5,0,['bed']));b.root.querySelector('.hitem').onclick();a.equal(b.C.SRS.peek('pt','bed').heard,1);a.equal(b.state().sleeping,false);
});
test('registry invalid reads stay classic without mutation; brush gates unearned stages and pickers',async()=>{
 const s=seed(1);s.stars=3;s.house.look={roof:'future',bed:'future'};const b=await boot(s);a.equal(b.c.House.lookOf('roof'),'redtile');a.equal(b.C.house().look.roof,'future');
 b.root.querySelector('.b-hstyle').onclick();a.equal(b.state().styling,true);a.equal(b.root.querySelectorAll('.hpart.off').length,4);b.root.querySelectorAll('.hpart')[0].onclick();b.root.querySelectorAll('.hvar')[1].onclick();a.equal(b.C.house().look.plot,'sand');
 const fresh=await boot({...seed(0),stars:0});a.ok(fresh.root.querySelector('.b-hstyle').classList.contains('hidden'));
});

test('house_pick is at most once across sequential pickers and silent with help off or missing inventory',async()=>{
 const count=b=>b.events.filter(e=>e[0]==='say').flatMap(e=>e[1]).filter(url=>url==='audio/ui/en_house_pick.ogg').length;
 const b=await boot(seed(3),{pickAvailable:true});a.equal(count(b),1);b.root.querySelector('.hvar').onclick();await ticks();a.equal(b.state().picker,'stage');a.equal(count(b),1);
 const off=seed(3);off.settings.ruHelp=false;a.equal(count(await boot(off,{pickAvailable:true})),0);a.equal(count(await boot(seed(3),{pickAvailable:false})),0);
});
