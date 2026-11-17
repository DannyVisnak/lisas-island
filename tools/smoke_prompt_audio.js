/* Controlled real-time prompt lifecycle checks. Called by smoke.js; no Core.fast. */
'use strict';

async function run(page) {
  const result = await page.evaluate(async () => {
    /* Isolate from the live screen: its own speech (home greeting, idle lines) would restart the chain mid-check. */
    if (window.UI && UI.flow) UI.flow.kill();
    Core.Snd.stop();
    if (window.UI && UI.stage) UI.stage.innerHTML = '';
    Core.fast = false;
    const snd = Core.Snd, AudioCtor = window.Audio, oldCache = snd.cache;
    snd.cache = {}; /* earlier screens cached real <audio> elements; the checks need the fake Audio below */
    const host = document.createElement('div'), button = document.createElement('button');
    document.body.appendChild(host); host.appendChild(button);
    let pauses = 0, accepted = 0, playing = [];
    window.Audio = function () {
      const audio = document.createElement('audio');
      Object.defineProperty(audio, 'duration', { configurable: true, value: 30 });
      /* The fake src never loads: drop the browser's own load error so only the test's deliberate 'missing' error reaches playOne. */
      audio.addEventListener('error', (e) => { if (!e.lisaTest) e.stopImmediatePropagation(); });
      const play = audio.play, pause = audio.pause;
      audio.play = function () {
        if (/missing/.test(audio.src)) { setTimeout(() => { const ev = new Event('error'); ev.lisaTest = true; audio.dispatchEvent(ev); }, 0); return Promise.resolve(); }
        playing.push(audio); return Promise.resolve();
      };
      audio.pause = function () { pauses++; return pause.call(audio); };
      return audio;
    };
    function finishAudio(audio) { audio.dispatchEvent(new Event('ended')); }
    const f = new Core.Flow();
    function tap() { if (!f.promptActive()) accepted++; }
    button.addEventListener('click', tap);
    const assertions = [];
    try {
      const pending = f.prompt(host, ['long-audio'], [button]);
      const firstAudio = snd.active[0].a;
      button.click();
      assertions.push({ name: 'tap during prompt audio is ignored', ok: accepted === 0 && f.promptActive() });
      await new Promise((resolve) => setTimeout(resolve, 4200));
      assertions.push({ name: 'audio longer than 4 seconds stays locked and is not stopped', ok: f.promptActive() && pauses === 0 && snd.busy() });
      finishAudio(firstAudio); await pending;
      button.click();
      assertions.push({ name: 'tap after ended counts', ok: !f.promptActive() && accepted === 1 });

      const t0 = performance.now();
      await f.prompt(host, ['missing'], [button]);
      const elapsed = performance.now() - t0;
      assertions.push({ name: 'missing clip releases within 4 seconds', ok: elapsed < 4000 && !f.promptActive() });
      assertions.push({ name: 'watchdog never stops playback', ok: pauses === 0 });

      /* Exercise Q.ask's real registered card handler while its scheduled question is pending. */
      const quizHost = document.createElement('div'); document.body.appendChild(quizHost);
      const quizFlow = new Core.Flow(), correct = 'cat', wrong = 'dog';
      const quizResult = Q.ask(quizFlow, quizHost, { lang: 'pt', target: correct, choices: [wrong, correct], srs: false });
      for (let w = 0; w < 60 && !snd.active.length; w++) await new Promise((resolve) => setTimeout(resolve, 50)); /* scheduled question starts ~450 ms after Q.ask */
      if (!snd.active.length) throw new Error('Q.ask question audio never started');
      const quizAudio = snd.active[snd.active.length - 1].a;
      const card = quizHost.querySelector('.card[data-id="' + correct + '"]');
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      assertions.push({ name: 'Q.ask card handler ignores a tap during its real prompt gate', ok: quizHost.querySelector('.card.right') === null && Q.cur.wrongs() === 0 && quizFlow.promptActive() });
      finishAudio(quizAudio);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const wrongCard = quizHost.querySelector('.card[data-id="' + wrong + '"]');
      wrongCard.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      Q.cur.help();
      await new Promise((resolve) => setTimeout(resolve, 30));
      const helpToken = snd.chainTok, helpPauses = pauses;
      await new Promise((resolve) => setTimeout(resolve, 950));
      assertions.push({ name: 'delayed wrong-answer replay does not interrupt pending Help audio', ok: helpToken === snd.chainTok && pauses === helpPauses && quizFlow.promptActive() });
      quizFlow.kill(); quizHost.remove();

      const acceptHost = document.createElement('div'); document.body.appendChild(acceptHost);
      const acceptFlow = new Core.Flow();
      Q.ask(acceptFlow, acceptHost, { lang: 'pt', target: correct, choices: [wrong, correct], srs: false });
      for (let w = 0; w < 60 && !snd.active.length; w++) await new Promise((resolve) => setTimeout(resolve, 50));
      const acceptAudio = snd.active[snd.active.length - 1].a;
      const acceptCard = acceptHost.querySelector('.card[data-id="' + correct + '"]');
      finishAudio(acceptAudio);
      await new Promise((resolve) => setTimeout(resolve, 20));
      acceptCard.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      assertions.push({ name: 'Q.ask card handler accepts a tap after prompt ended', ok: !!acceptHost.querySelector('.card.right') && !acceptFlow.promptActive() });
      acceptFlow.kill(); acceptHost.remove();
      void quizResult;
      return assertions;
    } finally {
      button.removeEventListener('click', tap); host.remove(); f.kill();
      window.Audio = AudioCtor; snd.cache = oldCache;
    }
  });
  result.forEach((x) => console.log((x.ok ? '  PASS: ' : '  FAIL: ') + x.name));
  const failed = result.filter((x) => !x.ok);
  if (failed.length) throw new Error(failed.map((x) => x.name).join('; '));
}

module.exports = run;

if (require.main === module) {
  const path = require('path');
  const pw = require(require.resolve('playwright', { paths: [process.cwd(), __dirname] }));
  (async () => {
    const browser = await pw.firefox.launch();
    try {
      const page = await browser.newPage();
      await page.goto('file://' + path.join(__dirname, '..', 'app', 'index.html'), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.Core && window.Core.Flow);
      await run(page);
    } finally { await browser.close(); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
