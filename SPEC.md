# Lisa's Island ("Остров Лисы") — offline language game for a pre-literate child

Child: Russian-speaking, about 4–6 (the first player is 6), cannot read yet. Targets: European Portuguese (main),
English (British), German (optional, parent-enabled). Device: old touchscreen laptop, Fedora
Workstation, Firefox. Everything works with NO network. Research basis: `research/01_*.md`, `research/02_*.md`.

## Hard rules
- **No reading needed anywhere in the child UI.** Vocabulary subtitles are an optional aid and reuse existing words only; no text is required to play. Every instruction is
  voiced (Russian instruction voice), every item = picture + audio. Small decorative numerals are OK.
- Touch first: every child tap target ≥ 110 px at 1366×768 (≈2.5 cm), generous spacing. Use pointer
  events (`pointerdown`/`pointerup`), never hover, never drag-required, never double-tap. `touch-action: none`,
  `user-select: none`, block `contextmenu`, block pinch zoom and multi-finger gestures.
- No fail states: no lives, no death, no timers/countdowns, no red X, no buzzer. Wrong answer = gentle
  "boop", the wrong card wobbles and fades out, the question replays. After 2 wrong taps on one question the
  correct card glows and bounces (errorless). Never block progress.
- Fixed, predictable rewards only (no loot boxes, no random rarity, no mystery eggs). No streaks, no
  "you missed a day" messages, no guilt, the fox never gets sad or sick. No ads, no purchases, no network.
  Gamification (see "Rewards and gamification") is positive-only: XP amounts are fixed (never random), nothing
  is ever taken away, a miss resets the combo flame quietly (no sound of loss, no message), the 7-day strip only
  lights suns (an unlit day is just a dim outline, no counter of lost days), and nothing is ever rewarded for
  reading. Reward animations use only transforms and opacity, at most 80 live particles, no input blocking.
- Idle behaviour (quiet by design): every screen speaks its instruction ONCE on entry. Idle is a visual cue
  only (pulse the speaker / help button, nudge the next card, Lisa looks at the cards), repeated silently every
  ~8 s. At most ONE spoken repeat per idle period: after ~20 s without any tap on Meet / Memory (instruction
  once more); on answer screens (Listen & tap, Meet+tap, Run gates, review chest) the one repeat is the
  automatic help after ~25 s. After it there is silence until the child taps; any tap re-arms one more repeat.
  Home / map / world path / garden / stickers: no spoken idle repeat at all, only the visual pulse. Idle time
  is counted in virtual ticks (scaled by Core.speed). Every screen has a big speaker button that replays the
  current audio on demand.
- Help (answer screens): a big round yellow light-bulb button (icon only, `.b-help`; top bar next to the speaker,
  or right of the gate bar) on Listen & tap, Meet+tap, review chest, the Run picture gates and Memory. Tap:
  replay the word, then the Russian gloss if "Russian help" is on, the correct card glows (`.hint`) and Lisa
  points/wiggles. The same help fires automatically after ~25 s without a tap. A helped answer gets normal happy
  feedback (errorless) but does NOT touch the Leitner box (`SRS.touch` only makes sure the word is known) and does
  not count toward the adaptive choice-count increase or reset. Memory: help silently-ish flips one still-hidden
  matching pair for ~1.8 s (plays its word) and flips it back; no automatic memory help (quieter choice).
- One target language at a time; progress is stored separately per language.
- Classic `<script>` files only (no ES modules, no fetch, no build step) so the game also works from
  `file://`. Audio via `HTMLAudioElement` (pooled/cached); sound effects via WebAudio oscillators (no files).
  Storage: `localStorage` key `lisa-island-v1` (JSON), with try/catch fallback to memory.
- Lightweight: vanilla JS + CSS + one `<canvas>` for the platformer; cap canvas DPR at 1.5; 60 fps target on
  an old Intel iGPU; no frameworks. The optional vocabulary subtitles use the bundled offline Andika font; system fonts remain the fallback and parent-screen font.

## Content
- `content/vocab.tsv` (117 words, 13 worlds) and `content/ui.tsv` are the single source of truth; generate
  `app/js/data.js` from them (`window.GAME_DATA = {...}`). World order (= unlock order):
  animals, colors, food, phrases, numbers, body, family, toys, clothes, home, transport, nature, actions.
- Picture types in column 3: an emoji → bundled Noto Emoji SVG `app/img/<id>.svg`; `#rrggbb` → draw a big
  paint blob in that colour (white gets a grey outline); a number 1–10 → draw that many big dots
  in a dice-like/ten-frame layout (optionally a small numeral below).
- Distractors: never put two items with the same emoji, the same picture, or the same target-language word on
  one question (e.g. food `orange` vs colour `orange_c` in English/German, home `toilet` vs phrase `toiletp`).
