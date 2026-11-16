# Lisa's Island (Остров Лисы)

A free, fully offline language game for small children who cannot read yet.
A friendly fox called Lisa speaks to the child in Russian and teaches the first words of
**European Portuguese**, **English** and **German** through pictures, sounds and play.
There are no menus to read, no ads, no accounts and no internet.

## Why this exists

My son is 6. He speaks Russian, and we are moving to Portugal soon. We wanted him to learn the
languages we speak ourselves, so he arrives with a few words of his own and keeps the ones we use at home.
Every app we tried either wanted him to read, sold him things or ran on a phone.
So we built our own game for an old laptop with a touch screen.

The first evening he played it, he did not want to stop. He loves Lisa's voice, her jokes and how she
cheers for him. That is the part we care most about. He should feel that he is doing great, because he is.

## What the child does

- **One Play button.** Every day Lisa runs one short session, and the child never has to choose:
  meet 4 new words → memory game → a mini-game with the same words → a tiny lesson from Lisa
  (maths, the sky, stories) and a movement break → 4 more words → listen and tap → a game with all of
  today's words → a gift for Lisa's house. Then Lisa goes to sleep until tomorrow.
- **Games instead of flash cards:** memory, a jump-and-run where the doors open with the right picture,
  "where is the horse?" hidden-picture scenes (zoo, house, picnic) and seven small games
  (feed Lisa, dress Lisa, paint, body parts, bus ride, fishing, market).
- **Lisa's house.** Stars build her house step by step, and finished games bring furniture as gifts.
- **Errorless.** A wrong tap is never punished. Lisa repeats the word and shows the right picture.

## How the learning works (the short version)

The design follows research on early second-language learning and on motivation in children. The notes and
43 references are in [`research/LEARNING_SCIENCE.md`](research/LEARNING_SCIENCE.md). In short:

- few new words at once (4 per block, at most 8 a day), each heard several times, alone and in a phrase;
- spaced repetition: a Leitner box with 1/3/7/14/30-day steps, plus a gentle review day when many words are due;
- the child has to recall the word in a game before new words come, not just watch;
- stars for finishing, never for speed or accuracy. Praise names what the child did,
  never "you are so smart";
- short sessions (15 minutes by default) with a movement break. No streaks, no "one more", no shop pressure.

## Run it

Any recent browser works: open `app/index.html` (works from `file://`, no server). It is made for touch screens,
and a mouse works too.

On Linux (tested on Fedora), as a desktop app with no browser UI:

```
cd desktop && ./build.sh      # packages app/ with Electron -> desktop/dist/lisa-island-linux-x64.tar.gz
cd .. && ./install.sh         # installs to ~/.local/share/lisa-island and adds a launcher
```

Without the Electron build, `install.sh` falls back to a Firefox kiosk window. Exit with Alt+F4.
The grown-up area sits behind a hold-to-open gate. It has languages (German is optional), session length,
volume, progress per language and free play. More setup notes: [`docs/SETUP_NOTES.md`](docs/SETUP_NOTES.md).

## Change or add words

1. Edit `content/vocab.tsv` (`world id emoji_or_color en pt de ru q_en q_pt q_de`) or `content/ui.tsv`.
2. `python3 tools/build_data.py` rebuilds `app/js/data.js`.
3. Speech was generated once with Google Gemini TTS (`tools/gen_audio_gemini.py --keys key1,key2` for new
   clips only, needs your own API key in the environment). `tools/check_assets.py` checks that every file exists.

Tests are Playwright smoke suites in `tools/smoke*.js`. The open work is in [`tickets/BACKLOG.md`](tickets/BACKLOG.md).

## Credits and licences

- Code, Lisa, the scenes and the lesson art: MIT, see [LICENSE](LICENSE).
- Emoji artwork: Noto Emoji © Google, Apache-2.0. Flags: region-flags. Details in `app/img/LICENSES.md`.
- Voices: generated with Google Gemini text-to-speech for this project.

Pull requests with new words, languages or games are welcome. Please keep it offline, ad-free and readable
for a child who cannot read yet.
