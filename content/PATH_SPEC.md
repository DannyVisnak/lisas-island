# Linear path ("one Play button") — build spec v1 (Opus 5.5, 16.11.26)

Source of every rule: research/LEARNING_SCIENCE.md §9 + "Design rules" checklist. This file is the contract for the path builder. Child-facing words in this file are Opus-authored; use them verbatim.

## 1. What the child sees
- Home = Lisa + ONE big Play button (plus the existing hat/wardrobe and Lisa's house buttons; these are micro-choices, never needed to progress). No map, no world picker, no level numbers.
- Play runs today's session as one chain of steps. Each step hands over to the next with a `next` line (shuffle bag) and a short whoosh; no "continue?" screens, no result screens between steps. One small celebration at each block end (`blockend` line, existing FX) and the ritual at the end.
- The old map / level / free-run navigation moves into the parent area (parent gate) as "Free play (parent)". Nothing is deleted.

## 2. Session template (one per calendar day)
| # | Step | Words | Implementation |
|---|---|---|---|
| 0 | Hello + warm-up | 2–3 due words (box ≥1, due today) | Lisa `hi` line → listen&tap, 2 choices, errorless. Skip if nothing is due. |
| A1 | Meet A | 4 new | existing meet card, 3 exposures per word: word alone → carrier phrase → word + action/gesture prompt. Target lit, others dimmed. Russian gloss only while the word is in box 0 (first ever exposure). |
| A2 | Memory | same 4 (4 pairs) | existing memory game |
| A3 | Mini-game X | 4 new + 2–4 due old | the registered mini-game whose `worlds` contains the current world; if none, listen&tap with 3 choices |
| C | Lesson + move | – | `Lesson.play(nextLessonId)` (built by the lesson builder) then movement break: `move` line, 35 s with Lisa doing the move (simple bounce animation), `moveend` line. If no lesson is available, movement break only. |
| B1 | Meet B | 4 new | as A1 |
| B2 | Listen & tap | B words + 1–2 A words | 2–3 choices (see §4) |
| B3 | Game Z | all 8 new + 4–6 due old | rotate: Run (picture gates) → seek-and-find scene (Scene, if the world has one) → another mini-game from an EARLIER world (review). Run/seek only use words already retrieved ≥2 times this session. |
| R | Ritual | – | `blockend` praise was already given; now house gift (Core.houseGift via the existing hook), Lisa yawns, `bye` line, sleepy-fox screen. |

Rules
- New words: 4 per block, 8 per session max. Parent setting "small" (age 3–4) = block A only.
- Review-only day: if > 12 words are due, skip both Meet blocks: `reviewday` line → listen&tap (due) → mini-game X of the due words' world → lesson + move → Run/seek with due words → ritual.
- Never start Block B before every A word has been retrieved at least once in a game.
- Choose new words in world order (current world first, its unseen items); when a world has no unseen words left, the next world starts. World order: animals, food, colors, numbers, body, family, clothes, toys, home, transport, nature, actions, phrases, school (adjust if a world id does not exist). Lesson end-card words (water, moon, n4) are queued first into the next Meet.
- Hard stop: 15 min of active play (parent setting 10/15/20). At the cap, finish the current step's last item, skip remaining steps except the ritual. Early end: 3 helped answers in a row twice in one session → go to ritual.
- After the ritual the Play button is replaced by sleeping Lisa until the next calendar day. Tapping her plays one `sleep` line. Parent can unlock another session in the parent area. No "one more", no streak.

## 3. Feedback per tap (all games in the path)
- Correct: echo the word audio (target language) + `da` line (shuffle bag), existing good FX. Every 3rd correct (counter per session, not per game) the `da` is replaced by a personality line from `yes`/`combo*` bags.
- Wrong: no failure sound, replay the target word within 1 s, highlight the right picture (existing errorless behaviour). Helped answers do not promote the word.
- Block end: one `blockend` line.

## 4. SRS changes (core.js)
- Leitner: one promotion per calendar day per word (keep). Lapse: box ≥3 → down one box; box 1–2 → box 1. (Currently resets to 1.)
- Due intervals: box1 +1 d, box2 +3 d, box3 +7 d, box4 +14 d, box5 +30 d.
- Choices count per word: 2 until the word has 3 first-try-correct answers on different days, then 3, then 4 after another 3. Never change inside a block after an error.

## 5. Stars (completion-based, fixed)
- +1 star per finished step (warm-up, Meet, Memory, X, lesson, Listen&tap, Z), +3 for the ritual. Never accuracy-based, never random. `Core.starsFor` accuracy logic is not used in the path (the parent free-play keeps it).
- Star counter on home = information only. Hat unlocks and house build stages keep their existing thresholds on lifetime stars.
- No line ever says "do X to get Y".

## 6. Save
`Core.L(lang).path = { day: 'YYYY-MM-DD', step: n, newA: [...], newB: [...], startedAt, playedMs, done: bool, lessonsSeen: {...} }`. Resume mid-session on the same day at the current step (the app may be closed). New day → new session.

## 7. New lines needed (Opus, verbatim; add to content/ui.tsv as lang=ru, generate audio with --keys only)
- lisa_sleep1 — "Тсс… Лиса спит. Завтра поиграем снова!"
- lisa_sleep2 — "Хр-р-р… Лиса видит сон про новые слова. Завтра продолжим!"
- lisa_sleep3 — "Лиса отдыхает в своём домике. До завтра!"
- lisa_play — "Поиграем вместе? Нажми, и пойдём!" (home idle prompt for the Play button)
All other path lines already exist in content/lisa_lines_v2.tsv (groups hi, next, blockend, move, moveend, reviewday, bye, da, yes, combo*). Integrate that whole file (176 lines) into ui.tsv + LISA_KEYS and retire lisa_yes2, lisa_yes7, lisa_level1, lisa_combo8, lisa_combo3 from LISA_KEYS (keep their audio files).

## 8. Tests
tools/smoke_path.js: fresh save → Play → walk the whole session with fast timing (all steps, a wrong tap in each game) → ritual → sleeping Lisa → reload page mid-session resumes the step → next-day (fake clock) starts a new session with a warm-up → review-only day with 13 due words. Plus all existing suites must still pass (smoke.js may need the parent free-play route instead of the map).
