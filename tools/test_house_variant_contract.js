'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function art(){const source=read('app/js/house.js'),c={Core:{D:{items:{}}},UI:{screens:{}}};c.window=c;vm.createContext(c);vm.runInContext(read('app/js/house_variant_rules.js'),c);vm.runInContext(source.replace('var ROOM_SVG =','window.__art={exterior:EXT_SVG,icons:STAGE_ICO,varIcons:VAR_ICO};\nvar ROOM_SVG =').replace('var GIFT_SVG =','window.__art.room=ROOM_SVG;\nvar GIFT_SVG ='),c);return c.__art;}
function inner(svg,cls){const anchor='<g class="'+cls+'">';a.equal(svg.split(anchor).length,2);const start=svg.indexOf(anchor)+anchor.length,tail=svg.slice(start);let depth=1;for(const m of tail.matchAll(/<\/?g\b[^>]*>/g)){depth+=m[0].startsWith('</')?-1:1;if(!depth)return tail.slice(0,m.index);}throw Error(cls);}
test('classic stage inner bytes, room SVG and five classic chip SVGs remain byte-identical',()=>{
 const before=JSON.parse(read('tools/fixtures/house_classic_art.json')),now=art(),defs=['dirt','stone','plaster','redtile','arch'];a.equal(now.room,before.room);a.deepEqual(Array.from(now.icons),before.icons);
 defs.forEach((v,i)=>{a.equal(inner(now.exterior,'hs hs'+(i+1)+' v-'+v),before.stages[i+1]);a.equal(now.varIcons[v],before.icons[i]);});
 for(const [i,list] of [['sand','meadow'],['sandstone','cobble'],['wood','brick'],['bluetile','straw'],['round','shutter']].entries())for(const v of list){a.ok(inner(now.exterior,'hs hs'+(i+1)+' v-'+v).length);a.ok(now.varIcons[v]);}
});
test('prompt data uses exact author words and every derived asset is in generated readiness inventory',()=>{
 const c={window:{}};vm.runInNewContext(read('app/js/data.js'),c);const D=c.window.GAME_DATA;a.equal(D.ui.ru.house_pick,'Выбери, что тебе нравится!');a.equal(D.ui.en.house_pick,'Choose the one you like!');const M=JSON.parse(read('tools/house_variant_manifest.json'));for(const entry of M.assets)a.ok(D.packs.countries.readyAssets.includes(entry.output.replace(/^app\//,'')),entry.output);
 a.ok(read('app/index.html').indexOf('js/house_variant_rules.js')<read('app/index.html').indexOf('js/core.js'));
});
test('author-sized controls and reduced-motion CSS declarations are supplied',()=>{
 const css=read('app/css/house.css');a.match(css,/\.hvar \{[^}]*width: 14rem; height: 14rem;/);a.match(css,/\.hdone \{[^}]*width: 14rem; height: 14rem;/);a.match(css,/\.house-tray\.styler \.hstep\.hpart \{ width: 14rem; height: 14rem;/);a.match(css,/prefers-reduced-motion: reduce/);a.match(css,/\.topbar \.b-hstyle \{[^}]*width: 13\.6rem; height: 13\.6rem;/);
});