- Audio per item and language: `audio/<lang>/<id>.ogg` (the word, e.g. "o gato") and `audio/<lang>/<id>_q.ogg`
  (the question, e.g. "Onde está o gato?"); Russian gloss `audio/ru/<id>.ogg`. UI lines `audio/ui/<lang>_<key>.ogg`.
  For phrases the question audio equals the phrase.

### Prompt playback input gate
Target-word and question playback that asks the child to answer uses the owning screen's `Flow.prompt(host, list, targets)` gate. It is acquired synchronously before audio starts, including scheduled initial prompts and replay/help chains. While held, answer handlers ignore input and the answer targets dim slightly; a small decorative ear marks playback. At 4 seconds, the watchdog releases immediately if owned playback is no longer active; while the same playback chain remains active, it rechecks every 350 ms. The per-clip safety timer settles that chain. An absolute 20-second cap releases input without stopping audio. Ordinary Lisa/personality chatter remains on `Snd.say` and does not gate answers. Reward and transition locks remain independent.

## Audio generation (`tools/gen_audio.py`)
Piper TTS, already installed: `tools/.venv` (`piper` package), models in `tools/voices/`:
pt = `pt_PT-tugão-medium`, en = `en_GB-jenny_dioco-medium`, de = `de_DE-thorsten-medium`, ru = `ru_RU-irina-medium`.
Load each voice once via the Python API. Speak slightly slower for a child (length_scale ≈ 1.15 for single
words, ≈ 1.08 for sentences). Post-process with ffmpeg: trim leading/trailing silence, 0.12 s padding,
loudness-normalise all clips to the same level, encode mono Ogg Opus ~32 kbit/s. Idempotent (skip existing
unless `--force`). Print a count summary; fail loudly on any empty clip.

## Images (`tools/fetch_images.py`)
Download Noto Emoji SVGs (Apache-2.0) from
`https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u<cp1>_<cp2>.svg` (lowercase hex,
drop `fe0f`; ZWJ sequences keep `200d`; if a file 404s, retry with/without fe0f). Flags from
`https://raw.githubusercontent.com/googlefonts/noto-emoji/main/third_party/region-flags/svg/{PT,GB,DE}.svg`.
Also fetch any UI emoji you use (⭐ star, 🎁/treasure chest, 🔊 is better drawn as an inline SVG icon, 🏠 home).
Do NOT git-clone the repo; individual file downloads only. Write `app/img/LICENSES.md` with attribution.
Report any word whose image failed. Runtime never touches the network.

