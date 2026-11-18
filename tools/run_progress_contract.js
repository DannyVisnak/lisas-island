'use strict';
async function readRunSnapshot(page) {
 return page.evaluate(()=>{const s=window.__runState;return s?{state:s.state,x:s.lisa.x,checkpointX:s.checkpointX,mounted:!!(window.UI&&window.UI.cur==='run'&&window.UI.flow&&!window.UI.flow.dead)}:null;});
}
async function waitRunProgress(readState, options={}) {
 const timeoutMs=options.timeoutMs==null?5000:options.timeoutMs,intervalMs=options.intervalMs||50;
 if(!(timeoutMs>0&&timeoutMs<=5000))throw new Error('Run progress timeout must be <=5000ms');
 const now=options.now||Date.now,sleep=options.sleep||(ms=>new Promise(r=>setTimeout(r,ms))),started=now(),baseline=await readState();
 if(!baseline||!baseline.mounted||baseline.state!=='run'||!Number.isFinite(baseline.x))throw new Error('Run progress needs a mounted post-recovery run baseline: '+JSON.stringify(baseline));
 let observed=baseline;while(now()-started<timeoutMs){observed=await readState();if(!observed||!observed.mounted||['dead','over'].includes(observed.state))throw new Error('Run became invalid: '+JSON.stringify({baseline,observed}));
  if(observed.state==='run'&&Number.isFinite(observed.x)&&observed.x-baseline.x>300)return {baseline,observed,delta:observed.x-baseline.x,elapsedMs:now()-started};
  await sleep(Math.min(intervalMs,Math.max(0,timeoutMs-(now()-started))));}
 throw new Error('Run progress never exceeded300 within'+timeoutMs+'ms: '+JSON.stringify({baseline,observed}));
}
module.exports={waitRunProgress,readRunSnapshot};
