/* Focused LISA-14 DOM sequence/word-card acceptance, no design changes.
   Controller: node tools/smoke_lesson_demonstration.js --viewport=1128|1920 */
const assert=require('node:assert/strict'),{boot,sleep}=require('./mg_lib');
const width=Number((process.argv.find(x=>x.startsWith('--viewport='))||'--viewport=1128').split('=')[1]);
(async()=>{const lib=await boot({viewport:{width,height:width===1128?752:1080},speed:3});let code=0;
try{for(const id of ['repka','more']){
  console.log('DEMONSTRATION '+id);
  await lib.page.evaluate(id=>{
    window.__demo={joined:[],counts:[],word:null,extractedBeforeAll:false,done:false};
    const sample=()=>{
      const a=__demo;
      for(const e of document.querySelectorAll('[data-helper][data-joined="true"]'))if(!a.joined.includes(e.dataset.helper))a.joined.push(e.dataset.helper);
      const left=document.querySelector('.ls-more-left'),right=document.querySelector('.ls-more-right');
      if(left&&right&&left.dataset.count&&right.dataset.count){const pair=left.dataset.count+','+right.dataset.count;if(a.counts.at(-1)!==pair)a.counts.push(pair);}
      if(document.querySelector('.ls-rp-turnip[data-extracted="true"]')&&a.joined.length!==6)a.extractedBeforeAll=true;
      const card=document.querySelector('.ls-card');if(card&&!a.word){const img=card.querySelector('img'),label=card.querySelector('.ls-cardword');a.word={picture:!!card.querySelector('.ls-cardpic'),src:img&&img.getAttribute('src'),label:label&&label.textContent};}
    };
    window.__demoObserver=new MutationObserver(sample);__demoObserver.observe(UI.stage,{subtree:true,childList:true,attributes:true});
    Core.lang='de';Core.save.settings.enabled.de=true;__test.go('lesson',{id,lang:'de',done:()=>{sample();__demo.done=true;__test.go('home');}});
  },id);
  const start=Date.now();let picked=false;
  while(Date.now()-start<120000){if(await lib.page.evaluate(()=>__demo.done))break;
    const s=await lib.page.evaluate(()=>window.__lessonTest&&__lessonTest.state());
    if(s&&s.phase==='prompt'&&!picked){await lib.waitPromptFree();await lib.tapSel('.ls-tile');picked=true;}
    await sleep(40);
  }
  const r=await lib.page.evaluate(id=>{__demoObserver.disconnect();return{audit:__demo,word:Core.item(Lesson.word(id)).de.word};},id);
  assert(r.audit.done,'lesson completes');
  if(id==='repka'){assert.deepEqual(r.audit.joined,['grandpa','grandma','girl','dog','cat','mouse'],'helpers join in narrative order');assert(!r.audit.extractedBeforeAll,'turnip stays planted until every helper joins');}
  else {let previous=-1;for(const pair of ['3,1','3,2','3,3']){const n=r.audit.counts.indexOf(pair);assert(n>previous,'quantity '+pair+' observed in order: '+r.audit.counts);previous=n;}}
  assert(r.audit.word&&r.audit.word.picture,'end card renders a vocabulary picture');assert.equal(r.audit.word.label,r.word,'German end card uses active-language word');
}}
catch(e){lib.fail(e.stack||String(e));code=1;}code=(await lib.finish('LESSON DOM DEMONSTRATION'))||code;process.exit(code);})();