## Mascot
An original character: **Lisa (Лиса), a round friendly orange fox**, drawn as inline SVG/canvas (no copied
characters, nothing resembling Mario or any existing game's art). She appears on every screen, reacts
(bounce on correct, head-tilt on wrong, cheering on level end), and wears unlocked hats/accessories.
She is an **adventure-show guide with a personality**: a cheerful, slightly cheeky Russian-speaking guide with a
bank of short voice lines (`lisa_*`, see "Lisa's voice lines"). Poses: idle, cheer, tilt, wave, jump, flip,
giggle, dance, high-five. On the home screen and map Lisa is **tappable** (poke): she giggles or jumps every tap,
the voice line plays at most once per 4 s cooldown (and never over another running voice).

## Screens and flow
1. **Home**: big Lisa, three big flag buttons (🇵🇹 largest/first, 🇬🇧, 🇩🇪 hidden unless enabled in the parent
   area), each with a small progress ring (share of stickers collected). First launch voices `welcome`, then
   `choose_lang`; the first home entry of each session greets with a random `lisa_hi*` line (instead of
   `welcome` after the first launch). A **daily-goal pill** (ring + 7 suns) sits at the top of the home screen. Tapping a flag voices `lang_xx` and opens that language's map. Sticker-book button
   (album icon). Parent gear: small, top corner, opens only after a **3-second press-and-hold** with a fill
   ring (parental gate).
2. **World map** (per language): a winding path across an island with 13 world nodes, each shown by the world's
   first picture. Locked worlds greyed with a padlock; current world glows. Tapping a world voices its Russian
   name then the target-language name (`w_<world>`) and opens the world's level path. A **treasure chest**
   appears on the map when ≥4 words are due for review (spaced repetition); tapping it plays the chest-opening
   animation (shake, lid flies up, glow, stars) with `review` + `lisa_chest`, then starts the review round.
   Finished worlds carry a **crown** (world finished) or a gold **crown with sparks** (all levels 3 stars); open
   level nodes on the world path show the stars they earned. The daily-goal ring sits at the top of the map.
3. **World level path** — 5 levels per world, unlocked in order, replayable:
   - L1 **Meet** (first half of the world's words, max 6): big picture cards; tap one → it zooms, plays the
     word; Russian gloss after the target word only if the parent setting "Russian help" is on (default ON).
     Each card shows a small checkmark once heard twice. When all are heard → 3 quick 2-choice checks → done.
   - L2 **Listen & tap** on those words: 8 questions. Question audio plays (`<id>_q`), cards appear. Choices
     start at 2; becomes 3 when the child's recent accuracy ≥ 80%, 4 from world 4 onward if accuracy stays high;
     drops back to 2 after two wrong questions in a row. Correct: card jumps, Lisa cheers, word audio plays
     again, then Lisa's Russian line (`lisa_yes*`, random, never the same twice in a row; falls back to the
     target-language praise `praise1-3` when the line is missing or Russian help is off), chime. Full reward
     choreography: "Rewards and gamification".
   - L3 **Meet + tap** for the second half of the words (Meet then 6 questions mixing old and new words).
   - L4 **Memory**: face-down cards; flipping a card plays its word; find pairs of the same picture. Worlds
     1–3: 3 pairs; later 4 pairs; up to 6 pairs on a wide screen. No move limit.
   - L5 **Run!** the platformer (below) using all the world's words plus up to 2 due review words from earlier
     worlds. Finishing L5 awards the world sticker page, unlocks the next world (`world_open`).
   - Each level is 2–4 minutes. End of level: Lisa dances, confetti rain, stars pop in one by one with a rising
     arpeggio (1–3 stars: 3 = few mistakes; always at least 1), the XP tally counts up, stars fly into the jar,
     `level_done` + `lisa_level*`, then a big **high-five hand** (tap = clap + star burst; if nobody taps it
     auto-continues after ~5 s) and auto-return to the level path (no autoplay into the next level — a natural
     stopping point).
4. **Platformer "Run!"** (canvas): side view, Lisa **auto-runs** right at a calm speed; **tap anywhere** to jump
   (one button, generous coyote time, jump buffering). Terrain: grass ground, low blocks, small gaps, floating
   picture-bubbles / fruit to collect (sparkle sound). **No death**: falling into a gap makes a spring bounce
   Lisa back up onto the last ledge. A level has 5–6 **gates** (big wooden doors with a lock). At a gate Lisa
   stops, `gate` voiced on the first gate only, then 3 big picture buttons slide up over the scene and the
   question plays. Correct → the lock pops, door swings open, Lisa continues. Wrong → errorless rules above.
   End: a flag + the fox's house; celebration. Length ≈ 2–3 min. Theme/colours vary per world (meadow, farm,
   beach with sea, night with moon for nature, town for transport…). Parallax background (2 layers max).
   Also add a **free-run** entry on the map (a running-fox button) that replays any finished world's run.
5. **Review round** (chest): 8 questions from due words across worlds, 3 choices, then the chest opens and gives
   a fixed reward (5 stars into the jar).
6. **Sticker book**: one page per world; each word is a sticker slot (silhouette until learned). A word's sticker
   is earned when it reaches Leitner box 3 (correct on different days, see SRS). Tapping a sticker plays the
   word. Earning a sticker shows a big sticker animation + `new_sticker`. Completion feeling: "3 of 12" shown as
   filled dots, not text.
7. **Fox wardrobe**: star jar thresholds unlock Lisa accessories in a fixed order (e.g. 10★ cap, 25★ sunglasses,
   45★ scarf, 70★ cape, 100★ crown, 140★ guitar, 190★ astronaut helmet…). Unlock → `new_hat`. The child can tap
   accessories to put them on (wardrobe screen from home).
8. **Session end**: parent-set session length (default 15 min, options 10/15/20/30/off). When reached, the
   current level finishes normally, then a "rest" scene: moon, Lisa yawns and sleeps, `rest` voiced. The child can
   still go back to the home screen (soft limit) unless the parent chose "hard stop", which shows the
   sleeping scene until the next calendar day or a parent-gate unlock.
9. **Parent area** (English text, normal UI is fine here): daily goal in XP (15/30/45/60/90, default 30), enable German, choose which languages show; "Russian
   help" on/off (instruction voice + gloss); session length + soft/hard; progress per language (words heard,
   words learned/stickers, last played, list of words with Leitner box); reset a language's progress (confirm by
   hold); volume; fullscreen toggle; a short "how to play together" tip (co-play matters: ask him to point and
   say the word, repeat words in daily life).

