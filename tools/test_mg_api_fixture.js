'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{uiNamespaceFixture}=require('./mg_api_fixture');
function core(){const c={window:{localStorage:{getItem:()=>null,setItem(){}}},document:{addEventListener(){}},Date,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){}};vm.createContext(c);for(const f of ['data','core'])vm.runInContext(fs.readFileSync('app/js/'+f+'.js','utf8'),c);return c.window.Core;}
test('unknown synthetic keys stay null until temporary metadata makes namespace available',()=>{
 const C=core();assert.equal(C.baseUrl('mg_apitest_help'),null);assert.equal(C.baseUrl('mg_apitest_intro'),null);const real=C.baseUrl('mg_feed_done');assert.equal(real,'audio/ui/ru_mg_feed_done.ogg');
 const original=JSON.stringify({ui:C.D.ui,inventory:C.D.uiAudio,settings:C.save.settings}),inventory=C.D.uiAudio.ru;
 uiNamespaceFixture({core:C,action:'install'});try{assert.equal(C.ruUrl('mg_apitest_help'),'audio/ui/ru_mg_apitest_help.ogg');assert.equal(C.ruUrl('mg_apitest_intro'),'audio/ui/ru_mg_apitest_intro.ogg');assert.equal(C.ruUrl('mg_feed_done'),real);C.save.settings.ruHelp=false;assert.equal(C.ruUrl('mg_apitest_help'),null);}finally{uiNamespaceFixture({core:C,action:'restore'});}
 assert.equal(C.D.uiAudio.ru,inventory);assert.equal(JSON.stringify({ui:C.D.ui,inventory:C.D.uiAudio,settings:C.save.settings}),original);assert.equal(C.baseUrl('mg_apitest_help'),null);
});
test('fixture restore retains earlier EN/OFF settings even after an assertion error',()=>{
 const C=core();C.save.settings.baseLang='en';C.save.settings.ruHelp=false;const before=JSON.stringify(C.D);try{uiNamespaceFixture({core:C,action:'install'});assert.equal(C.baseLang(),'ru');throw new Error('internal fixture check');}catch(e){assert.equal(e.message,'internal fixture check');}finally{uiNamespaceFixture({core:C,action:'restore'});}
 assert.equal(C.baseLang(),'en');assert.equal(C.save.settings.ruHelp,false);assert.equal(JSON.stringify(C.D),before);
});
