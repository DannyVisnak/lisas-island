'use strict';
// One isolated real-touch/recovery contract; parent owns browser execution.
const assert=require('node:assert/strict'),{boot}=require('./mg_lib'),{waitRunProgress,readRunSnapshot}=require('./run_progress_contract');
(async()=>{
 const arg=process.argv[2]||'--viewport=1128';if(process.argv.length>3||!/^--viewport=(1128|1920)$/.test(arg))throw new Error('Use --viewport=1128 or --viewport=1920');
 const width=Number(arg.split('=')[1]),started=Date.now();let lib;
 try{lib=await boot({viewport:{width,height:width===1128?752:1080},speed:1});const {page}=lib;
  await page.evaluate(()=>{__test.go('run',{lang:'pt',world:'animals',level:4});window.__recoveryRun=__runState;});
  await page.waitForFunction(()=>{const cv=document.querySelector('.s-run .runcv');if(!cv||__runState!==__recoveryRun||__runState.state!=='ready'||UI.flow.dead||getComputedStyle(cv.parentElement).opacity!=='1')return false;const b=cv.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;return b.width>0&&b.height>0&&document.elementFromPoint(x,y)===cv;},null,{timeout:1500});
  await page.evaluate(()=>{document.querySelector('.s-run .runcv').addEventListener('pointerdown',e=>{window.__recoveryTouch={state:__runState.state,trusted:e.isTrusted,touch:e.pointerType==='touch'};},{capture:true,once:true});});
  await lib.tapSel('.s-run .runcv');assert.deepEqual(await page.evaluate(()=>__recoveryTouch),{state:'ready',trusted:true,touch:true});
  await page.waitForFunction(()=>__runState===__recoveryRun&&__runState.state==='run'&&!__runState.lisa.onGround&&__runState.lisa.vy<0,null,{timeout:1200});
  await page.evaluate(()=>{__test.speedUp(8);__runState.lisa.y=900;__runState.lisa.vy=1200;__runState.lisa.onGround=false;});
  await page.waitForFunction(()=>__runState.state==='bounce',null,{timeout:2000});assert.deepEqual(await page.evaluate(()=>({x:__runState.lisa.x,checkpoint:__runState.checkpointX})),{x:220,checkpoint:220});
  await page.waitForFunction(()=>__runState.state==='run',null,{timeout:5000});const progress=await waitRunProgress(()=>readRunSnapshot(page));assert.ok(progress.delta>300);
  const states=new Set();for(let i=0;i<40;i++){const s=await readRunSnapshot(page);assert.ok(s&&s.mounted);states.add(s.state);await new Promise(r=>setTimeout(r,150));}assert.ok(!states.has('dead')&&!states.has('over'));
  assert.deepEqual(lib.errors,[]);console.log(JSON.stringify({event:'run-recovery.pass',width,elapsedMs:Date.now()-started,progress,states:[...states]}));
 }catch(e){let state=null;if(lib)try{state=await readRunSnapshot(lib.page);}catch{}console.error(JSON.stringify({event:'run-recovery.fail',width,error:e.stack,state,elapsedMs:Date.now()-started}));process.exitCode=1;}
 finally{if(lib)await lib.browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