## Rewards and gamification (Duolingo-style, errorless)
All of it lives in `app/js/fx.js` (layer `#fx`, pointer-events none) plus XP/goal/crown logic in `core.js`.
Nothing here needs reading; numbers are decorative. Fixed amounts, never random. Missing `lisa_*` audio or a
failed WebAudio never blocks anything (lines are skipped, chains continue after ~350 ms).
- **XP** (fixed): first-try correct +5, helped/second-try correct +2, level complete +10 (run levels and the
  review round count too). Stored in `lisa-island-v1` (`xp` total, `daily {day,xp}`).
- **Correct answer**: the card pops (scale, green ring), a star/confetti burst (≤ 80 particles in total), WebAudio
  ding whose pitch climbs with the combo (pentatonic, capped), a "+5" XP chip flies to the XP counter in the top
  bar, Lisa jumps or spins; word audio first, then a random non-repeating `lisa_yes*` line.
- **Combo**: a flame meter in the top bar counts consecutive first-try correct answers. Milestones at 3 / 5 / 8:
  a ~1.5 s fireworks overlay, a big combo badge, Lisa flips, fanfare arpeggio, `lisa_combo3/5/8`. A miss resets
  the combo quietly (soft boop only); `lisa_oops` plays at most every other miss. Memory: a match counts as a
  correct answer, a mismatch does NOT reset the combo (nothing is "wrong" in memory).
- **Progress bar** on every question screen: green fill with a shine sweep on every correct answer.
- **Level complete**: see Screens 3. XP tally pill counts up with tick sounds, ends with a pulse.
- **Daily goal** (default 30 XP, parent-adjustable): a ring on home (pill) and map. Reaching it shows a trophy
  celebration (trophy, fireworks, confetti, `lisa_goal`) once per day. A 7-day strip of **suns** shows the days
  the goal was met; unmet days are a faint outline only (no streak counter, nothing is lost).
- **Crowns**: crown on a finished world (map node and path medal); gold crown with sparks when all 3 stars.
  A new crown pops in with `FX.popCrown` after the level result.
- **Chest opening**: shake, lid flies up, glow, star burst, `lisa_chest`.
- **Sounds** come from the existing WebAudio synth (`Snd.sfx`: ding, arp, rise, clap, tick, sparkle, pop, whoosh),
  respect the volume setting.
- **Persistence and migration**: `xp`, `daily`, `goalDays`, `crowns`, `settings.dailyGoal` are sanitised on load;
  old saves without them load with zeros and the default goal (30).

### Lisa's voice lines
Russian, generated by `tools/gen_audio.py` into `app/audio/ru/lisa_*` (all keys in `Core.LISA_KEYS`): `lisa_hi1-4`
(first home entry), `lisa_ask1-3` (once per level start, after the instruction), `lisa_yes1-8` (correct),
`lisa_combo3/5/8`, `lisa_oops1-3` (miss), `lisa_help1-2`, `lisa_door1-2` (gate opened), `lisa_level1-3`,
`lisa_chest`, `lisa_goal`, `lisa_poke1-3` (tap on Lisa), `lisa_bye1` (rest scene). Each group uses a shuffle bag
(no immediate repeat). If a file is missing the line is skipped (`Core.lisaProbe` marks known-bad files at boot).

### Seek-and-find scenes (zoo / house / picnic)
`app/js/scene.js` (engine, `UI.screens.scene`), `scenes_art.js` (SVG backgrounds + item placements in units, 1 unit = 0.1 rem, world 2400 x 768), `css/scene.css`. Entry: pink binoculars node (`.scenenode`, not `.lvnode`) on the path of animals / home / toys / food, open once that world's level 1 is done. Round = 6 items by SRS priority (due, new, rest); a wrong tap only wiggles + names the item (no `FX.miss`, no star loss); idle 8 s = voice + wiggle, 15 s = glow + auto-pan (answer then counts as helped = `SRS.touch`). Stars live in `Core.L(lang).scenes[id]`; path levels are never touched. Test: `tools/smoke_scene.js` (smoke.js wipes `tools/shots/`, so run it second). Voice lines: ui keys `scene_*` (generate with `gen_audio_gemini.py --keys scene_a,scene_b`, never a full run).

## Spaced repetition (per language, per word)
Leitner boxes 0–5. Box 0 = not introduced. Introduced in Meet → box 1. Correct on the first try in a question
→ promote one box, but at most one promotion per word per calendar day (so box 3 means correct on ≥2
different days). Wrong first try → back to box 1. Due intervals: box1 = due next session/day, box2 = 1 day,
box3 = 3 days, box4 = 7 days, box5 = 14 days. Review round and run levels draw due words first.

## Parent-facing files
- `start-game.sh`: launches Firefox in kiosk mode with a dedicated profile (`~/.local/share/lisa-island/ffprofile`,
  `--no-remote`) on `file://…/app/index.html`; env `MOZ_USE_XINPUT2=1` for touch on X11 (harmless on Wayland).
