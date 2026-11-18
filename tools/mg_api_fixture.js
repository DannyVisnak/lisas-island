'use strict';
// Pure metadata adapter. Browser evaluate may call it without importing application code.
function uiNamespaceFixture(input) {
 const core=input.core||window.Core,key='__mgApiNamespaceFixture';
 if(input.action==='restore'){
  const saved=core[key];if(!saved)return false;
  for(const [name,descriptor] of saved.text)if(descriptor)Object.defineProperty(saved.ui,name,descriptor);else delete saved.ui[name];
  core.D.uiAudio.ru=saved.inventory;
  for(const [name,descriptor] of saved.settings)if(descriptor)Object.defineProperty(core.save.settings,name,descriptor);else delete core.save.settings[name];
  delete core[key];return true;
 }
 if(input.action!=='install'||core[key])throw new Error('Invalid or overlapping mini-game namespace fixture');
 const keys=['mg_apitest_help','mg_apitest_intro'],ui=core.D.ui.ru,inventory=core.D.uiAudio.ru;
 if(!ui||!Array.isArray(inventory))throw new Error('Missing actual RU UI metadata');
 core[key]={ui,inventory,text:keys.map(k=>[k,Object.getOwnPropertyDescriptor(ui,k)]),settings:['baseLang','ruHelp'].map(k=>[k,Object.getOwnPropertyDescriptor(core.save.settings,k)])};
 for(const k of keys)ui[k]='Internal namespace fixture';
 core.D.uiAudio.ru=inventory.concat(keys.filter(k=>!inventory.includes(k)));
 core.save.settings.baseLang='ru';core.save.settings.ruHelp=true;return true;
}
if(typeof module!=='undefined')module.exports={uiNamespaceFixture};
