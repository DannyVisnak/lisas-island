# Lisa's Island — backlog (source for the Linear project "Lisa's Island", team VIS)

Order = priority. Each ticket runs through `tools/tickets/lisa-ticket` (see tickets/PIPELINE.md):
plan (Codex GPT-6.1 Sol, high) → copy gate (Opus writes child-facing words only when the plan asks) →
build (Codex GPT-6 Luna, medium) → tests (smoke suites) → review (Codex Sol, read-only, diff + screenshots) →
In Review → controller merge + Surface deploy.
Child facts: age 6, Russian native, pre-reader, impatient tapper. Target langs PT-PT (main), EN, DE.

## LISA-01 Subtitles with gender colours on the Meet card
Under the picture on the Meet card, show the target word with its article, big child font. Colour by article:
DE der = blue, die = red, das = green (die plural stays red); PT o/os = blue, a/as = red; EN and words without
article (colours, numbers, phrases, actions) = dark neutral. Article and noun share the colour. RU gloss
(box 0 only) stays as today, smaller, grey, below. Subtitle appears with the first audio and stays.
Also show the coloured word small on memory-card fronts after a pair is matched.
Offline font for early readers: bundle Andika (SIL OFL, add licence file) or fall back to system sans; single-storey
"a" preferred. Parent switch "Subtitles" (default ON).
Accept: smoke_path Meet shots show coloured subtitles for de/pt/en; colour map lives in one place (core.js or data);
no change to audio; all 6 suites pass.

## LISA-02 Lisa finishes the word before taps count
In every game where Lisa says the target word/question (Meet, Memory, Listen&tap, Run door gates, mini-games,
seek-and-find, warm-up), answer taps are ignored while that prompt audio plays (and during the wrong-tap replay).
Visual: choices slightly dimmed + small ear icon pulse; they light up when audio ends (also on audio error/timeout
fallback ≤ 4 s so the game never locks). Idle chatter/personality lines do NOT lock input.
Accept: unit/smoke check that a tap during prompt audio is ignored and a tap after `ended` counts; all suites pass.

## LISA-03 Run game: space bar jumps
Space (and ArrowUp / W) = jump, same as the touch jump. No page scroll on space. Accept: smoke_run/smoke.js presses
Space and asserts a jump.

## LISA-04 Run game: restart at the last door after a fall
Falling respawns Lisa at the last door/gate she passed (checkpoint), not the level start. Collected stars stay.
Accept: smoke test falls after door 2 and asserts the respawn x ≈ door 2.

## LISA-05 Letters & typing game (design ticket, then build ticket LISA-18)
Slow alphabet track for a 6-year-old pre-reader, Latin script, in the active target language. Research-based order
(letter SOUNDS before names, start with first letters of words he already knows, few letters per day, multisensory:
see + hear + trace/tap, then find the letter on a big on-screen keyboard and on the real keyboard, then build 3-letter
words with the picture). Fits the linear path as an optional step once ≥ 20 words are known.
Plan must list: letter order per language, step types, which Lisa lines are needed (Opus writes them), audio keys.
Accept for the design ticket: tickets/LISA-05/DESIGN.md with research refs; build ticket gets its own acceptance.

## LISA-18 Letters & typing game — build (from LISA-05 design)
Build the letters track from tickets/LISA-05/DESIGN.md (letter queues per language §2, five step types §3, path slot §4,
audio contract §6). Russian Lisa lines are DONE (controller): merge tickets/LISA-05/COPY.tsv rows into content/ui.tsv
verbatim; copy gate = none for those keys. Target-language letter sounds/names = new audio keys under
app/audio/<lang>/letters/ (runner generates with gen_audio_gemini.py --keys; list them in AUDIO_KEYS). First slice:
PT-PT only, first 6 letters (p a m o l v), steps listen → see word + first letter → tap letter (2 choices) → trace or tap →
on-screen key → real key (e.code, any keyboard layout). Optional path step after >= 20 known PT words. No "wrong", no timers.
Accept: new smoke_letters.js (or a smoke_path case) walks one encounter at 1128 and 1920, real-key press via e.code works
with a Russian layout key value, all suites pass, shots show big letters >= 110 px tap targets.

## LISA-06 Money & shop game (research → copy → build)
Grocery shop: Lisa's basket, price tags with pictures (no reading needed: coin/note pictures + spoken price), pay by
dragging coins/notes; first whole euros (1 €, 2 €, 5 € note), later cents (10/20/50 c), later change.
Euro first and most of the time. Sometimes a trip to a shop in another country with its own money and ONE
culture fact told by Lisa (e.g. Japan: money goes on a small tray, no tips; UK pound; Swiss franc; US dollar).
Currency pictures: our own stylised drawings in the right colours/sizes (no photo reproduction of banknotes).
Step a DONE: tickets/LISA-06/RESEARCH.md (denominations, colours, sizes, ECB reproduction rules, 6 currencies, shop facts, levels 0-10).
Step b DONE: tickets/LISA-06/COPY.tsv (Opus; merge rows verbatim into content/ui.tsv; copy gate = none for those keys; read both from the main checkout /root/kids-lang-game/tickets/LISA-06/).
Step c (this build): mini-game `mg_shop`, launch scope = RESEARCH.md levels 0-7 (euro first); passport shops (other currencies + one fact each) after level 7. Target-language prices/currency names = new audio keys via --keys.
Accept: smoke_mg shop passes; euro coins/notes recognisable side by side in a shot.

## LISA-19 Test-harness flake hardening
Three timing assertions fail under load (load avg ~10) and pass alone: smoke_scene "house: no inertia after release"
(measures movement right after release), smoke_lesson "float: tile too small" (measured 117 = 0.78 x 150 during the
pop-in animation), smoke_path A3 (fixed 16.11 in 523d21f: settle on the screen, not the first record). Make each wait for
a settled state (animation end / bounded polling) instead of a fixed sleep; no weaker thresholds.
Accept: each of the three passes 3x in a row while another suite runs in parallel; all suites pass.

## LISA-07 Deploy Round 4 (house, lessons, linear path) to the Surface — controller
Back up the son's save first. Done in session 16.11 if the receipt says so.

## LISA-08 Age 6 defaults
Son is 6 (confirmed 16.11). Apply research defaults for 6: block A+B (not "small"), choices 2→3→4 ladder, session cap
15 min. Parent area shows age setting. Accept: fresh save uses age-6 profile.

## LISA-09 Clearer PT-PT voice
Parent feedback: Lisa's PT is hard to understand, especially "r". Test a slower/clearer PT-PT style prompt on 10 words
(gen_audio_gemini.py --keys only, new keys or a side folder), the parent compares by ear before any swap.

## LISA-10 Lessons respect the "Russian help" switch
## LISA-11 Cosmetic batch: double sun on house build screen; dress coat+dress overlap; fish last round has 1 fish;
market idle re-ask says only the number; seek-and-find right arrow overlaps art.
## LISA-12 main.js zoom-limit warning (setVisualZoomLevelLimits before frame → move to did-finish-load + catch)
## LISA-13 Countries pack (plane journey, foods, what's typical, where) from content/packs/countries_draft.md — Opus copy
## LISA-14 More lessons: "Репка", "Где больше?" (scripts in content/CUTSCENES.md) + audio --keys
## LISA-15 History-terms topic pack (research → Opus copy → build as lessons)
## LISA-16 Parent ear check: lisa_buy2, en/hurts_q, ru_lisa_poke1 + ASR-flagged list (parent-owned)
## LISA-17 Ticket pipeline itself (tools/tickets) — built by Codex Sol, see PIPELINE.md