- `install.sh` (run once, no sudo): copies the game to `~/.local/share/lisa-island/`, creates the Firefox profile
  with a `user.js` (disable pinch zoom `apz.allow_zooming=false`, swipe navigation off
  `browser.gesture.swipe.left/right=""` and `widget.disable-swipe-tracker=true`, no first-run pages,
  `browser.sessionstore.resume_from_crash=false`, autoplay allowed `media.autoplay.default=0`,
  `media.autoplay.blocking_policy=0`, no updates prompts, `toolkit.legacyUserProfileCustomizations.stylesheets`
  not needed), writes a GNOME `.desktop` launcher with a fox icon (PNG/SVG) into `~/.local/share/applications/`
  and on the Desktop if it exists. Exit kiosk = Alt+F4 (also a "Quit" button in the parent area that calls
  `window.close()` — works because kiosk profile; document the fallback).
- `README.md` (English, short, for parents): install steps, how to play together, how to exit, how to back up
  progress (profile folder), how to add words (edit TSV → run the two tools), licences.

## Mini-games (shared base: `app/js/minigames.js`, `app/css/minigames.css`)
Seven mini-games, ONE file each: `app/js/mg_<id>.js` (+ optional `app/css/mg_<id>.css`, every selector prefixed `.mg-<id>`). A game never edits
ui.js / index.html / data.js / games.js / core.js; it registers itself and uses the ctx the base hands it. The 14 files are already wired into index.html
(stubs until built). Games: `feed` (food), `dress` (clothes), `paint` + `fish` (colors), `body` (body), `bus` (transport), `market` (numbers).
Entry + unlock: every world with games shows extra round nodes top-right of its path (slots x 90 / 77 / 64 %, y 21 %; the scene binoculars come first),
open once **level 1 of that world is done** (same rule as scenes), locked = grey + lock + shake. Stars: `Core.L(lang).minigames[id] = {stars, plays}`
(3 stars for 0-2 helped answers, 2 for 3-5, else 1); path levels and world unlocks are never touched. Result screen: `kind:'minigame'`, returns to the path.
Errorless: no FX.miss, no star loss, a wrong answer = wiggle + its own name. No new target-language audio: only per-item `<id>.ogg` and `<id>_q.ogg`.
RU lines: `mg_<id>_intro|help|done` (+ `mg_feed_other`, `mg_body_tickle`, `mg_market_more`) in content/ui.tsv, clips `app/audio/ui/ru_mg_*.ogg`; new wording only via
`python3 tools/gen_audio_gemini.py --keys k1,k2` (never a full regen), then `python3 tools/build_data.py`.

