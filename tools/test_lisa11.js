'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const functionSource = (source, name) => {
  const match = source.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n    \\}'));
  assert.ok(match, 'production function ' + name + ' exists');
  return match[0];
};

test('house build backdrop contains no second sun', () => {
  const house = read('app/js/house.js');
  assert.match(house, /UI\.scene\(root, 'garden'\)/);
});

test('dress treats coat and dress as one torso slot', () => {
  const dress = read('app/js/mg_dress.js');
  const group = () => ({ children: [], set innerHTML(v) { if (v === '') this.children = []; }, appendChild(n) { this.children.push(n); } });
  const context = { WEAR: { coat: { parts: [[10, 20, 30]] }, dress: { parts: [[10, 20, 30]] }, socks: { parts: [[10, 20, 30]] } },
    layers: { coat: group(), dress: group(), socks: group() }, D: { items: { coat: { pic: { src: 'coat.svg' } }, dress: { pic: { src: 'dress.svg' } }, socks: { pic: { src: 'socks.svg' } } } },
    document: { createElementNS: () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, appendChild(n) { (this.children || (this.children = [])).push(n); } }) }, NS: 'svg' };
  const wear = vm.runInNewContext('(' + functionSource(dress, 'wear') + ')', context);
  wear('coat'); wear('socks'); wear('dress');
  assert.equal(context.layers.coat.children.length, 0);
  assert.equal(context.layers.dress.children.length, 1);
  assert.equal(context.layers.socks.children.length, 1);
  wear('coat');
  assert.equal(context.layers.dress.children.length, 0);
  assert.equal(context.layers.coat.children.length, 1);
});

test('fish calls the swimmer reset after a catch', () => {
  const fish = read('app/js/mg_fish.js');
  const f = { held: true, caught: true, jumping: true, t: 20, x: 90, y: 90, cx: 12, cy: 24, dir: -1,
    wrap: { style: { display: 'none', transform: 'scale(.5)' } }, inner: { classes: new Set(['fh-hooked']), style: { scale: '.5', rotate: '70deg' }, classList: { remove(c) { f.inner.classes.delete(c); } } } };
  const context = { place: (fish) => { fish.placed = true; } };
  const restore = vm.runInNewContext('(' + functionSource(fish, 'restoreSwimmer') + ')', context);
  restore(f);
  assert.deepEqual([f.held, f.caught, f.jumping, f.t, f.x, f.y, f.dir], [false, false, false, 0, 12, 24, 1]);
  assert.equal(f.wrap.style.display, ''); assert.equal(f.inner.classes.has('fh-hooked'), false); assert.equal(f.placed, true);
  assert.equal(f.wrap.style.transform, ''); assert.equal(f.inner.style.scale, '1 1'); assert.equal(f.inner.style.rotate, '0deg');
  const catchPath = fish.slice(fish.indexOf('f.caught = true;'), fish.indexOf('async function finale'));
  assert.match(catchPath, /restoreSwimmer\(f\)/, 'the catch path must invoke reset after collection');
});

