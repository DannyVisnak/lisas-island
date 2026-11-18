/* Fast source-contract checks; browser lifecycle coverage lives in smoke_prompt_audio.js. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function check(ok, message) { if (!ok) throw new Error(message); console.log('  PASS: ' + message); }
const core = read('app/js/core.js');
const games = read('app/js/games.js');
const lesson = read('app/js/lesson.js');
const market = read('app/js/mg_market.js');
const body = read('app/js/mg_body.js');
const pathScreen = read('app/js/path.js');
const minigames = read('app/js/minigames.js');
const feed = read('app/js/mg_feed.js');
const dress = read('app/js/mg_dress.js');
check(/Array\.prototype\.slice\.call\(targets\)/.test(core), 'Flow.prompt normalizes NodeList targets');
check(/elapsed >= 20000/.test(core) && /setTimeout\(watchdog, 4000\)/.test(core) && /Math\.min\(350/.test(core), 'prompt watchdog rechecks owned audio and has a 20-second cap');
check(!/release\(true\)/.test(core.slice(core.indexOf('function watchdog'), core.indexOf('this.prompting = true'))), 'watchdog does not stop audio');
check(/promptGeneration/.test(games), 'quiz completion clears only its current prompt generation');
check(/sayAfterPrompt/.test(core) && /sayInstruction\(flow, 'explore'\)/.test(games) && /flow\.sayAfterPrompt\(\[Core\.ruUrl\('memory'\)\]\)/.test(games), 'Meet and Memory instruction speech waits until protected prompt playback settles');
check(/clearTimeout\(inactivity\)/.test(pathScreen) && /flow\.prompt\(ctx\.area, \[Core\.url\.w\(lang, id\)\], \[c\]\)\.then\(fin\)/.test(pathScreen), 'Path Meet touch cancels inactivity completion and settles after prompt playback');
check(/setPromptTargets/.test(minigames) && /ctx\.setPromptTargets\(/.test(feed) && /ctx\.setPromptTargets\(/.test(dress), 'mini-game prompt choices are independent from correct-target hints');
check(/flow\.prompt\(box, \[url\], box\.querySelectorAll/.test(lesson), 'lesson speaker replay passes its tile NodeList through Flow.prompt');
check(/ctx\.prompt\(\[ctx\.wordUrl\('n' \+ target\)\]\)/.test(market), 'Market request playback uses prompt gate');
check(/ctx\.prompt\(\[u, 300, ctx\.askUrl\(item\)\]/.test(body), 'Body third-miss replay uses prompt gate');
check(/await wordPrompt/.test(games), 'Memory waits for the active target word before praise');