```js
MG.register({ id, worlds: ['food'], icon: '<svg viewBox="0 0 100 100">white shapes</svg>', title, color: '#hex' /*node*/, scene: 'meadow'|'sea'|'garden'|'paper'|'night'|false,
              start: function (root, ctx) {} })        // root = <section class="screen mg mg-<id>">; start may be async (rejections are logged)
MG.drag(node, { targets: [el]|fn, pad: 0, point: 'center'|'pointer', lift: 1.12, minMove: 9,
                onStart(info), onMove(info), onDrop(targetEl|null, info) -> false|'back'|Promise, onTap(info) }) -> { disable(bool), reset(), destroy() }
// drop on a target: node STAYS unless onDrop returns false/'back'; drop on nothing: onDrop(null) then snap back; <9 px = tap. Moves via CSS `translate`/`scale` (not `transform`).
// info = {node, x, y, dx, dy, target} in client px. Works with touch + mouse (pointer events).
MG.stub(root, ctx)            // placeholder screen used by the stubs: delete this call in the real game
```
ctx (all audio goes through `ctx.flow`, so it dies with the screen; `ctx.lang`, `ctx.world`, `ctx.id`, `ctx.root`, `ctx.flow`, `ctx.def`, `ctx.stats`, `ctx.done`, `ctx.total`):
```
ctx.chrome({total, lisa:'corner'|false, speaker:true, help:true}) -> {bar, dots, speaker, helpBtn, lisa}   back, FX.hud progress, speaker replay, help bulb (mg_<id>_help), corner Lisa
ctx.placeLisa({left, top, width, cls, pose, replace:true}) -> lisa     units: 1 unit = 0.1 rem, frame 1366x768 (left/top/width in units); replaces the corner Lisa
ctx.progress(n)               set the progress dots to n (ctx.correct advances them by 1 unless {count:false})
ctx.pickTargets(worldIds, n, {pool, exclude}) -> [itemIds]     SRS due -> new -> rest, shuffled, only items that have the current language
ctx.setTarget(itemId|null, node?)   the current question: resets help state, starts idle help; null = nothing asked (idle off)
ctx.ask(itemId) / ctx.say(itemId)   play <id>_q.ogg ("where is...") / <id>.ogg (the word) in ctx.lang; return a promise (resolves when played)
ctx.ru('help'|'other'|'mg_feed_done'|any ui key) -> promise   RU line; a short key means mg_<id>_<key>; no-op when the parent switched RU help off
ctx.ruUrl(key), ctx.askUrl(id), ctx.wordUrl(id)   url builders for your own Snd.say lists (ruUrl is null when RU help is off)
ctx.correct(node, itemId, {helped, say:true, count:true, praise:true}) -> promise(fx)   FX.correct + SRS (helped -> SRS.touch, else SRS.answer first-try) + dot + [word, praise]; resolves after the hold
ctx.other(node, itemId, {ru:'other', after:2, replay:true, cls}) -> promise   errorless: wiggle + the item's own name, never FX.miss; the optional ru line plays ONCE after `after` such answers, then the question again
ctx.run({targets, intro:true, ask:true, play: async (itemId, i) => {} })   standard loop: intro -> per target setTarget + ask + await play (resolve on the correct answer) -> finish()
ctx.intro()                   350 ms then mg_<id>_intro
ctx.finish({helps?, stars?})  mg_<id>_done + Lisa line, stars stored in minigames[id], XP, result screen (never returns)
idle help: with a target set, 8 s silence -> ctx.onPeek(fn(itemId,node)) (default: wiggle `.mgpeek` + replay question), 15 s -> ctx.onAssist(fn) (default: glow `.mgglow`), the answer then counts as helped.
  Help bulb: 1st press = mg_<id>_help + the question (+ ctx.onHelp(fn(n)) hook), 2nd press on the same target = assist. ctx.assist(), ctx.markHelped(), ctx.helped(), ctx.lock(bool), ctx.freeze(bool)
ctx.wiggle(node, 'mgwig'|'mgpeek'), ctx.glow(node), ctx.clearGlow(), ctx.quiet(maxMs)   cosmetic helpers (CSS in minigames.css)
ctx.expose({fn..}); ctx.expose({state: fn -> obj})   test hooks on window.__mgTest (base state: id, idx, total, done, target, locked, finished, helps, others, correct, helped, glow)
```
Tests (Node Playwright, Firefox, with Node Playwright installed (set `PLAYWRIGHT_PATH` to the playwright module if it is not resolvable from `tools/`)): `tools/smoke_mg.js [id..]` is generic
(registered games, locked/open node, no overlap with level nodes at 1366x768 and 1128x752, mount + back, stub finish -> result -> path, shared API incl. MG.drag in
`tools/smoke_mg_api.js`). A builder adds `tools/smoke_mg_<id>.js` = `module.exports = async function (lib) {..}` (helpers in `tools/mg_lib.js`: openGame, tapSel, dragMouse,
gameState, shot -> `tools/shots/mg_*.png`, expect/fail); smoke_mg.js runs it automatically, and it also runs alone (`if (require.main === module)` boot block, see smoke_mg_api.js).
`tools/smoke.js` wipes tools/shots: run it first, then smoke_scene.js, then smoke_mg.js.

## Lisa's house (`app/js/house.js`, `app/css/house.css`)
Lisa's house grows with the child's lifetime stars and is furnished with gifts. **No spending, no purse, no price tags, no unaffordable state**
(research/LEARNING_SCIENCE.md section 6: star-priced shops are the documented overjustification risk). `Core.save.stars` is untouched: it only ever grows and alone drives the hats.
- **Data** `Core.save.house = { stage 0-5, gifts 0-3, owned[], placed{id: slot}, reviewDay }` (`defaults()` + `sanitize()` in core.js; the first purse draft `{spent, built}` migrates to `stage`, `spent` is dropped).
  API in core.js: `Core.houseGift(src)`, `Core.housePlace(id, slot)`, `Core.houseStage(n)`; at most 3 gifts wait; with every catalog item owned (`House.exhausted()`) gifts stay 0, no error.
- **Milestones** one constants table, `STAGE_AT` at the top of house.js: `[3, 8, 16, 28, 42]` lifetime stars for plot / foundation / walls / roof / door + windows (stage 1 on day 1). When the house is opened and a stage is due
  it is built in front of the child (pop + sparkle + a `build` line, the last one `builddone`, then the door opens into the room). Never "X more stars needed": the tray shows pictures only.
- **Gifts** `Core.houseGift()` is one silent line at each activity completion (no banner there): first completion of a level (`Core.completeLevel`, covers free-run too), first finish of a mini-game, first finish of a scene, review chest once a day (`reviewDay`).
  The map house button (`House.mapBtn()`, one line in `UI.screens.map`) shows a small sparkle when a gift or a stage waits, never a number.