test('market reminder sequences instruction and goal with stale-state guards', async () => {
  const market = read('app/js/mg_market.js');
  const sequences = [], cues = [];
  const state = { round: 2, target: 3, count: 0, solved: false, locked: false };
  const snd = { token: 0 };
  const context = { Core: { Snd: snd }, flow: { dead: false, say: (urls) => { sequences.push(urls); return Promise.resolve(true); } }, ctx: {
    finished: false, locked: false, target: 'n3', ruUrl: (key) => key === 'help' ? 'ru-help' : null,
    wordUrl: (key) => 'audio/' + (context.language || 'pt') + '/' + key + '.ogg', ru: (key) => { cues.push(key); return Promise.resolve(true); },
    wiggles: 0, glows: 0, wiggle() { this.wiggles++; }, glow() { this.glows++; }
  }, get round() { return state.round; }, get target() { return state.target; }, get count() { return state.count; },
    get solved() { return state.solved; }, alive: () => [{}], inputVersion: 0, playbackToken: 0 };
  const remind = vm.runInNewContext('(' + functionSource(market, 'remind') + ')', context);
  remind(false);
  assert.deepEqual(Array.from(sequences[0]), ['ru-help', 'audio/pt/n3.ogg']);
  context.ctx.ruUrl = () => null;
  remind(false);
  assert.deepEqual(Array.from(sequences[1]), ['audio/pt/n3.ogg']);
  context.ctx.ruUrl = () => 'ru-help';
  state.count = 1;
  remind(false);
  await Promise.resolve();
  assert.deepEqual(cues, ['more']);
  assert.deepEqual(Array.from(sequences[2]), ['ru-help', 'audio/pt/n3.ogg']);
  const glowBefore = context.ctx.glows;
  remind(true);
  await Promise.resolve();
  assert.equal(context.ctx.glows, glowBefore + 1, 'partial basket assist highlights an available fruit');
  context.ctx.ruUrl = () => null;
  const glowWithoutRu = context.ctx.glows;
  const noRussianBefore = sequences.length;
  remind(true);
  await Promise.resolve();
  assert.equal(context.ctx.glows, glowWithoutRu + 1, 'partial basket assist still highlights when Russian help is disabled');
  assert.deepEqual(Array.from(sequences[noRussianBefore]), ['audio/pt/n3.ogg'], 'Russian help disabled leaves the target number reminder');
  context.ctx.ruUrl = () => 'ru-help';
  context.ctx.ru = () => Promise.resolve(false);
  const missingCueBefore = sequences.length;
  remind(true);
  await Promise.resolve();
  assert.deepEqual(Array.from(sequences[missingCueBefore]), ['ru-help', 'audio/pt/n3.ogg'], 'unavailable more recording falls through to reminder');
  for (const lang of ['pt', 'en', 'de']) {
    context.language = lang;
    state.count = 0;
    const numberPath = path.join(__dirname, '..', 'app', 'audio', lang, 'n3.ogg');
    assert.equal(fs.existsSync(numberPath), true, lang + ' target number recording exists');
    remind(false);
    assert.deepEqual(Array.from(sequences.at(-1)), ['ru-help', 'audio/' + lang + '/n3.ogg']);
  }
  context.language = 'pt';
  let moreDone;
  context.ctx.ru = () => { const owner = ++snd.token; return new Promise((resolve) => { moreDone = () => resolve({ owner, canceled: snd.token !== owner }); }); };
  state.count = 1;
  const beforeDrop = sequences.length;
  remind(true);
  snd.token++; moreDone(); await Promise.resolve();
  assert.equal(sequences.length, beforeDrop, 'speaker interruption cannot restart reminder audio');
  const overlapDone = [];
  context.ctx.ru = () => { const owner = ++snd.token; return new Promise((resolve) => { overlapDone.push(() => resolve({ owner, canceled: snd.token !== owner })); }); };
  remind(true); remind(true); overlapDone[0](); await Promise.resolve();
  assert.equal(sequences.length, beforeDrop, 'older overlapping reminder cannot continue after a newer reminder takes playback');
  overlapDone[1](); await Promise.resolve();
  assert.equal(sequences.length, beforeDrop + 1, 'latest reminder continues after its own cue');
  const beforeCountInterrupt = sequences.length;
  let countDone;
  context.ctx.ru = () => { const owner = ++snd.token; return new Promise((resolve) => { countDone = () => resolve({ owner, canceled: snd.token !== owner }); }); };
  remind(true); snd.token++; countDone(); await Promise.resolve();
  assert.equal(sequences.length, beforeCountInterrupt, 'counting playback interruption owns the audio');
  let release;
  context.ctx.ru = () => new Promise((resolve) => { release = resolve; });
  const beforeStaleRound = sequences.length;
  remind(true); state.round++;
  release(); await Promise.resolve();
  assert.equal(sequences.length, beforeStaleRound, 'a reminder queued for an old round must not continue');
  state.round = 2; state.solved = true;
  remind(false);
  assert.equal(sequences.length, beforeStaleRound, 'solved baskets do not start reminders');
  assert.match(market, /ctx\.say\('n' \+ count\)/);
  assert.match(market, /inputVersion\+\+/);
  assert.match(market, /playbackToken/);
});

test('scene arrows are placed in the control band and excluded from world pointer handling', () => {
  const scene = read('app/js/scene.js');
  const css = read('app/css/scene.css');
  assert.match(scene, /bar\.appendChild\(arrL\);\s*bar\.appendChild\(arrR\)/);
  assert.match(scene, /if \(e\.target\.closest && e\.target\.closest\('\.sarrow'\)\) return/);
  assert.match(css, /\.scn \.topbar \.sarrow\.shown\s*\{[^}]*opacity:\s*1[^}]*pointer-events:\s*auto/);
});
