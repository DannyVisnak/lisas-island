/* LISA-13 pure adapters. No persistence, awards, audio, UI or SRS writes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CountryRules = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
const sets = [
 ['pt','country_sardine','country_tram','country_custard_tart','sea'],
 ['ru','country_nesting_doll','country_pancakes','country_bear','country_snow'],
 ['de','country_pretzel','country_castle','country_sausage','country_forest'],
 ['eng','bus','country_tea','country_clock','country_umbrella'],
 ['it','country_pizza','country_pasta','icecream','country_gondola'],
 ['fr','country_baguette','country_croissant','cheese','country_eiffel_tower'],
 ['jp','country_sushi','country_mountain','country_cherry_blossom','country_rice_ball'],
 ['br','country_football','country_parrot','banana','country_rainforest'],
 ['cn','country_panda','country_dumplings','country_chopsticks','country_dragon'],
 ['eg','country_pyramid','country_camel','country_desert','sun'],
 ['au','country_kangaroo','country_koala','beach','country_boomerang'],
 ['us','country_burger','country_statue_liberty','country_skyscraper','country_cowboy_hat']
];
const catalog = Object.freeze(sets.map(([id,...ids]) => Object.freeze({id,ids:Object.freeze(ids)})));
const byId = new Map(catalog.map(c=>[c.id,c]));
const optional = new Set(catalog.flatMap(c=>c.ids).filter(id=>id.startsWith('country_')));
const object = v => !!v && typeof v==='object' && !Array.isArray(v);
function clone(v) {
 if (Array.isArray(v)) return v.map(clone);
 if (!object(v)) return v;
 return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clone(x)]));
}
function country(id) {const c=byId.get(id);if(!c)throw new RangeError('Unknown country ID');return c;}
function migrateLanguage(l) {
 const out=object(l)?clone(l):{};
 const c=object(out.countries)?out.countries:{};
 out.countries={pending:byId.has(c.pending)?c.pending:null,completed:Object.fromEntries(catalog.filter(x=>object(c.completed)&&Object.hasOwn(c.completed,x.id)&&c.completed[x.id]===true).map(x=>[x.id,true]))};
 return out;
}
function select(l,id) {country(id);const out=migrateLanguage(l);out.countries.pending=id;return out;}
function validTrip(t) {
 const c=object(t)&&byId.get(t.id);
 return !!(c && ['pt','en','de'].includes(t.lang) && typeof t.token==='string' && t.token.length>0 && t.token.length<=128 && Array.isArray(t.ids) && t.ids.length===4 && t.ids.every((id,i)=>id===c.ids[i]));
}
function plan(l,s,o) {
 if(!object(o)||!['pt','en','de'].includes(o.lang)||typeof o.token!=='string'||!o.token.length||o.token.length>128)throw new TypeError('Target language and bounded session token required');
 if(typeof o.sleeping!=='boolean'||typeof o.reviewOnly!=='boolean')throw new TypeError('Explicit sleeping/review gates required');
 const language=migrateLanguage(l),session=clone(s);
 const result={language,session,applied:false};
 // Only a freshly created normal session is eligible. A live session is never rewritten.
 if (o.freshPlan!==true||!object(s)||s.country||s.step!==0||s.done||o.sleeping||o.reviewOnly||s.review||!language.countries.pending||!Array.isArray(s.plan)||!Array.isArray(s.newA)||!Array.isArray(s.newB))return result;
 if(s.plan.filter(x=>x==='A1').length!==1||s.plan.filter(x=>x==='A2').length!==1||s.plan.filter(x=>x==='A3').length!==1||s.plan.includes('CF')||s.plan.includes('CP'))return result;
 const c=country(language.countries.pending);
 session.country={id:c.id,ids:c.ids.slice(),token:o.token,lang:o.lang};
 session.newA=c.ids.slice();
 session.newB=s.newB.filter(id=>!c.ids.includes(id)).slice(0,4);
 session.plan=s.plan.flatMap(x=>x==='A1'?['CF','A1']:x==='A3'?['CP']:[x]);
 language.countries.pending=null;
 result.applied=true;return result;
}
function complete(l,s,token,lang) {
 const language=clone(l),session=clone(s),result={language,session,rewardStep:false,newPostcard:false};
 if(!object(s)||s.done||!validTrip(s.country)||lang!==s.country.lang||token!==s.country.token||!Number.isSafeInteger(s.step)||s.step<0||!Array.isArray(s.plan)||s.step>=s.plan.length||s.plan[s.step]!=='CP'||s.step===Number.MAX_SAFE_INTEGER)return result;
 if(!Array.isArray(s.newA)||s.newA.length!==4||!s.newA.every((id,i)=>id===s.country.ids[i])||!object(s.paid)||s.paid[s.step]||!object(s.ret)||!s.country.ids.every(id=>Number.isSafeInteger(s.ret[id])&&s.ret[id]>=2))return result;
 const migrated=migrateLanguage(l);
 result.newPostcard=migrated.countries.completed[s.country.id]!==true;
 migrated.countries.completed[s.country.id]=true;
 result.language=migrated;
 session.paid[s.step]=1;session.step=s.step+1;result.rewardStep=true;
 return result;
}
function restore(l,s) {
 const out=migrateLanguage(l);
 if(!out.countries.pending && object(s) && validTrip(s.country) && Array.isArray(s.plan)) {
 const cp=s.plan.indexOf('CP');
 if(cp>=0 && !(object(s.paid)&&s.paid[cp]))out.countries.pending=s.country.id;
 }
 return out;
}
function replay(l,id,item) {const c=country(id);if(!c.ids.includes(item))throw new RangeError('Item is not on postcard');return clone(l);}
function sequentialIds(ids) {return ids.filter(id=>!optional.has(id));}
return Object.freeze({catalog,migrateLanguage,select,plan,complete,restore,replay,sequentialIds});
});