- **In the house** (room mode) a gift box waits in the tray under the room and the `gift` line plays; tap -> two not-yet-owned cards (words the child has met come first) -> tap or drag one: it flies into its fixed slot (bounce + sparkle), its target-language word plays, then a `buy` line;
  repeat while gifts > 0. Tapping a placed item replays its word (a free review; only `heard` is incremented, SRS boxes are never touched). Tapping Lisa: she giggles, or sleeps on the bed if owned. No spoken idle repeat on this screen, only a visual nudge.
- **Catalog** `CATALOG` table in house.js (17 vocabulary words with their slot x/y/size in room units, 1 unit = 0.1 rem); art for the exterior and the room is inline SVG there.
- **Voice** ui keys `house_intro`, `house_help`, groups `lisa_househi1-4`, `lisa_build1-4`, `lisa_builddone1`, `lisa_gift1-4`, `lisa_buy1-6` (in `LISA_KEYS`; `lisa_more1-3` are generated but unused). Text source: `content/lisa_house_lines.tsv`.
- **Test** `tools/smoke_house.js` (1128x752 and 1920x1080, shots `tools/shots/house_*.png`); the scene and review gift assertions sit in `smoke_scene.js` and `smoke.js`. Chain: smoke.js, smoke_scene.js, smoke_mg.js, smoke_house.js. Hooks: `window.__houseTest.state()`.

## Lessons (`app/js/lesson.js`, `lessons_data.js`, `lessons_art.js`, `app/css/lesson.css`)
Lisa's little lessons (content/CUTSCENES.md v1): 60-90 s illustrated cutscenes narrated in Russian, 3 prototypes: `float` (word `water`), `daynight` (`moon`), `stones` (`n4`).
No UI entry; the linear path builder calls the engine.
- API: `Lesson.list()` -> `[{id, word, scene, beats}]`; `Lesson.word(id)` -> vocab id of the end word card; `Lesson.seen(lang, id)` -> times finished;
  `Lesson.play(id, root, onDone, opts)` -> handle `{stop(), replay(), state(), flow, S}` (`opts.lang`, `opts.flow`); `onDone(true)` after the word card, `onDone(false)` when stopped early or the id is unknown.
  Screen wrapper: `UI.screens.lesson(flow, root, {id, lang?, done?, back?})` (back + speaker button, no skip; `done()` else `UI.go('home')`).
- Data (`window.LESSON_DATA = {order, lessons}`): lesson = `{scene, word, edge, beats[]}`; beat = `{line: ui key, anim: name|[names] (starts with the voice), cues: [{word, anim}] (fired at the word's position in the voice), pose, poseMs, pause, prompt}`;
  prompt = `{q?: ui key of the question half (the idle repeat plays only this), choices: [{id, tile}] x 2}`. Any tap is accepted; the picked tile is highlighted, `cs_check` ("Давай проверим!") plays, then the demo beat. Idle 8 s: pulse + the question once more; idle 15 s: auto-continue (pick recorded as `auto`).
  Text: ui keys `cs_<lesson>_<n>` (+ `cs_check`), source content/lessons_ui.tsv (already appended to ui.tsv); audio `app/audio/ui/ru_cs_*.ogg` (Lisa voice, `gen_audio_gemini.py` styles `cs_` like `lisa_`). Lessons ignore the parent's "Russian help" switch.
- Art (`window.LessonArt`): `scenes[name](S)` -> `{act: {anim name: fn -> promise}, tile(spec, size), promptBox}`; `LessonArt.stage` gives layers, WAAPI helpers (transform/opacity only), Lisa, splash, and `S.edge/edgeTo` (letterbox band colours).
- Save: `Core.L(lang).lessons[id] = {seen, last}` (guarded, optional). Never calls the house gift hook; the path builder decides that.
- Tests: `window.__lessonTest` (`state()`, `tapChoice(i)`), `tools/smoke_lesson.js` (`--dev` + `tools/lesson_dev_gen.py` for the pre-wiring harness), shots `tools/shots/lesson_<id>_<beat>_<width>.png`.

