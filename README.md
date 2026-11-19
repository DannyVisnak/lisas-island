# Lisa's Island (Остров Лисы)

A free, offline language game for small children who cannot read yet.
A friendly fox called Lisa talks to the child in Russian or English and teaches the first words of
**European Portuguese**, **English** and **German** through pictures, sounds and play.
There are no menus to read, no ads, no accounts and no internet.

> **Status: early and experimental.** This is a family project in active development.
> This README describes the current source in this checkout (19 lessons). The download builds are older
> test builds with 11 lessons (see "Which version is which" below). The Mac builds are ad-hoc signed only:
> they are not signed with an Apple developer certificate and not notarized (see "Testing status" below).
> Nothing here has been shown to teach a language faster or better than anything else.

## Why this exists

My son is 6. He speaks Russian, and we are moving to Portugal soon. We wanted him to learn the
languages we speak ourselves, so he arrives with a few words of his own and keeps the ones we use at home.
Every app we tried either wanted him to read, sold him things or ran on a phone.
So we built our own game for an old laptop with a touch screen.

The first evening he played it, he did not want to stop. He loves Lisa's voice, her jokes and how she
cheers for him. That is the part we care most about. He should feel that he is doing great, because he is.

## What is in the game

- **Languages.** Lisa speaks to the child in Russian or English, and the child learns European
  Portuguese (pt-PT), English or German. A grown-up picks the languages.
- **One Play button.** Each day Lisa runs one short session, and the child never has to choose:
  new words, a memory game, a mini-game with the same words, a tiny lesson and a movement break,
  more words, listen and tap, then a game with all of today's words. Then Lisa goes to sleep until tomorrow.
- **Session length.** A grown-up can set the session to 10, 15 or 20 minutes. We do not claim that any
  of these lengths is best. When the time is up, the child finishes the activity in progress, and then
  Lisa says goodnight.
- **Games instead of flash cards:** memory, a jump-and-run where the doors open with the right picture,
  hidden-picture scenes, seven mini-games and a play shop with play money in seven currencies
  (the foreign money cards are made-up designs).
- **19 short lessons** from Lisa. The first 11 cover things like counting and the sky. 8 new ones are about
  shadows, a sprout, halves, the rainbow, the Teremok fairy tale, balance, the stars and a frog.
  They teach no new vocabulary words.
- **12 countries** to visit on Lisa's map.
- **Lisa's house.** Stars build her house step by step. Each of the 5 building parts and each of the
  17 pieces of furniture comes in 3 styles, so the child can mix styles and restyle the house.
- **Optional letter track for Portuguese.** 6 letters, each with a familiar word, tracing and the keyboard.
  The isolated letter sounds are held back for now, and the letter uses the bare word instead.
  If the track is turned off, the plain-word track works the same as before.
- **A first picture story ("Picnic").** An optional story of 8 short scenes with 30 recorded lines.
  The child taps a picture to choose what happens, and every choice is right. The story appears on the
  home screen only after the child has heard all four of its words (apple, banana, ball, boat).
  It has short pauses where the child can say the word out loud if they want to.
  **Nothing is recorded or scored. The game never uses the microphone.**
- **Errorless.** A wrong tap is never punished. Lisa repeats the word and shows the right picture.

## How the learning is designed

The design is based on research about early second-language learning and about children's
motivation. These are design choices drawn from that research, not proven results for this game.
We have not measured whether Lisa's Island works better than anything else, and we do not claim a best
session length. The notes and references are in [`research/LEARNING_SCIENCE.md`](research/LEARNING_SCIENCE.md).

The ideas we built in:

- only a few new words at a time, each heard several times, alone and in a short phrase;
- spaced review: a Leitner box with 1/3/7/14/30-day steps, plus a gentler day when many words are due;
- the child recalls a word in a game before new words come, instead of only watching;
- stars mark finished steps and progress. In some older mini-games, how many stars the child gets also
  depends on how much help they needed. Praise names what the child did, never "you are so smart";
- short sessions with a movement break, and a length the grown-up can change. No streaks, no
  "one more round", no shop pressure.

## Install

### Which version is which

- **The current source** has 19 lessons. It is on the `main` branch on GitHub. It has not been packaged
  or released yet.
- **The three download builds** are an older snapshot with 11 lessons. They have not changed and are still
  drafts. There is no new packaged build and no stable release.

### Download (desktop test builds)

Get the builds from the [Releases](../../releases) page when they are published.
These files are built from the older 11-lesson snapshot:

| File | For |
|---|---|
| `Lisas-Island-Linux-x64.tar.gz` | Linux on 64-bit Intel/AMD PCs |
| `Lisas-Island-Mac-Intel.zip` | Macs with an Intel processor, macOS 13 or newer |
| `Lisas-Island-Mac-Apple-Silicon.zip` | Macs with an M-series chip, macOS 13 or newer |

**Mac.** Unzip the file and move **Lisa's Island** to the Applications folder. The app is ad-hoc signed only,
not signed with an Apple developer certificate and not notarized, so macOS may block it the first time you open it.
If it does, open **System Settings → Privacy & Security**, scroll down to the message about Lisa's Island and click
**Open Anyway**. Do this only for this app, and again for an updated copy if macOS asks. Do not turn off
the macOS security check for all apps.