## Linear path (`app/js/path.js`, `app/css/path.css`; contract `content/PATH_SPEC.md`)
Home = Lisa + ONE big Play button (`.path-play`) + house / garden / album / hat buttons + language flags (only if >1 language is on). No map, world picker or level numbers on home.
- **Session** (one per calendar day, `Core.L(lang).path = {day, step, plan[], newA, newB, startedAt, playedMs, done, lessonsSeen, queue, rot, ret{}, cc{}, paid{}, hs, strikes, early, cor, warm[], rv[], review, ritual}`): `warm, A1 (pmeet), A2 (memory), A3 (mini-game X of the current world, else plisten with 3 choices), L (lesson), MV (35 s bounce), B1, B2 (plisten), B3 (Run / seek scene / earlier-world mini-game, rotating on `rot`), R (ritual)`. `warm` and `L` skip themselves when nothing is due / no lesson is left; the plan is built in `Path.newSession`.
- **Reused games**: every path screen carries `p.path = true` + `p.words`; `memory`, `minigame`, `scene`, `run`, `lesson` call `Path.finishStep(flow)` instead of showing level/result screens. `Path.active()` is `!!UI.p.path` (no global flag). Hooks: `SRS.answer/touch` -> `Path.note` (retrieval count `ret[id]`, helped-run counter), `FX.voiceFor` -> `Path.voice` (`da`; every 3rd correct a `yes`/`combo*`), `Q.ask` (inPath: no boop, hint at once, word replay within ~1 s, `afterhelp` voice), `UI.runQuestions` (`Path.shouldStop`, `choiceFor`).
- **Words**: 4 new per block (queue = lesson end words first, then the current world's unseen items, next world when empty), world order in `Path.worldOrder`. Block B only after every A word was retrieved once (a catch-up listen&tap otherwise). Run/seek only use words with `ret >= 2` today (B2 asks each B word twice). Review-only day when more than 12 words are due: `rv1 (reviewday listen&tap), rv2 (mini-game of the due words' top world), L, MV, rv3 (Run/seek), R`; no Meet.
- **SRS** (core.js): intervals 1/3/7/14/30 days; lapse: box>=3 -> one down, box 1-2 -> box 1; one promotion per calendar day; choice count 2 until 3 first-try-correct answers on different days (`w.fc`, seeded from the box for old saves), then 3, then 4 after 3 more; snapshotted per session (`S.cc`) so it never changes inside a block.
- **Stars**: +1 per finished step (warm, Meet, Memory, X, lesson, listen&tap, Z; `paid[step]` guards a repeat), +3 for the ritual, nothing for the movement break. Lifetime stars drive hats + house stages as before. No line says "do X to get Y".
- **Stop rules**: hard cap = `settings.sessionMin` 10/15/20 of ACTIVE play (`playedMs`, 1 s ticker, touch within 90 s, tab visible): the running game ends after its current question and the rest is skipped except the ritual. Early end: 3 helped answers in a row twice (`strikes`). `settings.pathSmall` = block A only.
- **Ritual** (`pritual`): record closed first (`done`+`ritual`, so a reload never repeats it), +3 stars, `Core.houseGift('path')` (the house still caps waiting gifts at 3; the path grants nothing else), pending goal/hats/stickers pop, yawn + `bye`, sleepy Lisa, home. **Sleeping home**: while any language finished a session today, home shows sleeping Lisa without Play; a tap plays one `sleep` line. Parent area > Daily path: session length, small setting, "Unlock another session today" (`Path.unlockExtra`), "Free play (parent)" (the old map/levels/free run with their old star logic, untouched).
- **Resume**: reload mid-session -> Play resumes at `S.step` (the step restarts from its beginning); a new calendar day (or `Core.dayShift`) plans a new session. Existing saves are untouched (all new fields optional, boxes kept).
- **Tests**: `tools/smoke_path.js` (see its header); test hooks `Path.test.*`, `__test.go`, `__test.dayShift`.

## Self-test (required before you report done)
Use Node Playwright (`PLAYWRIGHT_PATH` / `PLAYWRIGHT_BROWSERS_PATH` if needed),
**Firefox** engine, viewport 1366×768, `hasTouch: true`. Script `tools/smoke.js`: open `file://` index, no
console errors, tap through: home → pt flag → map → world 1 → L1 (tap all cards) → L2 (answer correctly by
reading the data attribute of the correct card) → L4 memory → L5 run (simulate taps, answer gates) → sticker
book → parent gate hold → parent area. Screenshot each screen to `tools/shots/`. Also verify every audio file
referenced in data.js exists and every image exists.

Reward-layer assertions (in `smoke.js`, section `rewards()`): crown on a finished world node; daily-goal ring on
map and pill with 7 suns on home (no overlaps); Lisa poke (pose + 4 s cooldown); correct answer spawns particles,
+5 XP, combo 1/2/3 and the combo-3 celebration, live particle cap ≤ 80; a miss resets the combo and plays only the
soft boop; result screen shows lit stars, a full XP tally and the high-five (tap works); parent daily goal set to
45 persists across reload; an old save without the new fields migrates; with all `lisa_*` audio missing a chain
still finishes within 4 s and answer → next question stays under 9 s. Mid-animation real-time screenshots
(`tools/shots/fx-*.png`) are taken at 1366×768 and 1920×1080.