The game starts in full screen. It is not a locked kiosk: Ctrl+Cmd+F or the green window button turns full screen
off and on, Cmd+Tab switches apps, Cmd+H hides and Cmd+Q quits. Cmd+M (minimize) may only work after you leave full screen.

To update, quit the old app (Cmd+Q) and replace it in Applications. The new copy keeps the same app identity,
so the child's progress should stay, but this has not been checked on a real Mac yet. Look at the progress
in the grown-up area before you update, and check it again afterwards.

**Linux.** Extract the archive and start `lisa-island-linux-x64/lisa-island`.
On Linux the game runs full screen with no menus. Press Alt+F4 to exit.

### Run from source

The Electron desktop app is the preferred way to run the game, and the one that plays the full audio.

As a Linux desktop app with no browser UI (tested on Fedora):

```
cd desktop && ./build.sh      # packages app/ with Electron -> desktop/dist/lisa-island-linux-x64.tar.gz
cd .. && ./install.sh         # installs to ~/.local/share/lisa-island and adds a launcher
```

`build.sh` installs its own Node dependencies first (`npm ci`, or `npm install` if there is no lock file).
It needs Node.js and npm, and the first build needs internet access.

Opening `app/index.html` directly in a browser also works as an option (from `file://`, no server needed),
but whether the voices play depends on the browser's media backend. In our tests Firefox showed a known
audio error (`OnMediaSinkAudioError`) with both old and new audio files, so no browser is guaranteed to play
the voices. Without the Electron build, `install.sh` falls back to a Firefox kiosk window with the same limit.
Exit with Alt+F4. It is made for touch screens, and a mouse works too.

The grown-up area sits behind a hold-to-open button. It has the languages, session length, volume,
progress per language and free play. More setup notes: [`docs/SETUP_NOTES.md`](docs/SETUP_NOTES.md).

## Testing status

Honest state of the current 19-lesson source:

- **Focused automated tests pass:** 98 Node tests in 12 files. They cover lesson choice and resume,
  review rules, the story rules and how the tests observe lessons and the path. This is a targeted set,
  not a full rerun of every older test.
- **The 6 older browser suites pass** on the current app. After a fix in how one test reads the game
  (a test fix, not a game fix), the Path suite was rerun in full. No check was weakened or removed.
- **In the real desktop app**, 66 lesson routes were checked on the source just before one last fix to
  the Sun's position in the rainbow lesson. That fix then got its own checks. Separately, 2 whole lessons
  ran normally in the app: a tap while Lisa is speaking is ignored, and a tap after she finishes counts.
- **Older numbers** (382 Node assertions, 47 Python tests, 11 desktop checks) come from the earlier
  11-lesson build. They were not all rerun on the 19-lesson source, so they are not a test result for this version.
- **Those desktop runs were on Linux in a virtual screen, as root, with the browser sandbox and the
  GPU turned off.** That is not the same as a normal user account, a real Mac or a Windows tablet.
  The new lessons have not been tried with real touch, sound and saving on a physical device yet.
- **Pictures:** the pictures in the 8 new lessons were reviewed on screenshots and accepted.
  That was a check of still images only, not of motion or sound.
- **Mac builds** are ad-hoc signed only. There is no Apple developer certificate and no notarization.
  Neither the Apple Silicon build nor the Intel build has been tested on a real Mac.
  The Mac window controls and keeping progress across an update were checked in the code, not yet on a device.
- **Voices:** 135 of the 136 new Russian and English lines are installed. One Russian line in the shadows
  lesson (`ru_cs_x_shadow_1`) is still missing while a decision about recording it is pending.
  When a clip is missing, the game is built to go on within 4 seconds.
  The new lines, the 30 story lines and the optional Portuguese letter track still wait for a check by a
  person who knows the language well. The isolated letter sounds are held back until a specialist hears them.
- **Open test gates:** a strict screenshot check and a parallel stress test are still open.
  Until they pass, the builds count as test builds and not as a stable release.

If you try it, issues with your device, OS version and what happened are very welcome.

## Change or add words

1. Edit `content/vocab.tsv` (`world id emoji_or_color en pt de ru q_en q_pt q_de`) or `content/ui.tsv`.
2. `python3 tools/build_data.py` rebuilds `app/js/data.js`.
3. The speech was generated once with Google Gemini text-to-speech. For new clips only, run
   `tools/gen_audio_gemini.py --keys key1,key2`, with your own API key in the environment.
   `tools/check_assets.py` checks that every audio file exists.

Tests are Playwright smoke suites in `tools/smoke*.js`. An older list of ideas and tasks is in
[`tickets/BACKLOG.md`](tickets/BACKLOG.md). It is out of date and does not show what is open or done now.

## Credits and licences

- Code, Lisa, the scenes and the lesson art: MIT, see [LICENSE](LICENSE).
- Emoji artwork: Noto Emoji © Google, Apache-2.0. Flags: region-flags. Details in `app/img/LICENSES.md`.
- Voices: generated with Google Gemini text-to-speech for this project. The 30 lines of the "Picnic" story use the Gemini voice Sulafat.
- Optional vocabulary subtitle font: Andika (SIL OFL 1.1), see `app/fonts/OFL.txt`.

Pull requests with new words, languages or games are welcome. Please keep it offline, ad-free and usable
for a child who cannot read yet.
